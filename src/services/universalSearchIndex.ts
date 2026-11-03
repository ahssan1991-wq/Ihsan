/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Material, WarehouseFile } from '../types';
import { dbService } from './dbService';
import { normalizeIdentifier, normalizePunctuationFree } from './duplicateDetectionService';

export interface UniversalSearchItem {
  id: string;
  materialId: string;
  fileId: string;
  fileName: string;
  warehouseName: string;
  sequence: number;
  partNumber: string;
  normalizedPartNumber: string;
  punctuationFreePartNumber: string;
  model: string;
  normalizedModel: string;
  serialNumber: string;
  normalizedSerialNumber: string;
  manufacturer: string;
  description: string;
  arabicDescription?: string;
  tagNumber?: string;
  location: string;
  quantity: number;
  unit: string;
  oemVerified: boolean;
  status: string;
  matchScore?: number;
  matchReasonAr?: string;
  matchReasonEn?: string;
  material: Material;
}

export interface UniversalSearchFilterOptions {
  fileId?: string; // Search within specific file or 'ALL'
  warehouse?: string; // Filter by warehouse name
  limit?: number; // Max results to return
}

let cachedIndex: UniversalSearchItem[] | null = null;
let lastIndexedTimestamp = 0;

/**
 * Builds or retrieves the fast indexed collection in memory.
 */
export function getUniversalSearchIndex(forceRebuild = false): UniversalSearchItem[] {
  const now = Date.now();
  if (!forceRebuild && cachedIndex && (now - lastIndexedTimestamp < 30000)) {
    return cachedIndex;
  }

  const materials = dbService.getMaterials();
  const files = dbService.getWarehouseFiles();
  const fileMap = new Map<string, WarehouseFile>();
  files.forEach(f => fileMap.set(f.id, f));

  const items: UniversalSearchItem[] = materials.map((m, idx) => {
    const file = m.fileId ? fileMap.get(m.fileId) : undefined;
    const fileId = m.fileId || 'wh-file-ndgs-master';
    const fileName = m.fileName || file?.name || file?.fileName || 'NDGS Instrument Materials';
    const warehouseName = m.store || file?.warehouseName || 'Main Store';
    const seq = typeof m.fileSequence === 'number' ? m.fileSequence : (typeof m.sequence === 'number' ? m.sequence : idx + 1);

    const normPn = normalizeIdentifier(m.partNumber);
    const puncFreePn = normalizePunctuationFree(m.partNumber);
    const normModel = normalizeIdentifier(m.model);
    const normSerial = normalizeIdentifier(m.serialNumber);

    return {
      id: m.id || `search-mat-${seq}-${idx}`,
      materialId: m.id || m.partNumber,
      fileId,
      fileName,
      warehouseName,
      sequence: seq,
      partNumber: m.partNumber || '',
      normalizedPartNumber: normPn,
      punctuationFreePartNumber: puncFreePn,
      model: m.model || '',
      normalizedModel: normModel,
      serialNumber: m.serialNumber || '',
      normalizedSerialNumber: normSerial,
      manufacturer: m.manufacturer || '',
      description: m.description || '',
      arabicDescription: m.arabicDescription,
      tagNumber: m.tagNumber,
      location: `${m.store || 'Store'} (R:${m.rack || '-'} S:${m.shelf || '-'})`,
      quantity: typeof m.quantity === 'number' ? m.quantity : 0,
      unit: m.unit || 'pcs',
      oemVerified: Boolean(m.oemVerified),
      status: m.status || (m.quantity > 0 ? 'Available' : 'Out of Stock'),
      material: m
    };
  });

  cachedIndex = items;
  lastIndexedTimestamp = now;
  return items;
}

/**
 * Invalidate index cache when materials or files change.
 */
export function invalidateUniversalSearchIndex(): void {
  cachedIndex = null;
  lastIndexedTimestamp = 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener('emis:materials-changed', () => invalidateUniversalSearchIndex());
  window.addEventListener('emis:material-added', () => invalidateUniversalSearchIndex());
  window.addEventListener('emis:material-deleted', () => invalidateUniversalSearchIndex());
  window.addEventListener('emis:warehouse-files-changed', () => invalidateUniversalSearchIndex());
}

/**
 * Searches across all warehouse files or within a selected file with fast token matching and scoring.
 * Preserves separate records if identical part exists in multiple files.
 */
