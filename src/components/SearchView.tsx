/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Layers, 
  SlidersHorizontal, 
  MapPin, 
  Eye, 
  X, 
  RefreshCcw, 
  Cpu, 
  AlertOctagon, 
  CheckCircle,
  FileSpreadsheet,
  Camera,
  Sparkles,
  AlertTriangle,
  Download,
  ShieldCheck,
  Package,
  RefreshCw,
  Hash,
  Boxes,
  Scale,
  FileCheck,
  Award,
  AlertCircle,
  ArrowRight,
  Info,
  Check,
  CheckCircle2,
  FileText,
  Warehouse,
  Globe,
  ArrowRightLeft,
  Clock,
  Flame,
  History,
  TrendingUp,
  ExternalLink,
  Link2,
  Copy,
  ArrowUpRight
} from 'lucide-react';
import { 
  Material, 
  User, 
  UserRole, 
  NearestSubstitute, 
  TechnicalDifference, 
  EngineeringDecision,
  ExternalMaterial,
  UnifiedSearchResult,
  UnifiedSearchResultSource
} from '../types';
import NameplateScanner from './NameplateScanner';
import SearchHistoryBar from './SearchHistoryBar';
import { searchHistoryService, RecentSearchQuery, AccessedPartNumber } from '../services/searchHistoryService';
import { apiQuickMatchMaterial, apiFindNearestSubstitute, apiCompareDatasheets } from '../services/apiClient';
import { executeSmartSearch, parseTechnicalQuery, ParsedSearchQuery } from '../services/smartSearchService';
import { dbService } from '../services/dbService';
import * as XLSX from 'xlsx';

interface SearchViewProps {
  materials?: Material[];
  currentUser: User;
  onInspectMaterial: (material: Material) => void;
  onNavigateToTab?: (tabId: string, query?: string, prefillData?: Record<string, string | null>) => void;
  initialQuery?: string;
}

