import { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Sparkles, Download, RotateCcw, Save, CheckCircle, ChevronLeft, AlertCircle } from 'lucide-react';
import { compositePolaroid, compositePhotoStrip } from '../utils/canvasUtils';
import { galleryStore } from '../utils/galleryStore';

const POLAROID_FRAMES = [
  { id: 1, name: 'Classic Cream', path: '/polaroid1.jpeg' },
  { id: 2, name: 'Charcoal Film', path: '/polaroid2.jpeg' },
  { id: 3, name: 'Retro Rose', path: '/polaroid3.jpeg' },
  { id: 4, name: 'Golden Hour', path: '/polaroid4.jpeg' },
  { id: 5, name: 'Acid Fade', path: '/polaroid5.jpeg' }
];

const STRIP_FRAMES = [
  { id: 1, name: 'Carnival Reel', path: '/photostrip1.jpeg' },
  { id: 2, name: 'Boardwalk Strip', path: '/photostrip2.jpeg' },
  { id: 3, name: 'Nickelodeon', path: '/photostrip3.jpeg' },
  { id: 4, name: 'Cinema Paradiso', path: '/photostrip4.jpeg' },
  { id: 5, name: 'Rusty Amber', path: '/photostrip5.jpeg' }
];

const FILTERS = ['Normal', 'Sepia', 'B&W', 'Faded', 'Vivid'];

const getVideoFilterStyle = (filterName) => {
  switch (filterName) {
    case 'Sepia':
      return 'sepia(0.8) contrast(1.1) brightness(0.95)';
    case 'B&W':
      return 'grayscale(1) contrast(1.25) brightness(0.95)';
    case 'Faded':
      return 'contrast(0.85) brightness(1.05) saturate(0.65) sepia(0.15)';
    case 'Vivid':
      return 'saturate(1.4) contrast(1.1) brightness(1.0)';
    case 'Normal':
    default:
      return 'sepia(0.2) contrast(1.05) brightness(0.98)';
  }
};

const getStickerBackgroundPos = (index) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const xPct = col * 50;
  const yPct = row * 50;
  return `${xPct}% ${yPct}%`;
};

// programmatically play a realistic mechanical camera shutter release sound
const playCameraShutterSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    
    // Create click noise buffer
    const bufferSize = audioCtx.sampleRate * 0.12; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 2.5;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.10);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    // Triangle wave impulse for click trigger
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 0.05);
    
    oscGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    
    noise.start();
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
    noise.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio click failed', e);
  }
};

