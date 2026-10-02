/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Material, 
  MaterialTranslation, 
  WebEvidenceSource, 
  DatasheetSearchResult, 
  MaterialImageResult, 
  MaterialIntelligenceResult, 
  MaterialSearchHistoryItem,
  ManufacturerIntelligence 
} from '../types';
import { 
  lookupIndustrialDictionary, 
  lookupAbbreviation, 
  lookupManufacturer, 
  checkBrandTypo, 
  generateSearchQueries,
  INDUSTRIAL_ABBREVIATIONS,
  INDUSTRIAL_TERMS_DICTIONARY
} from '../data/industrialDictionary';
import { getBaseApiUrl } from './apiClient';
import { dbService } from './dbService';

export type { 
  MaterialTranslation, 
  WebEvidenceSource, 
  DatasheetSearchResult, 
  MaterialImageResult, 
  MaterialIntelligenceResult, 
  MaterialSearchHistoryItem,
  ManufacturerIntelligence 
};

// Aliases for compatibility
export type WebEvidenceItem = WebEvidenceSource;
export type DatasheetEvidence = DatasheetSearchResult;

const CACHE_KEY_TRANSLATIONS = 'emis_cache_translations';
const CACHE_KEY_INTEL = 'emis_cache_material_intel';
const CACHE_KEY_HISTORY = 'emis_cache_search_history';

class MaterialIntelligenceService {
  private memoryTranslations: Map<string, MaterialTranslation> = new Map();
  private memoryIntel: Map<string, MaterialIntelligenceResult> = new Map();

  constructor() {
    this.loadLocalCache();
  }

  private loadLocalCache() {
    try {
      const savedTrans = localStorage.getItem(CACHE_KEY_TRANSLATIONS);
      if (savedTrans) {
        const parsed = JSON.parse(savedTrans);
        Object.entries(parsed).forEach(([k, v]) => this.memoryTranslations.set(k, v as MaterialTranslation));
      }
      const savedIntel = localStorage.getItem(CACHE_KEY_INTEL);
      if (savedIntel) {
        const parsed = JSON.parse(savedIntel);
        Object.entries(parsed).forEach(([k, v]) => this.memoryIntel.set(k, v as MaterialIntelligenceResult));
      }
    } catch (e) {
      console.warn('Failed to load material intelligence cache from localStorage:', e);
    }
  }

  private saveCache() {
    try {
      const transObj = Object.fromEntries(this.memoryTranslations.entries());
      localStorage.setItem(CACHE_KEY_TRANSLATIONS, JSON.stringify(transObj));
      const intelObj = Object.fromEntries(this.memoryIntel.entries());
      localStorage.setItem(CACHE_KEY_INTEL, JSON.stringify(intelObj));
    } catch (e) {
      console.warn('Failed to save material intelligence cache:', e);
    }
  }

