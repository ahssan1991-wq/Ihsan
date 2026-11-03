/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Material } from '../types';
import { dbService } from './dbService';

export type DuplicateMatchLevel = 'EXACT' | 'POSSIBLE' | 'NONE';

export interface DuplicateMatchReason {
  field: 'partNumber' | 'materialCode' | 'tagNumber' | 'sequence' | 'barcode' | 'qrCode' | 'serialNumber' | 'manufacturerModel' | 'description';
  descriptionAr: string;
  descriptionEn: string;
  matchedValue: string;
}

export interface DuplicateDetectionResult {
  level: DuplicateMatchLevel;
  exactMatch: Material | null;
  possibleMatches: Array<{
    material: Material;
    score: number; // 0 to 100
    reasons: DuplicateMatchReason[];
  }>;
  reasons: DuplicateMatchReason[];
}

export interface MaterialCandidateInput {
  partNumber?: string | null;
  materialCode?: string | null;
  tagNumber?: string | null;
  sequence?: number | string | null;
  barcode?: string | null;
  qrCode?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  description?: string | null;
  id?: string | null;
}

/**
 * Normalizes identifier strings safely:
 * - Trims whitespace
 * - Converts to uppercase
 * - Strips common industrial prefixes (P/N, PN, S/N, SN, TAG, etc.)
 * - PRESERVES meaningful leading zeros (e.g., '00124' is preserved!)
 */
