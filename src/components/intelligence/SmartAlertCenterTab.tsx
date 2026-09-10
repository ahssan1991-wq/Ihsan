/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  RefreshCw, 
  Search, 
  Mail, 
  Check, 
  X, 
  ChevronRight, 
  Layers, 
  ArrowRight,
  Send,
  Eye
} from 'lucide-react';
import { SmartAlert, User } from '../../types';
import { smartAlertService } from '../../services/smartAlertService';

interface SmartAlertCenterTabProps {
  selectedSite: string;
  currentUser: User;
  onRefresh?: () => void;
}

export default function SmartAlertCenterTab({
  selectedSite,
  currentUser,
  onRefresh
}: SmartAlertCenterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<SmartAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const alerts = smartAlertService.getAlerts(selectedSite) || [];

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter === 'ACTIVE') {
      if (a.status === 'RESOLVED' || a.status === 'DISMISSED') return false;
    } else if (statusFilter !== 'ALL' && a.status !== statusFilter) {
      return false;
    }

    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.partNumber || '').toLowerCase().includes(q) ||
        (a.relatedEntityNumber || '').toLowerCase().includes(q) ||
        a.site.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const handleEvaluateRules = () => {
    setIsEvaluating(true);
    smartAlertService.evaluateAllRules(currentUser);
    setTimeout(() => {
      setIsEvaluating(false);
      if (onRefresh) onRefresh();
    }, 600);
  };

  const handleAcknowledge = (alertId: string) => {
    smartAlertService.acknowledgeAlert(alertId, currentUser);
    if (onRefresh) onRefresh();
  };

  const handleOpenResolveModal = (alert: SmartAlert) => {
    setSelectedAlertForResolve(alert);
    setResolutionNotes(`Engineering remediation verified by ${currentUser.name}.`);
  };

  const handleConfirmResolve = () => {
    if (!selectedAlertForResolve) return;
    smartAlertService.resolveAlert(selectedAlertForResolve.id, resolutionNotes, currentUser);
    setSelectedAlertForResolve(null);
    if (onRefresh) onRefresh();
  };

  const handleDismiss = (alertId: string) => {
    smartAlertService.dismissAlert(alertId, 'Dismissed by authorized engineer.', currentUser);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Evaluation Trigger */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Enterprise Smart Alert & Safety Engine
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Automated deterministic rule evaluation across inventory stock buffers, QA rejections, certificate deficiencies, and SLA aging.
            </p>
          </div>

          <button
            onClick={handleEvaluateRules}
            disabled={isEvaluating}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating Rules...' : 'Run Automated Rule Engine'}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-industrial-800">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-industrial-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search alerts..."
              className="w-full pl-9 pr-3 py-1.5 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="ACTIVE">Status: Active Only (New & Ack)</option>
            <option value="ALL">Status: All History</option>
            <option value="NEW">Status: New Unacknowledged</option>
            <option value="ACKNOWLEDGED">Status: Acknowledged</option>
            <option value="RESOLVED">Status: Resolved</option>
            <option value="DISMISSED">Status: Dismissed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Severity: All Levels</option>
            <option value="CRITICAL">Critical (P1)</option>
            <option value="HIGH">High (P2)</option>
            <option value="MEDIUM">Medium (P3)</option>
            <option value="LOW">Low (P4)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Category: All Rules</option>
            <option value="STOCK">Stock Depletion</option>
            <option value="DOCUMENT">Missing Documentation</option>
            <option value="MISMATCH">MR/PO Discrepancy</option>
            <option value="INSPECTION">Inspection Rejection</option>
            <option value="APPROVAL">Approval SLA Aging</option>
            <option value="TRANSFER">Transfer Delay</option>
            <option value="SUPPLIER">Supplier Risk</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-10 bg-industrial-900 border border-industrial-800 rounded-xl text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No Active Alerts</h3>
            <p className="text-xs text-industrial-400 mt-1">
              All monitored engineering parameters are within acceptable operating tolerances.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            const isMedium = alert.severity === 'MEDIUM';

            const isResolved = alert.status === 'RESOLVED';
            const isDismissed = alert.status === 'DISMISSED';
            const isNew = alert.status === 'NEW';

            return (
              <div 
                key={alert.id}
                className={`p-5 rounded-xl border transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isResolved ? 'bg-industrial-950/40 border-industrial-800 opacity-70' :
                  isDismissed ? 'bg-industrial-950/30 border-industrial-800/60 opacity-50' :
                  isCritical ? 'bg-red-950/20 border-red-800/50 hover:border-red-500' :
                  isHigh ? 'bg-amber-950/20 border-amber-800/50 hover:border-amber-500' :
                  'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
                }`}
              >
                {/* Alert Content */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Severity Pill */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      isHigh ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      isMedium ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-industrial-800 text-industrial-400'
                    }`}>
                      {alert.severity}
                    </span>

                    {/* Category Pill */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-industrial-800 text-industrial-300 border border-industrial-700">
                      {alert.category}
                    </span>

                    {/* Site */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-industrial-950 text-industrial-400">
                      Site: {alert.site}
                    </span>

                    {/* Email dispatched badge */}
                    {alert.emailSent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 flex items-center gap-1 border border-emerald-500/20">
                        <Mail className="w-2.5 h-2.5" />
                        Email Dispatched
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  <p className="text-xs text-industrial-300">{alert.description}</p>

                  <div className="text-[11px] text-industrial-400 font-mono flex items-center gap-3 pt-1">
                    <span>Entity: <strong className="text-white">{alert.relatedEntityNumber || alert.partNumber || alert.relatedEntity || 'Material'}</strong></span>
                    <span>&bull;</span>
                    <span>Raised: {new Date(alert.createdAt).toLocaleString()}</span>
                    {alert.acknowledgedBy && (
                      <>
                        <span>&bull;</span>
                        <span className="text-brand-400">Ack by {alert.acknowledgedBy}</span>
                      </>
                    )}
                  </div>

                  {alert.resolutionNotes && (
                    <div className="mt-2 p-2 bg-industrial-950 rounded text-[11px] text-emerald-400 border border-industrial-800">
                      <strong>Resolution: </strong>{alert.resolutionNotes} (by {alert.resolvedBy})
                    </div>
                  )}
                </div>

                {/* Lifecycle Action Buttons */}
                {!isResolved && !isDismissed && (
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {isNew && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-brand-400 border border-industrial-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenResolveModal(alert)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 bg-industrial-800 hover:bg-red-500/20 hover:text-red-400 text-industrial-400 rounded-lg transition-colors cursor-pointer"
                      title="Dismiss Alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Modal */}
      {selectedAlertForResolve && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-industrial-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Formal Alert Resolution</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedAlertForResolve.title}</h3>
              </div>
              <button
                onClick={() => setSelectedAlertForResolve(null)}
                className="text-industrial-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-industrial-300">
                Provide engineering justification documenting the corrective action taken to close this alert.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase font-mono mb-1">
                  Resolution Notes & Evidence
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAlertForResolve(null)}
                className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Alert as Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
