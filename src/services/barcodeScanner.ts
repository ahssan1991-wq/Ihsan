/**
 * Real-Time Barcode & QR Code Scanning Engine
 * Uses local fast decoders (Html5Qrcode, Native BarcodeDetector) to decode codes in milliseconds offline.
 */

import { Html5Qrcode } from 'html5-qrcode';
import { Material } from '../types';
import { 
  rotateImage, 
  enhanceImageContrast, 
  invertImageColors, 
  cropCenterROI,
  applyAutoCorrectionFilter 
} from './imageScanOptimizer';

export interface DecodedBarcodeResult {
  code: string;
  format?: string;
  parsedFields?: Record<string, string | null>;
}

export interface AutoCorrectionScanResult {
  result: DecodedBarcodeResult | null;
  correctedImageSrc: string;
  appliedCorrection?: string;
  correctionType?: 'original' | 'rotation-90' | 'rotation-180' | 'rotation-270' | 'contrast-enhancement' | 'inverted-polarity' | 'center-roi';
  rotationAngle?: number;
}

/**
 * Ensures the hidden scratch element required by Html5Qrcode exists in the DOM
 */
function ensureTempScanElement(): string {
  const elemId = 'barcode-scan-canvas-temp';
  if (typeof document !== 'undefined' && !document.getElementById(elemId)) {
    const div = document.createElement('div');
    div.id = elemId;
    div.style.display = 'none';
    document.body.appendChild(div);
  }
  return elemId;
}

/**
 * Helper to ensure a data URL string from Blob or string
 */
export function toDataUrl(input: Blob | string): Promise<string> {
  if (typeof input === 'string') return Promise.resolve(input);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });
}

/**
 * Converts a base64 image data URL to a Blob
 */
export function base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
  const parts = base64.split(';base64,');
  const rawBase64 = parts.length > 1 ? parts[1] : parts[0];
  const byteCharacters = atob(rawBase64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Low-level single-pass decoder for an individual image Blob or Base64 string
 */
export async function decodeSinglePass(imageInput: Blob | string): Promise<DecodedBarcodeResult | null> {
  const blob = typeof imageInput === 'string' ? base64ToBlob(imageInput) : imageInput;
  const file = new File([blob], 'scan_capture.jpg', { type: blob.type || 'image/jpeg' });
  ensureTempScanElement();

  // 1. Try Html5Qrcode scanFile (cross-platform offline barcode/QR reader)
  try {
    const html5Qr = new Html5Qrcode('barcode-scan-canvas-temp', false);
    const decodedText = await html5Qr.scanFile(file, false);
    if (decodedText && decodedText.trim()) {
      return parseScannedText(decodedText.trim(), 'HTML5_QRCODE');
    }
  } catch (err) {
    // Not found by Html5Qrcode or invalid format, proceed to fallback
  }

  // 2. Try native Browser BarcodeDetector API (if supported on Android/Chrome/Edge/Safari)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: [
          'qr_code',
          'code_128',
          'code_39',
          'code_93',
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'data_matrix',
          'itf',
          'aztec',
          'pdf417'
        ]
      });

      const imgBitmap = await createImageBitmap(blob);
      const barcodes = await barcodeDetector.detect(imgBitmap);

      if (barcodes && barcodes.length > 0) {
        const primary = barcodes[0];
        const rawValue = primary.rawValue || primary.displayValue || '';
        if (rawValue.trim()) {
          return parseScannedText(rawValue.trim(), primary.format || 'BARCODE_DETECTOR');
        }
      }
    } catch (detectorErr) {
      // Barcode detector error or unsupported format
    }
  }

  return null;
}

/**
 * Intelligent Multi-Pass Decoding Engine with Automatic Shape, Orientation, and Contrast Correction.
 * If the image is tilted, upside down, low contrast, or inverted, this engine automatically
 * recognizes the code and modifies/re-orients the image.
 */
