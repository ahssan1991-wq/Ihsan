/**
 * EMIS Industrial Barcode Engine (Code 128-B)
 * Pure TypeScript & SVG implementation for high-resolution thermal printing (203/300/600 DPI)
 * Zero external dependencies.
 */

// Code 128 pattern table (107 patterns, each 11 modules wide, stop pattern is 13 modules)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (106 is STOP)
];

const START_CODE_B = 104; // Subset B
const STOP_CODE = 106;

/**
 * Encodes an ASCII string into Code 128 Subset B values
 */
export function encodeCode128B(text: string): { widths: number[]; checksum: number; valid: boolean } {
  if (!text || text.length === 0) {
    return { widths: [], checksum: 0, valid: false };
  }

  // Sanitize text to ASCII range 32-126
  const clean = text.replace(/[^\x20-\x7E]/g, '-').slice(0, 48);

  const values: number[] = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const val = charCode - 32;
    values.push(val);
    checkSum += val * (i + 1);
  }

  const checkValue = checkSum % 103;
  values.push(checkValue);
  values.push(STOP_CODE);

  // Convert pattern strings into module widths
  const widths: number[] = [];
  for (const v of values) {
    const pat = CODE128_PATTERNS[v];
    if (pat) {
      for (let j = 0; j < pat.length; j++) {
        widths.push(parseInt(pat[j], 10));
      }
    }
  }

  return { widths, checksum: checkValue, valid: true };
}

export interface BarcodeSVGOptions {
  height?: number;
  barWidth?: number;
  includeText?: boolean;
  quietZone?: number;
  textColor?: string;
  barColor?: string;
  backgroundColor?: string;
}

/**
 * Generates an SVG string representation of Code 128 barcode
 */
export function generateBarcodeSVG(text: string, options: BarcodeSVGOptions = {}): string {
  const {
    height = 50,
    barWidth = 2,
    includeText = true,
    quietZone = 10,
    textColor = '#000000',
    barColor = '#000000',
    backgroundColor = '#ffffff'
  } = options;

  const { widths, valid } = encodeCode128B(text);
  if (!valid || widths.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="${height}"><text x="10" y="25" fill="red" font-size="12">Invalid Code</text></svg>`;
  }

  // Calculate total modules
  const totalModules = widths.reduce((acc, w) => acc + w, 0);
  const totalWidth = totalModules * barWidth + quietZone * 2;
  const totalHeight = includeText ? height + 16 : height;

  let currentX = quietZone;
  let isBar = true;
  const rects: string[] = [];

  for (const w of widths) {
    const wPx = w * barWidth;
    if (isBar) {
      rects.push(`<rect x="${currentX}" y="0" width="${wPx}" height="${height}" fill="${barColor}" />`);
    }
    currentX += wPx;
    isBar = !isBar;
  }

  const textElement = includeText
    ? `<text x="${totalWidth / 2}" y="${height + 13}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="${textColor}" letter-spacing="1">${text}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
    <rect width="${totalWidth}" height="${totalHeight}" fill="${backgroundColor}" />
    ${rects.join('')}
    ${textElement}
  </svg>`;
}