export default function SearchView({ materials: rawMaterials = [], currentUser, onInspectMaterial, onNavigateToTab, initialQuery }: SearchViewProps) {
  const materials = Array.isArray(rawMaterials) && rawMaterials.length > 0 ? rawMaterials : (dbService.getMaterials() || []);
  // Universal Instant Search Input
  const [universalQuery, setUniversalQuery] = useState(initialQuery || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial query if updated from parent navigation
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== null) {
      setUniversalQuery(initialQuery);
    }
  }, [initialQuery]);

  // Source Filter Scope
  const [sourceScope, setSourceScope] = useState<'ALL' | 'STATION' | 'EXTERNAL' | 'EQUIPMENT' | 'MRF_WO'>('ALL');

  // Quick Filter Category
  const [quickFilter, setQuickFilter] = useState<'all' | 'low' | 'out' | 'oem' | 'incomplete'>('all');

  // Transfer External Material to Station Modal State
  const [transferTargetMat, setTransferTargetMat] = useState<ExternalMaterial | null>(null);
  const [targetStationStore, setTargetStationStore] = useState('ZFOD Central Warehouse');
  const [targetMinStock, setTargetMinStock] = useState(5);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Advanced Search Inputs
  const [seqQuery, setSeqQuery] = useState('');
  const [partQuery, setPartQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [mfgQuery, setMfgQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');

  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  // AI Semantic Matching State
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [aiMatchResults, setAiMatchResults] = useState<{
    matches: Array<{
      material: Material;
      score: number;
      matchReason?: string;
    }>;
    query: string;
  } | null>(null);

  // Nearest Substitute Finder State
  const [isSearchingSubstitutes, setIsSearchingSubstitutes] = useState(false);
  const [nearestSubstitutes, setNearestSubstitutes] = useState<NearestSubstitute[] | null>(null);
  const [substituteSearchTarget, setSubstituteSearchTarget] = useState<string>('');
  const [expandedSubstituteIdx, setExpandedSubstituteIdx] = useState<number | null>(0);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [isOfflineEngineActive, setIsOfflineEngineActive] = useState<boolean>(false);
  
  // Decision Approval Modal State
  const [approvingSubstitute, setApprovingSubstitute] = useState<NearestSubstitute | null>(null);
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [decisionDetails, setDecisionDetails] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionSuccessMsg, setDecisionSuccessMsg] = useState<string | null>(null);

  // Datasheet Comparison Modal State
  const [comparisonModalItem, setComparisonModalItem] = useState<{
    substitute: NearestSubstitute;
    result?: any;
    isLoading: boolean;
  } | null>(null);

  const [scanStatus, setScanStatus] = useState<{
    status: 'idle' | 'success' | 'not-found';
    message: string;
    matchedMaterial?: Material;
  }>({ status: 'idle', message: '' });

  const handleResetFilters = () => {
    setUniversalQuery('');
    setQuickFilter('all');
    setSeqQuery('');
    setPartQuery('');
    setDescQuery('');
    setMfgQuery('');
    setModelQuery('');
    setMinQty('');
    setMaxQty('');
    setAiMatchResults(null);
    setNearestSubstitutes(null);
    setSearchNotice(null);
    setIsOfflineEngineActive(false);
    setScanStatus({ status: 'idle', message: '' });
  };

  // Wrap material inspection to track access count and timestamp in local storage
  const handleInspectMaterialWithHistory = (material: Material) => {
    searchHistoryService.recordPartAccess(material.partNumber, {
      description: material.description,
      manufacturer: material.manufacturer,
      model: material.model
    });
    window.dispatchEvent(new Event('emis:search-history-updated'));
    onInspectMaterial(material);
  };

  // Direct link copy and navigation handlers
  const [copiedPart, setCopiedPart] = useState<string | null>(null);

  const handleCopyDirectLink = (e: React.MouseEvent, partNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const url = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(partNumber)}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedPart(partNumber);
        setTimeout(() => setCopiedPart(null), 2500);
      }).catch(() => {
        setCopiedPart(partNumber);
        setTimeout(() => setCopiedPart(null), 2500);
      });
    } catch {
      setCopiedPart(partNumber);
      setTimeout(() => setCopiedPart(null), 2500);
    }
  };

  const handleNavigateDirectToMaterial = (e: React.MouseEvent, partNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    searchHistoryService.recordPartAccess(partNumber);
    window.dispatchEvent(new Event('emis:search-history-updated'));
    if (onNavigateToTab) {
      onNavigateToTab('materials', partNumber);
    } else {
      const target = materials.find(m => m.partNumber.toUpperCase() === partNumber.toUpperCase());
      if (target) onInspectMaterial(target);
    }
  };

  // Handle selecting a previous query from history or suggestions
  const handleSelectHistoryQuery = (query: string, scope?: string) => {
    setUniversalQuery(query);
    if (scope && (scope === 'ALL' || scope === 'STATION' || scope === 'EXTERNAL' || scope === 'EQUIPMENT' || scope === 'MRF_WO')) {
      setSourceScope(scope as any);
    }
    searchHistoryService.saveSearchQuery(query, undefined, scope || sourceScope);
    window.dispatchEvent(new Event('emis:search-history-updated'));
    setIsSearchFocused(false);
  };

  // Handle inspecting a part number from frequent parts list
  const handleInspectPartNumberFromHistory = (partNumber: string) => {
    const found = materials.find(m => m.partNumber.toUpperCase() === partNumber.trim().toUpperCase());
    if (found) {
      handleInspectMaterialWithHistory(found);
    } else {
      setUniversalQuery(partNumber);
      setSourceScope('ALL');
      searchHistoryService.saveSearchQuery(partNumber, undefined, 'ALL');
      window.dispatchEvent(new Event('emis:search-history-updated'));
    }
    setIsSearchFocused(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced auto-save of active search queries to local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (universalQuery.trim().length >= 2) {
        searchHistoryService.saveSearchQuery(
          universalQuery.trim(),
          undefined,
          sourceScope
        );
        window.dispatchEvent(new Event('emis:search-history-updated'));
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [universalQuery, sourceScope]);

  // Perform AI Semantic Quick-Match
  const handleAiSemanticMatch = async () => {
    const q = universalQuery || partQuery || descQuery || mfgQuery || modelQuery;
    if (!q.trim()) return;

    setIsAiMatching(true);
    try {
      const response = await apiQuickMatchMaterial(q.trim(), materials);
      
      const mapped = response.map(item => {
        const fullMat = materials.find(m => m.partNumber.toLowerCase() === item.partNumber.toLowerCase());
        return {
          material: fullMat || {
            partNumber: item.partNumber,
            description: 'N/A',
            manufacturer: 'N/A',
            model: 'N/A',
            quantity: 0,
            unit: 'PCS',
            store: 'General Inventory',
            rack: 'N/A',
            shelf: 'N/A',
            notes: '',
            minStockLevel: 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          score: item.score / 100,
          matchReason: item.reason
        };
      });

      setAiMatchResults({
        matches: mapped,
        query: q.trim()
      });
    } catch (err) {
      console.error("AI Match Error:", err);
    } finally {
      setIsAiMatching(false);
    }
  };

  // Nearest Substitute Finder Engine Handler
  const handleFindSubstitutes = async (customQuery?: string) => {
    const q = customQuery || universalQuery || partQuery || modelQuery || descQuery || mfgQuery;
    if (!q.trim()) return;

    setIsSearchingSubstitutes(true);
    setSubstituteSearchTarget(q.trim());
    setSearchNotice(null);
    setIsOfflineEngineActive(false);

    try {
      const searchResult = await executeSmartSearch({
        query: q.trim(),
        materials,
        decisions: dbService.getEngineeringDecisions(),
        blacklist: dbService.getBlacklist(),
        alwaysFindSubstitutes: true
      });

      setNearestSubstitutes(searchResult.substitutes);
      setIsOfflineEngineActive(searchResult.isOfflineFallback);
      if (searchResult.noticeMessage) {
        setSearchNotice(searchResult.noticeMessage);
      }

      if (searchResult.substitutes.length > 0) {
        setExpandedSubstituteIdx(0);
      }
    } catch (err: any) {
      console.error("Error finding nearest substitutes:", err);
      setSearchNotice(`AI unavailable - Local Smart Search active (${err?.message || 'خطأ في الاتصال'})`);
      setIsOfflineEngineActive(true);
    } finally {
      setIsSearchingSubstitutes(false);
    }
  };

  // Open Decision Registration Modal for an alternate
  const handleOpenDecisionModal = (sub: NearestSubstitute) => {
    setApprovingSubstitute(sub);
    setDecisionTitle(`اعتماد بديل هندسي: ${sub.material.partNumber} كبديل لـ (${substituteSearchTarget || sub.nearestModel})`);
    setDecisionRationale(
      `بناءً على فحص التوافق الفني بنسبة ${sub.matchScore}% وتطابق معايير التشغيل الأساسية. الفروقات الفنية: ${sub.differencesSummary}`
    );
    setDecisionDetails(
      `تم التحقق من جاهزية القطعة ${sub.material.partNumber} (${sub.material.model}) كبديل تشغيلي مكافئ في المستودع ${sub.material.store}. الكمية المتوفرة: ${sub.material.quantity} ${sub.material.unit}.`
    );
    setDecisionSuccessMsg(null);
  };

  // Submit Engineering Decision to Database
  const handleSubmitDecision = () => {
    if (!approvingSubstitute || !decisionTitle.trim() || !decisionRationale.trim()) return;
    
    setIsSubmittingDecision(true);
    try {
      dbService.addEngineeringDecision(
        {
          partNumber: approvingSubstitute.material.partNumber,
          title: decisionTitle.trim(),
          decisionType: 'approval',
          details: decisionDetails.trim(),
          rationale: decisionRationale.trim()
        },
        currentUser
      );

      // Update local substitute status
      setNearestSubstitutes(prev => 
        prev ? prev.map(item => 
          item.material.partNumber === approvingSubstitute.material.partNumber
            ? { ...item, approvalStatus: 'approved_in_decisions', decisionReference: decisionTitle.trim() }
            : item
        ) : null
      );

      setDecisionSuccessMsg(`✅ تم تسجيل واعتماد البديل ${approvingSubstitute.material.partNumber} بنجاح كقرار هندسي رسمي.`);
      setTimeout(() => {
        setApprovingSubstitute(null);
        setDecisionSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      console.error("Error adding engineering decision:", err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Open AI Deep Compare Modal
  const handleOpenCompareModal = async (sub: NearestSubstitute) => {
    setComparisonModalItem({
      substitute: sub,
      isLoading: true
    });

    try {
      const result = await apiCompareDatasheets({
        itemA: {
          partNumber: substituteSearchTarget || 'Target Component',
          model: substituteSearchTarget,
          description: 'Original requested industrial component'
        },
        itemB: {
          partNumber: sub.material.partNumber,
          model: sub.material.model,
          manufacturer: sub.material.manufacturer,
          description: sub.material.description,
          voltage: sub.material.electricalRating,
          signalOutput: sub.material.outputProtocol,
          ipRating: sub.material.ipRating,
          operatingRange: sub.material.measuringRange
        }
      });

      setComparisonModalItem({
        substitute: sub,
        result,
        isLoading: false
      });
    } catch (err) {
      console.error("Error comparing datasheets:", err);
      setComparisonModalItem(prev => prev ? { ...prev, isLoading: false } : null);
    }
  };

  const handleScanSuccess = (data: Record<string, string | null>) => {
    const scannedPart = data.partNumber ? data.partNumber.trim().toUpperCase() : '';
    const scannedSerial = data.serialNumber ? data.serialNumber.trim().toUpperCase() : '';
    const scannedModel = data.model ? data.model.trim().toUpperCase() : '';
    
    const sanitize = (str: string) => str.replace(/[^A-Z0-9]/ig, '');
    const cleanScannedPart = sanitize(scannedPart);
    const cleanScannedSerial = sanitize(scannedSerial);
    const cleanScannedModel = sanitize(scannedModel);

    let found: Material | undefined = undefined;

    if (cleanScannedPart) {
      found = materials.find(m => {
        const cleanM = sanitize(m.partNumber.toUpperCase());
        return cleanM === cleanScannedPart || cleanM.includes(cleanScannedPart) || cleanScannedPart.includes(cleanM);
      });
    }

    if (!found && cleanScannedSerial) {
      found = materials.find(m => {
        if (!m.serialNumber) return false;
        const cleanM = sanitize(m.serialNumber.toUpperCase());
        return cleanM === cleanScannedSerial || cleanM.includes(cleanScannedSerial) || cleanScannedSerial.includes(cleanM);
      });
    }

    if (!found && cleanScannedModel) {
      found = materials.find(m => {
        const cleanM = sanitize(m.model.toUpperCase());
        return cleanM === cleanScannedModel || cleanM.includes(cleanScannedModel) || cleanScannedModel.includes(cleanM);
      });
    }

    if (found) {
      setScanStatus({
        status: 'success',
        message: `🎯 تم العثور على المادة المطابقة في قاعدة البيانات: ${found.partNumber} · ${found.description}. جاري الانتقال لصفحة المادة وتفاصيلها...`,
        matchedMaterial: found
      });
      setTimeout(() => {
        onInspectMaterial(found!);
        setScanStatus({ status: 'idle', message: '' });
      }, 1500);
    } else {
      if (scannedPart) setPartQuery(scannedPart);
      if (scannedModel) setModelQuery(scannedModel);
      if (data.manufacturer) setMfgQuery(data.manufacturer);
      if (scannedPart) setUniversalQuery(scannedPart);

      setScanStatus({
        status: 'not-found',
        message: `⚠️ لم نجد مادة مطابقة تماماً لرقم القطعة "${scannedPart || 'N/A'}". تم ملء حقول البحث ببيانات اللوحة الممسوحة لمساعدتك في العثور عليها أو تسجيلها يدوياً.`,
      });
    }
  };

  // Export filtered search results to Excel
  const handleExportSearchResults = () => {
    if (matchedMaterials.length === 0) return;

    // Strictly sort in ascending order by sequence (from smallest to largest: 1, 2, 3, ...)
    const sorted = [...matchedMaterials].sort((a, b) => {
      const seqA = (a.sequence !== undefined && a.sequence !== null && !isNaN(Number(a.sequence))) ? Number(a.sequence) : Infinity;
      const seqB = (b.sequence !== undefined && b.sequence !== null && !isNaN(Number(b.sequence))) ? Number(b.sequence) : Infinity;
      if (seqA !== seqB) return seqA - seqB;
      return (a.partNumber || '').localeCompare(b.partNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    const dataToExport = sorted.map((m, idx) => ({
      'Sequence / التسلسل': (m.sequence !== undefined && m.sequence !== null) ? m.sequence : (idx + 1),
      'Part Number / رقم القطعة': m.partNumber,
      'Material Code / كود المادة': m.materialCode || '',
      'Description / الوصف الفني': m.description,
      'Manufacturer / الشركة المصنعة': m.manufacturer,
      'Model / الموديل': m.model,
      'Quantity / الكمية': m.quantity,
      'Unit / الوحدة': m.unit || 'EA',
      'Min Stock Level / الحد الأدنى': m.minStockLevel || 10,
      'Storage Location / المستودع': m.store,
      'Rack / الرف': m.rack || '',
      'Shelf / الدرج': m.shelf || '',
      'Station / المحطة': m.station || 'ZFOD Warehouse',
      'OEM Verified / التوثيق': m.oemVerified ? 'VERIFIED / موثق' : (m.oemVerificationStatus || 'Pending'),
      'OEM Certificate / رقم الشهادة': m.oemCertificateId || '',
      'Serial Number / الرقم التسلسلي': m.serialNumber || '',
      'Electrical Rating': m.electricalRating || '',
      'Output Protocol': m.outputProtocol || '',
      'Measuring Range': m.measuringRange || '',
      'IP Rating': m.ipRating || '',
      'Compatible Equipment': (m.compatibleEquipment || []).join(', '),
      'Primary Alternative': m.alternatives?.primary || '',
      'Secondary Alternative': m.alternatives?.secondary || '',
      'Engineering Notes': m.engineeringNotes || m.notes || m.engineeringComments || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Search Results');
    XLSX.writeFile(workbook, `EMIS_Search_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filter and rank Materials using Universal Engineering Search Engine
  const searchResults = React.useMemo(() => {
    let ranked = dbService.universalSearch(universalQuery);

    // Apply quick filters if selected
    if (quickFilter === 'low') {
      ranked = ranked.filter(r => r.computedStatus === 'Low Stock');
    } else if (quickFilter === 'out') {
      ranked = ranked.filter(r => r.computedStatus === 'Out of Stock');
    } else if (quickFilter === 'oem') {
      ranked = ranked.filter(r => r.material.oemVerified);
    } else if (quickFilter === 'incomplete') {
      ranked = ranked.filter(r => r.material.isIncomplete);
    }

    // Apply advanced specific specifiers if provided
    if (seqQuery.trim()) {
      ranked = ranked.filter(r => r.material.sequence !== undefined && r.material.sequence.toString().includes(seqQuery.trim()));
    }
    if (partQuery.trim()) {
      ranked = ranked.filter(r => r.material.partNumber.toLowerCase().includes(partQuery.trim().toLowerCase()));
    }
    if (descQuery.trim()) {
      ranked = ranked.filter(r => r.material.description.toLowerCase().includes(descQuery.trim().toLowerCase()));
    }
    if (mfgQuery.trim()) {
      ranked = ranked.filter(r => r.material.manufacturer.toLowerCase().includes(mfgQuery.trim().toLowerCase()));
    }
    if (modelQuery.trim()) {
      ranked = ranked.filter(r => (r.material.model || '').toLowerCase().includes(modelQuery.trim().toLowerCase()));
    }
    if (minQty !== '') {
      const min = parseInt(minQty);
      if (!isNaN(min)) {
        ranked = ranked.filter(r => r.material.quantity >= min);
      }
    }
    if (maxQty !== '') {
      const max = parseInt(maxQty);
      if (!isNaN(max)) {
        ranked = ranked.filter(r => r.material.quantity <= max);
      }
    }

    return ranked;
  }, [universalQuery, quickFilter, seqQuery, partQuery, descQuery, mfgQuery, modelQuery, minQty, maxQty, materials]);

  const matchedMaterials = searchResults.map(r => r.material);

  // Multi-source Unified Cross-Inventory Search Results (Green, Blue, Purple, Orange)
  const unifiedResults: UnifiedSearchResult[] = React.useMemo(() => {
    if (sourceScope === 'STATION') {
      return [];
    }
    const q = universalQuery || partQuery || descQuery || mfgQuery || modelQuery || seqQuery;
    let sourceParam: any = undefined;
    if (sourceScope === 'EXTERNAL') sourceParam = 'EXTERNAL_STOCK';
    else if (sourceScope === 'EQUIPMENT') sourceParam = 'EQUIPMENT';
    else if (sourceScope === 'MRF_WO') sourceParam = 'MRF_WO';
    else if (sourceScope === 'ALL') sourceParam = undefined;

    return dbService.unifiedSearch(q, sourceParam);
  }, [sourceScope, universalQuery, partQuery, descQuery, mfgQuery, modelQuery, seqQuery, materials]);

  // Handle Transferring External Material to Station Ledger
  const handleConfirmTransfer = async () => {
    if (!transferTargetMat) return;
    setTransferLoading(true);
    setTransferFeedback(null);
    try {
      const res = dbService.transferExternalMaterialToStation(
        transferTargetMat,
        currentUser,
        targetStationStore,
        targetMinStock
      );
      if (res.success) {
        setTransferFeedback({
          type: 'success',
          message: `تم بنجاح نقل المادة ${transferTargetMat.partNumber} إلى سجل مواد المحطة (${targetStationStore})!`
        });
        setTimeout(() => {
          setTransferTargetMat(null);
          setTransferFeedback(null);
          if (onNavigateToTab) {
            onNavigateToTab('materials', transferTargetMat.partNumber);
          }
        }, 1200);
      } else {
        setTransferFeedback({
          type: 'error',
          message: res.error || 'Failed to transfer external material'
        });
      }
    } catch (e: any) {
      setTransferFeedback({
        type: 'error',
        message: e.message || 'An error occurred during transfer.'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Blacklisted':
        return (
          <span className="bg-industrial-950 text-rose-400 border border-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
            <AlertOctagon className="h-3 w-3 text-rose-500" />
            <span>⚫ Blacklisted</span>
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🔴 Out of Stock
          </span>
        );
      case 'Low Stock':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            🟡 Low Stock
          </span>
        );
      case 'Under Inspection':
        return (
          <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🟠 Under Inspection
          </span>
        );
      case 'Reserved':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🔵 Reserved
          </span>
        );
      case 'Pending Engineering Review':
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🟣 Pending Review
          </span>
        );
      default:
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🟢 Available
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="search-view">
      {/* Search Dashboard Header */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
              <SlidersHorizontal className="h-5.5 w-5.5 text-brand-600" /> خدمة البحث السريع والمطابقة الذكية / Quick & AI Search
            </h2>
            <p className="text-xs text-industrial-500 mt-1">
              ابحث فورياً برقم المادة التسلسلي، رقم القطعة، اسم الشركة المصنعة، الموديل، الوصف، أو استخدم الكاميرا والذكاء الاصطناعي لمطابقة اللوحات.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Export Search Results */}
            {matchedMaterials.length > 0 && (
              <button
                type="button"
                onClick={handleExportSearchResults}
                className="text-xs bg-industrial-50 hover:bg-industrial-100 text-industrial-700 font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-industrial-200 cursor-pointer shadow-2xs"
                title="تصدير نتائج البحث إلى ملف Excel"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>تصدير النتائج (Excel)</span>
              </button>
            )}

            {/* AI Visual Scan Search */}
            <NameplateScanner 
              materialsList={materials}
              onScanSuccess={handleScanSuccess} 
              renderTrigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-brand-700 cursor-pointer shadow-sm"
                >
                  <Camera className="h-4 w-4 animate-pulse" />
                  <span>المسح البصري بالكاميرا / Camera Scan</span>
                </button>
              )}
            />

            <button
              onClick={handleResetFilters}
              className="text-xs bg-industrial-100 hover:bg-industrial-200 text-industrial-700 font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 border border-industrial-200 cursor-pointer"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>إعادة ضبط / Reset</span>
            </button>
          </div>
        </div>

        {/* Multi-Source Search Scope Selector (Green: Station, Blue: External Stock, Purple: Equipment, Orange: MR/WO) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-industrial-100/80 rounded-xl overflow-x-auto text-xs font-semibold border border-industrial-200/80">
          <button
            type="button"
            onClick={() => setSourceScope('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              sourceScope === 'ALL'
                ? 'bg-industrial-900 text-white shadow-xs font-bold'
                : 'text-industrial-600 hover:text-industrial-900 hover:bg-industrial-200/60'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-brand-400" />
            <span>🌐 كافة المصادر / All Sources</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSourceScope('STATION')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              sourceScope === 'STATION'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-800 hover:bg-emerald-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>🟢 مواد المحطة / Station ({materials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceScope('EXTERNAL')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              sourceScope === 'EXTERNAL'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-sky-800 hover:bg-sky-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>🔵 مخزون خارجي / External Stock ({dbService.getExternalMaterials().length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceScope('EQUIPMENT')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              sourceScope === 'EQUIPMENT'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'text-purple-800 hover:bg-purple-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>🟣 المعدات / Equipment ({dbService.getEquipment().length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceScope('MRF_WO')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              sourceScope === 'MRF_WO'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-amber-800 hover:bg-amber-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>🟠 طلبات وأوامر العمل / MR & WO</span>
          </button>
        </div>

        {/* Quick Filter Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              quickFilter === 'all'
                ? 'bg-industrial-900 text-white shadow-2xs'
                : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
            }`}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>جميع المواد ({materials.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('low')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              quickFilter === 'low'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>رصيد منخفض ({materials.filter(m => m.quantity <= m.minStockLevel && m.quantity > 0).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('out')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              quickFilter === 'out'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>نفد من المخزن ({materials.filter(m => m.quantity === 0).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickFilter('oem')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              quickFilter === 'oem'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>قطع معتمدة OEM ({materials.filter(m => m.oemVerified).length})</span>
          </button>
          {materials.some(m => m.isIncomplete) && (
            <button
              type="button"
              onClick={() => setQuickFilter('incomplete')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                quickFilter === 'incomplete'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>بحاجة إكمال ({materials.filter(m => m.isIncomplete).length})</span>
            </button>
          )}
        </div>

        {/* Big Universal Search Bar */}
        <div className="relative flex items-center gap-2" ref={searchInputContainerRef}>
          <div className="relative flex-1">
            <div className="absolute right-4 top-3.5 text-industrial-400 pointer-events-none">
              <Search className="h-5 w-5 text-brand-600" />
            </div>
            <input
              type="text"
              value={universalQuery}
              onChange={(e) => {
                setUniversalQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && universalQuery.trim()) {
                  handleAiSemanticMatch();
                  setIsSearchFocused(false);
                } else if (e.key === 'Escape') {
                  setIsSearchFocused(false);
                }
              }}
              placeholder="Search Part Number, Model, Serial, MR, WO, TAG, Description..."
              className="w-full bg-brand-50/20 border-2 border-brand-200 focus:border-brand-500 text-sm font-medium pr-12 pl-28 py-3.5 rounded-xl text-industrial-900 placeholder:text-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            {universalQuery && (
              <button
                onClick={() => {
                  setUniversalQuery('');
                  setAiMatchResults(null);
                }}
                className="absolute left-24 top-3.5 p-1 rounded-full hover:bg-industrial-200 text-industrial-400 hover:text-industrial-600 cursor-pointer"
                title="مسح"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="absolute left-2.5 top-2 flex items-center">
              <NameplateScanner
                materialsList={materials}
                onScanSuccess={handleScanSuccess}
                onEditMaterial={(mat) => {
                  handleInspectMaterialWithHistory(mat);
                }}
                onRegisterNewEntry={(data) => {
                  if (onNavigateToTab) {
                    onNavigateToTab('add-material', '', data);
                  }
                }}
                renderTrigger={(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    title="التقاط بالكاميرا والبحث المباشر"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">مسح</span>
                  </button>
                )}
              />
            </div>

            {/* Quick Autocomplete & Recent Search History Dropdown Popover */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="absolute top-full mt-1.5 right-0 left-0 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-xl z-50 overflow-hidden text-xs divide-y divide-industrial-100 dark:divide-industrial-800 max-h-80 overflow-y-auto"
                >
                  {/* Recent Queries Matching */}
                  {(() => {
                    const allQueries = searchHistoryService.getSearchHistory();
                    const matchingQueries = universalQuery.trim()
                      ? allQueries.filter(q => q.query.toLowerCase().includes(universalQuery.trim().toLowerCase()))
                      : allQueries.slice(0, 5);

                    const allParts = searchHistoryService.getAccessedParts();
                    const matchingParts = universalQuery.trim()
                      ? allParts.filter(p => p.partNumber.toLowerCase().includes(universalQuery.trim().toLowerCase()) || (p.description && p.description.toLowerCase().includes(universalQuery.trim().toLowerCase())))
                      : allParts.slice(0, 4);

                    if (matchingQueries.length === 0 && matchingParts.length === 0) {
                      return (
                        <div className="p-4 text-center text-industrial-400">
                          <p>لا توجد استعلامات مطابقة في السجل المحلي</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {matchingQueries.length > 0 && (
                          <div className="p-2 space-y-1">
                            <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-bold text-industrial-400 uppercase font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-brand-600" />
                                <span>استعلامات البحث السابقة / Recent Queries</span>
                              </span>
                            </div>
                            {matchingQueries.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleSelectHistoryQuery(item.query, item.sourceScope)}
                                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Search className="h-3.5 w-3.5 text-industrial-400 group-hover:text-brand-600 shrink-0" />
                                  <span className="font-semibold text-industrial-900 dark:text-white truncate">
                                    {item.query}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-[10px] text-industrial-400 font-mono">
                                  {item.resultsCount !== undefined && (
                                    <span className="bg-industrial-100 dark:bg-industrial-800 px-1.5 py-0.5 rounded font-bold">
                                      {item.resultsCount} results
                                    </span>
                                  )}
                                  <ArrowRight className="h-3 w-3 text-industrial-300 group-hover:text-brand-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {matchingParts.length > 0 && (
                          <div className="p-2 space-y-1 bg-amber-50/30 dark:bg-amber-950/20">
                            <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 uppercase font-mono">
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-amber-500" />
                                <span>قطع الغيار الشائعة / Frequently Accessed Parts</span>
                              </span>
                            </div>
                            {matchingParts.map((part, idx) => (
                              <div
                                key={part.partNumber ? `matching-${part.partNumber}` : `matching-part-${idx}`}
                                onClick={() => handleInspectPartNumberFromHistory(part.partNumber)}
                                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-industrial-800 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-colors cursor-pointer group shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="font-mono font-bold text-xs text-industrial-900 dark:text-white group-hover:text-amber-600 block truncate">
                                      {part.partNumber}
                                    </span>
                                    {part.description && (
                                      <span className="text-[10px] text-industrial-500 dark:text-industrial-400 block truncate">
                                        {part.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                                    {part.accessCount}x
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleNavigateDirectToMaterial(e, part.partNumber)}
                                    className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900 text-industrial-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                    title="الانتقال المباشر لبطاقة المادة في السجل"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyDirectLink(e, part.partNumber)}
                                    className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900 text-industrial-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                    title="نسخ الرابط المباشر للمادة"
                                  >
                                    {copiedPart === part.partNumber ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Link2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Semantic Match Button */}
          <button
            type="button"
            onClick={handleAiSemanticMatch}
            disabled={isAiMatching || (!universalQuery.trim() && !partQuery.trim())}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-3.5 py-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="مطابقة ذكية بالذكاء الاصطناعي حتى لو كان هناك خطأ إملائي أو رقم غير مكتمل"
          >
            {isAiMatching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="hidden md:inline">جاري المطابقة...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden md:inline">مطابقة دلالية (AI Match)</span>
              </>
            )}
          </button>

          {/* Nearest Substitute Finder Button */}
          <button
            type="button"
            onClick={() => handleFindSubstitutes()}
            disabled={isSearchingSubstitutes || (!universalQuery.trim() && !partQuery.trim() && !modelQuery.trim())}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-4 py-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="البحث عن أقرب بديل هندسي ومقارنة المواصفات ونسبة التطابق"
          >
            {isSearchingSubstitutes ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري البحث عن بدائل...</span>
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" />
                <span>أقرب بديل هندسي (Nearest Substitute)</span>
              </>
            )}
          </button>
        </div>

        {/* Local Storage Search History & Frequently Accessed Parts Bar */}
        <SearchHistoryBar
          onSelectQuery={handleSelectHistoryQuery}
          onInspectPartNumber={handleInspectPartNumberFromHistory}
          currentQuery={universalQuery}
          sourceScope={sourceScope}
          materialsList={materials}
        />
      </div>

      {/* AI Visual Search feedback status */}
      <AnimatePresence>
        {scanStatus.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              scanStatus.status === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {scanStatus.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-medium flex-1">
              {scanStatus.message}
            </div>
            <button 
              onClick={() => setScanStatus({ status: 'idle', message: '' })}
              className="text-industrial-400 hover:text-industrial-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Semantic Match Results Section */}
      {aiMatchResults && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 p-5 rounded-2xl space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-xs font-bold text-purple-900 uppercase font-mono tracking-wider">
                نتائج المطابقة الذكية للذكاء الاصطناعي / Gemini Smart Match Results (الاستعلام: "{aiMatchResults.query}")
              </h3>
            </div>
            <button
              onClick={() => setAiMatchResults(null)}
              className="text-purple-700 hover:text-purple-900 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {aiMatchResults.matches.length === 0 ? (
            <p className="text-xs text-purple-800">
              لم يجد الذكاء الاصطناعي تطابقاً دلالياً في المخزون الحالي لهذا الاستعلام.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {aiMatchResults.matches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleInspectMaterialWithHistory(item.material)}
                  className="bg-white p-3.5 rounded-xl border border-purple-200 hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <a
                        href={`?part=${encodeURIComponent(item.material.partNumber)}`}
                        onClick={(e) => handleNavigateDirectToMaterial(e, item.material.partNumber)}
                        className="font-mono font-bold text-xs text-purple-900 hover:text-purple-700 hover:underline truncate inline-flex items-center gap-1"
                        title="رابط مباشر للمادة في السجل"
                      >
                        <span>{item.material.partNumber}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-70" />
                      </a>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                        مطابقة {Math.round(item.score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-industrial-700 line-clamp-2">
                      {item.material.description}
                    </p>
                  </div>
                  {item.matchReason && (
                    <p className="text-[10px] text-purple-700 bg-purple-50/70 p-1.5 rounded font-sans">
                      💡 {item.matchReason}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-industrial-500 font-mono border-t border-industrial-100 pt-1.5">
                    <span>الموقع: {item.material.store.split(' ')[0]}</span>
                    <span className="font-bold text-industrial-800">الرصيد: {item.material.quantity} {item.material.unit}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-purple-100 text-[10.5px]">
                    <a
                      href={`?part=${encodeURIComponent(item.material.partNumber)}`}
                      onClick={(e) => handleNavigateDirectToMaterial(e, item.material.partNumber)}
                      className="font-bold text-purple-700 hover:text-purple-950 flex items-center gap-1 hover:underline"
                      title="الانتقال المباشر للمادة في سجل المواد"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>رابط المادة في السجل</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleCopyDirectLink(e, item.material.partNumber)}
                      className="text-industrial-500 hover:text-industrial-800 flex items-center gap-1 p-1 rounded-md hover:bg-purple-50 transition-colors"
                      title="نسخ الرابط المباشر للمادة"
                    >
                      {copiedPart === item.material.partNumber ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 font-bold">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3 w-3" />
                          <span className="text-[10px]">نسخ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Filters Form Column */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono pb-2.5 border-b border-industrial-100">
            Query Specifiers
          </h3>

          {/* Material Sequence Number */}
          <div className="space-y-1">
            <label htmlFor="search-seq-input" className="block text-[11px] font-bold text-brand-700 uppercase tracking-wider">
              Material Sequence Number
            </label>
            <input
              id="search-seq-input"
              type="text"
              value={seqQuery}
              onChange={(e) => setSeqQuery(e.target.value)}
              placeholder="e.g. 15, 42..."
              className="w-full bg-brand-50/30 border border-brand-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-brand-900 font-bold"
            />
          </div>

          {/* Part Number */}
          <div className="space-y-1">
            <label htmlFor="search-part-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Part Number / SKU
            </label>
            <input
              id="search-part-input"
              type="text"
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              placeholder="e.g. STM32..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Manufacturer */}
          <div className="space-y-1">
            <label htmlFor="search-mfg-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Manufacturer / Brand
            </label>
            <input
              id="search-mfg-input"
              type="text"
              value={mfgQuery}
              onChange={(e) => setMfgQuery(e.target.value)}
              placeholder="e.g. Texas Instruments..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Model */}
          <div className="space-y-1">
            <label htmlFor="search-model-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Model / Series
            </label>
            <input
              id="search-model-input"
              type="text"
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="e.g. LM2596..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="search-desc-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Description keywords
            </label>
            <input
              id="search-desc-input"
              type="text"
              value={descQuery}
              onChange={(e) => setDescQuery(e.target.value)}
              placeholder="e.g. Microcontroller, SMD..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Quantity Min / Max Range */}
          <div className="space-y-1 border-t border-industrial-100 pt-3">
            <span className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider mb-1.5">
              Stock Quantity Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                placeholder="Min Qty"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                id="search-min-qty"
              />
              <input
                type="number"
                min="0"
                value={maxQty}
                onChange={(e) => setMaxQty(e.target.value)}
                placeholder="Max Qty"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                id="search-max-qty"
              />
            </div>
          </div>
        </div>

        {/* Results Stream Column */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Results count indicator */}
          <div className="bg-white px-5 py-3 rounded-xl border border-industrial-200 shadow-xs flex flex-wrap justify-between items-center text-xs text-industrial-500 font-mono gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-industrial-800">
                {sourceScope === 'ALL' ? '🌐 نتائج البحث الشامل (Unified Cross-Source Results):' :
                 sourceScope === 'EXTERNAL' ? '🔵 نتائج مخزون الشركة الخارجي (External Company Stock):' :
                 sourceScope === 'EQUIPMENT' ? '🟣 نتائج سجل المعدات (Equipment Register):' :
                 sourceScope === 'MRF_WO' ? '🟠 نتائج وثائق التوريد (MR / PO / WO):' :
                 '🟢 نتائج مواد المحطة (Station Materials):'}
              </span>
            </div>
            <span className="font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
              {sourceScope === 'STATION' 
                ? `${matchedMaterials.length} مواد مطابقة في المحطة` 
                : `${unifiedResults.length} سجلات مطابقة عبر الأنظمة`}
            </span>
          </div>

          {/* Render Multi-Source Unified Results when sourceScope !== 'STATION' */}
          {sourceScope !== 'STATION' ? (
            unifiedResults.length === 0 ? (
              <div className="bg-white text-center p-10 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
                <div className="inline-flex p-4 bg-sky-50 text-sky-600 rounded-full border border-sky-200">
                  <Search className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-industrial-900">لم يتم العثور على سجلات مطابقة</p>
                  <p className="text-xs text-industrial-500 max-w-md mx-auto mt-1">
                    لم نجد أي مادة أو معدة أو طلب شراء يطابق معايير البحث في المصادر المحددة. جرب البحث برقم القطعة الجزئي أو اسم الشركة المصنعة.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs bg-industrial-100 hover:bg-industrial-200 text-industrial-700 font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    إعادة ضبط البحث
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unifiedResults.map((item) => {
                  const isExternal = item.source === 'EXTERNAL_STOCK';
                  const isStation = item.source === 'STATION_MATERIAL';
                  const isEquipment = item.source === 'EQUIPMENT';
                  const isMrf = item.source === 'MRF_WO';

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all relative overflow-hidden ${
                        isStation
                          ? 'border-emerald-300 hover:border-emerald-500 ring-1 ring-emerald-400/20'
                          : isExternal
                          ? 'border-sky-300 hover:border-sky-500 ring-1 ring-sky-400/20'
                          : isEquipment
                          ? 'border-purple-300 hover:border-purple-500 ring-1 ring-purple-400/20'
                          : 'border-amber-300 hover:border-amber-500 ring-1 ring-amber-400/20'
                      }`}
                    >
                      {/* Top Badges & Source Type */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          {/* Distinct Source Badge (Green, Blue, Purple, Orange) */}
                          {isStation && (
                            <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>🟢 Station Material (مواد المحطة)</span>
                            </span>
                          )}
                          {isExternal && (
                            <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                              <span>🔵 External Company Stock (مخزون خارجي)</span>
                            </span>
                          )}
                          {isEquipment && (
                            <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              <span>🟣 Plant Equipment (سجل المعدات)</span>
                            </span>
                          )}
                          {isMrf && (
                            <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>🟠 MR & WO (طلبات وأوامر العمل)</span>
                            </span>
                          )}

                          {/* Match Category / Sequence */}
                          <div className="flex items-center gap-1.5">
                            {item.originalSequence !== undefined && (
                              <span className="text-[10px] font-mono font-black text-industrial-800 bg-industrial-100 px-2 py-0.5 rounded border border-industrial-200" title="Original Excel Sequence / الرقم التسلسلي الأصلي">
                                #Seq: {item.originalSequence}
                              </span>
                            )}
                            {item.originalExcelRow !== undefined && (
                              <span className="text-[10px] font-mono font-bold text-industrial-600 bg-industrial-50 px-1.5 py-0.5 rounded border border-industrial-150" title="Excel Row Index / رقم السطر في ملف الإكسل">
                                Row: {item.originalExcelRow}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <div className="mb-2">
                          <h3 className="font-mono font-black text-base text-industrial-900 tracking-tight flex items-baseline justify-between gap-2">
                            {isStation ? (
                              <a
                                href={`?part=${encodeURIComponent(item.title)}`}
                                onClick={(e) => handleNavigateDirectToMaterial(e, item.title)}
                                className="hover:underline text-brand-700 dark:text-brand-400 hover:text-brand-900 inline-flex items-center gap-1 group/title cursor-pointer"
                                title="رابط مباشر للانتقال إلى سجل المادة"
                              >
                                <span>{item.title}</span>
                                <ArrowUpRight className="h-4 w-4 opacity-70 group-hover/title:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <span>{item.title}</span>
                            )}
                            {item.model && (
                              <span className="text-xs font-mono font-semibold text-industrial-500">
                                {item.model}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-industrial-600 leading-relaxed font-sans line-clamp-2 mt-1 min-h-8">
                            {item.subtitle}
                          </p>
                        </div>

                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-industrial-500 border-t border-industrial-100 pt-2.5 mb-3 bg-industrial-50/50 p-2.5 rounded-xl">
                          <div>
                            <span className="text-industrial-400 block uppercase font-bold">Manufacturer / Source:</span>
                            <span className="font-semibold text-industrial-800 block truncate">
                              {item.manufacturer || (isExternal ? item.fileName : 'N/A')}
                            </span>
                          </div>
                          <div>
                            <span className="text-industrial-400 block uppercase font-bold">Location / Store:</span>
                            <span className="font-semibold text-industrial-800 block truncate">
                              {item.warehouseOrLocation}
                            </span>
                          </div>
                        </div>

                        {/* Quantity and Status */}
                        {item.quantity !== undefined && (
                          <div className="flex justify-between items-center text-[10.5px] font-mono bg-industrial-50 p-2.5 rounded-lg border border-industrial-200">
                            <span className="text-industrial-600 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-industrial-400" />
                              {item.warehouseOrLocation}
                            </span>
                            <span className="text-industrial-900 font-bold">
                              Qty: <span className="text-xs font-black text-brand-700">{item.quantity}</span> {item.unit || 'EA'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex flex-wrap justify-between items-center pt-2.5 border-t border-industrial-100 gap-2">
                        {/* Action buttons depending on source */}
                        {isExternal && (
                          <button
                            type="button"
                            onClick={() => setTransferTargetMat(item.rawData as ExternalMaterial)}
                            className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="نقل هذه المادة من مخزن الشركة الخارجي إلى سجل مواد المحطة مع الاحتفاظ بالرقم التسلسلي الأصلي"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span>نقل إلى مواد المحطة / Transfer to Station</span>
                          </button>
                        )}

                        {isStation && (
                          <div className="flex flex-wrap items-center gap-2">
                            {onNavigateToTab && (
                              <a
                                href={`?part=${encodeURIComponent(item.title)}`}
                                onClick={(e) => handleNavigateDirectToMaterial(e, item.title)}
                                className="text-xs bg-brand-700 hover:bg-brand-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                title="الانتقال المباشر للمادة في سجل المواد والمخزن"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>رابط المادة في السجل / Go to Material</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleInspectMaterialWithHistory(item.rawData as Material)}
                              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="معاينة تفاصيل المادة في نافذة منبثقة"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>معاينة / Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCopyDirectLink(e, item.title)}
                              className="text-xs text-industrial-600 hover:text-industrial-900 dark:text-industrial-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors flex items-center gap-1 cursor-pointer border border-industrial-200"
                              title="نسخ الرابط المباشر للمادة"
                            >
                              {copiedPart === item.title ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Link2 className="h-3.5 w-3.5" />
                              )}
                              <span className="text-[10.5px]">
                                {copiedPart === item.title ? 'تم النسخ' : 'نسخ الرابط'}
                              </span>
                            </button>
                          </div>
                        )}

                        {isEquipment && onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('equipment', item.title)}
                            className="text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <Warehouse className="h-3.5 w-3.5" />
                            <span>فتح بطاقة المعدة / View in Register</span>
                          </button>
                        )}

                        {isMrf && onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('mrf-management', item.title)}
                            className="text-xs bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>فتح وثيقة التوريد / View in MRF</span>
                          </button>
                        )}

                        {isStation && (
                          <button
                            type="button"
                            onClick={() => handleFindSubstitutes(item.title)}
                            className="text-[11px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>البحث عن بدائل</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          ) : (
            /* Results grid for Station Materials */
            matchedMaterials.length === 0 ? (
              <div className="bg-white text-center p-10 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
                <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                  <Search className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-industrial-900">لم يتم العثور على تطابق تام (No Exact Match)</p>
                  <p className="text-xs text-industrial-500 max-w-md mx-auto mt-1">
                    لا توجد مادة في المخزون تتطابق 100% مع معايير البحث الحالية. يمكنك تفعيل مكتشف البدائل الذكي للبحث عن أقرب موديل بديل متوفر مع نسبة التوافق وفروقات المواصفات.
                  </p>
                </div>

                {/* Automatic / Fast Substitute Search Trigger */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleFindSubstitutes()}
                    disabled={isSearchingSubstitutes}
                    className="text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSearchingSubstitutes ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scale className="h-4 w-4" />
                    )}
                    <span>🔎 البحث عن أقرب مادة وبديل هندسي متوفر (Find Nearest Substitute)</span>
                  </button>
                  
                  {universalQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleAiSemanticMatch}
                      disabled={isAiMatching}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>مطابقة دلالية بالذكاء الاصطناعي</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs bg-industrial-100 hover:bg-industrial-200 text-industrial-700 font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((result, idx) => {
                  const { material, matchCategory, computedStatus, isBlacklisted, blacklistDetails, priorityRank } = result;
                  return (
                    <motion.div
                      key={`${material.id || (material.sequence !== undefined ? `seq-${material.sequence}` : '') || material.partNumber || 'mat'}-${idx}`}
                      whileHover={{ y: -2 }}
                      className={`bg-white dark:bg-industrial-850 p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                        isBlacklisted
                          ? 'border-rose-400 dark:border-rose-600 ring-1 ring-rose-500 bg-rose-50/20'
                          : priorityRank <= 3
                          ? 'border-brand-300 dark:border-brand-600 ring-1 ring-brand-400/40'
                          : 'border-industrial-200 dark:border-industrial-700 hover:border-brand-300'
                      }`}
                      onClick={() => handleInspectMaterialWithHistory(material)}
                    >
                      {/* Card Top */}
                      <div>
                        {/* Priority Match Badge & Status Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {matchCategory && universalQuery.trim() && (
                              <span className="text-[9.5px] font-mono font-bold bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700 px-2 py-0.5 rounded-md">
                                {priorityRank === 1 ? '🎯 ' : priorityRank === 2 ? '🏷️ ' : priorityRank === 3 ? '🔢 ' : priorityRank === 4 ? '📄 ' : '🔍 '}
                                {matchCategory}
                              </span>
                            )}
                            {material.sequence !== undefined && (
                              <span className="text-[10px] font-mono font-black text-industrial-700 dark:text-industrial-300 bg-industrial-100 dark:bg-industrial-700 px-1.5 py-0.5 rounded">
                                #{material.sequence}
                              </span>
                            )}
                          </div>

                          {getStatusBadge(computedStatus)}
                        </div>

                        {/* Blacklist Warning Ribbon if Flagged */}
                        {isBlacklisted && (
                          <div className="bg-rose-600 text-white text-[10.5px] p-2 rounded-lg font-bold flex items-center gap-1.5 mb-2.5 shadow-xs">
                            <AlertOctagon className="h-4 w-4 shrink-0" />
                            <span>🚫 محظور / Blacklisted: {blacklistDetails?.reason || 'غير مطابق'}</span>
                          </div>
                        )}

                        {/* Part Number & Model */}
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <a
                            href={`?part=${encodeURIComponent(material.partNumber)}`}
                            onClick={(e) => handleNavigateDirectToMaterial(e, material.partNumber)}
                            className="group/pn inline-flex items-center gap-1 font-mono font-bold text-sm text-brand-700 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 hover:underline truncate tracking-tight cursor-pointer"
                            title="رابط مباشر للانتقال إلى بطاقة المادة في السجل"
                          >
                            <span>{material.partNumber}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover/pn:opacity-100 group-hover/pn:translate-x-0.5 group-hover/pn:-translate-y-0.5 transition-all" />
                          </a>
                          {material.model && (
                            <span className="text-xs font-mono font-semibold text-industrial-500 dark:text-industrial-400 truncate">
                              {material.model}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-industrial-600 dark:text-industrial-300 leading-relaxed font-sans line-clamp-2 min-h-8 mb-3">
                          {material.description}
                        </p>

                        {/* MR / MRF / WO Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono">
                          {(material.mrNumber || material.mrf || material.mrfNumber) && (
                            <span className="bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2 py-0.5 rounded">
                              MR: {material.mrNumber || material.mrfNumber || material.mrf}
                            </span>
                          )}
                          {material.workOrder && (
                            <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                              WO: {material.workOrder}
                            </span>
                          )}
                          {material.serialNumber && (
                            <span className="bg-industrial-100 dark:bg-industrial-700 text-industrial-700 dark:text-industrial-300 px-2 py-0.5 rounded">
                              SN: {material.serialNumber}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-industrial-500 dark:text-industrial-400 border-t border-industrial-100 dark:border-industrial-700 pt-2.5 mb-3">
                          <div>
                            <span className="text-industrial-400 block uppercase">Manufacturer:</span>
                            <span className="font-semibold text-industrial-700 dark:text-industrial-200 block truncate">{material.manufacturer}</span>
                          </div>
                          <div>
                            <span className="text-industrial-400 block uppercase">Warehouse / Shelf:</span>
                            <span className="font-semibold text-industrial-700 dark:text-industrial-200 block truncate">
                              {material.store} {material.rack ? `(${material.rack})` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono bg-industrial-50/70 dark:bg-industrial-800/70 p-2.5 rounded-lg border border-industrial-150 dark:border-industrial-700">
                          <span className="text-industrial-500 dark:text-industrial-400 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {material.store.split(' ')[0]}
                          </span>
                          <span className="text-industrial-800 dark:text-industrial-200 font-semibold">
                            Qty: <span className="text-xs font-extrabold text-industrial-900 dark:text-white">{material.quantity}</span> {material.unit}
                          </span>
                        </div>
                      </div>

                      {/* Actions inside card */}
                      <div className="mt-4 flex flex-wrap justify-between items-center pt-2.5 border-t border-industrial-100 dark:border-industrial-700 gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* Direct Material Link Button */}
                          <a
                            href={`?part=${encodeURIComponent(material.partNumber)}`}
                            onClick={(e) => handleNavigateDirectToMaterial(e, material.partNumber)}
                            className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            title="الانتقال المباشر للمادة في سجل المواد والمخزن"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>رابط المادة في السجل / Go to Material</span>
                          </a>

                          {/* Copy Direct Link Button */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyDirectLink(e, material.partNumber)}
                            className="text-xs text-industrial-600 dark:text-industrial-300 hover:text-industrial-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-industrial-100 dark:hover:bg-industrial-800 transition-colors flex items-center gap-1 cursor-pointer border border-industrial-200 dark:border-industrial-700"
                            title="نسخ الرابط المباشر للمادة للمشاركة أو الحفظ"
                          >
                            {copiedPart === material.partNumber ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Link2 className="h-3.5 w-3.5" />
                                <span className="text-[10px]">نسخ</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFindSubstitutes(material.partNumber);
                            }}
                            className="text-[10.5px] text-purple-600 dark:text-purple-400 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                            title="البحث عن البدائل الهندسية المكافئة"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>البدائل</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectMaterialWithHistory(material);
                            }}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>معاينة</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}

          {/* Loading Nearest Substitutes Indicator */}
          {isSearchingSubstitutes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border-2 border-amber-300 p-6 rounded-2xl text-center space-y-3 shadow-sm"
            >
              <div className="inline-flex p-3 bg-amber-100 rounded-full text-amber-700">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
              <h4 className="text-sm font-bold text-amber-900 font-mono">
                جاري تحليل المواصفات والبحث عن أقرب البدائل الهندسية في المخزون...
              </h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                يقوم محرك الذكاء الاصطناعي بمقارنة الموديل، الفولتية، نطاق التشغيل، الإشارة، والأبعاد لحساب نسبة التطابق الفني وتحديد الفروقات.
              </p>
            </motion.div>
          )}

          {/* Dedicated Nearest Substitutes Results Section */}
          {nearestSubstitutes && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 border-2 border-amber-300 p-5 rounded-2xl shadow-sm space-y-5"
            >
              {/* Fallback Notice Banner */}
              {searchNotice && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  isOfflineEngineActive
                    ? 'bg-blue-50/90 text-blue-900 border-blue-200'
                    : 'bg-amber-100/90 text-amber-900 border-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-600 shrink-0 animate-pulse" />
                    <span className="font-mono font-bold">{searchNotice}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 border border-blue-200 text-blue-800">
                    {isOfflineEngineActive ? 'Offline Heuristic Engine' : 'AI Online Gateway'}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950 font-mono flex items-center gap-2">
                      <span>🔎 نتائج أقرب المواد والبدائل الهندسية (Nearest Engineering Substitutes)</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {nearestSubstitutes.length} بدائل مرشحة
                      </span>
                    </h3>
                    <p className="text-xs text-amber-800 font-sans mt-0.5">
                      المواصفات والبحث المستهدف: <span className="font-mono font-bold text-amber-900">"{substituteSearchTarget || 'المواصفات المدخلة'}"</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFindSubstitutes()}
                    disabled={isSearchingSubstitutes}
                    className="text-xs bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSearchingSubstitutes ? 'animate-spin' : ''}`} />
                    <span>تحديث البدائل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNearestSubstitutes(null)}
                    className="p-1.5 rounded-lg hover:bg-amber-200 text-amber-800 cursor-pointer"
                    title="إغلاق قسم البدائل"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Substitute Cards List */}
              {nearestSubstitutes.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-amber-200 text-center text-xs text-amber-900">
                  لم يتم العثور على بدائل هندسية قريبة في المخزون الحالي لهذا الاستعلام.
                </div>
              ) : (
                <div className="space-y-5">
                  {nearestSubstitutes.map((sub, sIdx) => {
                    const isHighCompat = sub.matchScore >= 80;
                    const isModerateCompat = sub.matchScore >= 65 && sub.matchScore < 80;
                    const isExpanded = expandedSubstituteIdx === sIdx;

                    return (
                      <div
                        key={`${sub.nearestPartNumber}-${sIdx}`}
                        className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-xs overflow-hidden transition-all hover:border-amber-400"
                      >
                        {/* Top Info Bar */}
                        <div className="p-4 bg-gradient-to-r from-amber-50/80 to-industrial-50/50 border-b border-industrial-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-black text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-1 rounded-lg">
                              بديل #{sIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-sm text-industrial-900">
                                  {sub.nearestModel}
                                </span>
                                <span className="text-xs text-industrial-500 font-mono">
                                  (PN: {sub.nearestPartNumber})
                                </span>
                              </div>
                              <p className="text-xs text-industrial-600 font-medium">
                                تصنيع: <span className="font-bold text-industrial-800">{sub.material.manufacturer}</span>
                              </p>
                            </div>
                          </div>

                          {/* Match Score Gauge */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-base font-extrabold font-mono ${
                                  isHighCompat ? 'text-emerald-700' : isModerateCompat ? 'text-amber-700' : 'text-blue-700'
                                }`}>
                                  {sub.matchScore}%
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  isHighCompat ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  isModerateCompat ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                  'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}>
                                  {isHighCompat ? 'تطابق عالي' : isModerateCompat ? 'تطابق متوسط' : 'بديل جزئي'}
                                </span>
                              </div>
                              {/* Animated Progress Bar */}
                              <div className="w-28 bg-industrial-200 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isHighCompat ? 'bg-emerald-600' : isModerateCompat ? 'bg-amber-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${sub.matchScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Approval Status Badge */}
                            {sub.approvalStatus === 'approved_in_decisions' || sub.previouslyApproved ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>معتمد بقرار هندسي سابق</span>
                              </span>
                            ) : sub.approvalStatus === 'blacklisted' ? (
                              <span className="bg-red-50 text-red-800 border border-red-300 text-[10.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <AlertOctagon className="h-3.5 w-3.5 text-red-600" />
                                <span>محظور في القائمة السوداء</span>
                              </span>
                            ) : (
                              <span className="bg-amber-100/80 text-amber-900 border border-amber-300 text-[10.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                <span>بانتظار المراجعة والاعتماد</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Details Grid */}
                        <div className="p-4 space-y-4">
                          {/* Stock & Location Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-industrial-50/70 p-3 rounded-xl border border-industrial-150">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-industrial-500 shrink-0" />
                              <div>
                                <span className="text-[10px] text-industrial-400 block uppercase font-mono">الكمية المتوفرة / Quantity</span>
                                <span className="text-xs font-bold text-industrial-900 font-mono">
                                  {sub.availableStock} {sub.stockUnit} {sub.availableStock > 0 ? '(متوفر فوراً)' : '(رصيد صفري)'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-industrial-500 shrink-0" />
                              <div>
                                <span className="text-[10px] text-industrial-400 block uppercase font-mono">المستودع والموقع / Store</span>
                                <span className="text-xs font-semibold text-industrial-800 font-mono">
                                  {sub.storeLocation} ({sub.rackLocation})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-industrial-500 shrink-0" />
                              <div>
                                <span className="text-[10px] text-industrial-400 block uppercase font-mono">مبرر التوافق / Rationale</span>
                                <span className="text-xs text-industrial-750 line-clamp-1">
                                  {sub.compatibilityReason}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Technical Specifications Breakdown (المواصفات الفنية للبديل) */}
                          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                              <Cpu className="h-3.5 w-3.5 text-blue-600" />
                              <span>المواصفات الفنية للبديل (Technical Specifications)</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Part Number:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{sub.material.partNumber}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Material Type:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{sub.material.materialType || sub.material.model || 'Standard'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Inlet Pressure:</span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.inletPressure || 'N/A'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Outlet Pressure:</span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.outletPressure || 'N/A'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Connection:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.connectionSize || ''} {sub.material.connectionType || 'N/A'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Body Material:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.bodyMaterial || 'SS316 / Standard'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Voltage / Power:</span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.voltage || 'Passive / N/A'}</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] text-slate-400 block">Signal / Protocol:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{sub.material.signalType || 'Direct Mechanical'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Similarity Breakdown Badges */}
                          {sub.similarityBreakdown && (
                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                              <span className="text-[10.5px] font-bold text-amber-900 block mb-1.5">
                                تفصيل نسب ومحاور التشابه (Similarity Breakdown):
                              </span>
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                                  sub.similarityBreakdown.typeMatch ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  Type: {sub.similarityBreakdown.typeMatch ? '✓ Exact Match' : '≠ Different'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                                  sub.similarityBreakdown.pressureMatch ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  Pressure: {sub.similarityBreakdown.pressureMatch ? '✓ Matching' : '⚠️ Minor Delta'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                                  sub.similarityBreakdown.connectionMatch ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  Connection: {sub.similarityBreakdown.connectionMatch ? '✓ Compatible' : '⚠️ Requires Adaptor'}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg border font-mono ${
                                  sub.similarityBreakdown.manufacturerMatch ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  Brand: {sub.similarityBreakdown.manufacturerMatch ? '✓ Same OEM' : '≠ Cross-Brand'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* PREVIOUSLY APPROVED ENGINEERING DECISION INTEGRATION */}
                          {(sub.previouslyApproved || sub.approvedDecision) && (
                            <div className="bg-emerald-50/90 border-2 border-emerald-400 p-4 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                  <span>بديل معتمد رسمياً في قرارات الإدارة الهندسية السابقة (Previously Approved Alternative)</span>
                                </div>
                                <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                  Approved Decision
                                </span>
                              </div>
                              {sub.approvedDecision && (
                                <div className="text-xs text-emerald-800 space-y-1 pt-1 border-t border-emerald-200/80">
                                  <p className="font-semibold text-emerald-950">
                                    عنوان القرار: {sub.approvedDecision.title}
                                  </p>
                                  <p className="text-[11px]">
                                    المسوغ الهندسي: {sub.approvedDecision.rationale || sub.approvedDecision.details}
                                  </p>
                                  <div className="flex items-center gap-4 text-[10px] text-emerald-700 font-mono mt-1">
                                    <span>المعتمد: {sub.approvedDecision.approvedBy}</span>
                                    <span>التاريخ: {new Date(sub.approvedDecision.approvalDate).toLocaleDateString('ar-EG')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Technical Differences & Variations Table */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-industrial-800 flex items-center gap-1.5">
                                <Scale className="h-3.5 w-3.5 text-brand-600" />
                                <span>جدول الفروقات والمواصفات الفنية (Technical Differences & Variations)</span>
                              </h4>
                              <span className="text-[10.5px] text-industrial-500 font-mono">
                                {sub.differences.length} عناصر مقارنة
                              </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-industrial-200">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-industrial-100/80 text-industrial-700 font-mono text-[10.5px]">
                                  <tr>
                                    <th className="p-2.5 font-bold">المعيار الفني (Parameter)</th>
                                    <th className="p-2.5 font-bold text-industrial-600">المطلوب في الاستعلام (Requested)</th>
                                    <th className="p-2.5 font-bold text-brand-700">المواصفة في البديل المتاح (Candidate)</th>
                                    <th className="p-2.5 font-bold text-center">الأثر التشغيلي (Impact)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-industrial-150 font-sans">
                                  {sub.differences.map((diff, dIdx) => (
                                    <tr key={dIdx} className="hover:bg-industrial-50/50">
                                      <td className="p-2.5 font-semibold text-industrial-900 font-mono">
                                        {diff.feature}
                                      </td>
                                      <td className="p-2.5 text-industrial-600 bg-industrial-50/30">
                                        {diff.requested}
                                      </td>
                                      <td className="p-2.5 font-semibold text-brand-900 bg-brand-50/20">
                                        {diff.candidate}
                                      </td>
                                      <td className="p-2.5 text-center font-mono">
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                          diff.impact === 'favorable' ? 'bg-emerald-100 text-emerald-800' :
                                          diff.impact === 'low' ? 'bg-sky-100 text-sky-800' :
                                          diff.impact === 'medium' ? 'bg-amber-100 text-amber-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {diff.impact === 'favorable' ? 'إيجابي (Favorable)' :
                                           diff.impact === 'low' ? 'أثر منخفض (Low)' :
                                           diff.impact === 'medium' ? 'أثر متوسط (Medium)' : 'حرج (Critical)'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Summary Note */}
                            {sub.differencesSummary && (
                              <p className="text-xs text-industrial-700 bg-amber-50/60 border border-amber-200/70 p-2.5 rounded-lg mt-2.5 font-sans leading-relaxed">
                                💡 <span className="font-bold text-amber-950">ملخص التوافق والتعديل المطلوب:</span> {sub.differencesSummary}
                              </p>
                            )}
                          </div>

                          {/* MANDATORY ENGINEERING REVIEW WARNING BOX */}
                          <div className="bg-amber-100/70 border-2 border-amber-400/90 p-3.5 rounded-xl flex items-start gap-3 shadow-3xs">
                            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                            <div className="text-xs text-amber-950 leading-relaxed">
                              <span className="font-extrabold block text-amber-900 mb-0.5">
                                ⚠️ تنبيه هندسي إلزامي (Mandatory Engineering Review Advisory):
                              </span>
                              {sub.engineeringAdvisory || 'هذا البديل مرشح بناءً على حسابات التقارب الفني، ويتطلب مراجعة واعتماد المهندس المختص قبل التركيب الميداني.'}
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-industrial-100">
                            <div className="flex items-center gap-2">
                              {sub.approvalStatus !== 'approved_in_decisions' && !sub.previouslyApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDecisionModal(sub)}
                                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                  <FileCheck className="h-3.5 w-3.5" />
                                  <span>تسجيل واعتماد كبديل رسمي (Approve Decision)</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenCompareModal(sub)}
                                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>مقارنة داتاشيت بالذكاء الاصطناعي</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {onNavigateToTab && (
                                <a
                                  href={`?part=${encodeURIComponent(sub.material.partNumber)}`}
                                  onClick={(e) => handleNavigateDirectToMaterial(e, sub.material.partNumber)}
                                  className="text-xs bg-brand-700 hover:bg-brand-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                  title="الانتقال المباشر للمادة في سجل المواد والمخزن"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>رابط المادة في السجل</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => onInspectMaterial(sub.material)}
                                className="text-xs text-brand-700 hover:text-brand-800 font-bold bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3.5 py-2 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>معاينة بطاقة المادة بالكامل (#{sub.material.sequence || sub.material.partNumber})</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Decision Approval Modal */}
      <AnimatePresence>
        {approvingSubstitute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-industrial-200 shadow-xl max-w-xl w-full p-6 space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-industrial-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-industrial-900 font-mono">
                      تسجيل قرار اعتماد بديل هندسي (Register Engineering Decision)
                    </h3>
                    <p className="text-xs text-industrial-500 font-sans">
                      توثيق بديل الصنف رسمياً في سجل قرارات الإدارة الهندسية وقواعد البيانات
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setApprovingSubstitute(null)}
                  className="p-1 rounded-lg hover:bg-industrial-100 text-industrial-400 hover:text-industrial-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {decisionSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p>{decisionSuccessMsg}</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-industrial-700 mb-1">
                      عنوان القرار الهندسي:
                    </label>
                    <input
                      type="text"
                      value={decisionTitle}
                      onChange={(e) => setDecisionTitle(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 px-3 py-2 rounded-lg font-semibold text-industrial-900 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-industrial-700 mb-1">
                      المبرر الفني ونسبة التوافق (Technical Rationale):
                    </label>
                    <textarea
                      rows={2}
                      value={decisionRationale}
                      onChange={(e) => setDecisionRationale(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-industrial-700 mb-1">
                      تفاصيل الاعتماد والملاحظات الميدانية:
                    </label>
                    <textarea
                      rows={2}
                      value={decisionDetails}
                      onChange={(e) => setDecisionDetails(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                    />
                  </div>

                  <div className="bg-industrial-50 p-2.5 rounded-lg border border-industrial-200 flex justify-between items-center text-[10.5px] font-mono text-industrial-600">
                    <span>المعتمد: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
                    <span>التاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-industrial-100">
                    <button
                      type="button"
                      onClick={() => setApprovingSubstitute(null)}
                      className="px-4 py-2 rounded-xl text-industrial-600 hover:bg-industrial-100 font-semibold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitDecision}
                      disabled={isSubmittingDecision || !decisionTitle.trim()}
                      className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingDecision ? 'جاري التوثيق...' : 'تأكيد واعتماد القرار رسمياً'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Datasheet Comparison Modal */}
      <AnimatePresence>
        {comparisonModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-industrial-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-industrial-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-industrial-900 font-mono">
                      مقارنة الداتاشيت بالذكاء الاصطناعي (AI Datasheet Comparison)
                    </h3>
                    <p className="text-xs text-industrial-500 font-sans">
                      تحليل معمق بين المواصفة المستهدفة والمادة البديلة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setComparisonModalItem(null)}
                  className="p-1 rounded-lg hover:bg-industrial-100 text-industrial-400 hover:text-industrial-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {comparisonModalItem.isLoading ? (
                <div className="text-center py-12 space-y-3">
                  <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-industrial-700">جاري مقارنة المواصفات الفنية عبر محرك Gemini...</p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Verdict Banner */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    comparisonModalItem.result?.verdict === 'compatible' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    comparisonModalItem.result?.verdict === 'conditional' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <Scale className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm mb-0.5">
                        نتيجة التقييم الفني: {
                          comparisonModalItem.result?.verdict === 'compatible' ? 'توافق تشغيلي تام (Compatible)' :
                          comparisonModalItem.result?.verdict === 'conditional' ? 'توافق مشروط بتعديلات بسيطة (Conditional)' :
                          'بديل وظيفي جزئي (Alternative)'
                        }
                      </div>
                      <p className="text-xs leading-relaxed">
                        {comparisonModalItem.result?.recommendation || comparisonModalItem.substitute.compatibilityReason}
                      </p>
                    </div>
                  </div>

                  {/* Summary of Technical differences */}
                  <div className="bg-industrial-50 p-3.5 rounded-xl border border-industrial-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-industrial-700 block uppercase font-mono">
                      📋 ملخص الفروقات الهندسية:
                    </span>
                    <p className="text-xs text-industrial-800 leading-relaxed">
                      {comparisonModalItem.result?.differencesSummary || comparisonModalItem.substitute.differencesSummary}
                    </p>
                  </div>

                  {/* Advisory */}
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{comparisonModalItem.substitute.engineeringAdvisory}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-industrial-100">
                    <button
                      type="button"
                      onClick={() => setComparisonModalItem(null)}
                      className="px-4 py-2 bg-industrial-100 hover:bg-industrial-200 text-industrial-800 font-bold rounded-xl cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* External Material Transfer to Station Ledger Modal */}
      <AnimatePresence>
        {transferTargetMat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-industrial-200 shadow-2xl max-w-xl w-full p-6 space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-industrial-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-industrial-900 font-mono">
                      نقل مادة من المخزون الخارجي إلى سجل مواد المحطة (Transfer to Station)
                    </h3>
                    <p className="text-xs text-industrial-500 font-sans">
                      الاحتفاظ بالتسلسل الأصلي وتحديث الموقع الهندسي بالمحطة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTransferTargetMat(null);
                    setTransferFeedback(null);
                  }}
                  className="p-1 rounded-lg hover:bg-industrial-100 text-industrial-400 hover:text-industrial-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {transferFeedback && (
                <div className={`p-4 rounded-xl border text-xs font-bold space-y-1.5 ${
                  transferFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {transferFeedback.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                    )}
                    <span>{transferFeedback.message}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                {/* Material Source Overview Box */}
                <div className="p-3.5 bg-industrial-50 rounded-xl border border-industrial-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-industrial-900 text-sm">{transferTargetMat.partNumber}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                        #Seq: {transferTargetMat.sequence !== undefined ? transferTargetMat.sequence : transferTargetMat.originalSequence}
                      </span>
                      <span className="bg-industrial-200 text-industrial-800 px-2 py-0.5 rounded">
                        Row: {transferTargetMat.originalExcelRow}
                      </span>
                    </div>
                  </div>
                  <p className="text-industrial-600 font-sans text-xs">{transferTargetMat.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono text-industrial-600 pt-1 border-t border-industrial-200">
                    <div>
                      <span className="text-industrial-400 block uppercase">الملف الأصلي:</span>
                      <span className="font-bold text-industrial-800 truncate block">{transferTargetMat.fileName}</span>
                    </div>
                    <div>
                      <span className="text-industrial-400 block uppercase">الكمية المتوفرة:</span>
                      <span className="font-bold text-industrial-800">{transferTargetMat.quantity} {transferTargetMat.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Target Store selection */}
                <div>
                  <label className="block text-[11px] font-bold text-industrial-700 mb-1">
                    اختر مخزن المحطة المستهدف (Target Station Store):
                  </label>
                  <select
                    value={targetStationStore}
                    onChange={(e) => setTargetStationStore(e.target.value)}
                    className="w-full bg-industrial-50 border border-industrial-200 px-3 py-2 rounded-lg font-semibold text-industrial-900 focus:outline-none focus:ring-1.5 focus:ring-sky-500"
                  >
                    <option value="Main Warehouse (المخزن الرئيسي)">Main Warehouse (المخزن الرئيسي)</option>
                    <option value="Electrical Store (مخزن الكهرباء)">Electrical Store (مخزن الكهرباء)</option>
                    <option value="Mechanical Store (مخزن الميكانيك)">Mechanical Store (مخزن الميكانيك)</option>
                    <option value="Instrument Store (مخزن الآلات الدقيقة)">Instrument Store (مخزن الآلات الدقيقة)</option>
                    <option value="Chemical Store (مخزن المواد الكيميائية)">Chemical Store (مخزن المواد الكيميائية)</option>
                    <option value="Safety & Fire Store (مخزن السلامة والإطفاء)">Safety & Fire Store (مخزن السلامة والإطفاء)</option>
                  </select>
                </div>

                {/* Min stock level */}
                <div>
                  <label className="block text-[11px] font-bold text-industrial-700 mb-1">
                    الحد الأدنى للرصيد بالمحطة (Min Stock Level):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetMinStock}
                    onChange={(e) => setTargetMinStock(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-industrial-50 border border-industrial-200 px-3 py-2 rounded-lg font-semibold text-industrial-900 focus:outline-none focus:ring-1.5 focus:ring-sky-500 font-mono"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 leading-relaxed">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ملاحظة هندسية:</strong> سيتم إدراج المادة في سجل مواد المحطة مع الحفاظ على تسلسلها الأصلي (#{transferTargetMat.sequence !== undefined ? transferTargetMat.sequence : transferTargetMat.originalSequence}) وربطها برقم الملف الأصلي للتوثيق المرجعي.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-industrial-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferTargetMat(null);
                      setTransferFeedback(null);
                    }}
                    className="px-4 py-2 rounded-xl text-industrial-600 hover:bg-industrial-100 font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTransfer}
                    disabled={transferLoading}
                    className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {transferLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>جاري التحويل...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>تأكيد النقل إلى سجل المحطة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Copied Direct Link Toast */}
      <AnimatePresence>
        {copiedPart && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-industrial-950/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">تم نسخ الرابط المباشر للمادة بنجاح!</p>
              <p className="text-[11px] font-mono text-industrial-300">
                يمكنك مشاركة الرابط أو فتحه للوصول المباشر إلى المادة: <span className="text-white font-bold">{copiedPart}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