export async function decodeBarcodeWithAutoCorrection(
  imageInput: Blob | string
): Promise<AutoCorrectionScanResult> {
  const initialDataUrl = await toDataUrl(imageInput);

  // PASS 1: Try raw original image directly
  const pass1 = await decodeSinglePass(initialDataUrl);
  if (pass1 && pass1.code) {
    return {
      result: pass1,
      correctedImageSrc: initialDataUrl,
      correctionType: 'original',
      rotationAngle: 0
    };
  }

  // PASS 2: Multi-Angle Auto-Rotation (90°, 180°, 270°)
  // Essential for mobile portrait uploads or sideways scanned labels
  const angles: (90 | 180 | 270)[] = [90, 180, 270];
  for (const deg of angles) {
    try {
      const rotatedUrl = await rotateImage(initialDataUrl, deg);
      const res = await decodeSinglePass(rotatedUrl);
      if (res && res.code) {
        return {
          result: res,
          correctedImageSrc: rotatedUrl,
          appliedCorrection: `تم تدوير الصورة تلقائياً بمقدار ${deg}° وضبط الاتجاه الصحيح للرمز`,
          correctionType: `rotation-${deg}` as any,
          rotationAngle: deg
        };
      }
    } catch (e) {
      // Continue to next angle
    }
  }

  // PASS 3: Contrast Enhancement + Sharpening (Normal & Rotated)
  // Essential for laser-etched nameplates, faint thermal barcodes, or shadowy photos
  try {
    const enhancedUrl = await enhanceImageContrast(initialDataUrl, {
      contrastMultiplier: 1.55,
      brightnessOffset: 10,
      sharpen: true,
      grayscale: true
    });

    const resEnhanced = await decodeSinglePass(enhancedUrl);
    if (resEnhanced && resEnhanced.code) {
      return {
        result: resEnhanced,
        correctedImageSrc: enhancedUrl,
        appliedCorrection: 'تم تحسين التباين والحدة وإزالة التشويش تلقائياً لقراءة الرمز',
        correctionType: 'contrast-enhancement',
        rotationAngle: 0
      };
    }

    // Try enhanced image rotated at 90, 180, 270
    for (const deg of angles) {
      const rotatedEnhanced = await rotateImage(enhancedUrl, deg);
      const res = await decodeSinglePass(rotatedEnhanced);
      if (res && res.code) {
        return {
          result: res,
          correctedImageSrc: rotatedEnhanced,
          appliedCorrection: `تم تحسين التباين وتدوير الصورة ${deg}° تلقائياً`,
          correctionType: 'contrast-enhancement',
          rotationAngle: deg
        };
      }
    }
  } catch (e) {
    // Continue to next pass
  }

  // PASS 4: Inverted Polarity (White-on-Dark / Negative)
  // For QR codes etched on dark steel, black anodized nameplates, or negative data matrices
  try {
    const invertedUrl = await invertImageColors(initialDataUrl);
    const resInverted = await decodeSinglePass(invertedUrl);
    if (resInverted && resInverted.code) {
      return {
        result: resInverted,
        correctedImageSrc: invertedUrl,
        appliedCorrection: 'تم عكس تباين الألوان (Dark/Negative Polarity) والتعرف على الرمز',
        correctionType: 'inverted-polarity',
        rotationAngle: 0
      };
    }

    for (const deg of angles) {
      const rotatedInverted = await rotateImage(invertedUrl, deg);
      const res = await decodeSinglePass(rotatedInverted);
      if (res && res.code) {
        return {
          result: res,
          correctedImageSrc: rotatedInverted,
          appliedCorrection: `تم عكس ألوان الرمز وتدوير الصورة ${deg}° تلقائياً`,
          correctionType: 'inverted-polarity',
          rotationAngle: deg
        };
      }
    }
  } catch (e) {
    // Continue to next pass
  }

  // PASS 5: Center Crop ROI (Focus on center 75% of image)
  // If the photo was taken with excess busy background
  try {
    const croppedUrl = await cropCenterROI(initialDataUrl, 0.75);
    const resCropped = await decodeSinglePass(croppedUrl);
    if (resCropped && resCropped.code) {
      return {
        result: resCropped,
        correctedImageSrc: croppedUrl,
        appliedCorrection: 'تم التركيز على المنطقة المركزية للرمز وعزل الخلفية تلقائياً',
        correctionType: 'center-roi',
        rotationAngle: 0
      };
    }

    for (const deg of angles) {
      const rotatedCropped = await rotateImage(croppedUrl, deg);
      const res = await decodeSinglePass(rotatedCropped);
      if (res && res.code) {
        return {
          result: res,
          correctedImageSrc: rotatedCropped,
          appliedCorrection: `تم التركيز على منطقة الرمز وتدويرها ${deg}° تلقائياً`,
          correctionType: 'center-roi',
          rotationAngle: deg
        };
      }
    }
  } catch (e) {
    // End of passes
  }

  // Return original if no code was detected
  return {
    result: null,
    correctedImageSrc: initialDataUrl,
    correctionType: 'original',
    rotationAngle: 0
  };
}

/**
 * Decodes 1D Barcodes and 2D QR codes directly from an image Blob or Base64 string
 * (Maintains backwards compatibility while using the auto-correction engine)
 */
export async function decodeBarcodeFromImage(imageInput: Blob | string): Promise<DecodedBarcodeResult | null> {
  const autoResult = await decodeBarcodeWithAutoCorrection(imageInput);
  return autoResult.result;
}

/**
 * Parses raw barcode/QR string into structured attributes
 */
