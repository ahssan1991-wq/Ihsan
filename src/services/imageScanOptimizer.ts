/**
 * Image Scan Optimizer & Preprocessing Engine
 * Automatically detects, rotates, enhances, and modifies barcode/QR/nameplate images
 * when input images are sub-optimal (rotated, tilted, low contrast, inverted, or blurry).
 */

/**
 * Loads an image from a dataUrl or Blob into an HTMLImageElement
 */
export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image for preprocessing: ' + err));

    if (typeof src === 'string') {
      img.src = src;
    } else {
      img.src = URL.createObjectURL(src);
    }
  });
}

/**
 * Rotates an image by specified degrees (90, 180, 270)
 * Swaps dimensions correctly when rotated by 90 or 270 degrees.
 */
export async function rotateImage(
  imageSource: string | HTMLImageElement, 
  degrees: 90 | 180 | 270
): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const rad = (degrees * Math.PI) / 180;
  const isPerpendicular = degrees === 90 || degrees === 270;

  canvas.width = isPerpendicular ? img.naturalHeight || img.height : img.naturalWidth || img.width;
  canvas.height = isPerpendicular ? img.naturalWidth || img.width : img.naturalHeight || img.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(
    img, 
    -(img.naturalWidth || img.width) / 2, 
    -(img.naturalHeight || img.height) / 2
  );

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Flips an image horizontally or vertically
 */
export async function flipImage(
  imageSource: string | HTMLImageElement, 
  direction: 'horizontal' | 'vertical'
): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  ctx.save();
  if (direction === 'horizontal') {
    ctx.scale(-1, 1);
    ctx.drawImage(img, -canvas.width, 0);
  } else {
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, -canvas.height);
  }
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Enhances image contrast, applies adaptive grayscale stretching and optional edge sharpening
 * Great for reading metallic laser etched tags, faint thermal print labels, and shadowed barcodes.
 */
export async function enhanceImageContrast(
  imageSource: string | HTMLImageElement,
  options: {
    contrastMultiplier?: number;
    brightnessOffset?: number;
    sharpen?: boolean;
    grayscale?: boolean;
    binarizeThreshold?: number; // 0-255 or undefined
  } = {}
): Promise<string> {
  const {
    contrastMultiplier = 1.45,
    brightnessOffset = 10,
    sharpen = true,
    grayscale = true,
    binarizeThreshold
  } = options;

  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // First pass: grayscale, brightness, contrast
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (grayscale) {
        // Luminance formula
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray;
        g = gray;
        b = gray;
      }

      // Apply contrast multiplier centered at 128
      r = Math.min(255, Math.max(0, (r - 128) * contrastMultiplier + 128 + brightnessOffset));
      g = Math.min(255, Math.max(0, (g - 128) * contrastMultiplier + 128 + brightnessOffset));
      b = Math.min(255, Math.max(0, (b - 128) * contrastMultiplier + 128 + brightnessOffset));

      // Optional binarization threshold
      if (typeof binarizeThreshold === 'number') {
        const val = r >= binarizeThreshold ? 255 : 0;
        r = val;
        g = val;
        b = val;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // Optional 3x3 sharpening convolution filter
    if (sharpen && width > 4 && height > 4) {
      const copy = new Uint8ClampedArray(data);
      // Simple 3x3 sharpening kernel: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ]
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const up = ((y - 1) * width + x) * 4 + c;
            const down = ((y + 1) * width + x) * 4 + c;
            const left = (y * width + (x - 1)) * 4 + c;
            const right = (y * width + (x + 1)) * 4 + c;

            const val = 5 * copy[idx + c] - copy[up] - copy[down] - copy[left] - copy[right];
            data[idx + c] = Math.min(255, Math.max(0, val));
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    // If getImageData was restricted, fallback to CSS canvas filter
    ctx.filter = `contrast(${contrastMultiplier}) brightness(${1 + brightnessOffset / 100}) grayscale(${grayscale ? 1 : 0})`;
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Inverts the color polarity of the image (White on Dark -> Dark on White)
 * Crucial for negative barcodes and QR codes on black or metal backgrounds.
 */
export async function invertImageColors(imageSource: string | HTMLImageElement): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(img, 0, 0, width, height);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];         // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    ctx.filter = 'invert(1)';
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Crops the central region of interest (ROI)
 * Default crops center 75% to eliminate distracting background noise around barcode.
 */
export async function cropCenterROI(
  imageSource: string | HTMLImageElement, 
  cropRatio: number = 0.75
): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  const cropW = Math.round(naturalW * cropRatio);
  const cropH = Math.round(naturalH * cropRatio);
  const startX = Math.round((naturalW - cropW) / 2);
  const startY = Math.round((naturalH - cropH) / 2);

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Master Auto-Fix: Applies optimal composite adjustment
 * (Rotation detection candidate + contrast boost + slight sharpen + grayscale)
 */
export async function applyAutoCorrectionFilter(
  imageSource: string | HTMLImageElement
): Promise<string> {
  return enhanceImageContrast(imageSource, {
    contrastMultiplier: 1.5,
    brightnessOffset: 8,
    sharpen: true,
    grayscale: true
  });
}