  /**
   * Translates material text with instant dictionary fallback and server Gemini intelligence
   */
  async translateMaterialText(
    text: string, 
    sourceLang: string = 'en', 
    targetLang: string = 'ar', 
    materialId?: string
  ): Promise<MaterialTranslation> {
    if (!text || !text.trim()) {
      return {
        id: `trans_empty_${Date.now()}`,
        originalText: '',
        originalLanguage: sourceLang,
        translatedText: '',
        translatedLanguage: targetLang,
        confidence: 'UNKNOWN',
        source: 'DICTIONARY',
        provider: 'Static Dictionary',
        timestamp: new Date().toISOString()
      };
    }

    const cacheKey = `${text.toLowerCase().trim()}_${sourceLang}_${targetLang}`;
    if (this.memoryTranslations.has(cacheKey)) {
      return this.memoryTranslations.get(cacheKey)!;
    }

    // Step 1: Check Technical Dictionary & Abbreviations
    const dictMatch = lookupIndustrialDictionary(text);
    const abbrMatch = lookupAbbreviation(text);

    if (dictMatch && targetLang === 'ar') {
      const result: MaterialTranslation = {
        id: `trans_dict_${Date.now()}`,
        materialId,
        originalText: text,
        originalLanguage: 'en',
        translatedText: dictMatch.arabicTerm,
        translatedLanguage: 'ar',
        technicalMeaning: dictMatch.technicalMeaningArabic,
        category: dictMatch.category,
        confidence: 'HIGH',
        source: 'DICTIONARY',
        provider: 'Industrial Technical Dictionary',
        timestamp: new Date().toISOString()
      };
      this.memoryTranslations.set(cacheKey, result);
      this.saveCache();
      return result;
    }

    if (abbrMatch && targetLang === 'ar') {
      const result: MaterialTranslation = {
        id: `trans_abbr_${Date.now()}`,
        materialId,
        originalText: text,
        originalLanguage: 'en',
        translatedText: `${abbrMatch.arabicName} (${abbrMatch.code})`,
        translatedLanguage: 'ar',
        technicalMeaning: abbrMatch.descriptionArabic,
        category: abbrMatch.category,
        confidence: 'HIGH',
        source: 'DICTIONARY',
        provider: 'Standard ISA/IEC Abbreviation Dictionary',
        timestamp: new Date().toISOString()
      };
      this.memoryTranslations.set(cacheKey, result);
      this.saveCache();
      return result;
    }

    // Step 2: Call Server API for AI Translation with Gemini
    try {
      const baseUrl = getBaseApiUrl();
      const res = await fetch(`${baseUrl}/api/material/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang, targetLang, materialId })
      });

      if (res.ok) {
        const data = await res.json();
        this.memoryTranslations.set(cacheKey, data);
        this.saveCache();
        return data;
      }
    } catch (err) {
      console.warn('Server translation offline or unavailable, using fallback:', err);
    }

    // Fallback: Return safe structured unknown
    const fallback: MaterialTranslation = {
      id: `trans_fb_${Date.now()}`,
      materialId,
      originalText: text,
      originalLanguage: sourceLang,
      translatedText: text,
      translatedLanguage: targetLang,
      technicalMeaning: 'Translation pending connection or manual verification.',
      confidence: 'UNKNOWN',
      source: 'MANUAL',
      provider: 'Offline Fallback',
      timestamp: new Date().toISOString()
    };
    return fallback;
  }

  /**
   * Live Web Evidence Search via Server with Google Search Grounding
   */
  async searchWebEvidence(params: {
    query?: string;
    manufacturer?: string;
    model?: string;
    partNumber?: string;
    description?: string;
  }): Promise<{
    query: string;
    summary: string;
    webSources: WebEvidenceSource[];
    sourcesCount: number;
    modelUsed?: string;
  }> {
    const generated = generateSearchQueries(params);
    const q = params.query || generated.generalQuery;

    try {
      const baseUrl = getBaseApiUrl();
      let res: Response | null = null;
      try {
        res = await fetch(`${baseUrl}/api/material/search-web`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            manufacturer: params.manufacturer,
            model: params.model,
            partNumber: params.partNumber,
            description: params.description
          })
        });
      } catch (fetchErr) {
        if (baseUrl) {
          res = await fetch('/api/material/search-web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: q,
              manufacturer: params.manufacturer,
              model: params.model,
              partNumber: params.partNumber,
              description: params.description
            })
          });
        } else {
          throw fetchErr;
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        // Record in search history
        this.recordSearchHistory({
          query: q,
          materialName: params.description || params.model || params.partNumber,
          user: dbService.getCurrentUser()?.name || 'Current User',
          resultsCount: data.sourcesCount || 0,
          searchType: 'WEB',
          topSources: (data.webSources || []).map((s: WebEvidenceSource) => s.domain)
        });
        return data;
      }
    } catch (e) {
      console.warn('[MaterialIntelligence] Web evidence search offline or unavailable, using local registry:', e);
    }

    // Offline / Fallback: Check static known manufacturer registry
    const mInfo = lookupManufacturer(params.manufacturer || '');
    const fallbackSources: WebEvidenceSource[] = [];
    if (mInfo && mInfo.officialWebsite) {
      fallbackSources.push({
        id: `fb_src_${Date.now()}`,
        title: `${mInfo.name} Official Portal`,
        url: mInfo.officialWebsite,
        domain: new URL(mInfo.officialWebsite).hostname,
        snippet: `Verified manufacturer directory entry for ${mInfo.name}.`,
        sourceType: 'OFFICIAL_MANUFACTURER',
        confidence: 'HIGH',
        isOfficialDomain: true,
        relevance: 'HIGH',
        date: new Date().toISOString().split('T')[0]
      });
    }

    return {
      query: q,
      summary: fallbackSources.length > 0 
        ? `Found official manufacturer portal for ${params.manufacturer}. Connect to internet for live catalog results.`
        : `Offline mode: live web search requires internet connection.`,
      webSources: fallbackSources,
      sourcesCount: fallbackSources.length,
      modelUsed: 'Local Registry'
    };
  }

  /**
   * Find Official PDF Datasheets & Manuals
   */
  async findDatasheets(params: {
    manufacturer?: string;
    model?: string;
    partNumber?: string;
    description?: string;
  }): Promise<{
    datasheets: DatasheetSearchResult[];
    summary: string;
  }> {
    try {
      const baseUrl = getBaseApiUrl();
      let res: Response | null = null;
      try {
        res = await fetch(`${baseUrl}/api/material/find-datasheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
      } catch (fetchErr) {
        if (baseUrl) {
          res = await fetch('/api/material/find-datasheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
        } else {
          throw fetchErr;
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('[MaterialIntelligence] Datasheet search unavailable:', e);
    }

    return {
      datasheets: [],
      summary: 'Datasheet search requires active connection to technical web index.'
    };
  }

  /**
   * Search Reference Images & Diagrams
   */
  async searchReferenceImages(params: {
    query?: string;
    manufacturer?: string;
    model?: string;
    partNumber?: string;
  }): Promise<{
    images: MaterialImageResult[];
    summary: string;
  }> {
    try {
      const baseUrl = getBaseApiUrl();
      let res: Response | null = null;
      try {
        res = await fetch(`${baseUrl}/api/material/search-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
      } catch (fetchErr) {
        if (baseUrl) {
          res = await fetch('/api/material/search-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
        } else {
          throw fetchErr;
        }
      }

      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[MaterialIntelligence] Image search unavailable:', e);
    }

    return {
      images: [],
      summary: 'No reference images retrieved.'
    };
  }

  /**
   * Deep Material Intelligence & Conflict Analysis
   */
  async analyzeMaterial(
    material: Material, 
    webSources: WebEvidenceSource[] = [], 
    ocrText?: string
  ): Promise<MaterialIntelligenceResult> {
    const cacheKey = `intel_${material.id || material.partNumber || material.model}`;
    if (this.memoryIntel.has(cacheKey) && webSources.length === 0) {
      return this.memoryIntel.get(cacheKey)!;
    }

    const typoCheck = checkBrandTypo(material.manufacturer || material.description || '');
    const manufacturerInfo = lookupManufacturer(material.manufacturer || '') || undefined;

    try {
      const baseUrl = getBaseApiUrl();
      let res: Response | null = null;
      try {
        res = await fetch(`${baseUrl}/api/material/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ material, webSources, ocrText })
        });
      } catch (fetchErr) {
        if (baseUrl) {
          res = await fetch('/api/material/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ material, webSources, ocrText })
          });
        } else {
          throw fetchErr;
        }
      }

      if (res && res.ok) {
        const data: MaterialIntelligenceResult = await res.json();
        if (manufacturerInfo && !data.manufacturerInfo) {
          data.manufacturerInfo = manufacturerInfo;
        }
        this.memoryIntel.set(cacheKey, data);
        this.saveCache();
        return data;
      }
    } catch (e) {
      console.warn('[MaterialIntelligence] Material deep analysis API offline or unavailable, using heuristics:', e);
    }

