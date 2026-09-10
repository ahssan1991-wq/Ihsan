/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Wrench
} from 'lucide-react';
import { Material, ActivityLog, User as UserType, UserRole, ExternalFile, ExternalMaterial, AppDocument } from '../types';
import { dbService } from '../services/dbService';
import { getActionCenterItems } from '../services/port14Service';
import SystemHealthWidget from './SystemHealthWidget';
import { 
  EMISPageHeader, 
  EMISCard, 
  EMISBadge, 
  EMISButton,
  EMISStatus
} from './design-system';

interface DashboardViewProps {
  materials?: Material[];
  activities?: ActivityLog[];
  currentUser: UserType;
  onNavigateToTab: (tabId: string, initialSearch?: string) => void;
  onOpenWhatsNew?: () => void;
}

export default function DashboardView({ 
  materials = [], 
  activities = [], 
  currentUser, 
  onNavigateToTab,
  onOpenWhatsNew
}: DashboardViewProps) {
  const safeMaterials = Array.isArray(materials) ? materials : (dbService.getMaterials() || []);
  const safeActivities = Array.isArray(activities) ? activities : (dbService.getActivities() || []);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  
  // Real-time collections from dbService
  const [decisions, setDecisions] = useState(() => dbService.getEngineeringDecisions());
  const [equipment, setEquipment] = useState(() => dbService.getEquipment());
  const [blacklist, setBlacklist] = useState(() => dbService.getBlacklist());
  const [externalMaterials, setExternalMaterials] = useState<ExternalMaterial[]>(() => dbService.getExternalMaterials());
  const [documents, setDocuments] = useState<AppDocument[]>(() => dbService.getDocuments());
  const [actionItems, setActionItems] = useState(() => getActionCenterItems(currentUser));
  
  // Cloud & Offline sync state
  const [syncStatus, setSyncStatus] = useState(() => dbService.getSyncStatusSummary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const refreshData = () => {
    setDecisions(dbService.getEngineeringDecisions());
    setEquipment(dbService.getEquipment());
    setBlacklist(dbService.getBlacklist());
    setExternalMaterials(dbService.getExternalMaterials());
    setDocuments(dbService.getDocuments());
    setSyncStatus(dbService.getSyncStatusSummary());
    setActionItems(getActionCenterItems(currentUser));
  };

  useEffect(() => {
    refreshData();

    const handleSyncEvent = () => refreshData();
    window.addEventListener('online', handleSyncEvent);
    window.addEventListener('emis:sync-status-changed', handleSyncEvent);
    window.addEventListener('emis:background-sync-restored', handleSyncEvent);
    window.addEventListener('emis:recycle-bin-updated', handleSyncEvent);
    window.addEventListener('emis:material-added', handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleSyncEvent);
      window.removeEventListener('emis:sync-status-changed', handleSyncEvent);
      window.removeEventListener('emis:background-sync-restored', handleSyncEvent);
      window.removeEventListener('emis:recycle-bin-updated', handleSyncEvent);
      window.removeEventListener('emis:material-added', handleSyncEvent);
    };
  }, [currentUser]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await dbService.syncAllPendingToFirebase();
      refreshData();
      setSyncMessage({
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
    } catch (err: any) {
      setSyncMessage({
        text: `Sync error: ${err?.message || 'Failed to connect'}`,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // KPIs
  const totalMaterialsCount = safeMaterials.length;
  const zeroStockItems = safeMaterials.filter(m => (Number(m.quantity) || 0) <= 0);
  const lowStockItems = safeMaterials.filter(m => (Number(m.quantity) || 0) > 0 && (Number(m.quantity) || 0) <= (Number(m.minStockLevel) || 10));
  const blacklistedCount = blacklist.length;
  const pendingInspectionCount = safeMaterials.filter(m => m.inspectionStatus === 'pending' || m.inspectionStatus === 'underInspection').length;
  const quarantinedCount = safeMaterials.filter(m => m.inspectionStatus === 'rejected' || m.status === 'Quarantined').length + blacklistedCount;
  const totalPartsVolume = safeMaterials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  const criticalActionsCount = actionItems.filter(i => i.severity === 'CRITICAL').length;
  const pendingActionsCount = actionItems.filter(i => i.severity === 'PENDING').length;

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearchQuery.trim()) return;
    onNavigateToTab('search', quickSearchQuery.trim());
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${date.toLocaleDateString()}`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-command-center">
      {/* Port 14 EMIS COMMAND CENTER HEADER */}
      <div className="bg-industrial-900 p-6 rounded-2xl border border-industrial-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white heading-display">
                  EMIS Command Center
                </h1>
                <EMISBadge variant="brand" size="xs">
                  Port 14
                </EMISBadge>
                <span className="text-[10px] font-mono text-industrial-400">
                  v3.1.0
                </span>
              </div>
              <p className="text-xs text-industrial-400 mt-1">
                Central operational visibility: Real-time inventory telemetry, safety alerts, inspection workflows, and cloud replication.
              </p>
            </div>
          </div>
        </div>

        {/* Sync, Health & Release Notes Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenWhatsNew && (
            <EMISButton
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={onOpenWhatsNew}
            >
              Release Notes
            </EMISButton>
          )}

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 bg-industrial-800 hover:bg-industrial-750 text-industrial-200 border border-industrial-700 rounded-xl text-xs font-mono transition-colors cursor-pointer"
            title="Force Cloud Sync"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-brand-500' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : syncStatus.isOnline ? 'Firebase Connected' : 'Offline Mode'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
          syncMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="font-bold underline ml-2 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* PORT 14 ATTENTION BAR: "What requires my attention right now?" */}
      <div 
        onClick={() => onNavigateToTab('action-center')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          criticalActionsCount > 0
            ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400 ring-1 ring-rose-500/20'
            : pendingActionsCount > 0
            ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20'
            : 'bg-industrial-900 border-industrial-800 hover:border-brand-500/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            criticalActionsCount > 0
              ? 'bg-rose-500/20 text-rose-400'
              : pendingActionsCount > 0
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-industrial-400">
                Operational Attention Summary
              </span>
              {criticalActionsCount > 0 ? (
                <EMISBadge variant="danger" size="xs">
                  {criticalActionsCount} Critical Actions Required
                </EMISBadge>
              ) : pendingActionsCount > 0 ? (
                <EMISBadge variant="warning" size="xs">
                  {pendingActionsCount} Pending Verifications
                </EMISBadge>
              ) : (
                <EMISBadge variant="success" size="xs">
                  Nominal State
                </EMISBadge>
              )}
            </div>
            <p className="text-xs text-white font-medium mt-0.5">
              {criticalActionsCount > 0
                ? `${criticalActionsCount} materials have 0 stock or are under quarantine. Immediate operational sign-off required.`
                : pendingActionsCount > 0
                ? `${pendingActionsCount} receiving records or inspections require technical verification.`
                : 'All engineering records, stock thresholds, and inspection workflows are within standard operational limits.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-brand-400 hover:text-brand-300">
          <span>Open Action Center</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      {/* CORE 6 KPI TILES (PORT 14 COMMAND CENTER) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Materials */}
        <div
          onClick={() => onNavigateToTab('materials')}
          className="bg-industrial-900 p-4 rounded-2xl border border-industrial-800 hover:border-brand-500/50 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold">Total Catalog</span>
            <Layers className="h-4 w-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1.5">{totalMaterialsCount}</p>
          <span className="text-[10px] text-industrial-400 font-mono">
            {totalPartsVolume.toLocaleString()} units
          </span>
        </div>

        {/* 2. Zero Stock */}
        <div
          onClick={() => onNavigateToTab('materials', 'zero-stock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            zeroStockItems.length > 0 
              ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500' 
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">Zero Stock</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1.5">{zeroStockItems.length}</p>
          <span className="text-[10px] text-industrial-400 font-mono">Reorder required</span>
        </div>

        {/* 3. Low Stock */}
        <div
          onClick={() => onNavigateToTab('materials', 'lowstock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            lowStockItems.length > 0 
              ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500' 
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1.5">{lowStockItems.length}</p>
          <span className="text-[10px] text-industrial-400 font-mono">Below safety level</span>
        </div>

        {/* 4. Pending Inspection */}
        <div
          onClick={() => onNavigateToTab('mrf-management')}
          className="bg-industrial-900 p-4 rounded-2xl border border-industrial-800 hover:border-brand-500/50 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">QA Pending</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-sky-400 mt-1.5">{pendingInspectionCount}</p>
          <span className="text-[10px] text-industrial-400 font-mono">MRF & receiving</span>
        </div>

        {/* 5. Quarantined & Blacklist */}
        <div
          onClick={() => onNavigateToTab('blacklist')}
          className="bg-industrial-900 p-4 rounded-2xl border border-industrial-800 hover:border-brand-500/50 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-rose-300 font-bold">Quarantined</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1.5">{quarantinedCount}</p>
          <span className="text-[10px] text-industrial-400 font-mono">Isolated items</span>
        </div>

        {/* 6. Cloud Sync Status */}
        <div
          onClick={() => onNavigateToTab('backup-sync')}
          className="bg-industrial-900 p-4 rounded-2xl border border-industrial-800 hover:border-brand-500/50 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Cloud Sync</span>
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-white mt-2">
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </p>
          <span className="text-[10px] text-industrial-400 font-mono">
            {syncStatus.pendingCount} pending mutations
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS BAR (PORT 14 REQUIREMENT 8) */}
      <div className="bg-industrial-900 p-4 rounded-2xl border border-industrial-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-industrial-400 font-bold tracking-wider block">
            Quick Operational Commands & Industrial Studios
          </span>
          <span className="text-[11px] font-mono text-brand-400 font-medium">EMIS Core & Field Tools</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2.5">
          <button
            onClick={() => onNavigateToTab('add-material')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-brand-500 text-center"
          >
            <PlusCircle className="h-4 w-4 text-brand-400" />
            <span>Add Material</span>
          </button>

          <button
            onClick={() => onNavigateToTab('barcode-studio')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-cyan-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-full text-[9px] font-mono font-bold">DPI</span>
            <Barcode className="h-4 w-4 text-cyan-400" />
            <span>Barcode Studio</span>
          </button>

          <button
            onClick={() => onNavigateToTab('cycle-count')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[9px] font-mono font-bold">Audit</span>
            <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            <span>Cycle Count</span>
          </button>

          <button
            onClick={() => onNavigateToTab('reorder-hub')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-amber-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[9px] font-mono font-bold">PR</span>
            <ShoppingCart className="h-4 w-4 text-amber-400" />
            <span>Reorder Hub</span>
          </button>

          <button
            onClick={() => onNavigateToTab('shelf-life')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-amber-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[9px] font-mono font-bold">Aging</span>
            <Hourglass className="h-4 w-4 text-amber-400" />
            <span>Shelf-Life</span>
          </button>

          <button
            onClick={() => onNavigateToTab('preventive-maintenance')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-blue-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full text-[9px] font-mono font-bold">PM</span>
            <Wrench className="h-4 w-4 text-blue-400" />
            <span>PM Kits</span>
          </button>

          <button
            onClick={() => onNavigateToTab('workflow-approvals')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500 text-center relative group"
          >
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[9px] font-mono font-bold">Sign</span>
            <FileCheck2 className="h-4 w-4 text-emerald-400" />
            <span>Approvals</span>
          </button>

          <button
            onClick={() => onNavigateToTab('action-center')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-amber-500 text-center"
          >
            <BellRing className="h-4 w-4 text-amber-400" />
            <span>Action Center</span>
          </button>

          <button
            onClick={() => onNavigateToTab('data-quality')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500 text-center"
          >
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Data Quality</span>
          </button>

          <button
            onClick={() => onNavigateToTab('search')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-sky-500 text-center"
          >
            <Search className="h-4 w-4 text-sky-400" />
            <span>Global Search</span>
          </button>

          <button
            onClick={() => onNavigateToTab('enterprise')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-indigo-500 text-center"
          >
            <Building2 className="h-4 w-4 text-indigo-400" />
            <span>Receiving & Ops</span>
          </button>

          <button
            onClick={() => onNavigateToTab('excel-import')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-teal-500 text-center"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-400" />
            <span>Excel Import</span>
          </button>

          <button
            onClick={() => onNavigateToTab('documents')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-yellow-500 text-center"
          >
            <FolderArchive className="h-4 w-4 text-yellow-400" />
            <span>Documents</span>
          </button>

          <button
            onClick={() => onNavigateToTab('ai-copilot')}
            className="p-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer hover:border-purple-500 text-center"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>AI Co-Pilot</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Recent Activities & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Operational Activity Stream */}
        <div className="lg:col-span-2 bg-industrial-900 rounded-2xl border border-industrial-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Live Activity Stream</h2>
              <p className="text-xs text-industrial-400">Append-only operational event telemetry</p>
            </div>
            <EMISButton
              variant="outline"
              size="xs"
              onClick={() => onNavigateToTab('reports')}
            >
              View Full Audit Log
            </EMISButton>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {safeActivities.slice(0, 7).map((act) => (
              <div
                key={act.id || Math.random()}
                className="p-3 rounded-xl bg-industrial-850/80 border border-industrial-750/70 flex items-center justify-between text-xs gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{act.action}</span>
                    {act.userName && (
                      <span className="font-mono text-[10px] text-brand-400 font-bold bg-brand-500/10 px-1.5 py-0.2 rounded border border-brand-500/20">
                        {act.userName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-industrial-300 truncate">{act.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-industrial-400 block font-mono">{formatTime(act.timestamp)}</span>
                  <span className="text-[9px] text-industrial-500 uppercase">{act.userRole}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: System Health & Infrastructure Widget */}
        <div className="space-y-4">
          <SystemHealthWidget />
        </div>
      </div>
    </div>
  );
}
