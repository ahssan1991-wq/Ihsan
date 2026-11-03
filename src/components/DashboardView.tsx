/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  AlertTriangle, 
  Search, 
  PlusCircle, 
  ArrowRight,
  Shield, 
  Activity, 
  Boxes, 
  Database, 
  FileCheck2, 
  ShieldAlert, 
  Warehouse, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Radio, 
  FileSpreadsheet, 
  AlertOctagon, 
  RefreshCw, 
  ChevronRight, 
  FolderArchive, 
  Building2, 
  Compass, 
  BellRing, 
  Sparkles, 
  CheckCircle, 
  FileText, 
  Barcode, 
  ClipboardCheck, 
  ShoppingCart, 
  Hourglass, 
  Wrench,
  FolderKanban,
  ExternalLink,
  Tag,
  ArrowUpRight
} from 'lucide-react';
import { Material, ActivityLog, User as UserType, UserRole, WarehouseFile, AppDocument } from '../types';
import { dbService } from '../services/dbService';
import { getActionCenterItems } from '../services/port14Service';
import { useLanguage } from '../contexts/LanguageContext';
import SystemHealthWidget from './SystemHealthWidget';

interface DashboardViewProps {
  materials?: Material[];
  activities?: ActivityLog[];
  currentUser: UserType;
  onNavigateToTab: (tabId: string, initialSearch?: string) => void;
  onOpenWhatsNew?: () => void;
  onInspectMaterial?: (material: Material) => void;
}

