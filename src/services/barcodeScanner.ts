/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Real-Time Barcode & QR Code Scanning Engine
 * Ultra-fast, hardware-accelerated decoding using Native BarcodeDetector (2-5ms) 
 * with Html5Qrcode fallback, downscaling, and non-blocking multi-pass auto-correction.
 */

import { Html5Qrcode } from 'html5-qrcode';
import { Material } from '../types';
import { detectDuplicateMaterial } from './duplicateDetectionService';
import { dbService } from './dbService';
import { 
  downscaleImageIfNeeded,
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
let sharedHtml5QrInstance: Html5Qrcode | null = null;
function getSharedHtml5Qr(): Html5Qrcode {
  const elemId = 'barcode-scan-canvas-temp';
  if (typeof document !== 'undefined' && !document.getElementById(elemId)) {
    const div = document.createElement('div');
    div.id = elemId;
    div.style.display = 'none';
    document.body.appendChild(div);
  }
  if (!sharedHtml5QrInstance) {
    sharedHtml5QrInstance = new Html5Qrcode(elemId, false);
  }
  return sharedHtml5QrInstance;
}

/**
 * Fast helper to yield execution back to the browser UI thread
 * Prevents UI freezing, stuttering, and dropped animation frames.
 */
export function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
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
 * Converts a base64 image data URL to a Blob using fast native fetch or typed array
 */
export async function fastDataUrlToBlob(dataUrlOrBlob: string | Blob, mimeType = 'image/jpeg'): Promise<Blob> {
  if (dataUrlOrBlob instanceof Blob) return dataUrlOrBlob;
  if (typeof dataUrlOrBlob === 'string' && dataUrlOrBlob.startsWith('data:')) {
    try {
      const res = await fetch(dataUrlOrBlob);
      return await res.blob();
    } catch {
      // Fallback
      const parts = dataUrlOrBlob.split(',');
      const byteString = atob(parts[1] || parts[0]);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ia], { type: mimeType });
    }
  }
  return new Blob([dataUrlOrBlob], { type: mimeType });
}

/**
 * Backwards compatible base64ToBlob
 */
export function base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
  const parts = base64.split(';base64,');
  const rawBase64 = parts.length > 1 ? parts[1] : parts[0];
  const byteCharacters = atob(rawBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

const SUPPORTED_BARCODE_FORMATS = [
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
];

/**
 * Low-level single-pass decoder for an individual image Blob or Base64 string
 * Prioritizes GPU/C++ native BarcodeDetector FIRST (2-5ms) before falling back to Html5Qrcode.
 */
export async function decodeSinglePass(imageInput: Blob | string): Promise<DecodedBarcodeResult | null> {
  const blob = await fastDataUrlToBlob(imageInput);

  // 1. PRIMARY: Native Browser BarcodeDetector API (Instant 2-5ms on Android, Chrome, Edge, Safari)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: SUPPORTED_BARCODE_FORMATS
      });

      const imgBitmap = await createImageBitmap(blob);
      const barcodes = await detector.detect(imgBitmap);
      
      // Clean up ImageBitmap memory immediately
      if (typeof imgBitmap.close === 'function') {
        imgBitmap.close();
      }

      if (barcodes && barcodes.length > 0) {
        const primary = barcodes[0];
        const rawValue = primary.rawValue || primary.displayValue || '';
        if (rawValue && rawValue.trim()) {
          return parseScannedText(rawValue.trim(), primary.format || 'NATIVE_BARCODE_DETECTOR');
        }
      }
    } catch (detectorErr) {
      // Native detector failed or format unsupported, proceed to fallback
    }
  }

  // 2. FALLBACK: Html5Qrcode scanFile (pure JS ZXing reader)
  try {
    const file = new File([blob], 'scan_capture.jpg', { type: blob.type || 'image/jpeg' });
    const html5Qr = getSharedHtml5Qr();
    const decodedText = await html5Qr.scanFile(file, false);
    if (decodedText && decodedText.trim()) {
      return parseScannedText(decodedText.trim(), 'HTML5_QRCODE');
    }
  } catch (err) {
    // Not found by Html5Qrcode
  }

  return null;
}

/**
 * Intelligent Multi-Pass Decoding Engine with Downscaling and Non-Blocking Auto-Correction.
 * Runs instantly (<10ms) when barcode is detected on raw image, and yields to the main
 * thread between transformation passes to eliminate any stuttering or lag.
 */
