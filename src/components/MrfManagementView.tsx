/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Wrench,
  Package,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Building2,
  Calendar,
  Eye,
  Hash,
  Boxes,
  Truck,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Material, Equipment, User } from '../types';
import { dbService } from '../services/dbService';

interface MrfManagementViewProps {
  currentUser: User;
  onInspectMaterial: (material: Material) => void;
  onNavigateToTab?: (tabId: string, query?: string) => void;
}

export default function MrfManagementView({
  currentUser,
  onInspectMaterial,
  onNavigateToTab
}: MrfManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'mr' | 'wo' | 'inspection'>('mr');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMR, setSelectedMR] = useState<string | null>(null);
  const [selectedWO, setSelectedWO] = useState<string | null>(null);

  // Inspection Form State
  const [inspPartNumber, setInspPartNumber] = useState('');
  const [inspPoNumber, setInspPoNumber] = useState('');
  const [inspMrNumber, setInspMrNumber] = useState('');
  const [inspSuppliedModel, setInspSuppliedModel] = useState('');
  const [inspSuppliedSerial, setInspSuppliedSerial] = useState('');
  const [inspSuppliedMfg, setInspSuppliedMfg] = useState('');
  const [inspResult, setInspResult] = useState<'MATCHED' | 'PARTIALLY MATCHED' | 'REJECTED' | 'ON HOLD' | 'ENGINEERING REVIEW'>('MATCHED');
  const [inspReason, setInspReason] = useState('');
  const [inspNotes, setInspNotes] = useState('');
  const [inspFilter, setInspFilter] = useState<string>('ALL');
  const [inspSuccessMsg, setInspSuccessMsg] = useState<string | null>(null);

  const materials = dbService.getMaterials() || [];
  const inspections = dbService.getInspections() || [];
  const mrList = dbService.getMRSummaryList() || [];
  const woList = dbService.getWOSummaryList() || [];

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspPartNumber.trim()) return;

    try {
      dbService.addInspection(
        {
          partNumber: inspPartNumber.trim(),
          poNumber: inspPoNumber.trim() || undefined,
          mrNumber: inspMrNumber.trim() || undefined,
          suppliedModel: inspSuppliedModel.trim() || undefined,
          suppliedSerial: inspSuppliedSerial.trim() || undefined,
          suppliedManufacturer: inspSuppliedMfg.trim() || undefined,
          result: inspResult,
          reason: inspReason.trim() || `Inspection completed with result: ${inspResult}`,
          notes: inspNotes.trim() || undefined,
          status: 'COMPLETED'
        },
        currentUser
      );

      setInspSuccessMsg(`✅ تم تسجيل نتيجة الفحص والمطابقة للمادة (${inspPartNumber.trim()}) بنجاح.`);
      setInspPartNumber('');
      setInspPoNumber('');
      setInspMrNumber('');
      setInspSuppliedModel('');
      setInspSuppliedSerial('');
      setInspSuppliedMfg('');
      setInspReason('');
      setInspNotes('');

      setTimeout(() => {
        setInspSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      alert(`Error saving inspection: ${err?.message || 'Failed'}`);
    }
  };

  const filteredInspections = inspections.filter(i => {
    if (inspFilter !== 'ALL' && i.result !== inspFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      i.partNumber.toLowerCase().includes(q) ||
      (i.mrNumber && i.mrNumber.toLowerCase().includes(q)) ||
      (i.poNumber && i.poNumber.toLowerCase().includes(q)) ||
      (i.suppliedModel && i.suppliedModel.toLowerCase().includes(q)) ||
      (i.inspector && i.inspector.toLowerCase().includes(q)) ||
      (i.reason && i.reason.toLowerCase().includes(q))
    );
  });

  const filteredMRs = mrList.filter(mr => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      mr.mrNumber.toLowerCase().includes(q) ||
      (mr.mrfNumber && mr.mrfNumber.toLowerCase().includes(q)) ||
      (mr.supplier && mr.supplier.toLowerCase().includes(q)) ||
      (mr.poNumber && mr.poNumber.toLowerCase().includes(q)) ||
      mr.materials.some(m => m.partNumber.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
    );
  });

  const filteredWOs = woList.filter(wo => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      wo.workOrder.toLowerCase().includes(q) ||
      wo.equipmentTags.some(t => t.toLowerCase().includes(q)) ||
      wo.requiredMaterials.some(m => m.partNumber.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) ||
      wo.issuedMaterials.some(m => m.partNumber.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
    );
  });

  const currentSelectedMRData = selectedMR ? mrList.find(m => m.mrNumber === selectedMR) : null;
  const currentSelectedWOData = selectedWO ? woList.find(w => w.workOrder === selectedWO) : null;

  return (
    <div className="space-y-6" id="mrf-management-view">
      {/* Header */}
      <div className="bg-white dark:bg-industrial-800 p-5 sm:p-6 rounded-2xl border border-industrial-200 dark:border-industrial-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-industrial-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            <span>إدارة طلبات المواد وأوامر العمل / MR & WO Management</span>
          </h2>
          <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-1">
            استعراض وتتبع مجموعات المواد المرتبطة بأرقام طلبات الشراء (MR / MRF) وأوامر الصيانة (Work Orders)
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center p-1 bg-industrial-100 dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700 self-start md:self-auto gap-1">
          <button
            onClick={() => { setActiveSubTab('mr'); setSelectedWO(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'mr'
                ? 'bg-white dark:bg-industrial-700 text-brand-600 dark:text-brand-300 shadow-xs'
                : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>طلبات المواد (MR / MRF) ({mrList.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('wo'); setSelectedMR(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'wo'
                ? 'bg-white dark:bg-industrial-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>أوامر العمل (Work Orders) ({woList.length})</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('inspection'); setSelectedMR(null); setSelectedWO(null); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'inspection'
                ? 'bg-white dark:bg-industrial-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>الفحص والمطابقة (Inspection) ({inspections.length})</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-industrial-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeSubTab === 'mr'
              ? 'ابحث برقم MR, MRF, PO, اسم المورد، أو رقم القطعة...'
              : activeSubTab === 'wo'
              ? 'ابحث برقم Work Order (WO), كود المعدة (Tag), أو رقم القطعة...'
              : 'ابحث برقم القطعة، رقم PO، رقم MR، الموديل المورد، أو المفتش...'
          }
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Main Content Split View */}
      {activeSubTab === 'mr' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* MR List (Left Column / 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-industrial-600 dark:text-industrial-400 px-1">
              <span>قوائم طلبات المواد المسجلة</span>
              <span>{filteredMRs.length} طلب</span>
            </div>

            {filteredMRs.length === 0 ? (
              <div className="bg-white dark:bg-industrial-800 p-8 rounded-xl border border-industrial-200 dark:border-industrial-700 text-center text-xs text-industrial-500">
                لا توجد طلبات مواد (MR) تطابق البحث
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredMRs.map((mr) => {
                  const isSelected = selectedMR === mr.mrNumber;
                  return (
                    <div
                      key={mr.mrNumber}
                      onClick={() => setSelectedMR(mr.mrNumber)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-500 dark:border-brand-500 ring-1 ring-brand-500'
                          : 'bg-white dark:bg-industrial-800 border-industrial-200 dark:border-industrial-700 hover:border-industrial-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-mono font-bold text-xs">
                            MR
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold text-industrial-900 dark:text-white">
                              {mr.mrNumber}
                            </h4>
                            {mr.mrfNumber && (
                              <p className="text-[10px] text-industrial-500 dark:text-industrial-400 font-mono">
                                MRF: {mr.mrfNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-industrial-100 dark:bg-industrial-700 text-industrial-700 dark:text-industrial-300">
                            {mr.itemCount} مواد ({mr.totalQuantity} وحدة)
                          </span>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="mt-3 pt-2.5 border-t border-industrial-100 dark:border-industrial-700/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-industrial-400 block text-[9px]">المورد / Supplier:</span>
                          <span className="font-medium text-industrial-700 dark:text-industrial-300 truncate block">
                            {mr.supplier || 'N/A'}
                          </span>
                        </div>
                        {mr.poNumber && (
                          <div>
                            <span className="text-industrial-400 block text-[9px]">أمر الشراء / PO:</span>
                            <span className="font-mono text-industrial-700 dark:text-industrial-300 truncate block">
                              {mr.poNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Inspection badges */}
                      <div className="mt-2 flex items-center gap-2 text-[10px]">
                        {mr.passedInspectionCount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> {mr.passedInspectionCount} مفحوص
                          </span>
                        )}
                        {mr.pendingInspectionCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                            <Clock className="h-3 w-3" /> {mr.pendingInspectionCount} قيد الفحص
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* MR Details / Items Table (Right Column / 7 cols) */}
          <div className="lg:col-span-7">
            {currentSelectedMRData ? (
              <div className="bg-white dark:bg-industrial-800 rounded-2xl border border-industrial-200 dark:border-industrial-700 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-industrial-200 dark:border-industrial-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      Material Request Ledger
                    </span>
                    <h3 className="text-base font-bold text-industrial-900 dark:text-white font-mono flex items-center gap-2 mt-0.5">
                      <span>{currentSelectedMRData.mrNumber}</span>
                    </h3>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-industrial-400 block text-[10px]">إجمالي الأصناف:</span>
                    <span className="font-bold text-industrial-900 dark:text-white font-mono">
                      {currentSelectedMRData.itemCount} مواد / {currentSelectedMRData.totalQuantity} إجمالي
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-industrial-700 dark:text-industrial-300">
                    المواد التابعة لطلب الشراء:
                  </h4>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {currentSelectedMRData.materials.map((m, idx) => (
                      <div
                        key={m.partNumber + idx}
                        className="p-3.5 rounded-xl border border-industrial-200 dark:border-industrial-700/80 hover:bg-industrial-50/50 dark:hover:bg-industrial-750 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                              {m.partNumber}
                            </span>
                            {m.model && (
                              <span className="text-[10px] bg-industrial-100 dark:bg-industrial-700 px-1.5 py-0.5 rounded font-mono text-industrial-600 dark:text-industrial-300">
                                {m.model}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              m.inspectionStatus === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {m.inspectionStatus || 'PASSED'}
                            </span>
                          </div>

                          <p className="text-xs text-industrial-700 dark:text-industrial-300 truncate">
                            {m.description}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-industrial-500 dark:text-industrial-400 font-mono">
                            <span>الكمية: {m.quantity} {m.unit}</span>
                            <span>المستودع: {m.store}</span>
                            {m.rack && <span>الرف: {m.rack}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => onInspectMaterial(m)}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>عرض</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-white dark:bg-industrial-800 rounded-2xl border border-dashed border-industrial-200 dark:border-industrial-700 text-center text-xs text-industrial-400 space-y-2">
                <FileText className="h-10 w-10 text-industrial-300 dark:text-industrial-600" />
                <p className="font-semibold text-industrial-600 dark:text-industrial-300">
                  اختر طلب مادة (MR) من القائمة لاستعراض كافة مواده ومستنداته
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeSubTab === 'wo' ? (
        /* Work Orders Split View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WO List (Left Column / 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-industrial-600 dark:text-industrial-400 px-1">
              <span>أوامر العمل المسجلة (Work Orders)</span>
              <span>{filteredWOs.length} أمر عمل</span>
            </div>

            {filteredWOs.length === 0 ? (
              <div className="bg-white dark:bg-industrial-800 p-8 rounded-xl border border-industrial-200 dark:border-industrial-700 text-center text-xs text-industrial-500">
                لا توجد أوامر عمل تطابق البحث
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredWOs.map((wo) => {
                  const isSelected = selectedWO === wo.workOrder;
                  return (
                    <div
                      key={wo.workOrder}
                      onClick={() => setSelectedWO(wo.workOrder)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 ring-1 ring-amber-500'
                          : 'bg-white dark:bg-industrial-800 border-industrial-200 dark:border-industrial-700 hover:border-industrial-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 font-mono font-bold text-xs">
                            WO
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold text-industrial-900 dark:text-white">
                              {wo.workOrder}
                            </h4>
                            <span className="text-[10px] text-industrial-500">
                              {wo.totalMaterialCount} قطع مرتبطة
                            </span>
                          </div>
                        </div>

                        {wo.equipmentTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
                            {wo.equipmentTags.map(tag => (
                              <span key={tag} className="text-[9px] bg-industrial-100 dark:bg-industrial-700 text-industrial-700 dark:text-industrial-300 font-mono font-semibold px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-industrial-100 dark:border-industrial-700/60 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {wo.requiredMaterials.length} مواد متوفرة / مطلوبة
                        </span>
                        {wo.issuedMaterials.length > 0 && (
                          <span className="text-industrial-500 font-semibold">
                            {wo.issuedMaterials.length} مواد مصروفة
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WO Details (Right Column / 7 cols) */}
          <div className="lg:col-span-7">
            {currentSelectedWOData ? (
              <div className="bg-white dark:bg-industrial-800 rounded-2xl border border-industrial-200 dark:border-industrial-700 p-5 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-industrial-200 dark:border-industrial-700">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Work Order Breakdown
                    </span>
                    <h3 className="text-base font-bold text-industrial-900 dark:text-white font-mono flex items-center gap-2 mt-0.5">
                      <span>{currentSelectedWOData.workOrder}</span>
                    </h3>
                  </div>

                  {currentSelectedWOData.equipmentTags.length > 0 && (
                    <div className="text-right">
                      <span className="text-industrial-400 block text-[10px]">المعدات المرتبطة:</span>
                      <div className="flex gap-1 mt-0.5">
                        {currentSelectedWOData.equipmentTags.map(tag => (
                          <span key={tag} className="text-xs bg-industrial-100 dark:bg-industrial-700 text-industrial-800 dark:text-industrial-200 font-mono font-bold px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Required Materials */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-emerald-600" />
                    <span>المواد المتوفرة والمطلوبة للأمر ({currentSelectedWOData.requiredMaterials.length}):</span>
                  </h4>

                  {currentSelectedWOData.requiredMaterials.length === 0 ? (
                    <p className="text-xs text-industrial-400 italic">لا توجد مواد مخزنية مخصصة حالياً</p>
                  ) : (
                    <div className="space-y-2">
                      {currentSelectedWOData.requiredMaterials.map((m, idx) => (
                        <div
                          key={m.partNumber + idx}
                          className="p-3 rounded-xl border border-industrial-200 dark:border-industrial-700 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                              {m.partNumber}
                            </span>
                            <p className="text-xs text-industrial-700 dark:text-industrial-300 truncate">
                              {m.description}
                            </p>
                            <span className="text-[10px] text-industrial-500 font-mono block">
                              الكمية المتوفرة: {m.quantity} {m.unit} | المستودع: {m.store}
                            </span>
                          </div>

                          <button
                            onClick={() => onInspectMaterial(m)}
                            className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>عرض</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Issued Materials */}
                {currentSelectedWOData.issuedMaterials.length > 0 && (
                  <div className="space-y-2.5 pt-3 border-t border-industrial-100 dark:border-industrial-700">
                    <h4 className="text-xs font-bold text-industrial-600 dark:text-industrial-400 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-industrial-500" />
                      <span>المواد المصروفة سابقاً ({currentSelectedWOData.issuedMaterials.length}):</span>
                    </h4>

                    <div className="space-y-2">
                      {currentSelectedWOData.issuedMaterials.map((m, idx) => (
                        <div
                          key={m.partNumber + idx}
                          className="p-3 rounded-xl border border-industrial-200 dark:border-industrial-700/60 bg-industrial-50/50 dark:bg-industrial-850/50 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0 opacity-80">
                            <span className="text-xs font-mono font-bold text-industrial-700 dark:text-industrial-300">
                              {m.partNumber}
                            </span>
                            <p className="text-xs text-industrial-600 dark:text-industrial-400 truncate">
                              {m.description}
                            </p>
                            <span className="text-[10px] text-industrial-400 font-mono block">
                              الحالة: تم الصرف والتركيب
                            </span>
                          </div>

                          <button
                            onClick={() => onInspectMaterial(m)}
                            className="px-3 py-1.5 bg-industrial-200 hover:bg-industrial-300 dark:bg-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>عرض</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-white dark:bg-industrial-800 rounded-2xl border border-dashed border-industrial-200 dark:border-industrial-700 text-center text-xs text-industrial-400 space-y-2">
                <Wrench className="h-10 w-10 text-industrial-300 dark:text-industrial-600" />
                <p className="font-semibold text-industrial-600 dark:text-industrial-300">
                  اختر أمر عمل (Work Order) من القائمة لاستعراض المعدات والمواد المطلوبة والمصروفة
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inspection & Matching Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inspection Form (Left Column / 5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-industrial-800 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-700 shadow-sm space-y-4">
            <div className="border-b border-industrial-100 dark:border-industrial-700 pb-3">
              <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>تسجيل فحص ومطابقة استلام مادة / Inspection Record</span>
              </h3>
              <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-0.5">
                مراجعة مطابقة المواد الواردة مقابل طلبات الشراء والمواصفات الفنية المعتمدة
              </p>
            </div>

            {inspSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{inspSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveInspection} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  رقم القطعة المطلوب فحصها (Part Number) *
                </label>
                <input
                  type="text"
                  required
                  value={inspPartNumber}
                  onChange={(e) => setInspPartNumber(e.target.value)}
                  placeholder="مثال: 3051S-TG-2A / PT-01"
                  list="materials-part-list"
                  className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-mono font-bold text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                />
                <datalist id="materials-part-list">
                  {materials.map(m => (
                    <option key={m.partNumber} value={m.partNumber}>{m.description}</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    رقم أمر الشراء (PO Number)
                  </label>
                  <input
                    type="text"
                    value={inspPoNumber}
                    onChange={(e) => setInspPoNumber(e.target.value)}
                    placeholder="PO-2026-..."
                    className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-mono text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    رقم طلب المادة (MR Number)
                  </label>
                  <input
                    type="text"
                    value={inspMrNumber}
                    onChange={(e) => setInspMrNumber(e.target.value)}
                    placeholder="MR-0811..."
                    className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-mono text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الموديل المورّد (Supplied Model)
                  </label>
                  <input
                    type="text"
                    value={inspSuppliedModel}
                    onChange={(e) => setInspSuppliedModel(e.target.value)}
                    placeholder="Model on Nameplate"
                    className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-mono text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الرقم التسلسلي (Serial Number)
                  </label>
                  <input
                    type="text"
                    value={inspSuppliedSerial}
                    onChange={(e) => setInspSuppliedSerial(e.target.value)}
                    placeholder="SN-..."
                    className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-mono text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  الشركة الصانعة المورّدة (Supplied Manufacturer)
                </label>
                <input
                  type="text"
                  value={inspSuppliedMfg}
                  onChange={(e) => setInspSuppliedMfg(e.target.value)}
                  placeholder="Rosemount / Yokogawa / Fisher..."
                  className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  نتيجة الفحص الفني والمطابقة (Inspection Outcome) *
                </label>
                <select
                  value={inspResult}
                  onChange={(e: any) => setInspResult(e.target.value)}
                  className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg font-bold text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                >
                  <option value="MATCHED">✅ مطابق تماماً (MATCHED)</option>
                  <option value="PARTIALLY MATCHED">⚠️ مطابق جزئياً (PARTIALLY MATCHED)</option>
                  <option value="ENGINEERING REVIEW">🔬 يتطلب مراجعة هندسية (ENGINEERING REVIEW)</option>
                  <option value="ON HOLD">⏳ معلق للتأكد (ON HOLD)</option>
                  <option value="REJECTED">❌ مرفوض وغير مطابق (REJECTED)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  السبب الفني / المبرر (Reason / Discrepancy)
                </label>
                <textarea
                  rows={2}
                  value={inspReason}
                  onChange={(e) => setInspReason(e.target.value)}
                  placeholder="اكتب التقرير الفني أو سبب الاختلاف إن وجد..."
                  className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  ملاحظات إضافية أو توصية
                </label>
                <input
                  type="text"
                  value={inspNotes}
                  onChange={(e) => setInspNotes(e.target.value)}
                  placeholder="ملاحظات وتوصيات التخزين أو التركيب..."
                  className="w-full bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 px-3 py-2 rounded-lg text-industrial-900 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>حفظ واعتماد تقرير الفحص / Save Record</span>
              </button>
            </form>
          </div>

          {/* Inspection Records History (Right Column / 7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-bold text-industrial-700 dark:text-industrial-300">
                سجل الفحوصات والمطابقات الفنية ({filteredInspections.length})
              </span>
              
              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10.5px]">
                {['ALL', 'MATCHED', 'PARTIALLY MATCHED', 'ENGINEERING REVIEW', 'REJECTED'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setInspFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      inspFilter === filter
                        ? 'bg-industrial-900 dark:bg-white text-white dark:text-industrial-900'
                        : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'الكل' : filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredInspections.length === 0 ? (
              <div className="bg-white dark:bg-industrial-800 p-8 rounded-2xl border border-industrial-200 dark:border-industrial-700 text-center text-xs text-industrial-500">
                لا توجد سجلات فحص مسجلة حتى الآن تطابق معايير الفلترة.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredInspections.map((insp) => {
                  const isMatch = insp.result === 'MATCHED';
                  const isPartial = insp.result === 'PARTIALLY MATCHED';
                  const isReview = insp.result === 'ENGINEERING REVIEW';
                  const isReject = insp.result === 'REJECTED';

                  return (
                    <div
                      key={insp.id}
                      className="bg-white dark:bg-industrial-800 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-industrial-900 dark:text-white">
                            {insp.partNumber}
                          </span>
                          {insp.poNumber && (
                            <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              PO: {insp.poNumber}
                            </span>
                          )}
                          {insp.mrNumber && (
                            <span className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              MR: {insp.mrNumber}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isMatch ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' :
                          isPartial ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                          isReview ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300' :
                          isReject ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                          'bg-industrial-100 text-industrial-800'
                        }`}>
                          {insp.result}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10.5px] font-mono bg-industrial-50 dark:bg-industrial-850 p-2.5 rounded-lg border border-industrial-150 dark:border-industrial-750">
                        {insp.suppliedModel && (
                          <div>
                            <span className="text-industrial-400 block text-[9.5px]">الموديل:</span>
                            <span className="font-bold text-industrial-800 dark:text-industrial-200 truncate block">{insp.suppliedModel}</span>
                          </div>
                        )}
                        {insp.suppliedSerial && (
                          <div>
                            <span className="text-industrial-400 block text-[9.5px]">السيريال:</span>
                            <span className="font-bold text-industrial-800 dark:text-industrial-200 truncate block">{insp.suppliedSerial}</span>
                          </div>
                        )}
                        {insp.suppliedManufacturer && (
                          <div>
                            <span className="text-industrial-400 block text-[9.5px]">المصنع:</span>
                            <span className="font-bold text-industrial-800 dark:text-industrial-200 truncate block">{insp.suppliedManufacturer}</span>
                          </div>
                        )}
                      </div>

                      {insp.reason && (
                        <p className="text-xs text-industrial-700 dark:text-industrial-300 font-sans bg-industrial-50/50 dark:bg-industrial-850/50 p-2 rounded border border-industrial-100 dark:border-industrial-700/60">
                          {insp.reason}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-industrial-400 font-mono pt-1 border-t border-industrial-100 dark:border-industrial-700">
                        <span>المفتش: {insp.inspector || 'Engineering Team'}</span>
                        <span>{new Date(insp.inspectionDate).toLocaleString('ar-EG')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