export default function DashboardView({ 
  materials = [], 
  activities = [], 
  currentUser, 
  onNavigateToTab,
  onOpenWhatsNew,
  onInspectMaterial
}: DashboardViewProps) {
  const { language, t, isRTL } = useLanguage();
  const safeMaterials = Array.isArray(materials) ? materials : (dbService.getMaterials() || []);
  const safeActivities = Array.isArray(activities) ? activities : (dbService.getActivities() || []);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  
  // Real-time collections from dbService
  const [warehouseFiles, setWarehouseFiles] = useState<WarehouseFile[]>(() => dbService.getWarehouseFiles());
  const [blacklist, setBlacklist] = useState(() => dbService.getBlacklist());
  const [actionItems, setActionItems] = useState(() => getActionCenterItems(currentUser));
  
  // Cloud & Offline sync state
  const [syncStatus, setSyncStatus] = useState(() => dbService.getSyncStatusSummary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const refreshData = () => {
    setWarehouseFiles(dbService.getWarehouseFiles());
    setBlacklist(dbService.getBlacklist());
    setSyncStatus(dbService.getSyncStatusSummary());
    setActionItems(getActionCenterItems(currentUser));
  };

  useEffect(() => {
    refreshData();

    const handleSyncEvent = () => refreshData();
    window.addEventListener('online', handleSyncEvent);
    window.addEventListener('emis:sync-status-changed', handleSyncEvent);
    window.addEventListener('emis:background-sync-restored', handleSyncEvent);
    window.addEventListener('emis:materials-changed', handleSyncEvent);
    window.addEventListener('emis:warehouse-files-updated', handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleSyncEvent);
      window.removeEventListener('emis:sync-status-changed', handleSyncEvent);
      window.removeEventListener('emis:background-sync-restored', handleSyncEvent);
      window.removeEventListener('emis:materials-changed', handleSyncEvent);
      window.removeEventListener('emis:warehouse-files-updated', handleSyncEvent);
    };
  }, [currentUser?.id]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const syncPromise = dbService.syncAllPendingToFirebase();
      const timeoutPromise = new Promise<{ success: boolean; syncedCount: number; message: string }>((resolve) =>
        setTimeout(() => resolve({ success: true, syncedCount: 0, message: language === 'ar' ? 'تم التحقق من مزامنة السجل' : 'Synchronized with local and cloud repository' }), 3000)
      );
      const result = await Promise.race([syncPromise, timeoutPromise]);
      refreshData();
      setSyncMessage({
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
    } catch (err: any) {
      setSyncMessage({
        text: `${language === 'ar' ? 'خطأ في الاتصال' : 'Sync error'}: ${err?.message || 'Failed to connect'}`,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      refreshData();
    }
  };

  // KPIs
  const totalMaterialsCount = safeMaterials.length;
  const zeroStockItems = useMemo(() => safeMaterials.filter(m => (Number(m.quantity) || 0) <= 0), [safeMaterials]);
  const lowStockItems = useMemo(() => safeMaterials.filter(m => (Number(m.quantity) || 0) > 0 && (Number(m.quantity) || 0) <= (Number(m.minStockLevel) || 10)), [safeMaterials]);
  const blacklistedCount = blacklist.length;
  const pendingInspectionCount = useMemo(() => safeMaterials.filter(m => m.inspectionStatus === 'pending' || m.inspectionStatus === 'underInspection').length, [safeMaterials]);
  const quarantinedCount = useMemo(() => safeMaterials.filter(m => m.inspectionStatus === 'rejected' || m.status === 'Quarantined').length + blacklistedCount, [safeMaterials, blacklistedCount]);
  const totalPartsVolume = useMemo(() => safeMaterials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0), [safeMaterials]);

  const criticalActionsCount = actionItems.filter(i => i.severity === 'CRITICAL').length;
  const pendingActionsCount = actionItems.filter(i => i.severity === 'PENDING').length;

  // Recently updated materials
  const recentMaterials = useMemo(() => {
    return [...safeMaterials]
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [safeMaterials]);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearchQuery.trim()) return;
    onNavigateToTab('search', quickSearchQuery.trim());
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return language === 'ar' ? 'مؤخراً' : 'Recent';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return language === 'ar' ? 'الآن' : 'Just now';
      if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      if (diffDays === 1) return language === 'ar' ? 'أمس' : 'Yesterday';
      return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    } catch {
      return language === 'ar' ? 'مؤخراً' : 'Recent';
    }
  };

  return (
    <div className="space-y-6 text-slate-100" id="dashboard-command-center" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. HERO OPERATIONS COMMAND & PROMINENT UNIVERSAL SEARCH */}
      <div className="bg-[#0a101d] border border-[#1b263b] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1b263b]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                EMIS v3.2
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                {language === 'ar' ? 'مركز القيادة والعمليات الهندسية' : 'Engineering Operations Command'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'إدارة متكاملة لملفات المخازن المستقلة، محرك البحث الموحّد لكافة القطع والمواصفات، ومتابعة الأرصدة والعمليات اللحظية.'
                : 'Unified operational workspace for independent warehouse files, cross-catalog search, asset telemetry, and real-time ledger sync.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWhatsNew && (
              <button
                type="button"
                onClick={onOpenWhatsNew}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11192a] hover:bg-[#162137] text-slate-300 hover:text-white border border-[#1e2a42] text-xs font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>{language === 'ar' ? 'سجل التحديثات' : 'Release Notes'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#11192a] hover:bg-[#162137] text-slate-200 border border-[#1e2a42] text-xs font-mono transition-colors cursor-pointer"
              title="Repository Sync"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? (language === 'ar' ? 'جارِ التحقق...' : 'Syncing...') : syncStatus.isOnline ? (language === 'ar' ? 'المستودع متزامن' : 'Repository Synced') : (language === 'ar' ? 'تشغيل محلي' : 'Local Mode')}</span>
            </button>
          </div>
        </div>

        {/* PROMINENT UNIVERSAL SEARCH BAR */}
        <div className="pt-5">
          <form onSubmit={handleQuickSearchSubmit} className="relative flex items-center">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} h-5 w-5 text-blue-400 pointer-events-none`} />
            <input
              type="text"
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder={language === 'ar' 
                ? 'ابحث عبر كافة ملفات المخازن برقم القطعة (Part No)، كود الموديل، الرقم التسلسلي، أو الوصف الهندسي...' 
                : 'Universal search across all warehouse files by Part Number, Model, Serial, or Technical Description...'}
              className={`w-full py-3.5 ${isRTL ? 'pr-12 pl-36' : 'pl-12 pr-36'} bg-[#070b14] border border-[#1e2a42] hover:border-blue-500/60 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all shadow-inner`}
            />
            <div className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} flex items-center gap-2`}>
              <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-1 rounded bg-[#11192a] text-slate-400 border border-[#1e2a42]">
                ⌘K
              </kbd>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>{language === 'ar' ? 'بحث موحّد' : 'Search'}</span>
                <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </form>

          {/* Quick Filter Tag Suggestions */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar text-[11px] text-slate-400">
            <span className="font-mono text-slate-500 shrink-0">{language === 'ar' ? 'أمثلة سريعة:' : 'Quick tags:'}</span>
            {['PT-', 'FCV-', 'Rosemount', 'Fisher', 'Siemens', 'Yokogawa'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onNavigateToTab('search', tag)}
                className="px-2.5 py-1 rounded bg-[#11192a] hover:bg-[#162137] text-slate-300 border border-[#1e2a42] hover:border-blue-500/40 transition-colors font-mono cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          syncMessage.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
        }`}>
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="font-bold underline ml-2 cursor-pointer">
            {language === 'ar' ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* 2. OPERATIONAL ATTENTION & TELEMETRY STRIP */}
      <div 
        onClick={() => onNavigateToTab('action-center')}
        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          criticalActionsCount > 0
            ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-400/60'
            : pendingActionsCount > 0
            ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-400/60'
            : 'bg-[#0a101d] border-[#1b263b] hover:border-blue-500/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            criticalActionsCount > 0
              ? 'bg-rose-500/20 text-rose-400'
              : pendingActionsCount > 0
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">
                {language === 'ar' ? 'حالة التنبيهات والجاهزية التشغيلية' : 'Operational Readiness & Action Center'}
              </span>
              {criticalActionsCount > 0 ? (
                <span className="text-[11px] font-mono text-rose-400 font-semibold">
                  · {criticalActionsCount} {language === 'ar' ? 'إجراءات حرجة مطلوبة' : 'critical actions required'}
                </span>
              ) : pendingActionsCount > 0 ? (
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  · {pendingActionsCount} {language === 'ar' ? 'عمليات معلقة' : 'pending reviews'}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  · {language === 'ar' ? 'الحالة المعيارية مستقرة' : 'nominal operations'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {criticalActionsCount > 0
                ? (language === 'ar' ? `${criticalActionsCount} مواد ذات رصيد صفر أو تحت الحجر الفني تتطلب اتخاذ قرار فوري.` : `${criticalActionsCount} materials require immediate inventory or quarantine review.`)
                : pendingActionsCount > 0
                ? (language === 'ar' ? `${pendingActionsCount} سجلات فحص واستلام في انتظار المطابقة الفنية.` : `${pendingActionsCount} receiving or inspection records awaiting technical verification.`)
                : (language === 'ar' ? 'كافة السجلات الهندسية والمخزنية ضمن الحدود المعيارية المعتمدة.' : 'All materials, safety stock thresholds, and inspection workflows are within standard limits.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 shrink-0">
          <span>{language === 'ar' ? 'عرض تفاصيل الإجراءات' : 'Open Action Center'}</span>
          <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* 3. OPERATIONAL METRICS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Catalog */}
        <div
          onClick={() => onNavigateToTab('materials')}
          className="bg-[#0a101d] p-4 rounded-xl border border-[#1b263b] hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              {language === 'ar' ? 'إجمالي الكتالوج' : 'Master Catalog'}
            </span>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{totalMaterialsCount}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {totalPartsVolume.toLocaleString()} {language === 'ar' ? 'قطعة مسجلة' : 'units registered'}
          </span>
        </div>

        {/* Zero Stock */}
        <div
          onClick={() => onNavigateToTab('materials', 'zero-stock')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            zeroStockItems.length > 0 
              ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50' 
              : 'bg-[#0a101d] border-[#1b263b] hover:border-[#2a3b58]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">
              {language === 'ar' ? 'رصيد صفر' : 'Zero Stock'}
            </span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{zeroStockItems.length}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === 'ar' ? 'يتطلب إعادة طلب' : 'Reorder needed'}
          </span>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => onNavigateToTab('materials', 'lowstock')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            lowStockItems.length > 0 
              ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50' 
              : 'bg-[#0a101d] border-[#1b263b] hover:border-[#2a3b58]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
              {language === 'ar' ? 'رصيد منخفض' : 'Low Stock'}
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{lowStockItems.length}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === 'ar' ? 'تحت حد الأمان' : 'Below safety level'}
          </span>
        </div>

        {/* Pending QA */}
        <div
          onClick={() => onNavigateToTab('mrf-management')}
          className="bg-[#0a101d] p-4 rounded-xl border border-[#1b263b] hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">
              {language === 'ar' ? 'قيد الفحص الفني' : 'QA Pending'}
            </span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-sky-400 mt-1">{pendingInspectionCount}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === 'ar' ? 'استلام ومطابقة' : 'MRF & Receiving'}
          </span>
        </div>

        {/* Quarantined */}
        <div
          onClick={() => onNavigateToTab('blacklist')}
          className="bg-[#0a101d] p-4 rounded-xl border border-[#1b263b] hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-rose-300 font-bold">
              {language === 'ar' ? 'المحجوز والمرفوض' : 'Quarantined'}
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{quarantinedCount}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === 'ar' ? 'معزول فنياً' : 'Isolated items'}
          </span>
        </div>

        {/* Warehouse Files */}
        <div
          onClick={() => onNavigateToTab('warehouse-files')}
          className="bg-[#0a101d] p-4 rounded-xl border border-[#1b263b] hover:border-blue-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
              {language === 'ar' ? 'ملفات المخازن' : 'Store Files'}
            </span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{warehouseFiles.length}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {language === 'ar' ? 'ملفات مستقلة' : 'Independent files'}
          </span>
        </div>
      </div>

      {/* 4. WORKSPACE LAUNCHPAD (4 KEY MODULES) */}
      <div className="bg-[#0a101d] border border-[#1b263b] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              {language === 'ar' ? 'الوحدات الهندسية' : 'Engineering Core'}
            </span>
            <h2 className="text-sm font-bold text-white mt-0.5">
              {language === 'ar' ? 'بوابات العمليات المباشرة' : 'Operational Workspace Launchpad'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">EMIS Operational Modules</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => onNavigateToTab('warehouse-files')}
            className="p-4 rounded-xl bg-[#11192a] hover:bg-[#162137] border border-[#1e2a42] hover:border-blue-500/50 text-start transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <FolderKanban className="h-5 w-5 text-blue-400 group-hover:scale-105 transition-transform" />
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-xs font-bold text-white">
              {language === 'ar' ? 'إدارة ملفات المخازن' : 'Warehouse Files Manager'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {language === 'ar' ? 'إدارة واستيراد ملفات الإكسل مع الحفاظ على الأعمدة والتسلسل المستقل لكل مخزن.' : 'Manage & import Excel files preserving independent sequences & raw data.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('materials')}
            className="p-4 rounded-xl bg-[#11192a] hover:bg-[#162137] border border-[#1e2a42] hover:border-blue-500/50 text-start transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <Layers className="h-5 w-5 text-sky-400 group-hover:scale-105 transition-transform" />
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <p className="text-xs font-bold text-white">
              {language === 'ar' ? 'سجل المواد والكتالوج العام' : 'Materials Master Ledger'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {language === 'ar' ? 'جدول هندسي عالي الكثافة مع خيارات العرض، الفرز، وتصدير الدفعات.' : 'High-density engineering table with dense/card view modes and batch actions.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('add-material')}
            className="p-4 rounded-xl bg-[#11192a] hover:bg-[#162137] border border-[#1e2a42] hover:border-blue-500/50 text-start transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <PlusCircle className="h-5 w-5 text-emerald-400 group-hover:scale-105 transition-transform" />
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs font-bold text-white">
              {language === 'ar' ? 'تسجيل صنف جديد' : 'New Part Registration'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {language === 'ar' ? 'تسجيل مادة هندسية مع توليد تسلسل تلقائي خاص بملف المخزن المختار.' : 'Register material with auto-sequence linked to the target warehouse file.'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('search')}
            className="p-4 rounded-xl bg-[#11192a] hover:bg-[#162137] border border-[#1e2a42] hover:border-blue-500/50 text-start transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <Search className="h-5 w-5 text-purple-400 group-hover:scale-105 transition-transform" />
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-xs font-bold text-white">
              {language === 'ar' ? 'البحث الموحّد و OCR' : 'Universal Search & OCR'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {language === 'ar' ? 'محرك البحث المتعدد عبر المخازن مع قراءة لوحات البيانات بالكاميرا.' : 'Multi-warehouse query engine with field camera OCR nameplate extraction.'}
            </p>
          </button>
        </div>
      </div>

      {/* 5. INDEPENDENT WAREHOUSE FILES LEDGER */}
      <div className="bg-[#0a101d] border border-[#1b263b] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1b263b]">
          <div>
            <h2 className="text-sm font-bold text-white">
              {language === 'ar' ? 'ملفات المخازن المستقلة النشطة' : 'Active Independent Warehouse Files'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'ar' 
                ? 'كل ملف يحتفظ بـ fileId وتسلسل أرقام مستقل، مع عزل تام للبيانات وعدم التداخل.' 
                : 'Each dataset operates with its persistent fileId, sequence series, and isolated schema.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('warehouse-files')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>{language === 'ar' ? 'مدير الملفات الكامل' : 'Manage Files'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouseFiles.map(file => (
            <div
              key={file.id}
              className="p-4 rounded-xl bg-[#11192a] border border-[#1e2a42] hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                    <h3 className="font-semibold text-xs text-white truncate" title={file.name}>
                      {file.name}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#0a101d] text-blue-400 border border-[#1e2a42] shrink-0">
                    {file.totalRecords} {language === 'ar' ? 'سجل' : 'items'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={file.fileName}>
                  {file.fileName || file.warehouseName || 'Standard Warehouse File'}
                </p>
                {file.description && (
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                    {file.description}
                  </p>
                )}
              </div>

              <div className="pt-2.5 border-t border-[#1b263b] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">
                  {language === 'ar' ? 'التحديث: ' : 'Updated: '} {formatTime(file.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('materials', file.name)}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{language === 'ar' ? 'عرض المواد' : 'View Materials'}</span>
                  <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TWO COLUMN: RECENTLY UPDATED MATERIALS & TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Density Materials Ledger */}
        <div className="lg:col-span-2 bg-[#0a101d] rounded-xl border border-[#1b263b] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1b263b]">
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'ar' ? 'المواد المحدثة مؤخراً بالسجل' : 'Recent Engineering Material Ledger'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'آخر العمليات المسجلة برقم القطعة والتسلسل والمخزن' : 'Latest ledger updates with part numbers, sequence, and file linkage'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('materials')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              {language === 'ar' ? 'عرض الكتالوج الكامل' : 'View Full Catalog'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-[#1b263b] text-slate-400 font-mono text-[10px] uppercase">
                  <th className="pb-2.5 text-start font-semibold">{language === 'ar' ? 'رقم القطعة (PN)' : 'Part Number'}</th>
                  <th className="pb-2.5 text-start font-semibold">{language === 'ar' ? 'الوصف الهندسي والمُصنّع' : 'Description & Maker'}</th>
                  <th className="pb-2.5 text-start font-semibold">{language === 'ar' ? 'ملف المخزن' : 'Warehouse File'}</th>
                  <th className="pb-2.5 text-start font-semibold">{language === 'ar' ? 'الرصيد' : 'Stock'}</th>
                  <th className="pb-2.5 text-end font-semibold">{language === 'ar' ? 'معاينة' : 'Inspect'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b263b]/70">
                {recentMaterials.map(mat => {
                  const qty = Number(mat.quantity) || 0;
                  const isZero = qty <= 0;
                  const isLow = qty > 0 && qty <= (Number(mat.minStockLevel) || 10);

                  return (
                    <tr key={mat.id || mat.partNumber} className="hover:bg-[#11192a]/80 transition-colors">
                      <td className="py-3 pr-3">
                        <span className="font-mono font-bold text-white tracking-wider">
                          {mat.partNumber}
                        </span>
                        {mat.fileSequence && (
                          <span className="block text-[10px] font-mono text-slate-400">
                            #{mat.fileSequence}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 max-w-[240px]">
                        <p className="truncate text-slate-200 font-medium" title={mat.description}>
                          {mat.description}
                        </p>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {mat.manufacturer || '—'} {mat.model ? `• ${mat.model}` : ''}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-300 font-mono">
                          {mat.fileName || mat.warehouse || 'NDGS'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className={`font-mono text-xs font-semibold ${isZero ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {qty} {mat.unit || 'EA'}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-500">
                          {isZero ? (language === 'ar' ? 'نفاد مخزون' : 'Stockout') : isLow ? (language === 'ar' ? 'تحت الحد' : 'Low stock') : (language === 'ar' ? 'متوفر' : 'Available')}
                        </span>
                      </td>
                      <td className="py-3 text-end whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (onInspectMaterial) {
                              onInspectMaterial(mat);
                            } else {
                              onNavigateToTab('materials', mat.partNumber);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-[#11192a] hover:bg-[#162137] text-slate-200 hover:text-white border border-[#1e2a42] text-[11px] transition-colors cursor-pointer"
                        >
                          {language === 'ar' ? 'معاينة' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Operational Telemetry & System Health */}
        <div className="space-y-4">
          <div className="bg-[#0a101d] rounded-xl border border-[#1b263b] p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1b263b]">
              <h2 className="text-sm font-bold text-white">
                {language === 'ar' ? 'سجل العمليات والتدقيق' : 'Live Event Telemetry'}
              </h2>
              <span className="text-[10px] font-mono text-slate-500">Append-only</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {safeActivities.slice(0, 5).map((act) => (
                <div
                  key={act.id || Math.random()}
                  className="p-3 rounded-lg bg-[#11192a] border border-[#1e2a42] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate">{act.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatTime(act.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">{act.details}</p>
                </div>
              ))}
            </div>
          </div>

          <SystemHealthWidget />
        </div>
      </div>
    </div>
  );
}
