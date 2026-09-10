/**
 * EMIS Automated Reorder & Purchase Requisition Hub
 * Real-time deficit scanning, EOQ recommendations, and 1-click Purchase Requisition (PR) generation.
 */

import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  AlertCircle, 
  TrendingDown, 
  FileText, 
  Printer, 
  Download, 
  CheckSquare, 
  Square, 
  Search, 
  Filter, 
  ArrowRight, 
  DollarSign, 
  ShieldAlert, 
  Check, 
  Clock, 
  Send,
  Building,
  Plus
} from 'lucide-react';
import { Material, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { openPrintPreview } from '../utils/printManager';

interface ReorderAutomationProps {
  materials: Material[];
  currentUser: User | null;
  onInspectMaterial?: (m: Material) => void;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  createdAt: string;
  createdBy: string;
  site: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY_SHUTDOWN';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  justification: string;
  items: {
    partNumber: string;
    description: string;
    currentStock: number;
    minStock: number;
    reorderQty: number;
    unit: string;
    estimatedUnitCost: number;
    estimatedTotalCost: number;
    supplier?: string;
  }[];
  totalEstimatedCost: number;
}

const STORAGE_KEY_PRS = 'emis_purchase_requisitions';

export const ReorderAutomationView: React.FC<ReorderAutomationProps> = ({
  materials,
  currentUser,
  onInspectMaterial
}) => {
  const { language, isRTL } = useLanguage();

  // Load saved PRs from localStorage
  const [savedPRs, setSavedPRs] = useState<PurchaseRequisition[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'DEFICIT_HUB' | 'SAVED_PRS'>('DEFICIT_HUB');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL'>('ALL');

  // Custom reorder quantities state: partNumber -> quantity
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  // PR Modal
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [prUrgency, setPrUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY_SHUTDOWN'>('ROUTINE');
  const [prJustification, setPrJustification] = useState('');
  const [prTargetSite, setPrTargetSite] = useState(currentUser?.site || 'MAIN_PLANT');

  // Identify all materials below or at minimum stock level
  const deficitMaterials = useMemo(() => {
    return materials.filter(m => {
      const minStock = m.minStockLevel !== undefined ? m.minStockLevel : 10;
      return m.quantity <= minStock;
    });
  }, [materials]);

  // Selected part numbers for PR batch
  const [selectedParts, setSelectedParts] = useState<string[]>(() => {
    return deficitMaterials.slice(0, 10).map(m => m.partNumber);
  });

  // Filtered deficit list
  const filteredDeficits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return deficitMaterials.filter(m => {
      const minStock = m.minStockLevel !== undefined ? m.minStockLevel : 10;
      const isZero = m.quantity <= 0;
      const isCritical = m.quantity < minStock / 2;

      const matchesSearch = !q || 
        m.partNumber.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.manufacturer || '').toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || m.category === categoryFilter;

      let matchesUrgency = true;
      if (urgencyFilter === 'OUT_OF_STOCK') matchesUrgency = isZero;
      else if (urgencyFilter === 'CRITICAL') matchesUrgency = isCritical;

      return matchesSearch && matchesCat && matchesUrgency;
    });
  }, [deficitMaterials, searchQuery, categoryFilter, urgencyFilter]);

  // Calculations for summary stats
  const summaryStats = useMemo(() => {
    const totalDeficits = deficitMaterials.length;
    const outOfStockCount = deficitMaterials.filter(m => m.quantity <= 0).length;
    const criticalCount = deficitMaterials.filter(m => m.quantity > 0 && m.quantity <= (m.minStockLevel || 10) / 2).length;

    // Total estimated replenishment cost for all selected items
    const selectedCost = selectedParts.reduce((acc, partNo) => {
      const mat = materials.find(m => m.partNumber === partNo);
      if (!mat) return acc;
      const minStock = mat.minStockLevel || 10;
      const suggestedQty = customQuantities[partNo] !== undefined 
        ? customQuantities[partNo] 
        : Math.max(minStock * 2 - mat.quantity, minStock);
      const unitCost = 45; // Default unit estimate if not in material data
      return acc + (suggestedQty * unitCost);
    }, 0);

    return { totalDeficits, outOfStockCount, criticalCount, selectedCost };
  }, [deficitMaterials, selectedParts, customQuantities, materials]);

  const toggleSelectPart = (p: string) => {
    setSelectedParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const selectAll = () => {
    setSelectedParts(filteredDeficits.map(m => m.partNumber));
  };

  const deselectAll = () => {
    setSelectedParts([]);
  };

  // Generate PR Action
  const handleCreatePR = () => {
    if (selectedParts.length === 0 || !currentUser) return;

    const prNumber = `PR-${new Date().getFullYear()}-${String(savedPRs.length + 1).padStart(4, '0')}`;
    
    const items = selectedParts.map(p => {
      const m = materials.find(mat => mat.partNumber === p)!;
      const minStock = m.minStockLevel || 10;
      const reorderQty = customQuantities[p] !== undefined 
        ? customQuantities[p] 
        : Math.max(minStock * 2 - m.quantity, minStock);
      const estimatedUnitCost = 45; // Default standard cost
      const estimatedTotalCost = reorderQty * estimatedUnitCost;

      return {
        partNumber: m.partNumber,
        description: m.description || m.name || '',
        currentStock: m.quantity,
        minStock,
        reorderQty,
        unit: m.unit || 'EA',
        estimatedUnitCost,
        estimatedTotalCost,
        supplier: m.manufacturer || 'OEM / Local Vendor'
      };
    });

    const totalEstimatedCost = items.reduce((acc, i) => acc + i.estimatedTotalCost, 0);

    const newPR: PurchaseRequisition = {
      id: `pr-${Date.now()}`,
      prNumber,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      site: prTargetSite,
      urgency: prUrgency,
      status: 'SUBMITTED',
      justification: prJustification || (language === 'ar' ? 'إعادة تعبئة المخزون الحرج وتفادي التوقف التشغيلي' : 'Replenish critical safety stock'),
      items,
      totalEstimatedCost
    };

    const updated = [newPR, ...savedPRs];
    setSavedPRs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PRS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save PR locally', e);
    }

    setIsPRModalOpen(false);
    setActiveTab('SAVED_PRS');
  };

  // Print PR Form
  const handlePrintPR = (pr: PurchaseRequisition) => {
    const rows = pr.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">${item.partNumber}</td>
        <td style="padding: 6px 8px;">${item.description}</td>
        <td style="padding: 6px 8px; text-align: center;">${item.currentStock} ${item.unit}</td>
        <td style="padding: 6px 8px; text-align: center;">${item.minStock} ${item.unit}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: bold; background: #f0fdf4; color: #166534;">${item.reorderQty} ${item.unit}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace;">$${item.estimatedUnitCost.toLocaleString()}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">$${item.estimatedTotalCost.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>طلب شراء مواد صناعية - ${pr.prNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 900; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1f2937; color: #fff; padding: 8px; font-size: 11px; text-align: right; }
          .signatures { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; font-size: 12px; }
          .sig-box { border-top: 1px solid #000; padding-top: 8px; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #666;">نظام EMIS لإدارة ومطابقة المواد والمستودعات</div>
            <div class="title">طلب شراء مواد ومستلزمات تشغيلية (Purchase Requisition)</div>
          </div>
          <div style="text-align: left; font-family: monospace; font-size: 14px; font-weight: bold;">
            ${pr.prNumber}
          </div>
        </div>

        <div class="meta-grid">
          <div><b>الموقع الطالب:</b> ${pr.site}</div>
          <div><b>تاريخ الطلب:</b> ${new Date(pr.createdAt).toLocaleDateString()}</div>
          <div><b>درجة الاستعجال:</b> ${pr.urgency === 'EMERGENCY_SHUTDOWN' ? 'طوارئ توقف تشغيلي' : pr.urgency === 'URGENT' ? 'عاجل جداً' : 'عادي (روتيني)'}</div>
          <div><b>مقدم الطلب:</b> ${pr.createdBy}</div>
          <div><b>إجمالي البنود:</b> ${pr.items.length} بنود</div>
          <div><b>التكلفة التقديرية:</b> $${pr.totalEstimatedCost.toLocaleString()}</div>
        </div>

        <div style="margin-bottom: 15px; font-size: 12px;">
          <b>مبررات وأسباب الشراء:</b> ${pr.justification}
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th>رقم المادة (P/N)</th>
              <th>الوصف الفني</th>
              <th style="text-align: center;">الرصيد الحالي</th>
              <th style="text-align: center;">الحد الأدنى</th>
              <th style="text-align: center;">الكمية المطلوبة</th>
              <th style="text-align: right;">السعر التقريبي</th>
              <th style="text-align: right;">الإجمالي التقديري</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="text-align: left; margin-top: 15px; font-size: 14px; font-weight: bold;">
          إجمالي التكلفة التقديرية للطلب: $${pr.totalEstimatedCost.toLocaleString()} USD
        </div>

        <div class="signatures">
          <div>
            <div><b>مقدم الطلب / مهندس الموقع</b></div>
            <div class="sig-box">التوقيع: ............................</div>
          </div>
          <div>
            <div><b>مدير المستودعات وسلاسل الإمداد</b></div>
            <div class="sig-box">التوقيع: ............................</div>
          </div>
          <div>
            <div><b>المدير المالي والتنفيذي (الاعتماد)</b></div>
            <div class="sig-box">التوقيع: ............................</div>
          </div>
        </div>
      </body>
      </html>
    `;

    openPrintPreview(`PR_${pr.prNumber}`, html, `PR_${pr.prNumber}.html`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-industrial-900 via-industrial-850 to-indigo-950 p-6 rounded-2xl border border-industrial-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black heading-display">
                {language === 'ar' ? 'مركز أتمتة إعادة الطلب والمشتريات' : 'Automated Reorder & Requisitions'}
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold">
                EOQ & AUTO-PR
              </span>
            </div>
            <p className="text-xs text-industrial-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'رصد المواد دون حد الأمان والمخزون الصفري آلياً، حساب الكميات الاقتصادية المقترحة، وتوليد أوامر شراء PR فورية جاهزة للاعتماد والطباعة.'
                : 'Automated deficit surveillance for safety stock breach. Calculates economic reorder quantities and generates 1-click formal Purchase Requisitions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPRModalOpen(true)}
            disabled={selectedParts.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>
              {language === 'ar'
                ? `توليد طلب شراء PR (${selectedParts.length})`
                : `Generate PR (${selectedParts.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-industrial-850 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xs">
          <span className="text-[10px] font-mono text-industrial-400 uppercase font-bold block">
            {language === 'ar' ? 'إجمالي النواقص المرصودة' : 'Total Monitored Deficits'}
          </span>
          <div className="text-2xl font-black font-mono text-industrial-900 dark:text-industrial-100 mt-1">
            {summaryStats.totalDeficits}
          </div>
          <span className="text-[11px] text-industrial-500 mt-1 block">
            {language === 'ar' ? 'مواد بحاجة لإعادة توريد' : 'Items below safety stock'}
          </span>
        </div>

        <div className="bg-white dark:bg-industrial-850 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
          <span className="text-[10px] font-mono text-rose-500 uppercase font-bold block">
            {language === 'ar' ? 'نفاد تام (رصيد صفري)' : 'Out of Stock (Zero)'}
          </span>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            {summaryStats.outOfStockCount}
          </div>
          <span className="text-[11px] text-rose-500/80 mt-1 block">
            {language === 'ar' ? 'خطر توقف تشغيلي وشيك' : 'Immediate shortage risk'}
          </span>
        </div>

        <div className="bg-white dark:bg-industrial-850 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-2xs">
          <span className="text-[10px] font-mono text-amber-500 uppercase font-bold block">
            {language === 'ar' ? 'مستوى حرج جداً' : 'Critically Low (<50%)'}
          </span>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {summaryStats.criticalCount}
          </div>
          <span className="text-[11px] text-amber-500/80 mt-1 block">
            {language === 'ar' ? 'أقل من نصف حد الأمان' : 'Less than half safety limit'}
          </span>
        </div>

        <div className="bg-white dark:bg-industrial-850 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
          <span className="text-[10px] font-mono text-indigo-500 uppercase font-bold block">
            {language === 'ar' ? 'التكلفة التقديرية للدفعة' : 'Batch Estimated Cost'}
          </span>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            ${summaryStats.selectedCost.toLocaleString()}
          </div>
          <span className="text-[11px] text-indigo-500/80 mt-1 block">
            {language === 'ar' ? `لـ ${selectedParts.length} مادة محددة` : `For ${selectedParts.length} selected items`}
          </span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-industrial-200 dark:border-industrial-750 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('DEFICIT_HUB')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'DEFICIT_HUB'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100 dark:hover:bg-industrial-800'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{language === 'ar' ? 'قائمة النواقص وإعادة التوريد' : 'Deficits & Reorder Hub'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {deficitMaterials.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SAVED_PRS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'SAVED_PRS'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100 dark:hover:bg-industrial-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>{language === 'ar' ? 'طلبات الشراء المنشأة (PRs)' : 'Issued Purchase Requisitions'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
            {savedPRs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Deficit & Reorder Hub */}
      {activeTab === 'DEFICIT_HUB' && (
        <div className="bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-industrial-200 dark:border-industrial-750 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث برقم المادة أو الوصف...' : 'Search part #, name...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-800"
                />
              </div>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-800"
              >
                <option value="ALL">{language === 'ar' ? 'كل درجات النقص' : 'All Deficit Levels'}</option>
                <option value="OUT_OF_STOCK">{language === 'ar' ? 'رصيد صفري فقط' : 'Zero Stock Only'}</option>
                <option value="CRITICAL">{language === 'ar' ? 'حرج (< 50%)' : 'Critical (<50%)'}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
              >
                {language === 'ar' ? 'تحديد الكل' : 'Select All'}
              </button>
              <span className="text-industrial-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs font-semibold text-industrial-500 hover:underline px-2 py-1"
              >
                {language === 'ar' ? 'إلغاء التحديد' : 'Deselect'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-industrial-50 dark:bg-industrial-800/80 text-industrial-500 border-b border-industrial-200 dark:border-industrial-700 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <CheckSquare className="h-3.5 w-3.5 text-industrial-400 inline" />
                  </th>
                  <th className="p-3">{language === 'ar' ? 'رقم المادة والوصف' : 'Part Number & Description'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'الرصيد الحالي' : 'Stock'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'حد الأمان (Min)' : 'Min Limit'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'مقدار العجز' : 'Deficit'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'الكمية المقترحة للطلب' : 'Suggested Reorder Qty'}</th>
                  <th className="p-3 text-right">{language === 'ar' ? 'التكلفة المقدرة' : 'Est. Cost'}</th>
                  <th className="p-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {filteredDeficits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-industrial-400">
                      {language === 'ar' ? 'ممتاز! لا توجد مواد تعاني من نقص حالياً ضمن المحددات.' : 'Great! All inventory levels are above safety stock.'}
                    </td>
                  </tr>
                ) : (
                  filteredDeficits.map((mat) => {
                    const isSelected = selectedParts.includes(mat.partNumber);
                    const minStock = mat.minStockLevel || 10;
                    const deficit = Math.max(0, minStock - mat.quantity);
                    const defaultOrderQty = Math.max(minStock * 2 - mat.quantity, minStock);
                    const currentOrderQty = customQuantities[mat.partNumber] !== undefined ? customQuantities[mat.partNumber] : defaultOrderQty;
                    const estimatedCost = currentOrderQty * 45;

                    return (
                      <tr 
                        key={mat.partNumber}
                        className={`hover:bg-industrial-50 dark:hover:bg-industrial-800/50 transition-colors ${
                          isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectPart(mat.partNumber)}
                            className="text-indigo-600 dark:text-indigo-400 cursor-pointer"
                          >
                            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-industrial-300" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-industrial-900 dark:text-industrial-100">
                            {mat.partNumber}
                          </div>
                          <div className="text-industrial-500 text-[11px] truncate max-w-xs">
                            {mat.description || mat.name}
                          </div>
                          {mat.manufacturer && (
                            <div className="text-[10px] text-industrial-400 font-mono">
                              {mat.manufacturer}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span className={mat.quantity <= 0 ? 'text-rose-600 font-black' : 'text-amber-600'}>
                            {mat.quantity} {mat.unit || 'EA'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {minStock} {mat.unit || 'EA'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600">
                          -{deficit}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={currentOrderQty}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setCustomQuantities(prev => ({ ...prev, [mat.partNumber]: val }));
                            }}
                            className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-industrial-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          ${estimatedCost.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          {mat.quantity <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-mono">
                              OUT OF STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">
                              BELOW MIN
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Saved PRs List */}
      {activeTab === 'SAVED_PRS' && (
        <div className="space-y-4">
          {savedPRs.length === 0 ? (
            <div className="bg-white dark:bg-industrial-850 p-12 rounded-2xl border border-industrial-200 dark:border-industrial-750 text-center space-y-3">
              <FileText className="h-10 w-10 text-indigo-500 mx-auto" />
              <h3 className="text-base font-bold text-industrial-900 dark:text-industrial-100">
                {language === 'ar' ? 'لم يتم إنشاء طلبات شراء حتى الآن' : 'No Purchase Requisitions Generated Yet'}
              </h3>
              <p className="text-xs text-industrial-500 max-w-md mx-auto">
                {language === 'ar'
                  ? 'اختر المواد التي تعاني من نقص في رصيد المستودع، ثم اضغط على "توليد طلب شراء PR" لإنشاء وحفظ وطباعة الطلب.'
                  : 'Select depleted items from the Deficits tab and click "Generate PR" to issue official requisitions.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPRs.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-white dark:bg-industrial-850 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-industrial-900 dark:text-industrial-100">
                          {pr.prNumber}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                          pr.urgency === 'EMERGENCY_SHUTDOWN'
                            ? 'bg-rose-500 text-white'
                            : pr.urgency === 'URGENT'
                            ? 'bg-amber-500 text-white'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200'
                        }`}>
                          {pr.urgency}
                        </span>
                      </div>
                      <span className="text-[11px] text-industrial-400 block mt-0.5">
                        {new Date(pr.createdAt).toLocaleString()} • {pr.createdBy}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-industrial-400 block font-bold">
                        {language === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}
                      </span>
                      <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                        ${pr.totalEstimatedCost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-industrial-600 dark:text-industrial-300 line-clamp-2">
                    {pr.justification}
                  </p>

                  <div className="text-xs text-industrial-500 bg-industrial-50 dark:bg-industrial-800/60 p-2.5 rounded-xl font-mono">
                    <span>{pr.items.length} {language === 'ar' ? 'بنود مطلوبة' : 'requisition line items'}</span>
                    <span className="mx-2">•</span>
                    <span>Site: {pr.site}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-100 dark:border-industrial-800">
                    <button
                      type="button"
                      onClick={() => handlePrintPR(pr)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? 'طباعة نموذج PR' : 'Print PR Form'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PR Creation Modal */}
      {isPRModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-industrial-850 rounded-2xl max-w-lg w-full border border-industrial-200 dark:border-industrial-750 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
                  {language === 'ar' ? 'إصدار طلب شراء مواد رسمي (Purchase Requisition)' : 'Issue Purchase Requisition'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPRModalOpen(false)}
                className="text-industrial-400 hover:text-industrial-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                    {language === 'ar' ? 'الموقع الطالب:' : 'Requesting Site:'}
                  </label>
                  <input
                    type="text"
                    value={prTargetSite}
                    onChange={(e) => setPrTargetSite(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                    {language === 'ar' ? 'درجة الاستعجال والأولوية:' : 'Urgency Level:'}
                  </label>
                  <select
                    value={prUrgency}
                    onChange={(e) => setPrUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 font-bold"
                  >
                    <option value="ROUTINE">{language === 'ar' ? 'عادي (روتيني)' : 'Routine Replenishment'}</option>
                    <option value="URGENT">{language === 'ar' ? 'عاجل (خلال 48 ساعة)' : 'Urgent (48h)'}</option>
                    <option value="EMERGENCY_SHUTDOWN">{language === 'ar' ? 'طوارئ توقف تشغيلي' : 'Emergency Shutdown'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                  {language === 'ar' ? 'مبررات وأسباب طلب الشراء:' : 'Requisition Justification:'}
                </label>
                <textarea
                  rows={3}
                  value={prJustification}
                  onChange={(e) => setPrJustification(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: إعادة تعبئة مخزون الحساسات والصمامات الحرجة لتفادي توقف خط الإنتاج...' : 'e.g. Replenishing safety stock to prevent shutdown...'}
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>

              {/* Items Summary Preview */}
              <div className="bg-industrial-50 dark:bg-industrial-800/60 p-3 rounded-xl space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{language === 'ar' ? 'عدد البنود المضمنة:' : 'Included Items:'}</span>
                  <span className="font-mono">{selectedParts.length} {language === 'ar' ? 'مادة' : 'materials'}</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400">
                  <span>{language === 'ar' ? 'إجمالي التكلفة التقديرية:' : 'Total Est. Cost:'}</span>
                  <span className="font-mono">${summaryStats.selectedCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-100 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => setIsPRModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleCreatePR}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === 'ar' ? 'تأكيد وإصدار الطلب' : 'Issue Requisition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
