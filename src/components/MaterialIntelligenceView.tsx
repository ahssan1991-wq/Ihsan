/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Search, 
  Sparkles, 
  FileText, 
  Layers, 
  ExternalLink, 
  ArrowRightLeft, 
  BookOpen, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  RefreshCw, 
  ShieldCheck, 
  History, 
  Copy, 
  Check, 
  Eye, 
  FileCheck, 
  Building2, 
  SlidersHorizontal 
} from 'lucide-react';
import { Material, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { materialIntelligenceService } from '../services/materialIntelligenceService';
import MaterialIntelligenceModal from './MaterialIntelligenceModal';

interface MaterialIntelligenceViewProps {
  materials: Material[];
  currentUser: User;
  onOpenMaterialModal: (material: Material) => void;
}

export default function MaterialIntelligenceView({
  materials,
  currentUser,
  onOpenMaterialModal
}: MaterialIntelligenceViewProps) {
  const { language, t, isRTL } = useLanguage();
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Direct translation workbench state
  const [textToTranslate, setTextToTranslate] = useState('');
  const [targetLang, setTargetLang] = useState<'ar' | 'en'>(language === 'ar' ? 'ar' : 'en');
  const [translatedResult, setTranslatedResult] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick dictionary search state
  const [dictQuery, setDictQuery] = useState('');

  // Catalog search / filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMissingArabic, setFilterMissingArabic] = useState(false);

  // Catalog statistics
  const totalMaterials = materials.length;
  const materialsWithArabic = materials.filter(m => !!m.arabicDescription && m.arabicDescription.trim().length > 0).length;
  const materialsWithoutArabic = totalMaterials - materialsWithArabic;
  const coveragePercent = totalMaterials > 0 ? Math.round((materialsWithArabic / totalMaterials) * 100) : 0;

  // Filtered materials
  const filteredMaterials = materials.filter(mat => {
    if (filterMissingArabic && mat.arabicDescription && mat.arabicDescription.trim().length > 0) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      mat.partNumber.toLowerCase().includes(q) ||
      mat.description.toLowerCase().includes(q) ||
      (mat.arabicDescription && mat.arabicDescription.toLowerCase().includes(q)) ||
      (mat.manufacturer && mat.manufacturer.toLowerCase().includes(q)) ||
      (mat.model && mat.model.toLowerCase().includes(q))
    );
  });

  // Dictionary lookup
  const dictionaryResults = materialIntelligenceService.lookupDictionary(dictQuery);

  const handleTranslateCustomText = async () => {
    if (!textToTranslate.trim()) return;
    setIsTranslating(true);
    setTranslatedResult(null);
    try {
      const sourceLang = targetLang === 'ar' ? 'en' : 'ar';
      const res = await materialIntelligenceService.translateMaterialText(textToTranslate, sourceLang, targetLang);
      setTranslatedResult(res.translatedText);
    } catch (err) {
      console.error(err);
      setTranslatedResult('Translation service is operating in local heuristic mode.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenIntelligenceForMaterial = (mat: Material) => {
    setSelectedMaterial(mat);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="material-intelligence-view">
      {/* View Header Banner */}
      <div className="bg-linear-to-r from-brand-900 via-industrial-900 to-industrial-850 border border-brand-800/40 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold">
              <Globe className="h-3.5 w-3.5" />
              <span>EMIS Port 9 • Multilingual Intelligence & Grounded Web Evidence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight heading-display">
              استخبارات المواد والترجمة المتعددة اللغات
            </h1>
            <p className="text-xs sm:text-sm text-industrial-300 leading-relaxed">
              محرك ذكي متخصص في ترجمة وتدقيق المواصفات الصناعية والميكانيكية والكهربائية (عربي / إنجليزي)، والبحث المباشر عن الكتالوجات والـ Datasheets والأدلة الرقمية الموثقة عبر Google Search Grounding.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedMaterial(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>فتح نافذة الاستخبارات الشاملة</span>
            </button>
          </div>
        </div>

        {/* Catalog Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-industrial-800">
          <div className="bg-industrial-900/60 border border-industrial-750/70 p-3 rounded-xl">
            <div className="text-industrial-400 text-xs">إجمالي المواد المسجلة</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalMaterials}</div>
          </div>
          <div className="bg-industrial-900/60 border border-industrial-750/70 p-3 rounded-xl">
            <div className="text-emerald-400 text-xs flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>مترجمة للغة العربية</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{materialsWithArabic}</div>
          </div>
          <div className="bg-industrial-900/60 border border-industrial-750/70 p-3 rounded-xl">
            <div className="text-amber-400 text-xs flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>تتطلب ترجمة عربية</span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{materialsWithoutArabic}</div>
          </div>
          <div className="bg-industrial-900/60 border border-industrial-750/70 p-3 rounded-xl">
            <div className="text-brand-300 text-xs">نسبة التغطية الثنائية اللغات</div>
            <div className="text-xl font-bold font-mono text-brand-300 mt-0.5">{coveragePercent}%</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Workbench Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Direct Translation & Industrial Dictionary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Industrial Text Translator */}
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/50 rounded-lg text-brand-600 dark:text-brand-400">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-industrial-900 dark:text-white">المترجم الهندسي الفوري</h2>
                  <p className="text-[11px] text-industrial-500 dark:text-industrial-400">ترجمة المصطلحات مع الحفاظ على الأكواد والمعايير</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-industrial-100 dark:bg-industrial-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setTargetLang('ar')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    targetLang === 'ar' ? 'bg-brand-600 text-white shadow-xs' : 'text-industrial-600 dark:text-industrial-300'
                  }`}
                >
                  إلى العربية
                </button>
                <button
                  onClick={() => setTargetLang('en')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    targetLang === 'en' ? 'bg-brand-600 text-white shadow-xs' : 'text-industrial-600 dark:text-industrial-300'
                  }`}
                >
                  To English
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <textarea
                value={textToTranslate}
                onChange={(e) => setTextToTranslate(e.target.value)}
                placeholder="أدخل وصف المادة أو المواصفة الفنية (e.g., BALL VALVE 2 INCH 300# RF BODY A216 WCB TRIM 316SS STEM 17-4PH)..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850 text-industrial-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-industrial-400">يدعم ASME, API, DIN, ISO</span>
                <button
                  onClick={handleTranslateCustomText}
                  disabled={isTranslating || !textToTranslate.trim()}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isTranslating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري الترجمة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>ترجمة فورية</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {translatedResult && (
              <div className="p-3 bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-brand-700 dark:text-brand-300 font-semibold">
                  <span>الترجمة الهندسية الدقيقة:</span>
                  <button
                    onClick={() => handleCopy(translatedResult)}
                    className="p-1 hover:bg-brand-200/50 dark:hover:bg-brand-800/50 rounded-md transition-colors cursor-pointer"
                    title="نسخ"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-industrial-900 dark:text-white font-medium leading-relaxed">
                  {translatedResult}
                </p>
              </div>
            )}
          </div>

          {/* Quick Industrial Glossary Explorer */}
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-industrial-900 dark:text-white">القاموس الصناعي المعتمد</h2>
                <p className="text-[11px] text-industrial-500 dark:text-industrial-400">المصطلحات القياسية الميكانيكية والكهربائية والأنابيب</p>
              </div>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dictQuery}
                onChange={(e) => setDictQuery(e.target.value)}
                placeholder="ابحث عن مصطلح (e.g., Flange, Valve, Gasket, Impeller, RF)..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850 text-industrial-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {dictionaryResults.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-xl border border-industrial-150 dark:border-industrial-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors bg-industrial-50/30 dark:bg-industrial-850/40 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-industrial-900 dark:text-white truncate">{item.en}</div>
                    <div className="text-brand-600 dark:text-brand-400 font-medium truncate">{item.ar}</div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-industrial-200/60 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 shrink-0">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (2 cols): Catalog Materials Intelligence Explorer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
                  <span>سجل المواد واستخبارات المواصفات</span>
                </h2>
                <p className="text-xs text-industrial-500 dark:text-industrial-400">
                  عرض المواد مع إمكانية التحليل الفوري، الترجمة، والبحث عن الكتالوجات والمطابقة الهندسية
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterMissingArabic(!filterMissingArabic)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    filterMissingArabic 
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold' 
                      : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 border-transparent hover:bg-industrial-200 dark:hover:bg-industrial-750'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>بدون ترجمة ({materialsWithoutArabic})</span>
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="h-4 w-4 text-industrial-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم القطعة (Part #)، الوصف الإنجليزي، الوصف العربي، أو الشركة الصانعة..."
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850 text-industrial-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            {/* Materials List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredMaterials.length === 0 ? (
                <div className="p-8 text-center text-industrial-400 text-xs">
                  لا توجد مواد مطابقة لخيارات البحث المحددة.
                </div>
              ) : (
                filteredMaterials.map((mat) => {
                  const hasArabic = mat.arabicDescription && mat.arabicDescription.trim().length > 0;
                  return (
                    <div
                      key={mat.id || mat.partNumber}
                      className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 bg-industrial-50/20 dark:bg-industrial-850/30 hover:bg-industrial-100/50 dark:hover:bg-industrial-800/50 hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800">
                            {mat.partNumber}
                          </span>
                          {mat.manufacturer && (
                            <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                              {mat.manufacturer} {mat.model ? `• ${mat.model}` : ''}
                            </span>
                          )}
                          {hasArabic ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Check className="h-3 w-3" />
                              <span>مترجم</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              <span>بحاجة لترجمة</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-semibold text-industrial-900 dark:text-white leading-snug">
                          {mat.description}
                        </div>

                        {hasArabic && (
                          <div className="text-xs text-brand-700 dark:text-brand-300 font-medium leading-snug">
                            {mat.arabicDescription}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenIntelligenceForMaterial(mat)}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="استخبارات المواد وترجمة وتدقيق المواصفات"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>استخبارات المادة</span>
                        </button>

                        <button
                          onClick={() => onOpenMaterialModal(mat)}
                          className="p-1.5 text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200 hover:bg-industrial-200 dark:hover:bg-industrial-700 rounded-lg transition-colors cursor-pointer"
                          title="عرض تفاصيل المادة"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded / Pop-up Material Intelligence Modal */}
      {isModalOpen && (
        <MaterialIntelligenceModal
          material={selectedMaterial}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMaterial(null);
          }}
          onApplyArabicTranslation={(arabicText) => {
            if (selectedMaterial) {
              // Update material in local memory/ledger if applicable
              selectedMaterial.arabicDescription = arabicText;
            }
          }}
        />
      )}
    </div>
  );
}