export function searchUniversalCatalog(
  rawQuery: string,
  options: UniversalSearchFilterOptions = {}
): {
  items: UniversalSearchItem[];
  totalMatches: number;
  query: string;
  filesSearched: number;
} {
  const index = getUniversalSearchIndex();
  const query = (rawQuery || '').trim();
  const queryLower = query.toLowerCase();
  const queryNorm = normalizeIdentifier(query);
  const queryPuncFree = normalizePunctuationFree(query);
  const cleanNumeric = query.replace(/[^0-9]/g, '');

  const { fileId, warehouse, limit = 100 } = options;

  let candidates = index;

  // Filter by File if specified
  if (fileId && fileId !== 'ALL') {
    candidates = candidates.filter(item => item.fileId === fileId);
  }

  // Filter by Warehouse if specified
  if (warehouse && warehouse !== 'ALL') {
    candidates = candidates.filter(item => item.warehouseName.toLowerCase().includes(warehouse.toLowerCase()));
  }

  // If query is empty, return top items sorted by sequence
  if (!query) {
    const sorted = [...candidates].sort((a, b) => a.sequence - b.sequence).slice(0, limit);
    return {
      items: sorted,
      totalMatches: candidates.length,
      query: '',
      filesSearched: fileId && fileId !== 'ALL' ? 1 : new Set(candidates.map(c => c.fileId)).size
    };
  }

  const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 0);
  const matched: UniversalSearchItem[] = [];

  for (const item of candidates) {
    let score = 0;
    let reasonAr = '';
    let reasonEn = '';

    const pUpper = item.partNumber.toUpperCase();
    const mUpper = item.model.toUpperCase();
    const sUpper = item.serialNumber.toUpperCase();
    const descLower = item.description.toLowerCase();
    const arDescLower = (item.arabicDescription || '').toLowerCase();
    const mfgLower = item.manufacturer.toLowerCase();
    const tagUpper = (item.tagNumber || '').toUpperCase();
    const seqStr = String(item.sequence);

    // 1. Exact Sequence Match within File
    if (cleanNumeric && seqStr === cleanNumeric) {
      score = 980;
      reasonAr = `تطابق رقم التسلسل (#${item.sequence}) ضمن ملف ${item.fileName}`;
      reasonEn = `Sequence match (#${item.sequence}) in file ${item.fileName}`;
    }
    // 2. Exact Part Number Match
    else if (queryNorm && item.normalizedPartNumber === queryNorm) {
      score = 1000;
      reasonAr = `تطابق تام في رقم القطعة (${item.partNumber})`;
      reasonEn = `Exact Part Number match (${item.partNumber})`;
    }
    // 3. Punctuation-Free Part Number Match (e.g. 6204-2Z vs 6204 2Z)
    else if (queryPuncFree && item.punctuationFreePartNumber === queryPuncFree && queryPuncFree.length >= 3) {
      score = 950;
      reasonAr = `تطابق رقم القطعة بغض النظر عن الفواصل (${item.partNumber})`;
      reasonEn = `Punctuation-free Part Number match (${item.partNumber})`;
    }
    // 4. Exact Model Number Match
    else if (queryNorm && item.normalizedModel === queryNorm) {
      score = 900;
      reasonAr = `تطابق تام في الطراز / الموديل (${item.model})`;
      reasonEn = `Exact Model match (${item.model})`;
    }
    // 5. Exact Serial Number Match
    else if (queryNorm && item.normalizedSerialNumber === queryNorm) {
      score = 880;
      reasonAr = `تطابق في الرقم التسلسلي (${item.serialNumber})`;
      reasonEn = `Exact Serial Number match (${item.serialNumber})`;
    }
    // 6. Exact Tag Number Match
    else if (tagUpper && tagUpper === query.toUpperCase()) {
      score = 870;
      reasonAr = `تطابق تام في رقم التاغ / Tag (${item.tagNumber})`;
      reasonEn = `Exact Equipment Tag match (${item.tagNumber})`;
    }
    // 7. Prefix Part Number Match (starts with query)
    else if (queryNorm.length >= 2 && item.normalizedPartNumber.startsWith(queryNorm)) {
      score = 820;
      reasonAr = `يبدأ برقم القطعة المطلوب (${item.partNumber})`;
      reasonEn = `Part Number starts with query (${item.partNumber})`;
    }
    // 8. Partial Part Number / Model / Serial Match
    else if (
      (queryNorm.length >= 3 && item.normalizedPartNumber.includes(queryNorm)) ||
      (queryNorm.length >= 3 && item.normalizedModel.includes(queryNorm)) ||
      (queryNorm.length >= 3 && item.normalizedSerialNumber.includes(queryNorm)) ||
      (tagUpper && tagUpper.includes(query.toUpperCase()))
    ) {
      score = 700;
      reasonAr = `تطابق جزئي في المعرفات (رقم القطعة / الموديل / السيريال)`;
      reasonEn = `Partial match in identifiers`;
    }
    // 9. Manufacturer Match
    else if (mfgLower.includes(queryLower)) {
      score = 550;
      reasonAr = `تطابق الشركة المصنعة (${item.manufacturer})`;
      reasonEn = `Manufacturer match (${item.manufacturer})`;
    }
    // 10. Description / Specs Keywords Match
    else if (queryTokens.every(tok => descLower.includes(tok) || arDescLower.includes(tok) || mfgLower.includes(tok))) {
      score = 450;
      reasonAr = `تطابق في الوصف والمواصفات الفنية`;
      reasonEn = `Description keywords match`;
    }

    if (score > 0) {
      matched.push({
        ...item,
        matchScore: score,
        matchReasonAr: reasonAr,
        matchReasonEn: reasonEn
      });
    }
  }

  // Sort by highest match score, then by sequence ascending
  matched.sort((a, b) => {
    if ((b.matchScore || 0) !== (a.matchScore || 0)) {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    return a.sequence - b.sequence;
  });

  return {
    items: matched.slice(0, limit),
    totalMatches: matched.length,
    query,
    filesSearched: fileId && fileId !== 'ALL' ? 1 : new Set(candidates.map(c => c.fileId)).size
  };
}