export function parseScannedText(rawText: string, format?: string): DecodedBarcodeResult {
  const text = rawText.trim();
  const parsedFields: Record<string, string | null> = {};

  // Check if it's JSON formatted data
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const obj = JSON.parse(text);
      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          parsedFields[key] = String(obj[key]);
        });

        const partNum = obj.partNumber || obj.partNo || obj.part_number || obj.sku || obj.code || obj.id || text;
        return {
          code: String(partNum),
          format: format || 'JSON_PAYLOAD',
          parsedFields
        };
      }
    } catch (e) {
      // Not valid JSON
    }
  }

  // Check if it's a URL with part number query param or deep link
  if (text.includes('?') && (text.includes('part=') || text.includes('sku=') || text.includes('id='))) {
    try {
      const url = new URL(text.startsWith('http') ? text : `https://${text}`);
      const partParam = url.searchParams.get('part') || url.searchParams.get('sku') || url.searchParams.get('id') || url.searchParams.get('q');
      if (partParam) {
        parsedFields.partNumber = decodeURIComponent(partParam);
        return {
          code: decodeURIComponent(partParam),
          format: format || 'DEEP_LINK_URL',
          parsedFields
        };
      }
    } catch (e) {
      // URL parsing failed
    }
  }

  // Check if it's a key-value delimited string (e.g., "PART:3051S;SN:49202;MFG:Rosemount")
  if (text.includes(':') && (text.includes(';') || text.includes(','))) {
    const pairs = text.split(/[;,]/);
    pairs.forEach(pair => {
      const [k, v] = pair.split(':');
      if (k && v) {
        const key = k.trim().toLowerCase();
        const val = v.trim();
        if (key === 'part' || key === 'partnumber' || key === 'sku') parsedFields.partNumber = val;
        else if (key === 'sn' || key === 'serial' || key === 'serialnumber') parsedFields.serialNumber = val;
        else if (key === 'mfg' || key === 'maker' || key === 'manufacturer') parsedFields.manufacturer = val;
        else if (key === 'model' || key === 'mod') parsedFields.model = val;
        else parsedFields[key] = val;
      }
    });

    if (parsedFields.partNumber) {
      return {
        code: parsedFields.partNumber,
        format: format || 'KEY_VALUE_TAG',
        parsedFields
      };
    }
  }

  // Default: Return raw string as code
  parsedFields.partNumber = text;
  parsedFields.barcode = text;
  parsedFields.qrCode = text;

  return {
    code: text,
    format: format || 'RAW_CODE',
    parsedFields
  };
}

/**
 * Searches inventory catalog materials for a match against scanned QR/barcode/nameplate data
 */
export function lookupMaterialInCatalog(
  searchTarget: {
    code?: string;
    partNumber?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    barcode?: string;
    qrCode?: string;
    sequence?: number;
  },
  materialsList: Material[]
): Material | null {
  if (!materialsList || materialsList.length === 0) return null;

  const targetCode = (searchTarget.code || searchTarget.partNumber || searchTarget.barcode || searchTarget.qrCode || '').trim().toUpperCase();
  const targetSerial = (searchTarget.serialNumber || '').trim().toUpperCase();
  const targetMfg = (searchTarget.manufacturer || '').trim().toUpperCase();
  const targetModel = (searchTarget.model || '').trim().toUpperCase();
  const targetSeq = searchTarget.sequence;

  if (!targetCode && !targetSerial && !targetMfg && !targetModel && !targetSeq) {
    return null;
  }

  // 1. Match by Sequence Number if specified
  if (targetSeq !== undefined && targetSeq > 0) {
    const seqMatch = materialsList.find(m => m.sequence === targetSeq);
    if (seqMatch) return seqMatch;
  }

  // Check if targetCode is like "#15" or numeric sequence
  if (targetCode.startsWith('#')) {
    const num = parseInt(targetCode.slice(1));
    if (!isNaN(num) && num > 0) {
      const match = materialsList.find(m => m.sequence === num);
      if (match) return match;
    }
  }

  // 2. Match by exact Part Number
  if (targetCode) {
    const partMatch = materialsList.find(m => m.partNumber.trim().toUpperCase() === targetCode);
    if (partMatch) return partMatch;
  }

  // 3. Match by Serial Number (direct field or in serialNumbers array)
  if (targetSerial || targetCode) {
    const snToSearch = targetSerial || targetCode;
    const serialMatch = materialsList.find(m => {
      const directMatch = m.serialNumber && m.serialNumber.trim().toUpperCase() === snToSearch;
      const arrayMatch = m.serialNumbers?.some(sn => sn.serialNumber.trim().toUpperCase() === snToSearch);
      return directMatch || arrayMatch;
    });
    if (serialMatch) return serialMatch;
  }

  // 4. Match by Barcode / QR Code in notes or specs
  if (targetCode) {
    const notesMatch = materialsList.find(m => {
      return (
        (m.notes && m.notes.toUpperCase().includes(targetCode)) ||
        (m.engineeringNotes && m.engineeringNotes.toUpperCase().includes(targetCode))
      );
    });
    if (notesMatch) return notesMatch;
  }

  // 5. Match by exact Manufacturer + Model
  if (targetMfg && targetModel) {
    const mfgModelMatch = materialsList.find(m => 
      m.manufacturer.trim().toUpperCase() === targetMfg &&
      m.model.trim().toUpperCase() === targetModel
    );
    if (mfgModelMatch) return mfgModelMatch;
  }

  return null;
}