    // High quality offline heuristic fallback
    const dictMatch = lookupIndustrialDictionary(material.description || material.name || '');
    const arabicName = dictMatch ? dictMatch.arabicTerm : (material.arabicDescription || material.description || material.name || 'معدة غير مصنفة');
    const arabicMeaning = dictMatch ? dictMatch.technicalMeaningArabic : 'جهاز صناعي / قطعة غيار مستخدمة في المنشآت الهندسية والمصانع.';

    const fallbackResult: MaterialIntelligenceResult = {
      materialId: material.id,
      originalName: material.description || material.name || 'Equipment',
      arabicName,
      arabicDescription: arabicName,
      technicalMeaningArabic: arabicMeaning,
      technicalMeaningEnglish: dictMatch?.technicalMeaningEnglish || 'Industrial spare part component.',
      category: material.category || dictMatch?.category || 'Instrumentation',
      manufacturer: typoCheck?.suggested || material.manufacturer || 'OEM',
      model: material.model || 'Standard',
      partNumber: material.partNumber || 'N/A',
      application: 'Industrial Process Measurement & Control',
      industry: 'Oil & Gas / Petrochemicals / Power',
      knownSpecifications: {
        pressureRating: material.pressureRating || 'N/A',
        temperatureRange: material.temperatureRange || 'N/A',
        wettedMaterials: material.materialOfConstruction || '316SS / Standard',
        outputSignal: '4-20mA HART'
      },
      relatedEquipment: [],
      possibleAlternatives: [],
      confidence: dictMatch ? 'HIGH' : 'MEDIUM',
      evidenceLevel: dictMatch ? 'Verified' : 'Likely',
      webSources,
      datasheets: [],
      images: [],
      manufacturerInfo,
      aiExplanation: `Heuristic evaluation based on verified database record${dictMatch ? ' and industrial dictionary match' : ''}.`,
      conflictsDetected: typoCheck ? [{
        field: 'Manufacturer Name',
        dbValue: material.manufacturer || '',
        webValue: typoCheck.suggested,
        severity: 'LOW',
        description: `Potential typo detected in brand name (${typoCheck.original} -> ${typoCheck.suggested}).`
      }] : [],
      timestamp: new Date().toISOString(),
      isDeterminedConfident: true
    };

