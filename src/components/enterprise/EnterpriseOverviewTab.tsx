/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Package, 
  TrendingUp, 
  RefreshCw, 
  Boxes, 
  FileCheck2, 
  Truck, 
  ClipboardList, 
  ShieldCheck,
  ChevronRight,
  Filter,
  BarChart3,
  Search,
  Sparkles
} from 'lucide-react';
import { Material, EnterpriseHierarchyNode, InventoryTransaction, MaterialTransfer, ReceivingSession, User } from '../../types';
import { dbService } from '../../services/dbService';

interface EnterpriseOverviewTabProps {
  currentUser: User;
  materials?: Material[];
  sites?: EnterpriseHierarchyNode[];
  selectedSiteFilter?: string;
  setSelectedSiteFilter?: (site: string) => void;
  onNavigateTab?: (tabId: string) => void;
  onNavigateSubTab?: (tab: 'OVERVIEW' | 'HIERARCHY' | 'TRANSFERS' | 'LEDGER' | 'RECEIVING' | 'ISSUANCE' | 'SUPPLIERS' | 'APPROVALS') => void;
  onNavigateToTab?: (tabId: string, query?: string) => void;
  onSelectMaterial: (material: Material) => void;
}

export const EnterpriseOverviewTab: React.FC<EnterpriseOverviewTabProps> = ({
  currentUser,
  materials = [],
  sites = [],
  selectedSiteFilter,
  setSelectedSiteFilter,
  onNavigateTab,
  onNavigateSubTab,
  onNavigateToTab,
  onSelectMaterial
}) => {
  const [internalSiteFilter, setInternalSiteFilter] = useState('ALL');
  const activeSiteFilter = selectedSiteFilter !== undefined ? selectedSiteFilter : internalSiteFilter;
  const handleSiteFilterChange = setSelectedSiteFilter || setInternalSiteFilter;

  const handleNavigate = (target: string) => {
    const subTabMap: Record<string, 'OVERVIEW' | 'HIERARCHY' | 'TRANSFERS' | 'LEDGER' | 'RECEIVING' | 'ISSUANCE' | 'SUPPLIERS' | 'APPROVALS'> = {
      'stock-ledger': 'LEDGER',
      'ledger': 'LEDGER',
      'receiving': 'RECEIVING',
      'transfers': 'TRANSFERS',
      'tasks': 'APPROVALS',
      'approvals': 'APPROVALS',
      'hierarchy': 'HIERARCHY',
      'issuance': 'ISSUANCE',
      'suppliers': 'SUPPLIERS',
    };

    const targetLower = target.toLowerCase();
    if (subTabMap[targetLower] && onNavigateSubTab) {
      onNavigateSubTab(subTabMap[targetLower]);
    } else if (onNavigateTab) {
      onNavigateTab(target);
    } else if (onNavigateToTab) {
      onNavigateToTab(target);
    }
  };

  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const safeSites = Array.isArray(sites) && sites.length > 0 ? sites : (dbService.getHierarchyNodes() || []);
  
  // Real data metrics
  const transactions = dbService.getStockTransactions() || [];
  const transfers = dbService.getMaterialTransfers() || [];
  const tasks = dbService.getEnterpriseTasks() || [];
  const approvals = dbService.getApprovalRequests() || [];
  const receivingSessions = dbService.getReceivingSessions() || [];

  // Filter materials based on selected site if not 'ALL'
  const filteredMaterials = activeSiteFilter === 'ALL' 
    ? safeMaterials 
    : safeMaterials.filter(m => (m.store || '').toLowerCase().includes(activeSiteFilter.toLowerCase()) || (m.station || '').toLowerCase().includes(activeSiteFilter.toLowerCase()));

  const totalQuantity = filteredMaterials.reduce((acc, m) => acc + (m.quantity || 0), 0);
  const acceptedCount = filteredMaterials.filter(m => m.inspectionStatus === 'PASSED' || m.inspectionStatus === 'ACCEPTED' || m.status === 'Available').length;
  const underInspectionCount = filteredMaterials.filter(m => m.inspectionStatus === 'PENDING' || m.inspectionStatus === 'UNDER_INSPECTION' || m.status === 'Under Inspection').length;
  const rejectedCount = filteredMaterials.filter(m => m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted').length;
  const onHoldCount = filteredMaterials.filter(m => m.inspectionStatus === 'CONDITIONAL' || m.status === 'On Hold' || m.status === 'Pending Engineering Review').length;
  const lowStockCount = filteredMaterials.filter(m => (m.quantity || 0) <= (m.minStockLevel || 2)).length;

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;
  const activeTransfersCount = transfers.filter(t => t.status === 'REQUESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT').length;
  const openTasksCount = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  // Recent Stock movements
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* TOP HEADER & SITE SELECTOR */}
      <div className="bg-industrial-800/80 border border-industrial-700/70 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                EMIS v0.7 Enterprise Core
              </span>
              <span className="text-xs text-industrial-400">Multi-Site Operations</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-400" />
              Enterprise Operations & Material Lifecycle Command
            </h1>
            <p className="text-sm text-industrial-300 mt-0.5">
              Live multi-facility inventory tracking, state-machine lifecycle control, stock movements, and transfer logistics across all active gas & oil operations.
            </p>
          </div>

          {/* SITE SELECTOR PILL */}
          <div className="flex items-center gap-2 bg-industrial-900/90 p-1.5 rounded-lg border border-industrial-700">
            <Filter className="w-4 h-4 text-industrial-400 ml-2" />
            <span className="text-xs font-medium text-industrial-300">Site Scope:</span>
            <select
              value={activeSiteFilter}
              onChange={(e) => handleSiteFilterChange(e.target.value)}
              className="bg-industrial-800 text-white text-xs font-semibold px-3 py-1.5 rounded border border-industrial-600 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">🌐 All Enterprise Sites (Consolidated)</option>
              {safeSites.filter(s => s.type === 'SITE').map(s => (
                <option key={s.id} value={s.code}>
                  📍 {s.code} – {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS (CLICKABLE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Materials */}
        <div 
          onClick={() => handleNavigate('stock-ledger')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-industrial-700/80 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-brand-500/50 hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-industrial-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Items</span>
            <Boxes className="w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">{filteredMaterials.length}</div>
          <div className="text-[11px] text-industrial-400 mt-1 font-mono">{totalQuantity.toLocaleString()} Total Units</div>
        </div>

        {/* Accepted & Available */}
        <div 
          onClick={() => handleNavigate('materials')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium uppercase tracking-wider">Accepted / Stored</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">{acceptedCount}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1 font-medium">Ready for Operation</div>
        </div>

        {/* Under Inspection */}
        <div 
          onClick={() => handleNavigate('receiving')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-amber-500/20 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider">Inspection Pending</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 tracking-tight">{underInspectionCount}</div>
          <div className="text-[11px] text-amber-500/80 mt-1 font-medium">Verification in Progress</div>
        </div>

        {/* On Hold / Reviews */}
        <div 
          onClick={() => handleNavigate('tasks')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-purple-500/20 hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-medium uppercase tracking-wider">On Hold / Mismatch</span>
            <AlertTriangle className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400 tracking-tight">{onHoldCount}</div>
          <div className="text-[11px] text-purple-400/80 mt-1 font-medium">Action Required</div>
        </div>

        {/* Active Transfers */}
        <div 
          onClick={() => handleNavigate('transfers')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-blue-500/20 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Transfers</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400 tracking-tight">{activeTransfersCount}</div>
          <div className="text-[11px] text-blue-400/80 mt-1 font-medium">Inter-Site Movement</div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => handleNavigate('stock-ledger')}
          className="bg-industrial-800/90 hover:bg-industrial-750 border border-rose-500/20 hover:border-rose-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 group"
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock Warnings</span>
            <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 tracking-tight">{lowStockCount}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-medium">Below Reorder Level</div>
        </div>
      </div>

      {/* QUICK WORKFLOW LAUNCHERS & ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receiving Card */}
        <div 
          onClick={() => handleNavigate('receiving')}
          className="bg-gradient-to-br from-industrial-800 to-industrial-850 border border-industrial-700 hover:border-brand-500/60 rounded-xl p-5 cursor-pointer shadow hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/15 text-brand-400 rounded-xl border border-brand-500/30 group-hover:bg-brand-500/25 transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white group-hover:text-brand-300 transition-colors">
                Digital Receiving Session
              </h3>
              <p className="text-xs text-industrial-400 mt-0.5">
                Batch PO check-in, Nameplate OCR, and AI Verification.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-industrial-700/60 text-xs">
            <span className="text-industrial-300 font-medium">{receivingSessions.length} Active / Past Sessions</span>
            <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Launch Receiving <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Transfer Card */}
        <div 
          onClick={() => handleNavigate('transfers')}
          className="bg-gradient-to-br from-industrial-800 to-industrial-850 border border-industrial-700 hover:border-blue-500/60 rounded-xl p-5 cursor-pointer shadow hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30 group-hover:bg-blue-500/25 transition-colors">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                Material Inter-Site Transfer
              </h3>
              <p className="text-xs text-industrial-400 mt-0.5">
                Dispatch parts between NDGS, H-IPF, Jamna & Central Stores.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-industrial-700/60 text-xs">
            <span className="text-industrial-300 font-medium">{transfers.length} Total Transfer Slips</span>
            <span className="text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Manage Transfers <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Approval Center */}
        <div 
          onClick={() => handleNavigate('tasks')}
          className="bg-gradient-to-br from-industrial-800 to-industrial-850 border border-industrial-700 hover:border-emerald-500/60 rounded-xl p-5 cursor-pointer shadow hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">
                Approvals & Action Tasks
              </h3>
              <p className="text-xs text-industrial-400 mt-0.5">
                Review pending approvals, missing certificates and SLAs.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-industrial-700/60 text-xs">
            <span className="text-industrial-300 font-medium">
              <span className="text-amber-400 font-bold">{pendingApprovalsCount}</span> Pending Approvals
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open Task Hub <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SECTION: RECENT STOCK MOVEMENTS & ENTERPRISE SITES SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT STOCK MOVEMENTS (2 COLUMNS) */}
        <div className="lg:col-span-2 bg-industrial-850 border border-industrial-700/80 rounded-xl p-5 shadow">
          <div className="flex items-center justify-between pb-3 border-b border-industrial-700/70">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">Live Stock Movement Ledger</h2>
            </div>
            <button 
              onClick={() => handleNavigate('stock-ledger')}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
            >
              View Complete Ledger ({transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-industrial-750">
            {recentTransactions.map((tx) => {
              const isPositive = tx.quantityChange > 0;
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-industrial-800/40 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      tx.transactionType === 'RECEIPT' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      tx.transactionType === 'ISSUE' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      tx.transactionType === 'TRANSFER_IN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                      tx.transactionType === 'TRANSFER_OUT' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' :
                      'bg-industrial-700 text-industrial-300'
                    }`}>
                      {isPositive ? '+' : '-'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white font-mono">{tx.partNumber}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-industrial-700 text-industrial-300">
                          {tx.transactionType}
                        </span>
                        <span className="text-[11px] text-industrial-400 font-mono">Ref: {tx.referenceNumber}</span>
                      </div>
                      <p className="text-xs text-industrial-300 line-clamp-1 mt-0.5">{tx.materialDescription}</p>
                      <div className="text-[10px] text-industrial-400 flex items-center gap-2 mt-0.5">
                        <span>📍 {tx.site} ({tx.warehouse || 'Main Store'})</span>
                        <span>•</span>
                        <span>👤 {tx.performedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? `+${tx.quantityChange}` : tx.quantityChange} {tx.unit}
                    </span>
                    <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">
                      Balance: {tx.quantityAfter} {tx.unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SITES HEALTH & DIRECTORY PREVIEW (1 COLUMN) */}
        <div className="bg-industrial-850 border border-industrial-700/80 rounded-xl p-5 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-industrial-700/70">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Active Facilities ({safeSites.filter(s => s.type === 'SITE').length})</h2>
              </div>
              <button 
                onClick={() => handleNavigate('hierarchy')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Structure Tree <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {safeSites.filter(s => s.type === 'SITE').map(site => {
                const siteMatCount = safeMaterials.filter(m => (m.store || '').toLowerCase().includes(site.code.toLowerCase()) || (m.station || '').toLowerCase().includes(site.code.toLowerCase())).length;
                const isSelected = activeSiteFilter === site.code;
                return (
                  <div 
                    key={site.id}
                    onClick={() => handleSiteFilterChange(site.code)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-950/40 border-brand-500/60 shadow-sm' 
                        : 'bg-industrial-800/70 hover:bg-industrial-800 border-industrial-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${site.status === 'ACTIVE' ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-industrial-500'}`} />
                        <span className="font-semibold text-sm text-white">{site.code}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                        {siteMatCount} items
                      </span>
                    </div>
                    <div className="text-xs text-industrial-300 mt-1 font-medium">{site.name}</div>
                    <div className="text-[11px] text-industrial-400 mt-0.5 flex items-center justify-between">
                      <span>👤 {site.manager?.split('(')[0] || 'Store Mgr'}</span>
                      <span className="font-mono text-emerald-400">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-industrial-700/60 flex items-center justify-between">
            <button 
              onClick={() => handleSiteFilterChange('ALL')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                activeSiteFilter === 'ALL' 
                  ? 'bg-brand-600 text-white border-brand-500' 
                  : 'bg-industrial-800 text-industrial-300 border-industrial-700 hover:bg-industrial-750'
              }`}
            >
              Reset to All Sites
            </button>
            <span className="text-xs text-industrial-400 font-mono">EMIS v0.7 Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
