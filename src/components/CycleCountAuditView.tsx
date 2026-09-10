/**
 * EMIS Industrial Cycle Counting & Physical Inventory Audits
 * Comprehensive warehouse audit, barcode-assisted field counting, variance calculation, and reconciliation.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Barcode, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpDown, 
  Layers, 
  Warehouse, 
  Printer, 
  Download, 
  Check, 
  X, 
  SlidersHorizontal,
  Clock,
  UserCheck,
  ShieldAlert,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Material, User, StockCountSession, StockCountItem, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService } from '../services/dbService';
import { openPrintPreview } from '../utils/printManager';

interface CycleCountAuditProps {
  materials: Material[];
  currentUser: User | null;
  onMaterialsUpdated?: () => void;
  onInspectMaterial?: (m: Material) => void;
}

export const CycleCountAuditView: React.FC<CycleCountAuditProps> = ({
  materials,
  currentUser,
  onMaterialsUpdated,
  onInspectMaterial
}) => {
  const { language, isRTL } = useLanguage();

  // Sessions state
  const [sessions, setSessions] = useState<StockCountSession[]>(() => {
    return dbService.getStockCountSessions();
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const inProg = dbService.getStockCountSessions().find(s => s.status === 'IN_PROGRESS');
    return inProg ? inProg.id : null;
  });

  // New Session Modal
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newScopeWarehouse, setNewScopeWarehouse] = useState<string>('ALL');
  const [newScopeCategory, setNewScopeCategory] = useState<string>('ALL');
  const [newSessionNotes, setNewSessionNotes] = useState<string>('');

  // Field Counting Barcode Scanner State
  const [scanInput, setScanInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterVarianceOnly, setFilterVarianceOnly] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Toast feedback
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // Sync sessions when changed
  const reloadSessions = () => {
    const list = dbService.getStockCountSessions();
    setSessions(list);
  };

  // Focus scan input automatically when active session is open
  useEffect(() => {
    if (activeSession && activeSession.status === 'IN_PROGRESS') {
      scanInputRef.current?.focus();
    }
  }, [activeSessionId]);

  // Stats calculation
  const stats = useMemo(() => {
    if (!activeSession) {
      const totalSessions = sessions.length;
      const completed = sessions.filter(s => s.status === 'COMPLETED').length;
      const inProgress = sessions.filter(s => s.status === 'IN_PROGRESS').length;
      return { totalSessions, completed, inProgress, accuracyPct: 100, varianceCount: 0 };
    }

    const items = activeSession.items;
    const totalItems = items.length;
    const countedItems = items.filter(i => i.status !== 'UNCOUNTED').length;
    const matches = items.filter(i => i.status === 'MATCH').length;
    const shortages = items.filter(i => i.status === 'SHORTAGE').length;
    const surpluses = items.filter(i => i.status === 'SURPLUS').length;
    const accuracyPct = countedItems > 0 ? Math.round((matches / countedItems) * 100) : 100;
    const totalVariance = shortages + surpluses;

    return {
      totalItems,
      countedItems,
      matches,
      shortages,
      surpluses,
      accuracyPct,
      totalVariance
    };
  }, [activeSession, sessions]);

  // Handle Barcode Scan / Fast Search in active session
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || !activeSession) return;

    const term = scanInput.trim().toUpperCase();
    const found = activeSession.items.find(i => 
      i.partNumber.toUpperCase() === term || 
      (i.description || '').toUpperCase().includes(term) ||
      (i.location || '').toUpperCase() === term
    );

    if (found) {
      setSelectedItemId(found.id);
      setNotice({ type: 'info', text: `${language === 'ar' ? 'تم العثور على المادة:' : 'Found material:'} ${found.partNumber}` });
    } else {
      setNotice({ type: 'error', text: `${language === 'ar' ? 'لم يتم العثور على مادة بالرمز:' : 'No item matched scan:'} ${term}` });
    }
    setScanInput('');
  };

  // Update physical count for an item
  const handleUpdateItemCount = (itemId: string, newCount: number) => {
    if (!activeSession || activeSession.status !== 'IN_PROGRESS') return;

    const updatedItems = activeSession.items.map(item => {
      if (item.id === itemId) {
        const physical = Math.max(0, newCount);
        const variance = physical - item.systemQuantity;
        let status: StockCountItem['status'] = 'MATCH';
        if (variance < 0) status = 'SHORTAGE';
        else if (variance > 0) status = 'SURPLUS';

        return {
          ...item,
          physicalQuantity: physical,
          variance,
          status,
          countedBy: currentUser?.name || 'Auditor',
          countedAt: new Date().toISOString()
        };
      }
      return item;
    });

    const totalVarianceCount = updatedItems.filter(i => i.status === 'SHORTAGE' || i.status === 'SURPLUS').length;

    const updatedSession: StockCountSession = {
      ...activeSession,
      items: updatedItems,
      totalVarianceCount
    };

    const nextSessions = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    setSessions(nextSessions);
    dbService.saveStockCountSessions(nextSessions);
  };

  // Start new counting session
  const handleCreateSession = () => {
    if (!currentUser) return;

    // Filter materials for this session
    let targetMaterials = materials;
    if (newScopeWarehouse !== 'ALL') {
      targetMaterials = targetMaterials.filter(m => m.warehouse === newScopeWarehouse);
    }
    if (newScopeCategory !== 'ALL') {
      targetMaterials = targetMaterials.filter(m => m.category === newScopeCategory);
    }

    if (targetMaterials.length === 0) {
      setNotice({ type: 'error', text: language === 'ar' ? 'لا توجد مواد مطابقة للنطاق المحدد.' : 'No materials match the selected scope.' });
      return;
    }

    const items: StockCountItem[] = targetMaterials.map(m => ({
      id: `item-${m.partNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      partNumber: m.partNumber,
      description: m.description || m.name || '',
      systemQuantity: m.quantity,
      physicalQuantity: null,
      variance: 0,
      unit: m.unit || 'EA',
      location: m.location || m.warehouse || 'RACK-01',
      status: 'UNCOUNTED'
    }));

    const session = dbService.createStockCountSession({
      site: currentUser.site || 'ALL',
      warehouse: newScopeWarehouse,
      createdBy: currentUser.name,
      items,
      notes: newSessionNotes || (language === 'ar' ? 'جرد دوري للمستودع' : 'Regular cycle count')
    }, currentUser);

    reloadSessions();
    setActiveSessionId(session.id);
    setIsNewSessionModalOpen(false);
    setNotice({ type: 'success', text: `${language === 'ar' ? 'تم إنشاء جلسة الجرد بنجاح:' : 'Created audit session:'} ${session.sessionNumber}` });
  };

  // Reconcile and commit physical inventory
  const handleReconcileSession = () => {
    if (!activeSession || !currentUser) return;

    const uncounted = activeSession.items.filter(i => i.status === 'UNCOUNTED').length;
    if (uncounted > 0) {
      const confirmProceed = window.confirm(
        language === 'ar'
          ? `تنبيه: هناك ${uncounted} مادة لم يتم جردها بعد. هل ترغب في اعتماد التسوية للمواد المجرودة فقط؟`
          : `Warning: ${uncounted} items have not been counted yet. Proceed with reconciling counted items only?`
      );
      if (!confirmProceed) return;
    }

    // Apply adjustments to database
    let adjustedCount = 0;
    activeSession.items.forEach(item => {
      if (item.status !== 'UNCOUNTED' && item.variance !== 0 && item.physicalQuantity !== null) {
        const mat = materials.find(m => m.partNumber === item.partNumber);
        if (mat) {
          const updatedMat: Material = {
            ...mat,
            quantity: item.physicalQuantity,
            updatedAt: new Date().toISOString()
          };
          dbService.updateMaterial(updatedMat, currentUser);
          adjustedCount++;
        }
      }
    });

    // Mark session as completed
    const completedSession: StockCountSession = {
      ...activeSession,
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    };

    const nextSessions = sessions.map(s => s.id === completedSession.id ? completedSession : s);
    setSessions(nextSessions);
    dbService.saveStockCountSessions(nextSessions);

    if (onMaterialsUpdated) {
      onMaterialsUpdated();
    }

    setNotice({
      type: 'success',
      text: language === 'ar'
        ? `تم اعتماد الجرد بنجاح وتسوية ${adjustedCount} مادة في سجل المخزون الرسمي.`
        : `Audit reconciled successfully. Adjusted ${adjustedCount} materials in official ledger.`
    });
  };

  // Print Official Inventory Count Certificate
  const handlePrintAuditCertificate = () => {
    if (!activeSession) return;

    const itemsRows = activeSession.items.map((i, idx) => {
      const statusColor = i.status === 'MATCH' ? '#16a34a' : i.status === 'SHORTAGE' ? '#dc2626' : i.status === 'SURPLUS' ? '#d97706' : '#6b7280';
      const statusLabel = i.status === 'MATCH' ? 'مطابق / Match' : i.status === 'SHORTAGE' ? `عجز (${i.variance})` : i.status === 'SURPLUS' ? `فائض (+${i.variance})` : 'لم يجرد / Uncounted';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">${i.partNumber}</td>
          <td style="padding: 6px 8px;">${i.description}</td>
          <td style="padding: 6px 8px; text-align: center;">${i.location}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${i.systemQuantity} ${i.unit}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; background: #f9fafb;">${i.physicalQuantity !== null ? `${i.physicalQuantity} ${i.unit}` : '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${statusColor};">${statusLabel}</td>
          <td style="padding: 6px 8px; text-align: center; font-size: 10px;">${i.countedBy || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>محضر جرد مخزني رسمي - ${activeSession.sessionNumber}</title>
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
            <div style="font-size: 11px; font-weight: bold; color: #666;">نظام إدارة ومطابقة المواد الصناعية - EMIS</div>
            <div class="title">محضر جرد وتدقيق المخزون الفعلي (Physical Inventory Audit)</div>
          </div>
          <div style="text-align: left; font-family: monospace; font-size: 14px; font-weight: bold;">
            ${activeSession.sessionNumber}
          </div>
        </div>

        <div class="meta-grid">
          <div><b>الموقع / المستودع:</b> ${activeSession.warehouse || 'كافة المستودعات'}</div>
          <div><b>تاريخ الجلسة:</b> ${new Date(activeSession.createdAt).toLocaleDateString()}</div>
          <div><b>الحالة:</b> ${activeSession.status === 'COMPLETED' ? 'معتمد ومكتمل' : 'قيد التنفيذ'}</div>
          <div><b>المسؤول عن الجرد:</b> ${activeSession.createdBy}</div>
          <div><b>إجمالي المواد:</b> ${activeSession.items.length}</div>
          <div><b>الفروقات المرصودة:</b> ${activeSession.totalVarianceCount} مادة</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th>رقم المادة (P/N)</th>
              <th>الوصف الفني</th>
              <th style="text-align: center;">الموقع</th>
              <th style="text-align: center;">الرصيد الدفتري</th>
              <th style="text-align: center;">الرصيد الفعلي</th>
              <th style="text-align: center;">النتيجة</th>
              <th style="text-align: center;">المدقق</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div><b>أمين المستودع</b></div>
            <div class="sig-box">التوقيع والختم: ............................</div>
          </div>
          <div>
            <div><b>رئيس لجنة الجرد والتدقيق</b></div>
            <div class="sig-box">التوقيع والختم: ............................</div>
          </div>
          <div>
            <div><b>مدير العمليات الهندسية</b></div>
            <div class="sig-box">الاعتماد النهائي: ............................</div>
          </div>
        </div>
      </body>
      </html>
    `;

    openPrintPreview(
      `Inventory_Audit_${activeSession.sessionNumber}`,
      html,
      `Audit_${activeSession.sessionNumber}.html`
    );
  };

  // Filter items in active session
  const filteredItems = useMemo(() => {
    if (!activeSession) return [];
    const q = tableSearch.toLowerCase().trim();

    return activeSession.items.filter(item => {
      const matchesSearch = !q || 
        item.partNumber.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      const matchesVariance = !filterVarianceOnly || item.status === 'SHORTAGE' || item.status === 'SURPLUS';

      return matchesSearch && matchesVariance;
    });
  }, [activeSession, tableSearch, filterVarianceOnly]);

  const activeSelectedItem = useMemo(() => {
    if (!activeSession || !selectedItemId) return null;
    return activeSession.items.find(i => i.id === selectedItemId) || null;
  }, [activeSession, selectedItemId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-industrial-900 via-industrial-850 to-emerald-950 p-6 rounded-2xl border border-industrial-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black heading-display">
                {language === 'ar' ? 'الجرد الدوري والتدقيق الميداني للمخزون' : 'Cycle Counting & Physical Inventory'}
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                AUDIT & RECONCILIATION
              </span>
            </div>
            <p className="text-xs text-industrial-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'إجراء الجرد الفعلي للمواد عبر قارئ الباركود، مطابقة الرصيد الدفتري مع الفعلي في الرفوف، رصد العجز والفائض، واعتماد تسوية الفروقات المخزنية.'
                : 'Conduct fast physical inventory counts with barcode scanners. Compare ledger balance against rack counts, calculate variances, and approve stock reconciliations.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewSessionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{language === 'ar' ? 'بدء جلسة جرد جديدة' : 'New Count Session'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          notice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : notice.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer text-industrial-400 hover:text-industrial-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sessions Selector Tabs */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2">
        <div className="flex items-center gap-2">
          {sessions.map(s => {
            const isCur = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSessionId(s.id);
                  setSelectedItemId(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isCur
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-industrial-850 hover:bg-industrial-50 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-750'
                }`}
              >
                <span className="font-mono">{s.sessionNumber}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  s.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                }`}>
                  {s.status}
                </span>
                {s.totalVarianceCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-mono">
                    {s.totalVarianceCount} var
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeSession ? (
        <div className="space-y-6">
          {/* Active Session Status Bar */}
          <div className="bg-white dark:bg-industrial-850 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold block">
                  {language === 'ar' ? 'جلسة الجرد النشطة' : 'Active Audit Session'}
                </span>
                <div className="text-base font-black font-mono text-industrial-900 dark:text-industrial-100">
                  {activeSession.sessionNumber}
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-industrial-200 dark:bg-industrial-750" />

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-industrial-400 block text-[10px]">{language === 'ar' ? 'المستودع' : 'Warehouse'}</span>
                  <span className="font-bold">{activeSession.warehouse || 'ALL'}</span>
                </div>
                <div>
                  <span className="text-industrial-400 block text-[10px]">{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                  <span className="font-bold font-mono">
                    {stats.countedItems} / {stats.totalItems} ({stats.totalItems > 0 ? Math.round((stats.countedItems / stats.totalItems) * 100) : 0}%)
                  </span>
                </div>
                <div>
                  <span className="text-industrial-400 block text-[10px]">{language === 'ar' ? 'دقة التطابق' : 'Accuracy'}</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.accuracyPct}%</span>
                </div>
                <div>
                  <span className="text-industrial-400 block text-[10px]">{language === 'ar' ? 'فروقات' : 'Variances'}</span>
                  <span className={`font-bold font-mono ${stats.totalVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {stats.totalVariance}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Print Certificate, Reconcile */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintAuditCertificate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-800 hover:bg-industrial-50 text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-industrial-500" />
                <span>{language === 'ar' ? 'طباعة محضر الجرد' : 'Print Certificate'}</span>
              </button>

              {activeSession.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={handleReconcileSession}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'اعتماد الجرد وتسوية الأرصدة' : 'Reconcile & Adjust'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Barcode Scanner & Rapid Count Form */}
          {activeSession.status === 'IN_PROGRESS' && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
              <form onSubmit={handleScanSubmit} className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder={language === 'ar' ? 'امسح باركود المادة أو الرف عبر القارئ، أو اكتب رقم المادة P/N...' : 'Scan barcode or enter Part Number...'}
                    className="w-full pl-9 pr-4 py-2 text-sm font-mono rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-industrial-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-2xs"
                >
                  {language === 'ar' ? 'فحص ومطابقة' : 'Scan Item'}
                </button>
              </form>

              <div className="text-xs text-industrial-500 dark:text-industrial-400 font-mono shrink-0">
                {language === 'ar' ? 'يدعم ماسحات الباركود اللاسلكية USB / Bluetooth' : 'Hardware Barcode Gun Auto-Detected'}
              </div>
            </div>
          )}

          {/* Selected Item Quick Count Pad */}
          {activeSelectedItem && activeSession.status === 'IN_PROGRESS' && (
            <div className="bg-white dark:bg-industrial-850 p-5 rounded-2xl border-2 border-emerald-500 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-industrial-900 dark:text-industrial-100">
                      {activeSelectedItem.partNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 font-bold font-mono">
                      {activeSelectedItem.location}
                    </span>
                  </div>
                  <p className="text-xs text-industrial-600 dark:text-industrial-300 mt-0.5">
                    {activeSelectedItem.description}
                  </p>
                </div>

                {/* Tactile Count Buttons */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-industrial-400 block uppercase">
                      {language === 'ar' ? 'الرصيد الدفتري' : 'Book Balance'}
                    </span>
                    <span className="text-lg font-black font-mono">
                      {activeSelectedItem.systemQuantity} {activeSelectedItem.unit}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-industrial-200 dark:bg-industrial-700" />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(activeSelectedItem.id, (activeSelectedItem.physicalQuantity || 0) - 5)}
                      className="px-2.5 py-1.5 rounded-lg bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-xs font-bold cursor-pointer"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(activeSelectedItem.id, (activeSelectedItem.physicalQuantity || 0) - 1)}
                      className="px-2.5 py-1.5 rounded-lg bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-xs font-bold cursor-pointer"
                    >
                      -1
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={activeSelectedItem.physicalQuantity !== null ? activeSelectedItem.physicalQuantity : ''}
                      placeholder="0"
                      onChange={(e) => handleUpdateItemCount(activeSelectedItem.id, parseInt(e.target.value) || 0)}
                      className="w-20 py-1.5 text-center text-base font-black font-mono rounded-xl border-2 border-emerald-500 bg-white dark:bg-industrial-900"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(activeSelectedItem.id, (activeSelectedItem.physicalQuantity || 0) + 1)}
                      className="px-2.5 py-1.5 rounded-lg bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-xs font-bold cursor-pointer"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(activeSelectedItem.id, (activeSelectedItem.physicalQuantity || 0) + 5)}
                      className="px-2.5 py-1.5 rounded-lg bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-xs font-bold cursor-pointer"
                    >
                      +5
                    </button>

                    {/* Quick Match shortcut */}
                    <button
                      type="button"
                      onClick={() => handleUpdateItemCount(activeSelectedItem.id, activeSelectedItem.systemQuantity)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      {language === 'ar' ? 'تطابق تام' : 'Exact Match'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table of items in audit session */}
          <div className="bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xs overflow-hidden">
            {/* Table toolbar */}
            <div className="p-4 border-b border-industrial-200 dark:border-industrial-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث في جدول الجرد...' : 'Search items in count table...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterVarianceOnly(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                    filterVarianceOnly
                      ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800'
                      : 'bg-white dark:bg-industrial-800 text-industrial-600 border-industrial-200 dark:border-industrial-700'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>{language === 'ar' ? 'عرض الفروقات فقط' : 'Show Variances Only'}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-industrial-50 dark:bg-industrial-800/80 text-industrial-500 border-b border-industrial-200 dark:border-industrial-700 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">{language === 'ar' ? 'رقم المادة والوصف' : 'Part Number & Description'}</th>
                    <th className="p-3">{language === 'ar' ? 'الموقع / الرف' : 'Location'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'الرصيد الدفتري' : 'Book Qty'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'الرصيد الفعلي' : 'Physical Qty'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'الفارق' : 'Variance'}</th>
                    <th className="p-3 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-right">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-industrial-400">
                        {language === 'ar' ? 'لا توجد مواد مطابقة في هذه الجلسة' : 'No items match the current view.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isSelected = item.id === selectedItemId;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-industrial-50 dark:hover:bg-industrial-800/50 transition-colors ${
                            isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                          }`}
                        >
                          <td className="p-3 text-industrial-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-mono font-bold text-industrial-900 dark:text-industrial-100">
                              {item.partNumber}
                            </div>
                            <div className="text-industrial-500 text-[11px] truncate max-w-xs">
                              {item.description}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-semibold">
                            {item.location}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {item.systemQuantity} {item.unit}
                          </td>
                          <td className="p-3 text-center">
                            {activeSession.status === 'IN_PROGRESS' ? (
                              <input
                                type="number"
                                min="0"
                                value={item.physicalQuantity !== null ? item.physicalQuantity : ''}
                                placeholder="-"
                                onChange={(e) => handleUpdateItemCount(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 px-1.5 py-0.8 text-center text-xs font-bold font-mono rounded border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                              />
                            ) : (
                              <span className="font-mono font-bold">
                                {item.physicalQuantity !== null ? `${item.physicalQuantity} ${item.unit}` : '-'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {item.status === 'UNCOUNTED' ? (
                              <span className="text-industrial-400">-</span>
                            ) : item.variance === 0 ? (
                              <span className="text-emerald-600">0</span>
                            ) : item.variance > 0 ? (
                              <span className="text-amber-600 font-bold">+{item.variance}</span>
                            ) : (
                              <span className="text-rose-600 font-bold">{item.variance}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.status === 'MATCH' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{language === 'ar' ? 'مطابق' : 'Match'}</span>
                              </span>
                            )}
                            {item.status === 'SHORTAGE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                <TrendingDown className="h-3 w-3" />
                                <span>{language === 'ar' ? 'عجز' : 'Shortage'}</span>
                              </span>
                            )}
                            {item.status === 'SURPLUS' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <TrendingUp className="h-3 w-3" />
                                <span>{language === 'ar' ? 'فائض' : 'Surplus'}</span>
                              </span>
                            )}
                            {item.status === 'UNCOUNTED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-industrial-100 text-industrial-600 dark:bg-industrial-800 dark:text-industrial-400">
                                <Clock className="h-3 w-3" />
                                <span>{language === 'ar' ? 'لم يجرد' : 'Uncounted'}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedItemId(item.id)}
                              className="px-2 py-1 text-xs rounded bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 font-semibold cursor-pointer"
                            >
                              {language === 'ar' ? 'تعديل' : 'Count'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-industrial-850 p-12 rounded-2xl border border-industrial-200 dark:border-industrial-750 text-center space-y-3">
          <ClipboardCheck className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-industrial-900 dark:text-industrial-100">
            {language === 'ar' ? 'لا توجد جلسات جرد نشطة حالياً' : 'No Active Count Sessions'}
          </h3>
          <p className="text-xs text-industrial-500 max-w-md mx-auto">
            {language === 'ar'
              ? 'ابدأ جلسة جرد دورية جديدة للمستودع بكامله أو لموقع رف محدد لبدء المطابقة وتسوية الأرصدة.'
              : 'Start a new physical cycle count session to begin scanning items and verifying warehouse stocks.'}
          </p>
          <button
            type="button"
            onClick={() => setIsNewSessionModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {language === 'ar' ? 'بدء جلسة جرد الآن' : 'Start Audit Session'}
          </button>
        </div>
      )}

      {/* New Session Modal */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-industrial-850 rounded-2xl max-w-md w-full border border-industrial-200 dark:border-industrial-750 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
                  {language === 'ar' ? 'إنشاء جلسة جرد دوري جديدة' : 'Create New Cycle Count Session'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-industrial-400 hover:text-industrial-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                  {language === 'ar' ? 'نطاق المستودع:' : 'Target Warehouse Scope:'}
                </label>
                <select
                  value={newScopeWarehouse}
                  onChange={(e) => setNewScopeWarehouse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                >
                  <option value="ALL">{language === 'ar' ? 'كافة المستودعات (شامل)' : 'All Warehouses'}</option>
                  <option value="WH-01">WH-01 Main Industrial Store</option>
                  <option value="WH-02">WH-02 Hazardous & Chemical Store</option>
                  <option value="WH-03">WH-03 Electrical & Instrumentation Yard</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                  {language === 'ar' ? 'نطاق التصنيف:' : 'Category Filter:'}
                </label>
                <select
                  value={newScopeCategory}
                  onChange={(e) => setNewScopeCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                >
                  <option value="ALL">{language === 'ar' ? 'كافة التصنيفات' : 'All Categories'}</option>
                  <option value="Instrumentation">Instrumentation & Control</option>
                  <option value="Electrical">Electrical Parts</option>
                  <option value="Mechanical">Mechanical & Piping</option>
                  <option value="Safety">Safety & PPE</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-industrial-700 dark:text-industrial-300 block mb-1">
                  {language === 'ar' ? 'ملاحظات وهدف الجرد:' : 'Session Purpose / Notes:'}
                </label>
                <textarea
                  rows={3}
                  value={newSessionNotes}
                  onChange={(e) => setNewSessionNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: جرد ربع سنوي لأرفف الحساسات والصمامات...' : 'e.g. Q3 sensor racks routine audit...'}
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-100 dark:border-industrial-800">
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleCreateSession}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {language === 'ar' ? 'تأكيد وبدء الجلسة' : 'Launch Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