    this.memoryIntel.set(cacheKey, fallbackResult);
    this.saveCache();
    return fallbackResult;
  }

  /**
   * Search industrial dictionary and abbreviations
   */
  lookupDictionary(query: string = ''): Array<{ en: string; ar: string; category: string; description?: string }> {
    const q = query.toLowerCase().trim();
    const results: Array<{ en: string; ar: string; category: string; description?: string }> = [];

    INDUSTRIAL_ABBREVIATIONS.forEach(abbr => {
      if (!q || abbr.code.toLowerCase().includes(q) || abbr.englishName.toLowerCase().includes(q) || abbr.arabicName.includes(q)) {
        results.push({
          en: `${abbr.code} - ${abbr.englishName}`,
          ar: abbr.arabicName,
          category: abbr.category,
          description: abbr.descriptionArabic
        });
      }
    });

    INDUSTRIAL_TERMS_DICTIONARY.forEach(entry => {
      if (!q || entry.englishTerm.toLowerCase().includes(q) || entry.arabicTerm.includes(q) || entry.keywords.some(k => k.toLowerCase().includes(q))) {
        results.push({
          en: entry.englishTerm,
          ar: entry.arabicTerm,
          category: entry.category,
          description: entry.technicalMeaningArabic
        });
      }
    });

    return results;
  }

  /**
   * Search History Management
   */
  async getSearchHistory(): Promise<MaterialSearchHistoryItem[]> {
    try {
      const baseUrl = getBaseApiUrl();
      const res = await fetch(`${baseUrl}/api/material/search-history`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }

    try {
      const local = localStorage.getItem(CACHE_KEY_HISTORY);
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }

  recordSearchHistory(item: Omit<MaterialSearchHistoryItem, 'id' | 'timestamp'>) {
    const entry: MaterialSearchHistoryItem = {
      id: `sh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...item
    };

    try {
      const baseUrl = getBaseApiUrl();
      fetch(`${baseUrl}/api/material/search-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }).catch(() => {});
    } catch {}

    try {
      const current = this.getLocalSearchHistory();
      current.unshift(entry);
      localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify(current.slice(0, 50)));
    } catch {}
  }

  private getLocalSearchHistory(): MaterialSearchHistoryItem[] {
    try {
      const s = localStorage.getItem(CACHE_KEY_HISTORY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }

  clearSearchHistory() {
    try {
      localStorage.removeItem(CACHE_KEY_HISTORY);
    } catch {}
  }
}

export const materialIntelligenceService = new MaterialIntelligenceService();