export default function BoothPage({ user, setPage }) {
  // Steps: 1 (Format select), 2 (Camera), 3 (Preview/Edit), 4 (Developing)
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState('polaroid'); // 'polaroid' or 'strip'
  const [selectedFrame, setSelectedFrame] = useState(1); // 1 to 5
  
  // Camera & Viewfinder States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isFacingUser, setIsFacingUser] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  // Shutter states
  const [countdown, setCountdown] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [currentStripIndex, setCurrentStripIndex] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  // Customizer, Filters, and Stickers states
  const [caption, setCaption] = useState('');
  const [activeFilter, setActiveFilter] = useState('Normal');
  const [placedStickers, setPlacedStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [compositedImage, setCompositedImage] = useState(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);

  // Refs for camera streams
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas')); // Offscreen capture canvas
  const simulatedIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const capturedPhotosRef = useRef([]);

  const frames = format === 'polaroid' ? POLAROID_FRAMES : STRIP_FRAMES;
  const currentFramePath = frames.find(f => f.id === selectedFrame)?.path || frames[0].path;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopSimulation();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Recalculate preview in Step 3 when inputs change (stickers excluded for 60fps drag drag)
  useEffect(() => {
    if (step === 3 && capturedPhotos.length > 0) {
      triggerCompositing();
    }
  }, [step, selectedFrame, caption, activeFilter, format, capturedPhotos]);

  // Handle camera step trigger
  useEffect(() => {
    if (step === 2) {
      setCapturedPhotos([]);
      capturedPhotosRef.current = [];
      setCurrentStripIndex(0);
      setCountdown(0);
      setPlacedStickers([]);
      setSelectedStickerId(null);
      startCamera();
    } else {
      stopCamera();
      stopSimulation();
    }
  }, [step, isFacingUser]);

  const startCamera = async () => {
    setCameraError(false);
    setIsSimulated(false);
    stopSimulation();

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: isFacingUser ? 'user' : 'environment'
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera failed, starting simulator...', err);
      setCameraError(true);
      startSimulation();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startSimulation = () => {
    setIsSimulated(true);
    let hue = 0;
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    simulatedIntervalRef.current = setInterval(() => {
      const grad = ctx.createRadialGradient(320, 240, 40, 320, 240, 280);
      grad.addColorStop(0, '#fef3c7');
      grad.addColorStop(1, '#d97706');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      ctx.save();
      ctx.translate(320, 240);
      ctx.rotate((hue * Math.PI) / 180);
      ctx.fillStyle = 'rgba(217, 119, 6, 0.15)';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 400, (i * 30 * Math.PI) / 180, ((i * 30 + 15) * Math.PI) / 180);
        ctx.lineTo(0, 0);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(320, 260, 95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.arc(270, 185, 55, 0, Math.PI * 2);
      ctx.arc(370, 185, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 8;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.beginPath();
      ctx.arc(280, 250, 26, 0, Math.PI * 2);
      ctx.arc(360, 250, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(306, 250);
      ctx.lineTo(334, 250);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(320, 292, 22, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 0; y < 480; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(20, 20, 175, 30);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px monospace';
      ctx.fillText('⚡ VINTAGE SIMULATOR FEED', 28, 38);

      ctx.font = 'italic 16px "Playfair Display", serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Strike a Vintage Pose!', 240, 420);

      const outputCanvas = document.getElementById('viewfinder-canvas');
      if (outputCanvas) {
        const outCtx = outputCanvas.getContext('2d');
        outCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
      }

      hue = (hue + 1.2) % 360;
    }, 33);
  };

  const stopSimulation = () => {
    if (simulatedIntervalRef.current) {
      clearInterval(simulatedIntervalRef.current);
      simulatedIntervalRef.current = null;
    }
  };

  // Safe Shutter Actions
  const handleShutterClick = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setPlacedStickers([]);
    setSelectedStickerId(null);
    triggerCountdown(3);
  };

  const triggerCountdown = (seconds) => {
    setCountdown(seconds);
    let remaining = seconds;
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(0);
        setTimeout(() => captureSnap(), 200);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const captureSnap = () => {
    // Play Click Sound
    playCameraShutterSound();
    
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    let dataUrl;
    
    if (isSimulated) {
      const simCanvas = document.createElement('canvas');
      simCanvas.width = 640;
      simCanvas.height = 480;
      const simCtx = simCanvas.getContext('2d');
      const staticCanvas = document.getElementById('viewfinder-canvas');
      if (staticCanvas) {
        simCtx.drawImage(staticCanvas, 0, 0, 640, 480);
      }
      dataUrl = simCanvas.toDataURL('image/jpeg');
    } else if (videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      if (isFacingUser) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      dataUrl = canvas.toDataURL('image/jpeg');
    }

    if (!dataUrl) {
      dataUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    }

    if (format === 'polaroid') {
      capturedPhotosRef.current = [dataUrl];
      setCapturedPhotos([dataUrl]);
      setIsCapturing(false);
      setStep(3);
    } else {
      capturedPhotosRef.current.push(dataUrl);
      const updatedList = [...capturedPhotosRef.current];
      setCapturedPhotos(updatedList);
      
      if (updatedList.length < 3) {
        setCurrentStripIndex(updatedList.length);
        setTimeout(() => triggerCountdown(3), 1000);
      } else {
        setIsCapturing(false);
        setStep(3);
      }
    }
  };

  const triggerCompositing = async () => {
    if (capturedPhotos.length === 0) return;
    setIsCompositing(true);
    try {
      // Step 3 draws background print only (no stickers on background canvas for high performance)
      if (format === 'polaroid') {
        const result = await compositePolaroid(
          capturedPhotos[0],
          currentFramePath,
          caption,
          activeFilter,
          []
        );
        setCompositedImage(result);
      } else {
        const result = await compositePhotoStrip(
          capturedPhotos,
          currentFramePath,
          activeFilter,
          []
        );
        setCompositedImage(result);
      }
    } catch (err) {
      console.error('Compositing failed', err);
    } finally {
      setIsCompositing(false);
    }
  };

  // Compile final print containing stickers
  const handleDevelopClick = async () => {
    setIsDeveloping(true);
    setSavedToGallery(false);
    setStep(4);
    
    try {
      let finalResult;
      if (format === 'polaroid') {
        finalResult = await compositePolaroid(
          capturedPhotos[0],
          currentFramePath,
          caption,
          activeFilter,
          placedStickers
        );
      } else {
        finalResult = await compositePhotoStrip(
          capturedPhotos,
          currentFramePath,
          activeFilter,
          placedStickers
        );
      }
      setCompositedImage(finalResult);
    } catch (e) {
      console.error('Final compile failed', e);
    }
    
    setTimeout(() => {
      setIsDeveloping(false);
    }, 4500);
  };

  // Stickers Interaction Methods
  const addSticker = (index) => {
    const previewWidth = format === 'polaroid' ? 300 : 200;
    const previewHeight = format === 'polaroid' ? 360 : 600;

    const newSticker = {
      id: 'sticker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      stickerIndex: index,
      x: previewWidth / 2,
      y: previewHeight / 2,
      size: format === 'polaroid' ? 64 : 54,
      rotation: Math.floor(Math.random() * 50) - 25 // tilt slightly
    };

    setPlacedStickers(prev => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const removeSticker = (id) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
  };

  const updateSelectedSticker = (field, value) => {
    if (!selectedStickerId) return;
    setPlacedStickers(prev =>
      prev.map(s => (s.id === selectedStickerId ? { ...s, [field]: value } : s))
    );
  };

  const handleStickerDragStart = (e, stickerId) => {
    e.preventDefault();
    setSelectedStickerId(stickerId);

    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    // Retrieve container sizing
    const container = e.currentTarget.parentNode.getBoundingClientRect();

    const startX = sticker.x;
    const startY = sticker.y;
    const initialMouseX = clientX;
    const initialMouseY = clientY;

    const handleMouseMove = (moveEvent) => {
      const isMoveTouch = moveEvent.type.startsWith('touch');
      const curX = isMoveTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = isMoveTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = curX - initialMouseX;
      const deltaY = curY - initialMouseY;

      let newX = startX + deltaX;
      let newY = startY + deltaY;

      // Constrain inside container box
      newX = Math.max(10, Math.min(container.width - 10, newX));
      newY = Math.max(10, Math.min(container.height - 10, newY));

      setPlacedStickers(prev =>
        prev.map(s => (s.id === stickerId ? { ...s, x: newX, y: newY } : s))
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  const handleSaveToGallery = () => {
    if (savedToGallery || !compositedImage) return;
    const photo = galleryStore.savePhoto(
      user.uid,
      compositedImage,
      format === 'polaroid' ? caption : 'Vertical Strip',
      activeFilter,
      format
    );
    if (photo) {
      setSavedToGallery(true);
    }
  };

  const handleDownload = () => {
    if (!compositedImage) return;
    const link = document.createElement('a');
    link.download = `flash-fade-${format}-${Date.now()}.jpeg`;
    link.href = compositedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-aged-paper relative flex flex-col">
      {/* Shutter flash overlay */}
      {showFlash && (
        <div className="fixed inset-0 bg-white z-[9999] opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Navigation header bar */}
      <nav className="film-strip-nav py-6 px-6 sm:px-12 flex justify-between items-center text-vintage-cream z-10 select-none">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              setPage('home');
            }
          }}
          className="flex items-center gap-1.5 font-mono text-xs hover:text-amber-500 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Exit Booth' : 'Back'}</span>
        </button>

        <span className="font-serif italic text-amber-200 text-sm hidden md:inline">
          {step === 1 && 'Step 1: Choose Your Template'}
          {step === 2 && 'Step 2: Strike a Pose!'}
          {step === 3 && 'Step 3: Customize Print'}
          {step === 4 && 'Step 4: Developed Print'}
        </span>

        <span className="font-abril text-2xl tracking-wider text-amber-500">
          BOOTH NO. 1
        </span>
      </nav>

      {/* Main content viewport */}
      <div className="flex-grow p-4 md:p-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full z-10">

        {/* STEP 1: Formats & Carousel */}
        {step === 1 && (
          <div className="w-full flex flex-col items-center animate-film-jitter">
            <h2 className="font-serif font-extrabold text-3xl sm:text-4xl text-vintage-charcoal text-center mb-8">
              Select Your Template Format
            </h2>

            <div className="flex gap-4 mb-10 w-full max-w-md">
              <button
                onClick={() => { setFormat('polaroid'); setSelectedFrame(1); }}
                className={`flex-1 py-4 border-2 border-vintage-charcoal rounded-xl font-serif text-lg font-bold shadow-[4px_4px_0_#2c2523] cursor-pointer transition-all ${
                  format === 'polaroid' 
                    ? 'bg-amber-600 text-stone-950 translate-x-0.5 translate-y-0.5 shadow-[2px_2px_0_#2c2523]' 
                    : 'bg-white hover:bg-stone-50 text-vintage-charcoal'
                }`}
              >
                Classic Polaroid
                <span className="block font-mono text-[10px] uppercase font-normal text-stone-700 mt-1">
                  1 Capture
                </span>
              </button>

              <button
                onClick={() => { setFormat('strip'); setSelectedFrame(1); }}
                className={`flex-1 py-4 border-2 border-vintage-charcoal rounded-xl font-serif text-lg font-bold shadow-[4px_4px_0_#2c2523] cursor-pointer transition-all ${
                  format === 'strip' 
                    ? 'bg-amber-600 text-stone-950 translate-x-0.5 translate-y-0.5 shadow-[2px_2px_0_#2c2523]' 
                    : 'bg-white hover:bg-stone-50 text-vintage-charcoal'
                }`}
              >
                Photo Strip
                <span className="block font-mono text-[10px] uppercase font-normal text-stone-700 mt-1">
                  3 Captures (vertical)
                </span>
              </button>
            </div>

            <div className="w-full">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-4 text-center">
                CHOOSE TEMPLATE DECORATION
              </h3>

              <div className="flex overflow-x-auto gap-6 px-4 py-6 w-full max-w-3xl custom-scrollbar snap-x items-end justify-start md:justify-center">
                {frames.map((frame) => {
                  const cardWidthClass = format === 'polaroid' ? 'w-40' : 'w-32';
                  const previewHeightClass = format === 'polaroid' ? 'w-32 h-36' : 'w-24 h-72';
                  
                  return (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame.id)}
                      className={`flex-shrink-0 snap-center ${cardWidthClass} flex flex-col items-center p-3 bg-white border-2 rounded-xl transition-all cursor-pointer ${
                        selectedFrame === frame.id
                          ? 'border-amber-600 scale-105 shadow-lg bg-amber-50/20'
                          : 'border-vintage-charcoal/30 hover:border-vintage-charcoal shadow-sm hover:scale-[1.02]'
                      }`}
                    >
                      <div className={`${previewHeightClass} bg-stone-100 border border-stone-200 overflow-hidden rounded-lg mb-3 shadow-inner relative flex items-center justify-center`}>
                        <img
                          src={frame.path}
                          alt={frame.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = `<span class="font-serif text-[10px] text-stone-500 p-2 text-center">${frame.name}</span>`;
                          }}
                        />
                      </div>
                      <span className="font-serif font-bold text-xs text-vintage-charcoal text-center">
                        {frame.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-10 px-8 py-3 bg-vintage-charcoal text-vintage-cream font-serif font-bold text-lg rounded-xl border border-vintage-charcoal hover:bg-amber-800 hover:border-amber-800 cursor-pointer shadow-lg active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Step Inside Booth</span>
            </button>
          </div>
        )}

        {/* STEP 2: Shutter Capture viewfinder */}
        {step === 2 && (
          <div className="w-full flex flex-col items-center">
            <div className="relative wood-border p-4 bg-[#2b1d0e] rounded-xl w-full max-w-xl aspect-[4/3] flex items-center justify-center overflow-hidden">
              
              {!isSimulated && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover bg-black rounded-lg ${
                    isFacingUser ? '-scale-x-100' : ''
                  }`}
                  style={{
                    filter: getVideoFilterStyle(activeFilter)
                  }}
                />
              )}

              <canvas
                id="viewfinder-canvas"
                className="w-full h-full object-cover bg-black rounded-lg"
                style={{
                  display: isSimulated ? 'block' : 'none',
                  filter: getVideoFilterStyle(activeFilter)
                }}
              />

              <div className="absolute inset-4 border border-white/5 pointer-events-none rounded-lg flex flex-col justify-between">
                <div className="w-full border-b border-white/5 h-1/3" />
                <div className="w-full border-b border-white/5 h-1/3" />
              </div>
              <div className="absolute inset-4 border border-white/5 pointer-events-none rounded-lg flex justify-between">
                <div className="h-full border-r border-white/5 w-1/3" />
                <div className="h-full border-r border-white/5 w-1/3" />
              </div>

              {countdown > 0 && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-20">
                  <span className="font-serif font-black text-8xl text-amber-500 animate-ping">
                    {countdown}
                  </span>
                  <span className="font-mono text-sm uppercase tracking-widest text-amber-300 mt-4">
                    Get Ready...
                  </span>
                </div>
              )}

              {format === 'strip' && isCapturing && (
                <div className="absolute top-8 right-8 bg-black/80 px-3 py-1.5 rounded-lg border border-amber-600/30 text-amber-500 font-mono text-[10px] uppercase tracking-wider z-20 animate-pulse">
                  Capture {currentStripIndex + 1} of 3
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-4 p-3 max-w-md bg-amber-500/10 border border-amber-500/40 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Webcam Not Found or Blocked</p>
                  <p className="font-mono mt-0.5">Running in simulator mode! You can click "Click!" to capture a simulated snapshot.</p>
                </div>
              </div>
            )}

            {/* real time viewfinder filters chooser */}
            <div className="mt-6 mb-2 flex flex-col items-center">
              <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 font-bold mb-2">
                Active Viewfinder Filter
              </span>
              <div className="flex gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    disabled={isCapturing}
                    onClick={() => setActiveFilter(f)}
                    className={`py-1.5 px-3 border rounded-lg text-xs font-mono cursor-pointer transition-all ${
                      activeFilter === f
                        ? 'bg-amber-600 border-amber-600 text-stone-950 font-bold shadow'
                        : 'bg-white hover:bg-stone-50 border-stone-300 text-vintage-charcoal'
                    } disabled:opacity-50`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center items-center gap-8 w-full max-w-md">
              {!isSimulated && (
                <button
                  onClick={() => setIsFacingUser(!isFacingUser)}
                  disabled={isCapturing}
                  className="w-12 h-12 bg-white hover:bg-stone-50 border-2 border-vintage-charcoal rounded-full flex items-center justify-center transition-colors cursor-pointer shadow disabled:opacity-50"
                  title="Flip Camera"
                >
                  <RefreshCw className="w-5 h-5 text-vintage-charcoal" />
                </button>
              )}

              <button
                onClick={handleShutterClick}
                disabled={isCapturing}
                className="w-20 h-20 bg-amber-600 text-stone-950 font-serif font-bold text-sm tracking-wide uppercase border-4 border-vintage-charcoal rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-amber-700 shutter-glow active:scale-95 disabled:opacity-50"
              >
                <span>Click!</span>
              </button>

              <button
                onClick={() => setStep(1)}
                disabled={isCapturing}
                className="w-12 h-12 bg-white hover:bg-stone-50 border-2 border-vintage-charcoal rounded-full flex items-center justify-center transition-colors cursor-pointer shadow disabled:opacity-50"
                title="Change Template"
              >
                <ChevronLeft className="w-5 h-5 text-vintage-charcoal" />
              </button>
            </div>

            <p className="mt-4 font-mono text-[10px] text-stone-500 uppercase tracking-widest text-center">
              {format === 'polaroid' ? '1 Pose capture' : 'Auto-snaps 3 sequential poses with 3-second gaps'}
            </p>
          </div>
        )}

        {/* STEP 3: Preview layout / Customizer / Stamps */}
        {step === 3 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-film-jitter" onClick={() => setSelectedStickerId(null)}>
            
            {/* Left Column: Interactive Preview Canvas */}
            <div className="flex flex-col items-center">
              <h3 className="font-serif font-bold text-xl text-vintage-charcoal mb-4">
                Composed Print Preview
              </h3>

              {isCompositing ? (
                <div className="bg-stone-200 border border-stone-300 p-2 shadow-xl rounded-xl flex flex-col items-center justify-center gap-2"
                     style={{ height: format === 'polaroid' ? '360px' : '600px', width: format === 'polaroid' ? '300px' : '200px' }}>
                  <span className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs text-stone-500">Preparing film...</span>
                </div>
              ) : (
                /* Interactive draggable overlay wrapper */
                <div 
                  className="bg-white p-3 polaroid-shadow border border-stone-200 select-none overflow-hidden relative"
                  style={{ 
                    width: format === 'polaroid' ? '300px' : '200px',
                    height: format === 'polaroid' ? '360px' : '600px'
                  }}
                >
                  {/* Base composited image (contains background photos, custom caption, key-out templates) */}
                  {compositedImage && (
                    <img
                      src={compositedImage}
                      alt="Vintage composite"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  )}

                  {/* Absolute rendered draggable stickers */}
                  {placedStickers.map((st) => (
                    <div
                      key={st.id}
                      className={`absolute select-none cursor-move rounded ${
                        selectedStickerId === st.id ? 'ring-2 ring-amber-500 ring-offset-1 z-30' : 'z-20'
                      }`}
                      style={{
                        left: `${st.x}px`,
                        top: `${st.y}px`,
                        transform: `translate(-50%, -50%) rotate(${st.rotation || 0}deg)`,
                        width: `${st.size}px`,
                        height: `${st.size}px`
                      }}
                      onMouseDown={(e) => handleStickerDragStart(e, st.id)}
                      onTouchStart={(e) => handleStickerDragStart(e, st.id)}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedStickerId(st.id); 
                      }}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: 'url(/stickers.jpeg)',
                          backgroundSize: '300% 300%',
                          backgroundPosition: getStickerBackgroundPos(st.stickerIndex),
                          filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.35))'
                        }}
                      />
                      
                      {/* Delete stamp button */}
                      {selectedStickerId === st.id && (
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            removeSticker(st.id); 
                          }}
                          className="absolute -top-3 -right-3 w-5 h-5 bg-red-800 text-white rounded-full flex items-center justify-center text-xs font-bold border border-white cursor-pointer shadow z-40 hover:bg-red-950"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span className="font-mono text-[9px] text-stone-500 mt-2 uppercase tracking-wider">
                💡 Drag stamps to move. Click to edit size/angle.
              </span>
            </div>

            {/* Right Column: Customizer parameters & stickers tray */}
            <div className="flex flex-col gap-6" onClick={(e) => e.stopPropagation()}>
              <div>
                <h3 className="font-serif font-bold text-xl text-vintage-charcoal mb-3">
                  1. Customize Lens Filter
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`py-2 px-3 border border-vintage-charcoal/50 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                        activeFilter === f
                          ? 'bg-amber-600 text-stone-950 font-bold border-amber-600 shadow'
                          : 'bg-white hover:bg-stone-50 text-vintage-charcoal'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {format === 'polaroid' && (
                <div>
                  <h3 className="font-serif font-bold text-xl text-vintage-charcoal mb-3">
                    2. Add Polaroid Caption
                  </h3>
                  <input
                    type="text"
                    maxLength={32}
                    placeholder="Write a vintage caption... (Max 32 letters)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-[#fdfbf7] border-2 border-vintage-charcoal/40 focus:border-amber-600 rounded-lg py-2 px-3 text-sm text-vintage-charcoal font-handwriting text-2xl focus:outline-none transition-colors"
                  />
                  <span className="block font-mono text-[9px] text-stone-500 mt-1 uppercase tracking-widest text-right">
                    Using "Caveat" handwriting font
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-serif font-bold text-xl text-vintage-charcoal mb-3">
                  {format === 'polaroid' ? '3.' : '2.'} Swap Border Frame
                </h3>
                <div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                  {frames.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame.id)}
                      className={`flex-shrink-0 py-1.5 px-3 border rounded-lg text-xs font-serif font-bold cursor-pointer transition-all ${
                        selectedFrame === frame.id
                          ? 'bg-vintage-charcoal text-vintage-cream border-vintage-charcoal'
                          : 'bg-white hover:bg-stone-50 border-stone-300 text-vintage-charcoal'
                      }`}
                    >
                      {frame.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* RETRO STICKERS SELECTION TRARY */}
              <div>
                <h3 className="font-serif font-bold text-xl text-vintage-charcoal mb-2">
                  {format === 'polaroid' ? '4.' : '3.'} Add Retro Stamps
                </h3>
                <p className="text-[10px] font-mono text-stone-500 uppercase tracking-widest mb-3">
                  Click a stamp to add, then drag it inside the print preview!
                </p>
                
                {/* Sticker options grid */}
                <div className="grid grid-cols-5 gap-2 bg-stone-100/60 p-2 border border-stone-300/60 rounded-xl">
                  {[...Array(9)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => addSticker(idx)}
                      className="aspect-square bg-white hover:bg-stone-50 border border-stone-300/80 rounded-lg overflow-hidden flex items-center justify-center p-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: 'url(/stickers.jpeg)',
                          backgroundSize: '300% 300%',
                          backgroundPosition: getStickerBackgroundPos(idx)
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Edit options for active selected sticker */}
                {selectedStickerId && (
                  <div className="mt-4 p-3 bg-amber-50/20 border border-amber-900/10 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="font-bold text-vintage-charcoal">Edit Active Stamp</span>
                      <button
                        onClick={() => setSelectedStickerId(null)}
                        className="text-stone-500 hover:text-stone-800 underline text-[10px] cursor-pointer"
                      >
                        Deselect
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-0.5">
                        <span>TILT ROTATION</span>
                        <span>{placedStickers.find(s => s.id === selectedStickerId)?.rotation || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={placedStickers.find(s => s.id === selectedStickerId)?.rotation || 0}
                        onChange={(e) => updateSelectedSticker('rotation', parseInt(e.target.value))}
                        className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-stone-600 mb-0.5">
                        <span>STAMP SIZE</span>
                        <span>{placedStickers.find(s => s.id === selectedStickerId)?.size || 50}px</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="140"
                        value={placedStickers.find(s => s.id === selectedStickerId)?.size || 50}
                        onChange={(e) => updateSelectedSticker('size', parseInt(e.target.value))}
                        className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm print buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-vintage-charcoal/10">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-white hover:bg-stone-50 text-vintage-charcoal font-serif font-bold rounded-xl border border-vintage-charcoal cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  onClick={handleDevelopClick}
                  disabled={isCompositing}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-stone-950 font-serif font-bold rounded-xl border border-amber-600 cursor-pointer shadow shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Develop Print</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* STEP 4: Chemical Developing animation & Download */}
        {step === 4 && (
          <div className="w-full flex flex-col items-center">
            
            <div className="flex flex-col items-center mb-8">
              {isDeveloping ? (
                <div className="mb-4 text-center">
                  <h3 className="font-serif italic text-2xl text-amber-800 animate-pulse">
                    Developing print chemistry...
                  </h3>
                  <p className="font-mono text-[10px] uppercase text-stone-500 tracking-wider mt-1">
                    Watch the silver halides crystallize!
                  </p>
                </div>
              ) : (
                <div className="mb-4 text-center">
                  <h3 className="font-serif font-bold text-2xl text-green-800 flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-700" />
                    Print Fully Developed!
                  </h3>
                  <p className="font-mono text-[10px] uppercase text-stone-500 tracking-wider mt-1">
                    Ready to download or pin to your gallery.
                  </p>
                </div>
              )}

              <div 
                className="bg-white p-3 polaroid-shadow border border-stone-200 overflow-hidden relative"
                style={{ 
                  height: format === 'polaroid' ? '450px' : '600px', 
                  width: format === 'polaroid' ? '360px' : '230px' 
                }}
              >
                {compositedImage && (
                  <img
                    src={compositedImage}
                    alt="Developed vintage print"
                    className={`w-full h-full object-contain ${
                      isDeveloping ? 'animate-develop' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            {!isDeveloping && (
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-stone-950 font-serif font-bold rounded-xl border border-amber-600 shadow shadow-amber-600/10 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download JPEG</span>
                </button>

                <button
                  onClick={handleSaveToGallery}
                  disabled={savedToGallery}
                  className={`flex-1 py-3 border font-serif font-bold rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    savedToGallery
                      ? 'bg-green-800 border-green-800 text-white cursor-default'
                      : 'bg-vintage-charcoal border-vintage-charcoal text-vintage-cream hover:bg-stone-800'
                  }`}
                >
                  <Save className="w-5 h-5" />
                  <span>{savedToGallery ? 'Saved to Gallery!' : 'Pin to Gallery'}</span>
                </button>
              </div>
            )}

            {!isDeveloping && (
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setCapturedPhotos([]);
                    capturedPhotosRef.current = [];
                    setPlacedStickers([]);
                    setStep(2);
                  }}
                  className="font-mono text-xs text-vintage-charcoal underline hover:text-amber-800 cursor-pointer"
                >
                  Take Another Shot
                </button>
                <span className="text-stone-400 font-mono text-xs">•</span>
                <button
                  onClick={() => setPage('gallery')}
                  className="font-mono text-xs text-vintage-charcoal underline hover:text-amber-800 cursor-pointer"
                >
                  View My Gallery
                </button>
                <span className="text-stone-400 font-mono text-xs">•</span>
                <button
                  onClick={() => setPage('home')}
                  className="font-mono text-xs text-vintage-charcoal underline hover:text-amber-800 cursor-pointer"
                >
                  Exit to Station
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
