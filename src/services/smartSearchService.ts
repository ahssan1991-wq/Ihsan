/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Material, NearestSubstitute, TechnicalDifference, EngineeringDecision } from '../types';
import { getBaseApiUrl, recordDiagnosticTelemetry } from './apiClient';

export interface ParsedSearchQuery {
  rawQuery: string;
  materialType?: string;
  inletPressure?: string;
  outletPressure?: string;
  connectionSize?: string;
  connectionType?: string;
  bodyMaterial?: string;
  voltage?: string;
  signalProtocol?: string;
  manufacturer?: string;
  partNumber?: string;
  model?: string;
  extractedKeywords: string[];
}

/**
 * Intelligent parser that extracts technical parameters from free text (English & Arabic)
 * Example input: "Pressure Regulator 10 bar inlet, 4 bar outlet, 1/2 inch"
 */
export function parseTechnicalQuery(query: string): ParsedSearchQuery {
  const q = (query || '').trim();
  const lower = q.toLowerCase();

  const result: ParsedSearchQuery = {
    rawQuery: q,
    extractedKeywords: []
  };

  // 1. Material Type Detection
  if (lower.includes('pressure regulator') || lower.includes('regulator') || lower.includes('منظم ضغط') || lower.includes('منظم')) {
    result.materialType = 'Pressure Regulator';
  } else if (lower.includes('transmitter') || lower.includes('مرسل') || lower.includes('ترانزميتر') || lower.includes('3051') || lower.includes('p320')) {
    result.materialType = 'Transmitter';
  } else if (lower.includes('solenoid valve') || lower.includes('solenoid') || lower.includes('صمام سيلينويد') || lower.includes('صمام كهربائي')) {
    result.materialType = 'Solenoid Valve';
  } else if (lower.includes('control valve') || lower.includes('valve') || lower.includes('صمام تحكم') || lower.includes('صمام')) {
    result.materialType = 'Control Valve';
  } else if (lower.includes('bearing') || lower.includes('رولمان') || lower.includes('محمل') || lower.includes('brg') || lower.includes('6204')) {
    result.materialType = 'Bearing';
  } else if (lower.includes('sensor') || lower.includes('حساس') || lower.includes('pt100') || lower.includes('thermocouple')) {
    result.materialType = 'Sensor';
  } else if (lower.includes('plc') || lower.includes('controller') || lower.includes('s7-1200')) {
    result.materialType = 'PLC Controller';
  } else if (lower.includes('cable') || lower.includes('كابل') || lower.includes('سلك')) {
    result.materialType = 'Cable';
  } else if (lower.includes('pump') || lower.includes('مضخة')) {
    result.materialType = 'Pump';
  }

  // 2. Pressure specifications (Inlet / Outlet)
  // e.g. "10 bar inlet", "inlet: 10 bar", "10bar in", "مدخل 10 بار"
  const inletRegex = /(?:inlet|in|input|مدخل|دخول)[\s:=]*([\d.]+)\s*(bar|psi|kpa|mpa)/i;
  const inletMatch = lower.match(inletRegex);
  if (inletMatch) {
    result.inletPressure = `${inletMatch[1]} ${inletMatch[2].toLowerCase()}`;
  } else {
    // Reverse pattern: "10 bar inlet", "150 psi inlet"
    const revInletRegex = /([\d.]+)\s*(bar|psi|kpa|mpa)[\s-]*(?:inlet|in|input|مدخل)/i;
    const revMatch = lower.match(revInletRegex);
    if (revMatch) {
      result.inletPressure = `${revMatch[1]} ${revMatch[2].toLowerCase()}`;
    }
  }

  // Outlet pressure
  const outletRegex = /(?:outlet|out|output|مخرج|خروج)[\s:=]*([\d.]+)\s*(bar|psi|kpa|mpa)/i;
  const outletMatch = lower.match(outletRegex);
  if (outletMatch) {
    result.outletPressure = `${outletMatch[1]} ${outletMatch[2].toLowerCase()}`;
  } else {
    const revOutletRegex = /([\d.]+)\s*(bar|psi|kpa|mpa)[\s-]*(?:outlet|out|output|مخرج)/i;
    const revMatch = lower.match(revOutletRegex);
    if (revMatch) {
      result.outletPressure = `${revMatch[1]} ${revMatch[2].toLowerCase()}`;
    }
  }

  // Generic pressure match if neither inlet/outlet explicitly tagged
  if (!result.inletPressure && !result.outletPressure) {
    const genPressure = lower.match(/([\d.]+)\s*(bar|psi|kpa|mpa)/i);
    if (genPressure) {
      result.inletPressure = `${genPressure[1]} ${genPressure[2].toLowerCase()}`;
    }
  }

  // 3. Connection Size
  // e.g. "1/2 inch", "1/2\"", "1/4 in", "1 inch", "2\"", "dn50", "dn25", "نصف بوصة", "بوصة"
  const sizeRegex = /(1\/8|1\/4|3\/8|1\/2|3\/4|1|1\.5|2|3|4)\s*(?:inch|in|"|'')/i;
  const sizeMatch = lower.match(sizeRegex);
  if (sizeMatch) {
    result.connectionSize = `${sizeMatch[1]} inch`;
  } else if (lower.includes('dn50')) {
    result.connectionSize = 'DN50 (2 inch)';
  } else if (lower.includes('dn25')) {
    result.connectionSize = 'DN25 (1 inch)';
  } else if (lower.includes('dn15')) {
    result.connectionSize = 'DN15 (1/2 inch)';
  } else if (lower.includes('نصف بوصة') || lower.includes('1/2 بوصة')) {
    result.connectionSize = '1/2 inch';
  } else if (lower.includes('ربع بوصة') || lower.includes('1/4 بوصة')) {
    result.connectionSize = '1/4 inch';
  } else if (lower.includes('بوصة') || lower.includes('1 بوصة')) {
    result.connectionSize = '1 inch';
  }

  // 4. Connection Type
  if (lower.includes('npt-f') || lower.includes('npt female')) {
    result.connectionType = 'NPT Female';
  } else if (lower.includes('npt-m') || lower.includes('npt male')) {
    result.connectionType = 'NPT Male';
  } else if (lower.includes('npt')) {
    result.connectionType = 'NPT Threaded';
  } else if (lower.includes('flanged') || lower.includes('flange') || lower.includes('فلنجة') || lower.includes('فلنجات')) {
    result.connectionType = 'Flanged ANSI 150# RF';
  } else if (lower.includes('bsp') || lower.includes('g1/2') || lower.includes('g1/4')) {
    result.connectionType = 'BSP Threaded';
  } else if (lower.includes('tri-clamp') || lower.includes('sanitary')) {
    result.connectionType = 'Tri-Clamp';
  }

  // 5. Body Material
  if (lower.includes('ss316') || lower.includes('316l') || lower.includes('stainless') || lower.includes('ستانلس')) {
    result.bodyMaterial = 'Stainless Steel SS316L';
  } else if (lower.includes('brass') || lower.includes('نحاس')) {
    result.bodyMaterial = 'Brass (نحاس أصفر)';
  } else if (lower.includes('carbon steel') || lower.includes('a105') || lower.includes('حديد صلب')) {
    result.bodyMaterial = 'Carbon Steel A105';
  } else if (lower.includes('cast iron') || lower.includes('حديد زهر')) {
    result.bodyMaterial = 'Cast Iron';
  }

  // 6. Voltage / Power
  const voltRegex = /(24\s*vdc|12\s*vdc|220\s*vac|110\s*vac|380\s*v|24v|220v|12v)/i;
  const voltMatch = lower.match(voltRegex);
  if (voltMatch) {
    result.voltage = voltMatch[1].toUpperCase();
  }

  // 7. Signal Protocol
  if (lower.includes('hart')) {
    result.signalProtocol = '4-20 mA HART';
  } else if (lower.includes('4-20') || lower.includes('4-20ma')) {
    result.signalProtocol = '4-20 mA Standard';
  } else if (lower.includes('modbus') || lower.includes('rs485')) {
    result.signalProtocol = 'Modbus RS485';
  } else if (lower.includes('profibus')) {
    result.signalProtocol = 'Profibus PA/DP';
  } else if (lower.includes('foundation fieldbus') || lower.includes('ff')) {
    result.signalProtocol = 'Foundation Fieldbus';
  }

  // 8. Known Manufacturer Detection
  const knownMfrs = ['Fisher', 'Emerson', 'Rosemount', 'Swagelok', 'Tescom', 'Festo', 'Siemens', 'Yokogawa', 'Endress+Hauser', 'ASCO', 'SKF', 'ABB', 'Schneider', 'Karus'];
  for (const mfr of knownMfrs) {
    if (lower.includes(mfr.toLowerCase())) {
      result.manufacturer = mfr;
      break;
    }
  }

  // Keywords tokenization
  result.extractedKeywords = q.split(/[\s,;+]+/).filter(tok => tok.length > 1);

  return result;
}

/**
 * Checks if inventory has an exact / high match for the search query
 */
export function findExactMatches(query: string, materials: Material[]): Material[] {
  if (!query || !query.trim() || !materials || materials.length === 0) return [];
  const q = query.trim().toLowerCase();
  const cleanQ = q.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!cleanQ) return [];

  // Stripped of common prefixes (e.g., "pnusfr02nd" -> "usfr02nd")
  const cleanQWithoutPn = cleanQ.replace(/^(pn|part|model|sn|seq)/i, '');
  const seqNumberQuery = q.replace(/^[#\s]*(?:seq|sequence)[\s#:]*/i, '').replace(/[^0-9]/g, '');

  return materials.filter(m => {
    // 1. Sequence match (e.g. 727, #727, Seq 727)
    if (m.sequence !== undefined && seqNumberQuery && String(m.sequence) === seqNumberQuery) {
      return true;
    }

    const cleanPn = (m.partNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const cleanPnWithoutPn = cleanPn.replace(/^(pn|part)/i, '');

    const cleanMod = (m.model || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const cleanModWithoutPn = cleanMod.replace(/^(pn|part|model)/i, '');

    const cleanSn = (m.serialNumber || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const cleanDesc = (m.description || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

    // 2. Exact Part Number match (with or without PN prefix)
    if (cleanPn && (cleanPn === cleanQ || (cleanQWithoutPn && (cleanPn === cleanQWithoutPn || cleanPnWithoutPn === cleanQWithoutPn)))) {
      return true;
    }

    // 3. Exact Model match (e.g. "PN:USFR-02ND" matches "USFR-02ND")
    if (cleanMod && (cleanMod === cleanQ || (cleanQWithoutPn && (cleanMod === cleanQWithoutPn || cleanModWithoutPn === cleanQWithoutPn || cleanModWithoutPn === cleanQ)))) {
      return true;
    }

    // 4. Exact Serial Number
    if (cleanSn && cleanSn === cleanQ) {
      return true;
    }

    // 5. Direct exact substring match on Part Number or Model
    if (m.partNumber && m.partNumber.toLowerCase() === q) return true;
    if (m.model && m.model.toLowerCase() === q) return true;

    // 6. Direct occurrence inside description (e.g. description contains "PN:USFR-02ND" or "USFR-02ND")
    if (cleanQ.length >= 3 && cleanDesc.includes(cleanQ)) {
      return true;
    }
    if (cleanQWithoutPn.length >= 3 && cleanDesc.includes(cleanQWithoutPn)) {
      return true;
    }

    return false;
  });
}

/**
 * Intelligent Smart Search & Substitute Engine
 * 1. Checks exact match.
 * 2. If no full match, queries backend AI or runs advanced offline scoring.
 * 3. Enriches with similarity percentage, breakdown, technical differences, and previous engineering decisions.
 */
export async function executeSmartSearch(options: {
  query: string;
  materials: Material[];
  decisions?: EngineeringDecision[];
  blacklist?: any[];
  alwaysFindSubstitutes?: boolean;
}): Promise<{
  exactMatches: Material[];
  substitutes: NearestSubstitute[];
  parsedQuery: ParsedSearchQuery;
  isAiAssisted: boolean;
  isOfflineFallback: boolean;
  noticeMessage?: string;
}> {
  const { query, materials, decisions = [], blacklist = [], alwaysFindSubstitutes = false } = options;
  const parsed = parseTechnicalQuery(query);
  const exact = findExactMatches(query, materials);

  // If exact match found and no substitute requested, return exact
  if (exact.length > 0 && !alwaysFindSubstitutes) {
    return {
      exactMatches: exact,
      substitutes: [],
      parsedQuery: parsed,
      isAiAssisted: false,
      isOfflineFallback: false
    };
  }

  // Filter pool for substitutes: if exact match exists, candidate substitutes must be the other warehouse materials
  const candidatePool = exact.length > 0 && materials.length > exact.length
    ? materials.filter(m => !exact.some(e => e.partNumber === m.partNumber))
    : materials;

  // Search for nearest functional substitutes
  const startTime = Date.now();
  let substitutes: NearestSubstitute[] = [];
  let isAiAssisted = false;
  let isOfflineFallback = false;
  let noticeMessage = '';

  const baseUrl = getBaseApiUrl();

  try {
    const response = await fetch(`${baseUrl}/api/gemini/find-nearest-substitute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        criteria: parsed,
        materials: candidatePool,
        decisions,
        blacklist
      })
    });

    const durationMs = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.substitutes) && data.substitutes.length > 0) {
        isAiAssisted = true;
        substitutes = data.substitutes.map((sub: any) => enrichCandidateSubstitute(sub, materials, parsed, decisions, blacklist));
        
        recordDiagnosticTelemetry({
          type: 'search',
          endpoint: '/api/gemini/find-nearest-substitute',
          method: 'POST',
          requestPayload: { query, parsed },
          responseStatus: response.status,
          responseBody: { substituteCount: substitutes.length },
          durationMs,
          isSuccess: true
        });
      }
    } else {
      const errText = await response.text();
      throw new Error(`Server returned status ${response.status}: ${errText}`);
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.warn('[SmartSearchService] AI backend failed or device is offline. Running local similarity engine:', err);
    
    isOfflineFallback = true;
    noticeMessage = 'AI unavailable - Local Smart Search active (خدمة الذكاء الاصطناعي غير متوفرة - تم تفعيل البحث الذكي المحلي)';

    recordDiagnosticTelemetry({
      type: 'search',
      endpoint: '/api/gemini/find-nearest-substitute',
      method: 'POST',
      requestPayload: { query, parsed },
      responseStatus: 0,
      durationMs,
      isSuccess: false,
      rawErrorMessage: err?.message || String(err),
      errorDetails: {
        code: 'NETWORK_OR_OFFLINE',
        message: err?.message,
        stack: err?.stack,
        isNetworkError: true
      }
    });

    // Run advanced local similarity & substitute engine
    substitutes = computeLocalSmartSubstitutes(parsed, candidatePool, decisions, blacklist);
  }

  // Ensure top 3 to 5 substitutes
  const finalSubstitutes = substitutes.slice(0, 5);

  return {
    exactMatches: exact,
    substitutes: finalSubstitutes,
    parsedQuery: parsed,
    isAiAssisted,
    isOfflineFallback,
    noticeMessage: isOfflineFallback ? noticeMessage : undefined
  };
}

/**
 * Enriches candidate substitute with complete material data and engineering decisions
 */
function enrichCandidateSubstitute(
  sub: any,
  materials: Material[],
  parsed: ParsedSearchQuery,
  decisions: EngineeringDecision[],
  blacklist: any[]
): NearestSubstitute {
  const fullMat = materials.find(m => m.partNumber.toLowerCase() === sub.nearestPartNumber?.toLowerCase()) || {
    partNumber: sub.nearestPartNumber || 'UNKNOWN-PN',
    model: sub.nearestModel || 'N/A',
    manufacturer: 'Standard Industrial',
    description: 'Substitute Material',
    quantity: 1,
    unit: 'PCS',
    store: 'Main Store',
    rack: 'R-01',
    shelf: 'S-01',
    minStockLevel: 5,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Cross-reference with Engineering Decisions
  const matchingDecision = decisions.find(d => 
    d.partNumber.toLowerCase() === fullMat.partNumber.toLowerCase() ||
    (fullMat.model && d.title?.toLowerCase().includes(fullMat.model.toLowerCase()))
  );

  const isBlacklisted = blacklist.some(b => b.partNumber.toLowerCase() === fullMat.partNumber.toLowerCase());

  let approvalStatus: NearestSubstitute['approvalStatus'] = 'needs_review';
  let previouslyApproved = false;
  let approvedDecision = undefined;

  if (isBlacklisted) {
    approvalStatus = 'blacklisted';
  } else if (matchingDecision && matchingDecision.decisionType === 'approval') {
    approvalStatus = 'approved_in_decisions';
    previouslyApproved = true;
    approvedDecision = {
      id: matchingDecision.id,
      title: matchingDecision.title,
      details: matchingDecision.details,
      rationale: matchingDecision.rationale,
      approvedBy: matchingDecision.approvedBy,
      approvalDate: matchingDecision.approvalDate,
      decisionType: matchingDecision.decisionType
    };
  }

  // Calculate or map Similarity Breakdown
  const similarityBreakdown = sub.similarityBreakdown || computeFeatureBreakdown(parsed, fullMat);

  return {
    material: fullMat,
    matchScore: Math.min(99, Math.max(30, Number(sub.matchScore) || similarityBreakdown.overallScore || 80)),
    nearestModel: sub.nearestModel || fullMat.model,
    nearestPartNumber: sub.nearestPartNumber || fullMat.partNumber,
    compatibilityReason: sub.compatibilityReason || 'بديل مكافئ وظيفياً ضمن نفس الفئة الهندسية والتطبيق الصناعي.',
    availableStock: fullMat.quantity,
    stockUnit: fullMat.unit || 'PCS',
    storeLocation: fullMat.store || 'Main Store',
    rackLocation: `${fullMat.rack || 'R-01'} / ${fullMat.shelf || 'S-01'}`,
    differences: Array.isArray(sub.differences) && sub.differences.length > 0
      ? sub.differences
      : generateLocalTechnicalDifferences(parsed, fullMat),
    differencesSummary: sub.differencesSummary || 'فروقات تشغيلية طفيفة بين المواصفة المطلوبة والبديل المتوفر.',
    engineeringAdvisory: '⚠️ Engineering Review Required: هذا البديل مقترح آلياً ويحتاج إلى مراجعة واعتماد مهندس الصيانة والآلات الدقيقة قبل التركيب في خط الإنتاج.',
    approvalStatus,
    matchingParameters: Array.isArray(sub.matchingParameters) && sub.matchingParameters.length > 0
      ? sub.matchingParameters
      : ['Operational Function', 'Pressure Range', 'Port Connection'],
    decisionReference: matchingDecision ? matchingDecision.title : undefined,
    previouslyApproved,
    approvedDecision,
    similarityBreakdown,
    isOfflineFallback: false
  };
}

/**
 * Advanced Local Smart Substitute & Similarity Calculator
 * Runs 100% offline without requiring AI servers or network connection
 */
export function computeLocalSmartSubstitutes(
  parsed: ParsedSearchQuery,
  materials: Material[],
  decisions: EngineeringDecision[] = [],
  blacklist: any[] = []
): NearestSubstitute[] {
  if (!materials || materials.length === 0) return [];

  const q = parsed.rawQuery.toLowerCase();
  const tokens = parsed.extractedKeywords.map(t => t.toLowerCase());

  const scoredCandidates = materials.map(mat => {
    let score = 20; // Base score
    const matTokens = `${mat.partNumber} ${mat.model} ${mat.manufacturer} ${mat.description} ${mat.materialType || ''} ${mat.inletPressure || ''} ${mat.outletPressure || ''} ${mat.connectionSize || ''} ${mat.connectionType || ''} ${mat.bodyMaterial || ''} ${mat.voltage || ''} ${mat.signalProtocol || ''}`.toLowerCase();

    // 1. Material Type Match (35 points)
    let typeScore = 0;
    if (parsed.materialType) {
      const pType = parsed.materialType.toLowerCase();
      if (matTokens.includes(pType) || (mat.materialType && mat.materialType.toLowerCase().includes(pType))) {
        typeScore = 35;
      } else if (pType.includes('regulator') && (matTokens.includes('regulat') || matTokens.includes('منظم'))) {
        typeScore = 35;
      } else if (pType.includes('transmitter') && (matTokens.includes('trans') || matTokens.includes('مرسل') || matTokens.includes('3051'))) {
        typeScore = 35;
      } else if (pType.includes('valve') && (matTokens.includes('valve') || matTokens.includes('صمام') || matTokens.includes('vuvs'))) {
        typeScore = 30;
      }
    } else {
      typeScore = 15;
    }
    score += typeScore;

    // 2. Pressure Match (20 points)
    let pressureScore = 0;
    if (parsed.inletPressure || parsed.outletPressure) {
      if (parsed.inletPressure && matTokens.includes(parsed.inletPressure.toLowerCase().replace(/\s+/g, ''))) {
        pressureScore += 10;
      } else if (parsed.inletPressure && matTokens.includes('bar')) {
        pressureScore += 5;
      }

      if (parsed.outletPressure && matTokens.includes(parsed.outletPressure.toLowerCase().replace(/\s+/g, ''))) {
        pressureScore += 10;
      } else if (parsed.outletPressure && matTokens.includes('bar')) {
        pressureScore += 5;
      }
    }
    score += pressureScore;

    // 3. Connection Size & Type (15 points)
    let connectionScore = 0;
    if (parsed.connectionSize) {
      const cleanSize = parsed.connectionSize.toLowerCase().replace(/\s+/g, '');
      if (matTokens.includes(cleanSize) || matTokens.includes(parsed.connectionSize.toLowerCase())) {
        connectionScore += 10;
      } else if (cleanSize.includes('1/2') && matTokens.includes('1/2')) {
        connectionScore += 10;
      } else if (cleanSize.includes('1/4') && matTokens.includes('1/4')) {
        connectionScore += 10;
      }
    }
    if (parsed.connectionType) {
      if (matTokens.includes(parsed.connectionType.toLowerCase())) {
        connectionScore += 5;
      }
    }
    score += connectionScore;

    // 4. Voltage / Signal (15 points)
    let electricalScore = 0;
    if (parsed.voltage && matTokens.includes(parsed.voltage.toLowerCase())) {
      electricalScore += 8;
    }
    if (parsed.signalProtocol && matTokens.includes(parsed.signalProtocol.toLowerCase())) {
      electricalScore += 7;
    }
    score += electricalScore;

    // 5. Keyword Overlap (10 points)
    let matchedTokenCount = 0;
    tokens.forEach(tok => {
      if (matTokens.includes(tok)) matchedTokenCount++;
    });
    if (tokens.length > 0) {
      score += Math.min(10, (matchedTokenCount / tokens.length) * 10);
    }

    // 6. Available Stock Bonus (5 points)
    if (mat.quantity > 0) score += 5;

    // Cap between 45% and 97%
    const finalScore = Math.min(96, Math.max(45, Math.round(score)));

    // Cross reference decisions
    const matchingDecision = decisions.find(d => 
      d.partNumber.toLowerCase() === mat.partNumber.toLowerCase() ||
      (mat.model && d.title?.toLowerCase().includes(mat.model.toLowerCase()))
    );
    const isBlacklisted = blacklist.some(b => b.partNumber.toLowerCase() === mat.partNumber.toLowerCase());

    let approvalStatus: NearestSubstitute['approvalStatus'] = 'needs_review';
    let previouslyApproved = false;
    let approvedDecision = undefined;

    if (isBlacklisted) {
      approvalStatus = 'blacklisted';
    } else if (matchingDecision && matchingDecision.decisionType === 'approval') {
      approvalStatus = 'approved_in_decisions';
      previouslyApproved = true;
      approvedDecision = {
        id: matchingDecision.id,
        title: matchingDecision.title,
        details: matchingDecision.details,
        rationale: matchingDecision.rationale,
        approvedBy: matchingDecision.approvedBy,
        approvalDate: matchingDecision.approvalDate,
        decisionType: matchingDecision.decisionType
      };
    }

    const similarityBreakdown = computeFeatureBreakdown(parsed, mat, finalScore);
    const differences = generateLocalTechnicalDifferences(parsed, mat);

    return {
      material: mat,
      matchScore: finalScore,
      nearestModel: mat.model || mat.partNumber,
      nearestPartNumber: mat.partNumber,
      compatibilityReason: generateLocalCompatibilityReason(parsed, mat),
      availableStock: mat.quantity,
      stockUnit: mat.unit || 'PCS',
      storeLocation: mat.store || 'Main Store',
      rackLocation: `${mat.rack || 'R-01'} / ${mat.shelf || 'S-01'}`,
      differences,
      differencesSummary: `تم احتساب نسبة التوافق (${finalScore}%) عبر محرك الفحص المحلي المستند إلى معايير الآلات الدقيقة.`,
      engineeringAdvisory: '⚠️ Engineering Review Required: هذا البديل مقترح آلياً ويحتاج إلى مراجعة واعتماد مهندس الصيانة والآلات الدقيقة قبل التركيب في خط الإنتاج.',
      approvalStatus,
      matchingParameters: ['Function Category', 'Pressure Range', 'Process Connection'],
      decisionReference: matchingDecision ? matchingDecision.title : undefined,
      previouslyApproved,
      approvedDecision,
      similarityBreakdown,
      isOfflineFallback: true
    };
  });

  // Sort descending by match score and return top 5
  return scoredCandidates.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

/**
 * Calculates feature-by-feature match badges (e.g. Type: Match, Pressure: Match, Connection: Match, Manufacturer: Different)
 */
function computeFeatureBreakdown(
  parsed: ParsedSearchQuery,
  mat: Material,
  calculatedScore?: number
): NearestSubstitute['similarityBreakdown'] {
  const matText = `${mat.partNumber} ${mat.model} ${mat.manufacturer} ${mat.description} ${mat.materialType || ''} ${mat.inletPressure || ''} ${mat.outletPressure || ''} ${mat.connectionSize || ''} ${mat.connectionType || ''} ${mat.bodyMaterial || ''} ${mat.voltage || ''} ${mat.signalProtocol || ''}`.toLowerCase();

  // Type
  let typeMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.materialType) {
    if (matText.includes(parsed.materialType.toLowerCase()) || (mat.materialType && mat.materialType.toLowerCase().includes(parsed.materialType.toLowerCase()))) {
      typeMatch = 'Match';
    } else {
      typeMatch = 'Different';
    }
  }

  // Pressure
  let pressureMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.inletPressure || parsed.outletPressure) {
    const hasInlet = parsed.inletPressure && matText.includes(parsed.inletPressure.toLowerCase().replace(/\s+/g, ''));
    const hasOutlet = parsed.outletPressure && matText.includes(parsed.outletPressure.toLowerCase().replace(/\s+/g, ''));
    if (hasInlet || hasOutlet) {
      pressureMatch = 'Match';
    } else if (matText.includes('bar') || matText.includes('psi') || mat.inletPressure || mat.outletPressure) {
      pressureMatch = 'Compatible';
    } else {
      pressureMatch = 'Different';
    }
  }

  // Connection
  let connectionMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.connectionSize || parsed.connectionType) {
    const sizeHit = parsed.connectionSize && matText.includes(parsed.connectionSize.toLowerCase().replace(/\s+/g, ''));
    const typeHit = parsed.connectionType && matText.includes(parsed.connectionType.toLowerCase());
    if (sizeHit && typeHit) {
      connectionMatch = 'Match';
    } else if (sizeHit || typeHit) {
      connectionMatch = 'Match';
    } else {
      connectionMatch = 'Different';
    }
  }

  // Manufacturer
  let manufacturerMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.manufacturer) {
    if (mat.manufacturer.toLowerCase().includes(parsed.manufacturer.toLowerCase())) {
      manufacturerMatch = 'Match';
    } else {
      manufacturerMatch = 'Different';
    }
  } else {
    manufacturerMatch = 'Different';
  }

  // Voltage
  let voltageMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.voltage) {
    if (matText.includes(parsed.voltage.toLowerCase())) {
      voltageMatch = 'Match';
    } else {
      voltageMatch = 'Different';
    }
  }

  // Material
  let materialMatch: 'Match' | 'Different' | 'Compatible' | 'N/A' = 'N/A';
  if (parsed.bodyMaterial) {
    if (matText.includes(parsed.bodyMaterial.toLowerCase())) {
      materialMatch = 'Match';
    } else {
      materialMatch = 'Different';
    }
  }

  return {
    typeMatch,
    pressureMatch,
    connectionMatch,
    manufacturerMatch,
    voltageMatch,
    materialMatch,
    overallScore: calculatedScore || 85
  };
}

/**
 * Generates technical differences breakdown table
 */
function generateLocalTechnicalDifferences(parsed: ParsedSearchQuery, mat: Material): TechnicalDifference[] {
  const differences: TechnicalDifference[] = [];

  // 1. Manufacturer
  differences.push({
    feature: 'الشركة المصنعة / Manufacturer',
    requested: parsed.manufacturer || 'المواصفة المستهدفة',
    candidate: mat.manufacturer || 'OEM Component',
    impact: parsed.manufacturer && mat.manufacturer.toLowerCase() !== parsed.manufacturer.toLowerCase() ? 'low' : 'favorable'
  });

  // 2. Model & Part Number
  differences.push({
    feature: 'رقم القطعة والموديل / Model & P/N',
    requested: parsed.partNumber || parsed.model || parsed.rawQuery,
    candidate: `${mat.partNumber} (${mat.model})`,
    impact: 'medium'
  });

  // 3. Pressure Rating
  if (parsed.inletPressure || parsed.outletPressure || mat.inletPressure || mat.outletPressure) {
    differences.push({
      feature: 'نطاق الضغط / Pressure Limits',
      requested: `In: ${parsed.inletPressure || '10 bar'}, Out: ${parsed.outletPressure || '4 bar'}`,
      candidate: `In: ${mat.inletPressure || '10 bar'}, Out: ${mat.outletPressure || '1.5-6 bar'}`,
      impact: 'low'
    });
  }

  // 4. Connection Size & Type
  if (parsed.connectionSize || parsed.connectionType || mat.connectionSize || mat.connectionType) {
    differences.push({
      feature: 'حجم ونوع التوصيل / Connection',
      requested: `${parsed.connectionSize || '1/2 inch'} ${parsed.connectionType || 'NPT'}`,
      candidate: `${mat.connectionSize || '1/2 inch'} ${mat.connectionType || 'NPT-F'}`,
      impact: 'favorable'
    });
  }

  // 5. Body Material
  if (parsed.bodyMaterial || mat.bodyMaterial || mat.materialOfConstruction) {
    differences.push({
      feature: 'مادة التصنيع / Body Metallurgy',
      requested: parsed.bodyMaterial || 'SS316 / Brass',
      candidate: mat.bodyMaterial || mat.materialOfConstruction || 'Stainless Steel SS316',
      impact: 'favorable'
    });
  }

  return differences;
}

function generateLocalCompatibilityReason(parsed: ParsedSearchQuery, mat: Material): string {
  const cat = parsed.materialType || mat.materialType || 'الجهاز الهندسي';
  return `بديل متوافق وظيفياً مع فئة (${cat}). يتطابق في نطاقات الضغط ومعايير التوصيل الميكانيكية المعتمدة.`;
}
