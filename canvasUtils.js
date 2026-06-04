// Utilities for canvas compositing

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

const getCanvasFilter = (filterName) => {
  switch (filterName) {
    case 'Sepia':
      return 'sepia(0.85) contrast(1.15) brightness(0.95)';
    case 'B&W':
      return 'grayscale(1) contrast(1.3) brightness(0.95)';
    case 'Faded':
      return 'contrast(0.85) brightness(1.05) saturate(0.65) sepia(0.15)';
    case 'Vivid':
      return 'saturate(1.4) contrast(1.1) brightness(1.0)';
    case 'Normal':
    default:
      return 'none';
  }
};

/**
 * Slices a sticker from stickers.jpeg (3x3 grid) and draws it on canvas with scale/rotation.
 */
const drawStickerOnCanvas = (ctx, stickerImg, stickerIndex, x, y, size, rotation) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation || 0) * Math.PI / 180);

  // Divide stickers.jpeg into 3x3 grid (9 stickers)
  const sWidth = stickerImg.width / 3;
  const sHeight = stickerImg.height / 3;

  const col = stickerIndex % 3;
  const row = Math.floor(stickerIndex / 3);

  const sx = col * sWidth;
  const sy = row * sHeight;

  ctx.drawImage(
    stickerImg,
    sx, sy, sWidth, sHeight,
    -size / 2, -size / 2, size, size
  );

  ctx.restore();
};

/**
 * Chroma-keys (makes transparent) a solid color inside the specified slot bounds of a JPEG frame.
 */
