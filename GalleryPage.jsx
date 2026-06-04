import { useState, useEffect } from 'react';
import { ChevronLeft, Download, Trash2, Camera, X, Calendar, Sparkles } from 'lucide-react';
import { galleryStore } from '../utils/galleryStore';

export default function GalleryPage({ user, setPage }) {
  const [photos, setPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null); // Lightbox photo

  // Load photos scoped to user UID
  useEffect(() => {
    if (user && user.uid) {
      const savedPhotos = galleryStore.getPhotos(user.uid);
      
      // Inject stable random tilt angles and pin colors for visual realism
      const decorated = savedPhotos.map(photo => {
        // Simple hash of photo ID to keep it stable across renders
        const hash = photo.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rotate = (hash % 7) - 3; // Tilt between -3deg and +3deg
        const pinColor = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][hash % 5];
        const pinOffset = (hash % 11) - 5; // Offset between -5px and +5px
        return { ...photo, rotate, pinColor, pinOffset };
      });

      setPhotos(decorated);
    }
  }, [user]);

  const handleDelete = (photoId) => {
    if (confirm('Are you sure you want to tear this photo off the board? It will be deleted forever!')) {
      const success = galleryStore.deletePhoto(user.uid, photoId);
      if (success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
        if (activePhoto && activePhoto.id === photoId) {
          setActivePhoto(null);
        }
      }
    }
  };

  const handleDownload = (photo) => {
    const link = document.createElement('a');
    link.download = `flash-fade-${photo.format}-${Date.now()}.jpeg`;
    link.href = photo.url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'June 1974';
    }
  };

  return (
    <div className="min-h-screen bg-corkboard flex flex-col relative">
      
      {/* Navigation bar film strip */}
      <nav className="film-strip-nav py-6 px-6 sm:px-12 flex justify-between items-center text-vintage-cream z-10 shrink-0">
        <button
          onClick={() => setPage('home')}
          className="flex items-center gap-1.5 font-mono text-xs hover:text-amber-500 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit Gallery</span>
        </button>

        <span className="font-serif italic text-amber-200 text-sm hidden md:inline">
          {photos.length} Snapshots pinned to board
        </span>

        <span className="font-abril text-2xl tracking-wider text-amber-500 select-none">
          MY GALLERY
        </span>
      </nav>

      {/* Main Corkboard Pinned Grid */}
      <main className="flex-grow p-6 sm:p-12 relative flex items-center justify-center">
        {photos.length === 0 ? (
          /* Empty board state */
          <div className="bg-[#fdfbf7] p-8 sm:p-12 border-2 border-vintage-charcoal rounded-2xl max-w-md text-center shadow-2xl animate-film-jitter border-dashed">
            <Sparkles className="w-12 h-12 text-vintage-gold mx-auto mb-4 animate-pulse" />
            <h3 className="font-serif font-bold text-2xl text-vintage-charcoal mb-3">
              Your Memory Board is Empty
            </h3>
            <p className="font-mono text-xs text-stone-600 leading-relaxed mb-8">
              No prints have been pinned here yet! Step inside the photobooth to snap a vintage polaroid or photo strip.
            </p>
            <button
              onClick={() => setPage('booth')}
              className="py-3 px-6 bg-amber-600 hover:bg-amber-700 text-stone-950 font-serif font-bold rounded-xl border border-amber-600 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 mx-auto"
            >
              <Camera className="w-4 h-4" />
              <span>Step Into Booth</span>
            </button>
          </div>
        ) : (
          /* Pinned Prints Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl w-full">
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{ transform: `rotate(${photo.rotate}deg)` }}
                className="relative group bg-[#fdfbf7] p-3 polaroid-shadow border border-stone-200 hover:scale-105 hover:z-20 hover:rotate-0 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Push Pin Header visual */}
                <div 
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full z-10 shadow"
                  style={{
                    backgroundColor: photo.pinColor,
                    transform: `translateX(calc(-50% + ${photo.pinOffset}px))`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(0,0,0,0.4)'
                  }}
                />
                
                {/* Shadow Pin Needle representation */}
                <div 
                  className="absolute top-4 left-1/2 w-0.5 h-3 bg-black/40 rotate-[15deg] blur-[0.5px] pointer-events-none"
                  style={{ transform: `translateX(calc(-50% + ${photo.pinOffset + 2}px))` }}
                />

                {/* Captured Composite Image preview */}
                <div 
                  className="bg-stone-100 overflow-hidden rounded border border-stone-200 cursor-pointer"
                  onClick={() => setActivePhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Vintage Print'}
                    className="w-full h-auto object-cover max-h-[300px]"
                  />
                </div>

                {/* Print bottom details card */}
                <div className="pt-3 pb-1 px-1 flex flex-col justify-between items-center text-center">
                  {photo.format === 'polaroid' ? (
                    <span className="font-handwriting text-xl text-vintage-charcoal leading-none mb-1 max-w-full truncate">
                      {photo.caption || 'Memory'}
                    </span>
                  ) : (
                    <span className="font-serif italic font-bold text-xs text-vintage-charcoal leading-none mb-1">
                      Vertical Filmstrip
                    </span>
                  )}
                  <span className="font-mono text-[8px] text-stone-500 uppercase tracking-widest mt-1">
                    {formatDate(photo.timestamp)}
                  </span>
                </div>

                {/* Hover overlay shortcuts */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleDownload(photo)}
                    className="w-7 h-7 bg-amber-600 hover:bg-amber-700 text-stone-950 rounded-full flex items-center justify-center shadow transition-transform hover:scale-105 cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="w-7 h-7 bg-red-800 hover:bg-red-900 text-white rounded-full flex items-center justify-center shadow transition-transform hover:scale-105 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* LIGHTBOX MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] backdrop-blur-sm">
          <div className="relative bg-[#fdfbf7] p-4 sm:p-5 rounded-2xl polaroid-shadow max-w-lg w-full flex flex-col animate-film-jitter">
            
            {/* Close Button */}
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-vintage-charcoal text-vintage-cream border-2 border-vintage-cream rounded-full flex items-center justify-center shadow-lg hover:bg-amber-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Expanded print photo */}
            <div className="bg-stone-100 overflow-hidden rounded-xl border border-stone-200 flex justify-center items-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || 'Expanded print'}
                className="max-h-[60vh] sm:max-h-[70vh] object-contain w-full"
              />
            </div>

            {/* Print metadata / details footer */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-center sm:text-left">
                {activePhoto.format === 'polaroid' ? (
                  <h4 className="font-handwriting text-3xl text-vintage-charcoal leading-none">
                    {activePhoto.caption || 'Memory'}
                  </h4>
                ) : (
                  <h4 className="font-serif font-bold text-base text-vintage-charcoal">
                    Vintage Film Strip
                  </h4>
                )}
                <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[9px] uppercase tracking-wider mt-1 justify-center sm:justify-start">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(activePhoto.timestamp)}</span>
                  <span>•</span>
                  <span>{activePhoto.filter}</span>
                </div>
              </div>

              {/* Action buttons in lightbox */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(activePhoto)}
                  className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-stone-950 font-serif font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleDelete(activePhoto.id)}
                  className="py-2 px-4 bg-red-800 hover:bg-red-900 text-white font-mono text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Tear Off</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