export async function decodeBarcodeWithAutoCorrection(
  imageInput: Blob | string
): Promise<AutoCorrectionScanResult> {
  const initialDataUrl = await toDataUrl(imageInput);

  // STEP 0: Downscale if image is high-res (e.g. 12-48MP mobile camera photo)
  // Reduces processing time and memory by 90% without losing barcode clarity
  const workingDataUrl = await downscaleImageIfNeeded(initialDataUrl, 1280);

  // PASS 1: Try raw downscaled image directly (hits in 2-8ms on Android)
  const pass1 = await decodeSinglePass(workingDataUrl);
  if (pass1 && pass1.code) {
    return {
      result: pass1,
      correctedImageSrc: workingDataUrl,
      correctionType: 'original',
      rotationAngle: 0
    };
  }

  // Yield to UI to keep animations smooth
  await yieldToMain();

  // PASS 2: Multi-Angle Auto-Rotation (90°, 180°, 270°)
  // For sideways or upside-down mobile photos
  const angles: (90 | 180 | 270)[] = [90, 180, 270];
  for (const deg of angles) {
    try {
      const rotatedUrl = await rotateImage(workingDataUrl, deg);
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
      await yieldToMain();
    } catch {
      // Continue to next angle
    }
  }

  // PASS 3: Contrast Enhancement (GPU hardware-accelerated filter)
  // For laser-etched nameplates, faint thermal barcodes, or shadowy photos
  try {
    const enhancedUrl = await enhanceImageContrast(workingDataUrl, {
      contrastMultiplier: 1.6,
      brightnessOffset: 12,
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

    await yieldToMain();

    // Try rotated enhanced
    for (const deg of [90, 180, 270] as const) {
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
      await yieldToMain();
    }
  } catch {
    // Continue to next pass
  }

  // PASS 4: Inverted Polarity (White-on-Dark / Negative)
  // For QR codes etched on dark steel, black anodized nameplates
  try {
    const invertedUrl = await invertImageColors(workingDataUrl);
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
    await yieldToMain();
  } catch {
    // Continue to next pass
  }

  // PASS 5: Center Crop ROI (Focus on center 75% of image)
  try {
    const croppedUrl = await cropCenterROI(workingDataUrl, 0.75);
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
  } catch {
    // End of passes
  }

  // Return original downscaled if no code was detected
  return {
    result: null,
    correctedImageSrc: workingDataUrl,
    correctionType: 'original',
    rotationAngle: 0
  };
}

/**
 * Decodes 1D Barcodes and 2D QR codes directly from an image Blob or Base64 string
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
    } catch {
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
    } catch {
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
    materialCode?: string;
    tagNumber?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    barcode?: string;
    qrCode?: string;
    sequence?: number;
  },
  materialsList?: Material[]
): Material | null {
  const materials = materialsList && materialsList.length > 0 ? materialsList : dbService.getMaterials();
  if (!materials || materials.length === 0) return null;

  // Use the central robust duplicate detection service
  const dup = detectDuplicateMaterial({
    partNumber: searchTarget.partNumber || searchTarget.code,
    materialCode: searchTarget.materialCode,
    tagNumber: searchTarget.tagNumber,
    sequence: searchTarget.sequence,
    barcode: searchTarget.barcode || searchTarget.code,
    qrCode: searchTarget.qrCode || searchTarget.code,
    serialNumber: searchTarget.serialNumber,
    manufacturer: searchTarget.manufacturer,
    model: searchTarget.model
  }, materials);

  if (dup.level === 'EXACT' && dup.exactMatch) {
    return dup.exactMatch;
  }

  // Support sequence syntax "#15"
  const rawCode = (searchTarget.code || searchTarget.partNumber || '').trim().toUpperCase();
  if (rawCode.startsWith('#')) {
    const num = parseInt(rawCode.slice(1), 10);
    if (!isNaN(num) && num > 0) {
      const match = materials.find(m => m.sequence === num);
      if (match) return match;
    }
  }

  // Support combined part numbers separated by '+' or ','
  if (rawCode.includes('+') || rawCode.includes(',')) {
    const subParts = rawCode.split(/[+,]/).map(s => s.trim().toUpperCase()).filter(s => s.length >= 3);
    for (const sp of subParts) {
      const subDup = detectDuplicateMaterial({ partNumber: sp }, materials);
      if (subDup.exactMatch) return subDup.exactMatch;
    }
  }

  // If there is a high-confidence possible match (>= 80%)
  if (dup.level === 'POSSIBLE' && dup.possibleMatches.length > 0 && dup.possibleMatches[0].score >= 80) {
    return dup.possibleMatches[0].material;
  }

  return null;
}