const createTransparentFrame = (frameImg, slots, format) => {
  const canvas = document.createElement('canvas');
  canvas.width = frameImg.width;
  canvas.height = frameImg.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(frameImg, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const refWidth = format === 'polaroid' ? 600 : 400;
  const refHeight = format === 'polaroid' ? 720 : 1200;

  const scaleX = frameImg.width / refWidth;
  const scaleY = frameImg.height / refHeight;

  slots.forEach(slot => {
    const centerX = Math.floor((slot.x + slot.width / 2) * scaleX);
    const centerY = Math.floor((slot.y + slot.height / 2) * scaleY);
    
    if (centerX < 0 || centerX >= canvas.width || centerY < 0 || centerY >= canvas.height) {
      return;
    }

    const pixelIndex = (centerY * canvas.width + centerX) * 4;
    const targetR = data[pixelIndex];
    const targetG = data[pixelIndex + 1];
    const targetB = data[pixelIndex + 2];
    const targetA = data[pixelIndex + 3];

    if (targetA < 50) return;

    const minX = Math.floor(slot.x * scaleX);
    const maxX = Math.ceil((slot.x + slot.width) * scaleX);
    const minY = Math.floor(slot.y * scaleY);
    const maxY = Math.ceil((slot.y + slot.height) * scaleY);

    const tolerance = 75;

    for (let y = minY; y < maxY; y++) {
      if (y < 0 || y >= canvas.height) continue;
      for (let x = minX; x < maxX; x++) {
        if (x < 0 || x >= canvas.width) continue;
        
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0) {
          const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
          if (diff < tolerance) {
            data[i + 3] = 0;
          }
        }
      }
    }
  });

  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

/**
 * Composites a single photo into a Polaroid frame with stickers
 */
export const compositePolaroid = async (photoSrc, framePath, caption, filterName = 'Normal', placedStickers = []) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 600;
  canvas.height = 720;

  try {
    const [frameImg, photoImg] = await Promise.all([
      loadImage(framePath),
      loadImage(photoSrc)
    ]);

    const photoX = 42;
    const photoY = 42;
    const photoWidth = 516;
    const photoHeight = 500;

    // 1. Draw user photo FIRST
    ctx.save();
    ctx.filter = getCanvasFilter(filterName);

    const sourceWidth = photoImg.width;
    const sourceHeight = photoImg.height;
    const targetAspect = photoWidth / photoHeight;
    const sourceAspect = sourceWidth / sourceHeight;
    
    let sX = 0, sY = 0, sWidth = sourceWidth, sHeight = sourceHeight;
    
    if (sourceAspect > targetAspect) {
      sWidth = sourceHeight * targetAspect;
      sX = (sourceWidth - sWidth) / 2;
    } else {
      sHeight = sourceWidth / targetAspect;
      sY = (sourceHeight - sHeight) / 2;
    }

    ctx.drawImage(photoImg, sX, sY, sWidth, sHeight, photoX, photoY, photoWidth, photoHeight);
    ctx.restore();

    // 2. Overlay transparent keyed frame
    const polaroidSlots = [{ x: photoX, y: photoY, width: photoWidth, height: photoHeight }];
    const transparentFrameCanvas = createTransparentFrame(frameImg, polaroidSlots, 'polaroid');
    ctx.drawImage(transparentFrameCanvas, 0, 0, canvas.width, canvas.height);

    // 3. Draw caption text if present
    if (caption) {
      ctx.save();
      ctx.fillStyle = '#1c1510'; 
      ctx.textAlign = 'center';
      ctx.font = '38px "Caveat", "Special Elite", cursive';
      ctx.translate(canvas.width / 2, 620);
      ctx.rotate((Math.random() - 0.5) * 0.03);
      ctx.fillText(caption, 0, 0);
      ctx.restore();
    }

    // 4. Draw placed stickers
    if (placedStickers && placedStickers.length > 0) {
      const stickersImg = await loadImage('/stickers.jpeg');
      const scaleX = canvas.width / 300; // Preview is 300px wide
      const scaleY = canvas.height / 360; // Preview is 360px high

      placedStickers.forEach(st => {
        const canvasX = st.x * scaleX;
        const canvasY = st.y * scaleY;
        const canvasSize = st.size * scaleX;
        drawStickerOnCanvas(ctx, stickersImg, st.stickerIndex, canvasX, canvasY, canvasSize, st.rotation);
      });
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Error compositing Polaroid:', error);
    throw error;
  }
};

/**
 * Composites 3 photos into a vertical photo strip with stickers
 */
export const compositePhotoStrip = async (photoSrcs, framePath, filterName = 'Normal', placedStickers = []) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 400;
  canvas.height = 1200;

  try {
    const framePromise = loadImage(framePath);
    const photoPromises = photoSrcs.map(src => loadImage(src));
    
    const [frameImg, ...photoImgs] = await Promise.all([
      framePromise,
      ...photoPromises
    ]);

    const slotX = 32;
    const slotWidth = 336;
    const slotHeight = 336;
    const slotYPositions = [42, 424, 806];

    // 1. Draw 3 user photos FIRST
    ctx.save();
    ctx.filter = getCanvasFilter(filterName);

    photoImgs.forEach((photoImg, index) => {
      if (index >= slotYPositions.length) return;
      const targetY = slotYPositions[index];

      const sourceWidth = photoImg.width;
      const sourceHeight = photoImg.height;
      let sX = 0, sY = 0, sWidth = sourceWidth, sHeight = sourceHeight;
      
      if (sourceWidth > sourceHeight) {
        sWidth = sourceHeight;
        sX = (sourceWidth - sWidth) / 2;
      } else {
        sHeight = sourceWidth;
        sY = (sourceHeight - sHeight) / 2;
      }

      ctx.drawImage(photoImg, sX, sY, sWidth, sHeight, slotX, targetY, slotWidth, slotHeight);
    });

    ctx.restore();

    // 2. Overlay transparent keyed frame
    const stripSlots = slotYPositions.map(y => ({ x: slotX, y, width: slotWidth, height: slotHeight }));
    const transparentFrameCanvas = createTransparentFrame(frameImg, stripSlots, 'strip');
    ctx.drawImage(transparentFrameCanvas, 0, 0, canvas.width, canvas.height);

    // 3. Draw placed stickers
    if (placedStickers && placedStickers.length > 0) {
      const stickersImg = await loadImage('/stickers.jpeg');
      const scaleX = canvas.width / 200; // Preview is 200px wide
      const scaleY = canvas.height / 600; // Preview is 600px high

      placedStickers.forEach(st => {
        const canvasX = st.x * scaleX;
        const canvasY = st.y * scaleY;
        const canvasSize = st.size * scaleX;
        drawStickerOnCanvas(ctx, stickersImg, st.stickerIndex, canvasX, canvasY, canvasSize, st.rotation);
      });
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Error compositing Photo Strip:', error);
    throw error;
  }
};