export function normalizeIdentifier(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .toUpperCase()
    .replace(/^(?:P\/N|P-N|PN|PART\s*NO|PART\s*#|S\/N|S-N|SN|SERIAL\s*NO|TAG\s*#|TAG)[\s:_-]+/i, '')
    .trim();
}

/**
 * Removes punctuation, spaces, and hyphens while preserving characters and leading zeros.
 * Used for resilient matching (e.g. "6204-2Z" matches "6204 2Z" or "62042Z").
 */
export function normalizePunctuationFree(val?: string | null): string {
  const norm = normalizeIdentifier(val);
  if (!norm) return '';
  return norm.replace(/[\s\-_/\\#.,:;()]/g, '');
}

/**
 * Checks if a part number is temporary / unassigned
 */
export function isTemporaryOrUnassigned(pn?: string | null): boolean {
  if (!pn) return true;
  const upper = pn.trim().toUpperCase();
  return (
    upper === '' ||
    upper === 'N/A' ||
    upper === 'NONE' ||
    upper.startsWith('TEMP-') ||
    upper.startsWith('TEMP_') ||
    upper.startsWith('AUTOPN-') ||
    upper.includes('بدون') ||
    upper.includes('غير محدد')
  );
}

/**
 * Checks if manufacturer or model is generic
 */
function isGenericText(val?: string | null): boolean {
  if (!val) return true;
  const upper = val.trim().toUpperCase();
  return (
    upper === '' ||
    upper === 'N/A' ||
    upper === 'NA' ||
    upper === 'NONE' ||
    upper === 'OTHER' ||
    upper === 'UNKNOWN' ||
    upper === 'GENERIC' ||
    upper === 'عام' ||
    upper === 'غير معروف'
  );
}

/**
 * Calculates string similarity score between 0 and 100
 */
export function calculateSimilarityScore(str1: string, str2: string): number {
  const a = str1.trim().toLowerCase();
  const b = str2.trim().toLowerCase();
  if (a === b) return 100;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    return Math.round((minLen / maxLen) * 90);
  }

  // Token-based Jaccard similarity for multi-word descriptions
  const tokensA = new Set(a.split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(b.split(/\s+/).filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach(t => {
    if (tokensB.has(t)) intersection++;
  });
  const union = new Set([...tokensA, ...tokensB]).size;
  return Math.round((intersection / union) * 100);
}

/**
 * Central, production-grade Duplicate Detection Service
 * Evaluates candidate material against the authoritative persisted material dataset.
 */
export function detectDuplicateMaterial(
  candidate: MaterialCandidateInput,
  existingDataset?: Material[]
): DuplicateDetectionResult {
  // Always query latest persisted dataset if not provided
  const materials = existingDataset || dbService.getMaterials();

  const cPart = normalizeIdentifier(candidate.partNumber);
  const cPartClean = normalizePunctuationFree(candidate.partNumber);
  const cMatCode = normalizeIdentifier(candidate.materialCode);
  const cTag = normalizeIdentifier(candidate.tagNumber);
  const cBarcode = normalizeIdentifier(candidate.barcode);
  const cQr = normalizeIdentifier(candidate.qrCode);
  const cSerial = normalizeIdentifier(candidate.serialNumber);
  const cMfg = normalizeIdentifier(candidate.manufacturer);
  const cModel = normalizeIdentifier(candidate.model);
  const cModelClean = normalizePunctuationFree(candidate.model);
  const cSeq = typeof candidate.sequence === 'number' 
    ? candidate.sequence 
    : (candidate.sequence ? parseInt(String(candidate.sequence).replace(/[^0-9]/g, ''), 10) : undefined);
  const excludeId = candidate.id;

  const isCPartTemp = isTemporaryOrUnassigned(cPart);
  const isCMfgGeneric = isGenericText(cMfg);
  const isCModelGeneric = isGenericText(cModel);

  // 1. Check for EXACT DUPLICATE
  for (const m of materials) {
    if (excludeId && m.id && m.id === excludeId) continue;

    const mPart = normalizeIdentifier(m.partNumber);
    const mPartClean = normalizePunctuationFree(m.partNumber);
    const mMatCode = normalizeIdentifier(m.materialCode);
    const mTag = normalizeIdentifier(m.tagNumber);
    const mBarcode = normalizeIdentifier(m.barcode);
    const mQr = normalizeIdentifier(m.qrCode);
    const mMfg = normalizeIdentifier(m.manufacturer);
    const mModel = normalizeIdentifier(m.model);
    const mModelClean = normalizePunctuationFree(m.model);
    const isMPartTemp = isTemporaryOrUnassigned(mPart);

    // Exact Match 1: Non-temporary Part Number match
    if (!isCPartTemp && !isMPartTemp && cPart.length >= 2) {
      if (cPart === mPart || (cPartClean.length >= 4 && cPartClean === mPartClean)) {
        return {
          level: 'EXACT',
          exactMatch: m,
          possibleMatches: [],
          reasons: [
            {
              field: 'partNumber',
              descriptionAr: `تطابق تام في رقم القطعة / Part Number: (${m.partNumber})`,
              descriptionEn: `Exact match on Part Number: (${m.partNumber})`,
              matchedValue: m.partNumber
            }
          ]
        };
      }
    }

    // Exact Match 2: Material Code / ERP Code match
    if (cMatCode && mMatCode && cMatCode.length >= 3 && cMatCode === mMatCode) {
      return {
        level: 'EXACT',
        exactMatch: m,
        possibleMatches: [],
        reasons: [
          {
            field: 'materialCode',
            descriptionAr: `تطابق تام في رمز المادة / Material Code: (${m.materialCode})`,
            descriptionEn: `Exact match on Material Code: (${m.materialCode})`,
            matchedValue: m.materialCode || cMatCode
          }
        ]
      };
    }

    // Exact Match 3: Physical Equipment Tag Number match
    if (cTag && mTag && cTag.length >= 3 && cTag === mTag) {
      return {
        level: 'EXACT',
        exactMatch: m,
        possibleMatches: [],
        reasons: [
          {
            field: 'tagNumber',
            descriptionAr: `تطابق تام في رقم بطاقة المعدة (التاغ) / Tag Number: (${m.tagNumber})`,
            descriptionEn: `Exact match on Tag Number: (${m.tagNumber})`,
            matchedValue: m.tagNumber || cTag
          }
        ]
      };
    }

    // Exact Match 4: Barcode or QR Code match
    if (cBarcode && ((mBarcode && cBarcode === mBarcode) || (mQr && cBarcode === mQr))) {
      return {
        level: 'EXACT',
        exactMatch: m,
        possibleMatches: [],
        reasons: [
          {
            field: 'barcode',
            descriptionAr: `تطابق في رمز الباركود / Barcode: (${cBarcode})`,
            descriptionEn: `Exact match on Barcode: (${cBarcode})`,
            matchedValue: cBarcode
          }
        ]
      };
    }
    if (cQr && ((mQr && cQr === mQr) || (mBarcode && cQr === mBarcode))) {
      return {
        level: 'EXACT',
        exactMatch: m,
        possibleMatches: [],
        reasons: [
          {
            field: 'qrCode',
            descriptionAr: `تطابق في رمز الاستجابة السريعة / QR Code: (${cQr})`,
            descriptionEn: `Exact match on QR Code: (${cQr})`,
            matchedValue: cQr
          }
        ]
      };
    }

    // Exact Match 5: Non-generic Manufacturer + Non-generic Model match
    if (!isCMfgGeneric && !isCModelGeneric && cMfg.length >= 3 && cModelClean.length >= 3) {
      if (cMfg === mMfg && (cModel === mModel || (cModelClean.length >= 4 && cModelClean === mModelClean))) {
        return {
          level: 'EXACT',
          exactMatch: m,
          possibleMatches: [],
          reasons: [
            {
              field: 'manufacturerModel',
              descriptionAr: `تطابق تام في الشركة المصنعة والطراز / Model (${m.manufacturer} - ${m.model})`,
              descriptionEn: `Exact match on Manufacturer & Model (${m.manufacturer} - ${m.model})`,
              matchedValue: `${m.manufacturer} - ${m.model}`
            }
          ]
        };
      }
    }

    // Exact Match 6: Serial Number (if distinct and matches existing serials)
    if (cSerial && cSerial.length >= 4 && !isGenericText(cSerial)) {
      const directSerial = m.serialNumber && normalizeIdentifier(m.serialNumber) === cSerial;
      const arraySerial = m.serialNumbers?.some(sn => normalizeIdentifier(sn.serialNumber) === cSerial);
      if (directSerial || arraySerial) {
        return {
          level: 'EXACT',
          exactMatch: m,
          possibleMatches: [],
          reasons: [
            {
              field: 'serialNumber',
              descriptionAr: `تطابق في الرقم التسلسلي للمعدة / Serial Number: (${cSerial})`,
              descriptionEn: `Exact match on Serial Number: (${cSerial})`,
              matchedValue: cSerial
            }
          ]
        };
      }
    }
  }

  // 2. Check for POSSIBLE DUPLICATES (Similarity / Ambiguous Matches)
  const possibleCandidates: Array<{
    material: Material;
    score: number;
    reasons: DuplicateMatchReason[];
  }> = [];

  for (const m of materials) {
    if (excludeId && m.id && m.id === excludeId) continue;

    const reasons: DuplicateMatchReason[] = [];
    let totalScore = 0;

    const mPart = normalizeIdentifier(m.partNumber);
    const mPartClean = normalizePunctuationFree(m.partNumber);
    const mMfg = normalizeIdentifier(m.manufacturer);
    const mModel = normalizeIdentifier(m.model);
    const mModelClean = normalizePunctuationFree(m.model);

    // A. Substring Part Number match
    if (!isCPartTemp && !isTemporaryOrUnassigned(mPart) && cPart.length >= 4 && mPart.length >= 4) {
      if (cPart.includes(mPart) || mPart.includes(cPart)) {
        totalScore += 65;
        reasons.push({
          field: 'partNumber',
          descriptionAr: `تشابه جزئي في رقم القطعة: ${m.partNumber}`,
          descriptionEn: `Partial Part Number similarity: ${m.partNumber}`,
          matchedValue: m.partNumber
        });
      }
    }

    // B. Same Manufacturer, similar Model
    if (!isCMfgGeneric && cMfg === mMfg && cModelClean && mModelClean) {
      const modelSim = calculateSimilarityScore(cModelClean, mModelClean);
      if (modelSim >= 60) {
        totalScore += 50;
        reasons.push({
          field: 'manufacturerModel',
          descriptionAr: `نفس المصنع (${m.manufacturer}) مع طراز متقارب (${m.model})`,
          descriptionEn: `Same manufacturer (${m.manufacturer}) with similar model (${m.model})`,
          matchedValue: `${m.manufacturer} ${m.model}`
        });
      }
    }

    // C. Description Similarity
    if (candidate.description && m.description) {
      const descSim = calculateSimilarityScore(candidate.description, m.description);
      if (descSim >= 70) {
        totalScore += 35;
        reasons.push({
          field: 'description',
          descriptionAr: `تشابه كبير في المواصفات والوصف الفني (${descSim}%)`,
          descriptionEn: `High technical description similarity (${descSim}%)`,
          matchedValue: m.description
        });
      }
    }

    if (totalScore >= 50) {
      possibleCandidates.push({
        material: m,
        score: Math.min(99, totalScore),
        reasons
      });
    }
  }

  if (possibleCandidates.length > 0) {
    // Sort highest score first
    possibleCandidates.sort((a, b) => b.score - a.score);
    return {
      level: 'POSSIBLE',
      exactMatch: null,
      possibleMatches: possibleCandidates.slice(0, 5),
      reasons: possibleCandidates[0].reasons
    };
  }

  // 3. NEW MATERIAL
  return {
    level: 'NONE',
    exactMatch: null,
    possibleMatches: [],
    reasons: []
  };
}

/**
 * Calculates the next suggested sequence from the authoritative database.
 * Never relies on currently paginated or filtered views.
 */
export function getAuthoritativeSuggestedSequence(existingMaterials?: Material[]): number {
  const materials = existingMaterials || dbService.getMaterials();
  const validSeqs = materials
    .map(m => m.sequence)
    .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);
  
  if (validSeqs.length === 0) return 1;
  const maxSeq = Math.max(...validSeqs);
  return maxSeq + 1;
}

/**
 * Validates whether a sequence number is available or already occupied.
 */
export function validateSequenceAvailability(
  requestedSequence: number,
  excludeMaterialId?: string,
  existingMaterials?: Material[]
): {
  isAvailable: boolean;
  conflictingMaterial?: Material;
  suggestedAlternative: number;
} {
  const materials = existingMaterials || dbService.getMaterials();
  const nextAvailable = getAuthoritativeSuggestedSequence(materials);

  if (!requestedSequence || isNaN(requestedSequence) || requestedSequence <= 0) {
    return {
      isAvailable: false,
      suggestedAlternative: nextAvailable
    };
  }

  const conflict = materials.find(m => {
    if (excludeMaterialId && m.id && m.id === excludeMaterialId) return false;
    return m.sequence !== undefined && m.sequence !== null && Number(m.sequence) === Number(requestedSequence);
  });

  if (conflict) {
    return {
      isAvailable: false,
      conflictingMaterial: conflict,
      suggestedAlternative: nextAvailable
    };
  }

  return {
    isAvailable: true,
    suggestedAlternative: requestedSequence
  };
}
