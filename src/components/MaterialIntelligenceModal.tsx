/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Globe,
  Languages,
  Search,
  FileText,
  Image as ImageIcon,
  BrainCircuit,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Building2,
  Layers,
  History,
  RefreshCw,
  Save,
  Check,
  FileDown,
  Info,
  Compass,
  Tag,
  AlertOctagon,
  Copy
} from 'lucide-react';
import { 
  Material, 
  User, 
  UserRole,
  MaterialTranslation, 
  WebEvidenceSource, 
  DatasheetSearchResult, 
  MaterialImageResult, 
  MaterialIntelligenceResult, 
  MaterialSearchHistoryItem,
  ManufacturerIntelligence 
} from '../types';
import { materialIntelligenceService } from '../services/materialIntelligenceService';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService } from '../services/dbService';

interface MaterialIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: Material | null;
  customQuery?: string;
  currentUser?: User | null;
  onMaterialUpdated?: (updated: Material) => void;
  onApplyArabicTranslation?: (arabicText: string) => void;
}

type TabType = 'overview' | 'translation' | 'evidence' | 'images' | 'datasheets' | 'ai_analysis' | 'history';

export default function MaterialIntelligenceModal({
  isOpen,
  onClose,
  material,
  customQuery,
  currentUser,
  onMaterialUpdated,
  onApplyArabicTranslation
}: MaterialIntelligenceModalProps) {
  const { language, isRTL, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [targetManufacturer, setTargetManufacturer] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [targetPartNumber, setTargetPartNumber] = useState('');

  // Loaded Intelligence State
  const [intelResult, setIntelResult] = useState<MaterialIntelligenceResult | null>(null);
  const [translation, setTranslation] = useState<MaterialTranslation | null>(null);
  const [webSources, setWebSources] = useState<WebEvidenceSource[]>([]);
  const [datasheets, setDatasheets] = useState<DatasheetSearchResult[]>([]);
  const [images, setImages] = useState<MaterialImageResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<MaterialSearchHistoryItem[]>([]);

  // Loading States
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [isSearchingDatasheets, setIsSearchingDatasheets] = useState(false);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  
  // Save Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Initialize query parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      if (material) {
        setSearchQuery(material.description || material.name || '');
        setTargetManufacturer(material.manufacturer || '');
        setTargetModel(material.model || '');
        setTargetPartNumber(material.partNumber || '');
        // Trigger auto initial analysis
        runInitialAnalysis(material);
      } else if (customQuery) {
        setSearchQuery(customQuery);
        runQuerySearch(customQuery);
      }
      loadHistory();
    }
  }, [isOpen, material, customQuery]);

  const loadHistory = async () => {
    const history = await materialIntelligenceService.getSearchHistory();
    setSearchHistory(history);
  };

  const runInitialAnalysis = async (mat: Material) => {
    setIsLoadingIntel(true);
    try {
      // 1. Instant Translation & Technical Meaning
      const trans = await materialIntelligenceService.translateMaterialText(
        mat.description || mat.name || '',
        'en',
        'ar',
        mat.id
      );
      setTranslation(trans);

      // 2. Deep Intelligence & Evidence Heuristic
      const intel = await materialIntelligenceService.analyzeMaterial(mat);
      setIntelResult(intel);

      // If intel has web sources or datasheets, update
      if (intel.webSources && intel.webSources.length > 0) {
        setWebSources(intel.webSources);
      }
    } catch (e) {
      console.error('Failed to run initial material intelligence:', e);
    } finally {
      setIsLoadingIntel(false);
    }
  };

  const runQuerySearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoadingIntel(true);
    try {
      const trans = await materialIntelligenceService.translateMaterialText(queryText, 'en', 'ar');
      setTranslation(trans);

      const fakeMaterial: Material = {
        id: `query_${Date.now()}`,
        name: queryText,
        description: queryText,
        partNumber: targetPartNumber || 'QUERY-TERM',
        manufacturer: targetManufacturer || 'OEM',
        model: targetModel || '',
        category: 'Instrumentation',
        quantity: 1,
        unit: 'EA',
        store: 'Central Warehouse',
        rack: 'R-01',
        shelf: 'S-01',
        notes: 'Manual Query',
        minStockLevel: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const intel = await materialIntelligenceService.analyzeMaterial(fakeMaterial);
      setIntelResult(intel);
    } catch (e) {
      console.error('Query search failed:', e);
    } finally {
      setIsLoadingIntel(false);
    }
  };

  const handleFetchWebEvidence = async () => {
    setIsSearchingWeb(true);
    try {
      const res = await materialIntelligenceService.searchWebEvidence({
        query: searchQuery,
        manufacturer: targetManufacturer || material?.manufacturer,
        model: targetModel || material?.model,
        partNumber: targetPartNumber || material?.partNumber,
        description: searchQuery || material?.description
      });
      setWebSources(res.webSources || []);
      if (res.webSources && res.webSources.length > 0 && intelResult) {
        // Re-analyze with new web evidence
        const tempMat: Material = material || {
          id: 'temp',
          name: searchQuery,
          description: searchQuery,
          partNumber: targetPartNumber || 'TEMP-PART',
          manufacturer: targetManufacturer || 'OEM',
          model: targetModel || '',
          category: 'General',
          quantity: 1,
          unit: 'EA',
          store: 'Main Store',
          rack: 'A',
          shelf: '1',
          notes: 'Web Search',
          minStockLevel: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const updated = await materialIntelligenceService.analyzeMaterial(tempMat, res.webSources);
        setIntelResult(updated);
      }
      loadHistory();
    } catch (e) {
      console.error('Error fetching web evidence:', e);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleFetchDatasheets = async () => {
    setIsSearchingDatasheets(true);
    try {
      const res = await materialIntelligenceService.findDatasheets({
        manufacturer: targetManufacturer || material?.manufacturer,
        model: targetModel || material?.model,
        partNumber: targetPartNumber || material?.partNumber,
        description: searchQuery || material?.description
      });
      setDatasheets(res.datasheets || []);
    } catch (e) {
      console.error('Error finding datasheets:', e);
    } finally {
      setIsSearchingDatasheets(false);
    }
  };

  const handleFetchImages = async () => {
    setIsSearchingImages(true);
    try {
      const res = await materialIntelligenceService.searchReferenceImages({
        query: searchQuery,
        manufacturer: targetManufacturer || material?.manufacturer,
        model: targetModel || material?.model,
        partNumber: targetPartNumber || material?.partNumber
      });
      setImages(res.images || []);
    } catch (e) {
      console.error('Error finding images:', e);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSaveTranslationToMaterial = () => {
    if (!material || !translation) return;

    try {
      const activeUser: User = currentUser || {
        id: 'usr-admin',
        name: 'Authorized Engineer',
        role: UserRole.ADMIN,
        email: 'admin@emis.com'
      };

      const updatedMaterial: Material = {
        ...material,
        arabicDescription: translation.translatedText,
        technicalMeaningArabic: translation.technicalMeaning || material.technicalMeaningArabic,
        engineeringNotes: material.engineeringNotes 
          ? `${material.engineeringNotes}\n[Arabic Definition: ${translation.translatedText}]` 
          : `[Arabic Definition: ${translation.translatedText}]`
      };

      // Save to database
      dbService.updateMaterial(updatedMaterial, activeUser);

      // Audit Log
      dbService.logActivity({
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        action: 'update',
        details: `Saved technical Arabic translation for part [${material.partNumber}]: "${translation.translatedText}" (Source: ${translation.source})`
      });

      if (onMaterialUpdated) {
        onMaterialUpdated(updatedMaterial);
      }

      if (onApplyArabicTranslation) {
        onApplyArabicTranslation(translation.translatedText);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save translation to material record:', e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  const currentDesc = searchQuery || material?.description || material?.name || 'Industrial Material';
  const confidence = translation?.confidence || intelResult?.confidence || 'HIGH';
  const isUnknown = confidence === 'UNKNOWN' || intelResult?.evidenceLevel === 'Unknown';

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t('verified')} (High Confidence)</span>
          </span>
        );
      case 'MEDIUM':
      case 'Likely':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{t('likely')} (Standard Match)</span>
          </span>
        );
      case 'LOW':
      case 'Possible':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <Info className="h-3.5 w-3.5" />
            <span>{t('possible')} (Inferred)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{t('unknown')} (Unverified)</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-industrial-950/80 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-industrial-900 border border-industrial-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] text-industrial-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-industrial-750 bg-industrial-850 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-mono font-bold">
                <BrainCircuit className="h-3.5 w-3.5 text-brand-400" />
                <span>EMIS PORT 9 • MATERIAL INTELLIGENCE</span>
              </span>

              {material?.partNumber && (
                <span className="font-mono text-xs font-bold px-2 py-0.8 bg-industrial-800 rounded border border-industrial-700 text-industrial-200">
                  PN: {material.partNumber}
                </span>
              )}

              {getConfidenceBadge(intelResult?.evidenceLevel || confidence)}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
              <span>{currentDesc}</span>
            </h3>

            {translation?.translatedText && (
              <p className="text-sm font-semibold text-brand-300 flex items-center gap-2" dir="rtl">
                <Languages className="h-4 w-4 text-brand-400 shrink-0" />
                <span>{translation.translatedText}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => runInitialAnalysis(material || {
                id: 'temp',
                name: searchQuery,
                description: searchQuery,
                partNumber: targetPartNumber || 'TEMP-PART',
                manufacturer: targetManufacturer || 'OEM',
                model: targetModel || '',
                category: 'General',
                quantity: 1,
                unit: 'EA',
                store: 'Main',
                rack: 'A',
                shelf: '1',
                notes: 'Manual',
                minStockLevel: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })}
              disabled={isLoadingIntel}
              className="p-2 bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 rounded-xl text-industrial-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Intelligence / تحديث التحليل"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingIntel ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-industrial-400 hover:text-white hover:bg-industrial-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search / Refine Bar */}
        <div className="px-4 py-3 bg-industrial-950/60 border-b border-industrial-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs shrink-0">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-industrial-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 bg-industrial-900 border border-industrial-750 rounded-lg text-white placeholder-industrial-500 focus:outline-hidden focus:border-brand-500 text-xs"
            />
          </div>
          <div>
            <input
              type="text"
              value={targetManufacturer}
              onChange={(e) => setTargetManufacturer(e.target.value)}
              placeholder="Manufacturer (e.g. Rosemount)"
              className="w-full px-3 py-1.5 bg-industrial-900 border border-industrial-750 rounded-lg text-white placeholder-industrial-500 focus:outline-hidden focus:border-brand-500 text-xs"
            />
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={targetPartNumber}
              onChange={(e) => setTargetPartNumber(e.target.value)}
              placeholder="Part Number (PN)"
              className="w-full px-3 py-1.5 bg-industrial-900 border border-industrial-750 rounded-lg text-white placeholder-industrial-500 focus:outline-hidden focus:border-brand-500 text-xs"
            />
            <button
              onClick={() => runQuerySearch(searchQuery)}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {t('search')}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 border-b border-industrial-750 bg-industrial-850/50 text-xs font-bold scrollbar-none shrink-0">
          {[
            { id: 'overview', label: 'الاستخبارات الفنية / Intelligence Overview', icon: BrainCircuit },
            { id: 'translation', label: 'الترجمة المتخصصة / Translation', icon: Languages },
            { id: 'evidence', label: `أدلة الويب (${webSources.length})`, icon: Globe },
            { id: 'datasheets', label: `أوراق البيانات (${datasheets.length})`, icon: FileText },
            { id: 'images', label: `الصور والرسومات (${images.length})`, icon: ImageIcon },
            { id: 'ai_analysis', label: 'التحقق ومطابقة التعارضات / AI Audit', icon: ShieldCheck },
            { id: 'history', label: `السجل (${searchHistory.length})`, icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  if (tab.id === 'evidence' && webSources.length === 0) handleFetchWebEvidence();
                  if (tab.id === 'datasheets' && datasheets.length === 0) handleFetchDatasheets();
                  if (tab.id === 'images' && images.length === 0) handleFetchImages();
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-300 bg-brand-500/10'
                    : 'border-transparent text-industrial-400 hover:text-industrial-200 hover:bg-industrial-800/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Unknown Material Warning if ambiguous */}
              {isUnknown && (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">{t('unknownMaterial')}</h4>
                    <p className="text-industrial-300 leading-relaxed">{t('unknownMaterialDesc')}</p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleFetchWebEvidence}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Search className="h-3 w-3" />
                        <span>{t('searchWeb')}</span>
                      </button>
                      <button
                        onClick={handleFetchDatasheets}
                        className="px-3 py-1 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{t('findDatasheet')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Technical Profile Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Multilingual Identity */}
                <div className="p-4 rounded-xl border border-industrial-750 bg-industrial-850/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Languages className="h-4 w-4 text-brand-400" />
                      <span>الهوية الفنية متعددة اللغات</span>
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-800 text-industrial-400">
                      EN ↔ AR
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-industrial-400 text-[10px] block font-mono">Original Description (English):</span>
                      <p className="font-semibold text-industrial-100 text-xs bg-industrial-900/80 p-2 rounded-lg border border-industrial-800">
                        {currentDesc}
                      </p>
                    </div>

                    <div dir="rtl">
                      <span className="text-industrial-400 text-[10px] block font-mono text-right">الوصف الفني المعتمد (العربية):</span>
                      <p className="font-bold text-brand-300 text-sm bg-industrial-900/80 p-2 rounded-lg border border-brand-500/30">
                        {translation?.translatedText || intelResult?.arabicName || 'جاري التحليل...'}
                      </p>
                    </div>

                    <div dir="rtl">
                      <span className="text-industrial-400 text-[10px] block font-mono text-right">المعنى الهندسي والوظيفة التشغيلية:</span>
                      <p className="text-industrial-300 text-xs leading-relaxed bg-industrial-900/60 p-2.5 rounded-lg border border-industrial-800">
                        {translation?.technicalMeaning || intelResult?.technicalMeaningArabic || 'يقوم هذا الجهاز بقياس المتغيرات التشغيلية في المنشآت الهندسية.'}
                      </p>
                    </div>
                  </div>

                  {material && (
                    <div className="pt-2 flex items-center justify-between border-t border-industrial-800">
                      <span className="text-[10px] text-industrial-400">
                        {translation?.source === 'DICTIONARY' ? 'المصدر: قاموس معتمد' : 'المصدر: استخبارات الذكاء الاصطناعي'}
                      </span>
                      <button
                        onClick={handleSaveTranslationToMaterial}
                        disabled={saveSuccess}
                        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          saveSuccess 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
                        }`}
                      >
                        {saveSuccess ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                        <span>{saveSuccess ? t('translationSaved') : t('saveTranslation')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Card: Equipment Specs & OEM Directory */}
                <div className="p-4 rounded-xl border border-industrial-750 bg-industrial-850/60 space-y-3">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    <span>الشركة المصنعة والمواصفات الفنية المعتمدة</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-industrial-900/80 rounded-lg border border-industrial-800">
                      <span className="text-industrial-400 text-[10px] block">Manufacturer / المصنع:</span>
                      <span className="font-bold text-white">{targetManufacturer || material?.manufacturer || intelResult?.manufacturer || 'OEM'}</span>
                    </div>

                    <div className="p-2 bg-industrial-900/80 rounded-lg border border-industrial-800">
                      <span className="text-industrial-400 text-[10px] block">Model / الطراز:</span>
                      <span className="font-bold text-white">{targetModel || material?.model || intelResult?.model || 'Standard'}</span>
                    </div>

                    <div className="p-2 bg-industrial-900/80 rounded-lg border border-industrial-800">
                      <span className="text-industrial-400 text-[10px] block">Part Number (PN):</span>
                      <span className="font-mono font-bold text-brand-300">{targetPartNumber || material?.partNumber || intelResult?.partNumber || 'N/A'}</span>
                    </div>

                    <div className="p-2 bg-industrial-900/80 rounded-lg border border-industrial-800">
                      <span className="text-industrial-400 text-[10px] block">Category / التصنيف:</span>
                      <span className="font-semibold text-industrial-200">{material?.category || intelResult?.category || 'Instrumentation'}</span>
                    </div>
                  </div>

                  {intelResult?.knownSpecifications && Object.keys(intelResult.knownSpecifications).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono text-industrial-400 uppercase tracking-wider block">
                        Known Standard Specifications:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {Object.entries(intelResult.knownSpecifications).map(([k, v]) => (
                          <div key={k} className="p-1.5 bg-industrial-900/50 rounded border border-industrial-800/80 flex items-center justify-between">
                            <span className="text-industrial-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-mono font-semibold text-industrial-200">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {intelResult?.manufacturerInfo && (
                    <div className="p-2.5 rounded-lg bg-brand-950/30 border border-brand-500/30 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-300 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{intelResult.manufacturerInfo.name}</span>
                        </span>
                        {intelResult.manufacturerInfo.officialWebsite && (
                          <a
                            href={intelResult.manufacturerInfo.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 hover:text-brand-300 flex items-center gap-1 underline"
                          >
                            <span>Official Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {intelResult.manufacturerInfo.headquarters && (
                        <p className="text-industrial-400">HQ: {intelResult.manufacturerInfo.headquarters}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button
                  onClick={() => {
                    setActiveTab('evidence');
                    handleFetchWebEvidence();
                  }}
                  className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-industrial-400 group-hover:text-brand-400 mb-1">
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px] font-mono">Web</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">{t('searchWeb')}</h5>
                  <p className="text-[10px] text-industrial-400">Official catalog evidence</p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('datasheets');
                    handleFetchDatasheets();
                  }}
                  className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-industrial-400 group-hover:text-emerald-400 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px] font-mono">PDF</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">{t('findDatasheet')}</h5>
                  <p className="text-[10px] text-industrial-400">OEM specs & wiring</p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('images');
                    handleFetchImages();
                  }}
                  className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-industrial-400 group-hover:text-purple-400 mb-1">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-[10px] font-mono">Visuals</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">{t('searchImages')}</h5>
                  <p className="text-[10px] text-industrial-400">Reference diagrams</p>
                </button>

                <button
                  onClick={() => setActiveTab('ai_analysis')}
                  className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-industrial-400 group-hover:text-amber-400 mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-mono">Audit</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">Conflict Audit</h5>
                  <p className="text-[10px] text-industrial-400">ISO standard check</p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSLATION */}
          {activeTab === 'translation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-industrial-750 bg-industrial-850/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Languages className="h-4 w-4 text-brand-400" />
                    <span>الترجمة الفنية التخصصية والمصطلحات الهندسية القياسية</span>
                  </h4>
                  {translation && getConfidenceBadge(translation.confidence)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-industrial-900 border border-industrial-800 space-y-2">
                    <span className="text-industrial-400 text-[10px] font-mono uppercase block">Original Term (EN):</span>
                    <p className="text-sm font-bold text-white font-mono">{currentDesc}</p>
                    <button
                      onClick={() => handleCopy(currentDesc)}
                      className="text-[10px] text-industrial-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedText ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-industrial-900 border border-brand-500/30 space-y-2" dir="rtl">
                    <span className="text-industrial-400 text-[10px] font-mono uppercase block text-right">الترجمة الصناعية المعتمدة (AR):</span>
                    <p className="text-sm font-bold text-brand-300">{translation?.translatedText || '...'}</p>
                    <button
                      onClick={() => handleCopy(translation?.translatedText || '')}
                      className="text-[10px] text-industrial-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedText ? 'تم النسخ' : 'نسخ النص'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-industrial-900 border border-industrial-800 space-y-1.5" dir="rtl">
                  <span className="text-industrial-400 text-[10px] font-mono uppercase block text-right">الشرح والوظيفة التشغيلية:</span>
                  <p className="text-xs text-industrial-200 leading-relaxed">
                    {translation?.technicalMeaning || 'لا يتوفر شرح إضافي.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-industrial-800">
                  <div className="text-[11px] text-industrial-400 flex items-center gap-2">
                    <span>مزود الترجمة:</span>
                    <span className="font-mono text-industrial-200">{translation?.provider || 'Gemini Pro'}</span>
                    <span>•</span>
                    <span>التاريخ: {translation?.timestamp ? new Date(translation.timestamp).toLocaleTimeString() : 'Now'}</span>
                  </div>

                  {material && (
                    <button
                      onClick={handleSaveTranslationToMaterial}
                      disabled={saveSuccess}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        saveSuccess 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-brand-600 hover:bg-brand-500 text-white shadow-xs'
                      }`}
                    >
                      {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      <span>{saveSuccess ? t('translationSaved') : t('saveTranslation')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEB EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4 text-brand-400" />
                    <span>وثائق وأدلة الويب الرسمية (Web Evidence Grounding)</span>
                  </h4>
                  <p className="text-[11px] text-industrial-400">
                    مسترجعة من نطاقات المصنعين الرسمية والموزعين المعتمدين عبر Google Search Grounding.
                  </p>
                </div>

                <button
                  onClick={handleFetchWebEvidence}
                  disabled={isSearchingWeb}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSearchingWeb ? 'animate-spin' : ''}`} />
                  <span>{isSearchingWeb ? t('loading') : t('refresh')}</span>
                </button>
              </div>

              {isSearchingWeb ? (
                <div className="p-8 text-center space-y-2 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <RefreshCw className="h-6 w-6 text-brand-400 animate-spin mx-auto" />
                  <p className="text-industrial-300 font-semibold">{t('analyzingMaterial')}</p>
                </div>
              ) : webSources.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <Globe className="h-8 w-8 text-industrial-500 mx-auto" />
                  <p className="text-industrial-300 font-medium">لم يتم استرجاع أدلة ويب حتى الآن.</p>
                  <button
                    onClick={handleFetchWebEvidence}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('searchWeb')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {webSources.map((source) => (
                    <div
                      key={source.id}
                      className="p-3.5 rounded-xl border border-industrial-750 bg-industrial-850/80 hover:border-brand-500/50 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            {source.isOfficialDomain && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                <span>{t('officialSource')}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-800 text-industrial-400">
                              {source.sourceType}
                            </span>
                            <span className="text-[10px] font-mono text-industrial-400">
                              Domain: {source.domain}
                            </span>
                          </div>

                          <h5 className="font-bold text-white text-xs hover:text-brand-300 transition-colors">
                            {source.title}
                          </h5>
                        </div>

                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-industrial-800 hover:bg-industrial-700 text-brand-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors border border-industrial-700"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <p className="text-industrial-300 text-[11px] leading-relaxed line-clamp-3 bg-industrial-900/60 p-2 rounded border border-industrial-800/80">
                        {source.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DATASHEETS */}
          {activeTab === 'datasheets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span>أوراق البيانات الفنية وكتالوجات المصنع (PDF Datasheets & Manuals)</span>
                  </h4>
                  <p className="text-[11px] text-industrial-400">
                    أدلة التشغيل والمخططات التوصيلية المعتمدة من المصنعين.
                  </p>
                </div>

                <button
                  onClick={handleFetchDatasheets}
                  disabled={isSearchingDatasheets}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSearchingDatasheets ? 'animate-spin' : ''}`} />
                  <span>{isSearchingDatasheets ? t('loading') : t('findDatasheet')}</span>
                </button>
              </div>

              {isSearchingDatasheets ? (
                <div className="p-8 text-center space-y-2 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-industrial-300 font-semibold">جاري البحث في كتالوجات المصنعين...</p>
                </div>
              ) : datasheets.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <FileText className="h-8 w-8 text-industrial-500 mx-auto" />
                  <p className="text-industrial-300 font-medium">لم يتم العثور على ملفات PDF حتى الآن.</p>
                  <button
                    onClick={handleFetchDatasheets}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('findDatasheet')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {datasheets.map((ds) => (
                    <div
                      key={ds.id}
                      className="p-3.5 rounded-xl border border-industrial-750 bg-industrial-850/80 hover:border-emerald-500/50 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {ds.fileType}
                          </span>
                          <span className="text-[10px] font-mono text-industrial-400">
                            {ds.manufacturer} • {ds.domain}
                          </span>
                        </div>

                        <h5 className="font-bold text-white text-xs">
                          {ds.title}
                        </h5>

                        {ds.summary && (
                          <p className="text-[11px] text-industrial-300 line-clamp-2">
                            {ds.summary}
                          </p>
                        )}
                      </div>

                      <a
                        href={ds.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: IMAGES */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-purple-400" />
                    <span>الصور والرسومات الهندسية المرجعية (Reference Visuals)</span>
                  </h4>
                  <p className="text-[11px] text-industrial-400">
                    صور توضيحية ورسومات الأبعاد (تستخدم لأغراض التحقق المرجعي فقط).
                  </p>
                </div>

                <button
                  onClick={handleFetchImages}
                  disabled={isSearchingImages}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSearchingImages ? 'animate-spin' : ''}`} />
                  <span>{isSearchingImages ? t('loading') : t('searchImages')}</span>
                </button>
              </div>

              {isSearchingImages ? (
                <div className="p-8 text-center space-y-2 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <RefreshCw className="h-6 w-6 text-purple-400 animate-spin mx-auto" />
                  <p className="text-industrial-300 font-semibold">جاري البحث عن الصور المرجعية...</p>
                </div>
              ) : images.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-industrial-850/40 rounded-xl border border-industrial-800">
                  <ImageIcon className="h-8 w-8 text-industrial-500 mx-auto" />
                  <p className="text-industrial-300 font-medium">{t('noImageResults')}</p>
                  <button
                    onClick={handleFetchImages}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {t('searchImages')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="p-3 rounded-xl border border-industrial-750 bg-industrial-850 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {t('referenceImage')}
                          </span>
                          <span className="text-[10px] font-mono text-industrial-400">
                            {img.sourceDomain}
                          </span>
                        </div>
                        <h6 className="font-bold text-white text-xs truncate">{img.title}</h6>
                      </div>

                      <a
                        href={img.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 text-center rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-industrial-700"
                      >
                        <span>View Source Image</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AI CONFLICT AUDIT */}
          {activeTab === 'ai_analysis' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-industrial-750 bg-industrial-850/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-400" />
                    <span>تقرير التحقق والمطابقة الهندسية (Engineering Conflict Audit)</span>
                  </h4>
                  {getConfidenceBadge(intelResult?.evidenceLevel || 'Verified')}
                </div>

                <div className="p-3 rounded-lg bg-industrial-900 border border-industrial-800 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-industrial-400 block">AI Technical Explanation:</span>
                  <p className="text-xs text-industrial-200 leading-relaxed">
                    {intelResult?.aiExplanation || 'No conflict analysis available.'}
                  </p>
                </div>

                {/* Conflicts Detected Table */}
                <div className="space-y-2">
                  <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <AlertOctagon className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t('conflictsDetected')}</span>
                  </h5>

                  {(!intelResult?.conflictsDetected || intelResult.conflictsDetected.length === 0) ? (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{t('noConflicts')}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {intelResult.conflictsDetected.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-industrial-900 border border-amber-500/30 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300">{c.field}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                              Severity: {c.severity}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div>
                              <span className="text-industrial-400 block">Database Value:</span>
                              <span className="font-mono text-white">{c.dbValue || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-industrial-400 block">Web Standard Value:</span>
                              <span className="font-mono text-emerald-300">{c.webValue || 'N/A'}</span>
                            </div>
                          </div>
                          <p className="text-industrial-300 text-[11px] pt-1">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SEARCH HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-industrial-400" />
                  <span>{t('searchHistory')}</span>
                </h4>

                <button
                  onClick={() => {
                    materialIntelligenceService.clearSearchHistory();
                    setSearchHistory([]);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                >
                  {t('clearHistory')}
                </button>
              </div>

              {searchHistory.length === 0 ? (
                <div className="p-8 text-center bg-industrial-850/40 rounded-xl border border-industrial-800 text-industrial-400 text-xs">
                  لا توجد عمليات بحث سابقة مسجلة.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-industrial-750 bg-industrial-850 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{h.query}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-industrial-800 text-industrial-400">
                            {h.searchType}
                          </span>
                        </div>
                        <p className="text-[10px] text-industrial-400">
                          {new Date(h.timestamp).toLocaleString()} • User: {h.user} • Results: {h.resultsCount}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSearchQuery(h.query);
                          runQuerySearch(h.query);
                          setActiveTab('overview');
                        }}
                        className="px-2.5 py-1 bg-industrial-800 hover:bg-industrial-700 text-brand-300 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                      >
                        {t('repeatSearch')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-750 bg-industrial-850 flex items-center justify-between text-xs shrink-0">
          <div className="text-industrial-400 flex items-center gap-2 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>ISO/IEC 17025 Compliant Material Verification & Translation</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-industrial-800 hover:bg-industrial-750 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
