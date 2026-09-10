/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldAlert, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileQuestion, 
  Clock, 
  TrendingDown, 
  ArrowLeftRight, 
  Truck, 
  Building2, 
  Zap, 
  ChevronRight,
  Database,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Material, User } from '../../types';
import { smartAlertService } from '../../services/smartAlertService';
import { dbService } from '../../services/dbService';

interface IntelligenceOverviewTabProps {
  materials?: Material[];
  selectedSite?: string;
  dateRange?: string;
  currentUser: User;
  onNavigateToTab?: (subTab: string, initialQuery?: string) => void;
  onOpenMaterialModal?: (material: Material) => void;
}

export default function IntelligenceOverviewTab({
  materials = [],
  selectedSite = 'ALL',
  dateRange = '30_DAYS',
  currentUser,
  onNavigateToTab,
  onOpenMaterialModal
}: IntelligenceOverviewTabProps) {
  const safeNavigate = (subTab: string, initialQuery?: string) => {
    if (typeof onNavigateToTab === 'function') {
      onNavigateToTab(subTab, initialQuery);
    }
  };

  const safeMaterials = Array.isArray(materials) ? materials : (dbService.getMaterials() || []);
  const filteredMaterials = safeMaterials.filter(m => {
    if (selectedSite !== 'ALL' && m.store !== selectedSite) return false;
    return true;
  });

  const totalMaterials = filteredMaterials.length;
  const activeMaterials = filteredMaterials.filter(m => m.status === 'Available' || m.inspectionStatus === 'PASSED').length;
  const underInspection = filteredMaterials.filter(m => m.inspectionStatus === 'PENDING' || m.inspectionStatus === 'UNDER_INSPECTION' || m.status === 'Under Inspection').length;
  const accepted = filteredMaterials.filter(m => m.inspectionStatus === 'PASSED' || m.inspectionStatus === 'ACCEPTED' || m.status === 'Available').length;
  const rejected = filteredMaterials.filter(m => m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted').length;
  const mismatched = filteredMaterials.filter(m => m.oemVerificationStatus === 'alternative').length;
  const missingDocs = filteredMaterials.filter(m => !m.datasheet && !m.coc && (!m.documents || Object.keys(m.documents).length === 0)).length;

  const lowStock = filteredMaterials.filter(m => (m.quantity || 0) > 0 && (m.quantity || 0) <= (m.minStockLevel || 1)).length;
  const outOfStock = filteredMaterials.filter(m => (m.quantity || 0) === 0).length;

  const transfers = dbService.getMaterialTransfers() || [];
  const activeTransfers = transfers.filter(t => 
    (selectedSite === 'ALL' || t.fromSite === selectedSite || t.toSite === selectedSite) &&
    (t.status === 'REQUESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT')
  ).length;

  const receiving = dbService.getReceivingSessions() || [];
  const pendingReceiving = receiving.filter(r => 
    (selectedSite === 'ALL' || r.site === selectedSite) &&
    (r.status === 'IN_PROGRESS' || r.status === 'ON_HOLD')
  ).length;

  const approvals = dbService.getApprovalRequests() || [];
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;

  const alertSummary = smartAlertService.getAlertSummary(selectedSite) || { critical: 0, active: 0, high: 0, medium: 0, low: 0, total: 0 };
  const crossSiteOpportunities = dbService.getCrossSiteOpportunities(selectedSite) || [];
  const suppliers = dbService.getSupplierRiskProfiles() || [];
  const highRiskSuppliers = suppliers.filter(s => s.riskTier === 'HIGH' || s.riskTier === 'CRITICAL').length;

  // Real System Health calculation based on real weights
  const healthScore = totalMaterials > 0 
    ? Math.max(0, Math.min(100, Math.round(
        ((accepted / totalMaterials) * 40) +
        (((totalMaterials - missingDocs) / totalMaterials) * 25) +
        (((totalMaterials - outOfStock) / totalMaterials) * 20) +
        (alertSummary.critical === 0 ? 15 : Math.max(0, 15 - alertSummary.critical * 3))
      )))
    : 100;

  return (
    <div className="space-y-6">
      {/* Top Executive Health & Metric Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall System Health Score */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider">Engineering Health Index</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              healthScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              healthScore >= 60 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {healthScore >= 80 ? 'OPTIMAL' : healthScore >= 60 ? 'ATTENTION' : 'CRITICAL'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-white heading-display font-mono">{healthScore}%</span>
            <span className="text-xs text-industrial-400">weighted compliance</span>
          </div>
          <div className="w-full bg-industrial-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-industrial-400 font-mono">
            <span>Site: {selectedSite}</span>
            <span>Target: &gt;= 90%</span>
          </div>
        </div>

        {/* Critical Alerts Counter */}
        <div 
          onClick={() => safeNavigate('alerts')}
          className="bg-industrial-900 border border-industrial-800 hover:border-red-500/50 transition-all rounded-xl p-5 cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider">Active Smart Alerts</span>
            <div className="p-1.5 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-red-400 heading-display font-mono">{alertSummary.active}</span>
            <span className="text-xs text-red-400/80">({alertSummary.critical} Critical)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-industrial-400 group-hover:text-industrial-200">
            <span>{alertSummary.high} High, {alertSummary.medium} Medium</span>
            <ChevronRight className="w-3.5 h-3.5 text-industrial-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Stock Shortages & Cross-Site Opportunities */}
        <div 
          onClick={() => safeNavigate('cross-site')}
          className="bg-industrial-900 border border-industrial-800 hover:border-brand-500/50 transition-all rounded-xl p-5 cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider">Cross-Site Opportunities</span>
            <div className="p-1.5 bg-brand-500/10 rounded-lg text-brand-400 border border-brand-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-brand-400 heading-display font-mono">{crossSiteOpportunities.length}</span>
            <span className="text-xs text-brand-400/80">Surplus Matches</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-industrial-400 group-hover:text-industrial-200">
            <span>{outOfStock} Out of Stock / {lowStock} Low</span>
            <ChevronRight className="w-3.5 h-3.5 text-industrial-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Inspection & Approval Backlog */}
        <div 
          onClick={() => safeNavigate('aging')}
          className="bg-industrial-900 border border-industrial-800 hover:border-amber-500/50 transition-all rounded-xl p-5 cursor-pointer group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider">Pending Aging Backlog</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-amber-400 heading-display font-mono">{underInspection + pendingApprovals}</span>
            <span className="text-xs text-amber-400/80">Action Items</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-industrial-400 group-hover:text-industrial-200">
            <span>{underInspection} QA Insp / {pendingApprovals} Approvals</span>
            <ChevronRight className="w-3.5 h-3.5 text-industrial-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 16-Grid Detailed Telemetry Matrix */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 border-b border-industrial-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-500" />
              Live Operational & Inventory Telemetry
            </h3>
            <p className="text-xs text-industrial-400 mt-0.5">
              Real-time aggregation from localized database registers &bull; Site: <span className="text-industrial-200 font-mono font-semibold">{selectedSite}</span> &bull; Scope: <span className="text-industrial-200 font-mono font-semibold">{dateRange}</span>
            </p>
          </div>
          <button
            onClick={() => safeNavigate('kpis')}
            className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-750 text-brand-400 border border-industrial-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Full KPI Center</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* 1. Total Materials */}
          <div 
            onClick={() => safeNavigate('materials')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Total Materials</div>
            <div className="text-xl font-bold text-white font-mono mt-1">{totalMaterials}</div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-0.5">Active catalog</div>
          </div>

          {/* 2. Under Inspection */}
          <div 
            onClick={() => safeNavigate('aging')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Under Inspection</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1">{underInspection}</div>
            <div className="text-[10px] text-amber-400/80 mt-1">Pending QA signoff</div>
          </div>

          {/* 3. Accepted Materials */}
          <div 
            onClick={() => safeNavigate('materials')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Accepted & In-Service</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{accepted}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1">QA passed</div>
          </div>

          {/* 4. Rejected / Blacklisted */}
          <div 
            onClick={() => safeNavigate('materials')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Rejected / Quarantined</div>
            <div className="text-xl font-bold text-red-400 font-mono mt-1">{rejected}</div>
            <div className="text-[10px] text-red-400/80 mt-1">Non-conforming</div>
          </div>

          {/* 5. Mismatches */}
          <div 
            onClick={() => safeNavigate('alerts')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">MR/PO Mismatches</div>
            <div className="text-xl font-bold text-orange-400 font-mono mt-1">{mismatched}</div>
            <div className="text-[10px] text-orange-400/80 mt-1">Spec divergence</div>
          </div>

          {/* 6. Missing Documents */}
          <div 
            onClick={() => safeNavigate('materials')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Missing MTR / CoC</div>
            <div className="text-xl font-bold text-amber-300 font-mono mt-1">{missingDocs}</div>
            <div className="text-[10px] text-amber-400/80 mt-1">No certificate</div>
          </div>

          {/* 7. Low Stock */}
          <div 
            onClick={() => safeNavigate('cross-site')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Low Stock Buffer</div>
            <div className="text-xl font-bold text-yellow-400 font-mono mt-1">{lowStock}</div>
            <div className="text-[10px] text-yellow-400/80 mt-1">&lt;= Min threshold</div>
          </div>

          {/* 8. Out of Stock */}
          <div 
            onClick={() => safeNavigate('cross-site')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Stock Outages (0 Qty)</div>
            <div className="text-xl font-bold text-red-500 font-mono mt-1">{outOfStock}</div>
            <div className="text-[10px] text-red-400/80 mt-1">Immediate shortage</div>
          </div>

          {/* 9. Active Transfers */}
          <div 
            onClick={() => safeNavigate('cross-site')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Active Transfers</div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-1">{activeTransfers}</div>
            <div className="text-[10px] text-blue-400/80 mt-1">In transit / Req</div>
          </div>

          {/* 10. Pending Receiving */}
          <div 
            onClick={() => safeNavigate('aging')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Receiving Sessions</div>
            <div className="text-xl font-bold text-cyan-400 font-mono mt-1">{pendingReceiving}</div>
            <div className="text-[10px] text-cyan-400/80 mt-1">Open manifests</div>
          </div>

          {/* 11. Pending Approvals */}
          <div 
            onClick={() => safeNavigate('aging')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Pending Approvals</div>
            <div className="text-xl font-bold text-purple-400 font-mono mt-1">{pendingApprovals}</div>
            <div className="text-[10px] text-purple-400/80 mt-1">Awaiting signoff</div>
          </div>

          {/* 12. Supplier Risk Flags */}
          <div 
            onClick={() => safeNavigate('suppliers')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Supplier Quality Flags</div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-1">{highRiskSuppliers}</div>
            <div className="text-[10px] text-rose-400/80 mt-1">High/Critical risk</div>
          </div>

          {/* 13. Critical Alerts */}
          <div 
            onClick={() => safeNavigate('alerts')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Critical Alerts</div>
            <div className="text-xl font-bold text-red-400 font-mono mt-1">{alertSummary.critical}</div>
            <div className="text-[10px] text-red-400/80 mt-1">Priority 1</div>
          </div>

          {/* 14. Stock Transactions */}
          <div 
            onClick={() => safeNavigate('kpis')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Ledger Audit Count</div>
            <div className="text-xl font-bold text-teal-400 font-mono mt-1">{dbService.getStockTransactions().length}</div>
            <div className="text-[10px] text-teal-400/80 mt-1">Immutable records</div>
          </div>

          {/* 15. Active Hierarchy Sites */}
          <div 
            onClick={() => safeNavigate('kpis')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Enterprise Nodes</div>
            <div className="text-xl font-bold text-indigo-400 font-mono mt-1">{dbService.getHierarchyNodes().length}</div>
            <div className="text-[10px] text-indigo-400/80 mt-1">Sites & warehouses</div>
          </div>

          {/* 16. Verified MTR Reports */}
          <div 
            onClick={() => safeNavigate('reports')}
            className="p-3.5 bg-industrial-950/60 border border-industrial-800/80 rounded-xl hover:border-industrial-700 transition-all cursor-pointer"
          >
            <div className="text-[11px] text-industrial-400 font-medium">Verification Reports</div>
            <div className="text-xl font-bold text-emerald-300 font-mono mt-1">{dbService.getVerificationReports().length}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1">QA Certificates</div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Cross-Site Shortage Actions & Critical Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Cross-Site Opportunities */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-brand-400" />
                Cross-Site Redistribution Opportunities
              </h3>
              <span className="text-xs text-brand-400 font-mono bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 font-bold">
                {crossSiteOpportunities.length} Available
              </span>
            </div>
            <p className="text-xs text-industrial-400 mb-4">
              Real-time matching of site stock shortages against surplus inventory across sister facilities.
            </p>

            {crossSiteOpportunities.length === 0 ? (
              <div className="p-6 text-center text-xs text-industrial-500 font-mono bg-industrial-950/50 rounded-xl border border-industrial-800/50">
                No active cross-site shortage opportunities detected for site {selectedSite}. All stock buffers balanced.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {crossSiteOpportunities.slice(0, 4).map(opp => (
                  <div 
                    key={opp.id} 
                    className="p-3 bg-industrial-950/70 border border-industrial-800 rounded-lg flex items-center justify-between hover:border-brand-500/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">{opp.partNumber}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          opp.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {opp.urgency}
                        </span>
                      </div>
                      <div className="text-[11px] text-industrial-300 truncate max-w-xs mt-0.5">{opp.description}</div>
                      <div className="text-[10px] text-industrial-400 mt-1 flex items-center gap-1.5">
                        <span className="text-red-400 font-semibold">{opp.requestingSite} (Need {opp.shortageQuantity})</span>
                        <span>&larr;</span>
                        <span className="text-emerald-400 font-semibold">{opp.matchingSite} (Avail {opp.availableQuantity})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => safeNavigate('cross-site')}
                      className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      Transfer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-industrial-800 flex justify-between items-center text-xs">
            <span className="text-industrial-400">Avoids procurement lead time</span>
            <button
              onClick={() => safeNavigate('cross-site')}
              className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
            >
              <span>View All Opportunities</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Priority Smart Alerts Feed */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Immediate Action Alerts
              </h3>
              <button
                onClick={() => smartAlertService.evaluateAllRules(currentUser)}
                className="text-[11px] text-industrial-400 hover:text-white px-2 py-0.5 bg-industrial-800 rounded border border-industrial-700 cursor-pointer transition-colors"
              >
                Re-Evaluate Rules
              </button>
            </div>
            <p className="text-xs text-industrial-400 mb-4">
              Deterministic rule triggers from quality, stock, and SLA monitoring engines.
            </p>

            {alertSummary.active === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-400 font-mono bg-emerald-950/20 rounded-xl border border-emerald-800/30 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                All operational metrics and SLA thresholds within standard bounds.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {smartAlertService.getAlerts(selectedSite)
                  .filter(a => a.status === 'NEW' || a.status === 'IN_PROGRESS' || a.status === 'ACKNOWLEDGED')
                  .slice(0, 4)
                  .map(alert => (
                    <div 
                      key={alert.id}
                      className="p-3 bg-industrial-950/70 border border-industrial-800 rounded-lg flex items-start justify-between hover:border-industrial-700 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1 rounded mt-0.5 ${
                          alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          alert.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{alert.title}</span>
                            <span className="text-[9px] font-mono text-industrial-400 bg-industrial-800 px-1 py-0.2 rounded">
                              {alert.site}
                            </span>
                          </div>
                          <div className="text-[11px] text-industrial-300 line-clamp-1 mt-0.5">{alert.description}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-industrial-500 font-mono shrink-0 ml-2">
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-industrial-800 flex justify-between items-center text-xs">
            <span className="text-industrial-400">Total Active: {alertSummary.active}</span>
            <button
              onClick={() => safeNavigate('alerts')}
              className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              <span>Manage Smart Alerts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
