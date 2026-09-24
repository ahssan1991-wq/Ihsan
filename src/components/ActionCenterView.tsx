/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BellRing, 
  AlertOctagon, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  Filter, 
  Layers, 
  RefreshCw, 
  ShieldAlert, 
  Building2, 
  FileText, 
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { User, ActionCenterItem, ActionCenterSeverity } from '../types';
import { getActionCenterItems } from '../services/port14Service';
import { 
  EMISPageHeader, 
  EMISCard, 
  EMISBadge, 
  EMISButton, 
  EMISEmptyState,
  EMISSearchBar
} from './design-system';

interface ActionCenterViewProps {
  currentUser: User;
  onNavigateToTab: (tabId: string, initialSearch?: string) => void;
  onInspectMaterialByPn?: (partNumber: string) => void;
}

export default function ActionCenterView({
  currentUser,
  onNavigateToTab,
  onInspectMaterialByPn
}: ActionCenterViewProps) {
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<ActionCenterSeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = () => {
    setIsLoading(true);
    const actions = getActionCenterItems(currentUser);
    setItems(actions);
    setIsLoading(false);
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('emis:sync-status-changed', handleUpdate);
    window.addEventListener('emis:recycle-bin-updated', handleUpdate);
    window.addEventListener('emis:material-added', handleUpdate);
    return () => {
      window.removeEventListener('emis:sync-status-changed', handleUpdate);
      window.removeEventListener('emis:recycle-bin-updated', handleUpdate);
      window.removeEventListener('emis:material-added', handleUpdate);
    };
  }, [currentUser]);

  // Counts by severity
  const criticalCount = items.filter(i => i.severity === 'CRITICAL').length;
  const pendingCount = items.filter(i => i.severity === 'PENDING').length;
  const warningCount = items.filter(i => i.severity === 'WARNING').length;
  const infoCount = items.filter(i => i.severity === 'INFO').length;

  const filteredItems = items.filter(item => {
    if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        (item.relatedRecordId && item.relatedRecordId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleActionClick = (item: ActionCenterItem) => {
    if (item.relatedRecordType === 'MATERIAL' && item.relatedRecordId && onInspectMaterialByPn) {
      onInspectMaterialByPn(item.relatedRecordId);
    } else if (item.actionTab) {
      onNavigateToTab(item.actionTab, item.relatedRecordId);
    }
  };

  const getSeverityBadge = (severity: ActionCenterSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
            <span>🔴 Critical</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>🟠 Pending</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
            <span>🟡 Warning</span>
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Info className="h-3.5 w-3.5 text-sky-400" />
            <span>🔵 Information</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <EMISPageHeader
        title="EMIS Action Center"
        subtitle="Aggregated live operational tasks requiring immediate verification, inspection, stock reorder, or data quality intervention."
        badge="Port 14"
        icon={BellRing}
        actions={
          <div className="flex items-center gap-2">
            <EMISButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              isLoading={isLoading}
              onClick={loadItems}
            >
              Refresh Tasks
            </EMISButton>
          </div>
        }
      />

      {/* Severity Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">Critical Actions</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{criticalCount}</p>
          <span className="text-[10px] text-industrial-400">Zero stock & quarantined</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'PENDING'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Pending Tasks</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{pendingCount}</p>
          <span className="text-[10px] text-industrial-400">Inspections & receiving</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'WARNING' ? 'ALL' : 'WARNING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'WARNING'
              ? 'bg-yellow-950/40 border-yellow-500 ring-2 ring-yellow-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-yellow-300">Warnings</span>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{warningCount}</p>
          <span className="text-[10px] text-industrial-400">Low stock & missing data</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'INFO' ? 'ALL' : 'INFO')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'INFO'
              ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300">Information</span>
            <Info className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{infoCount}</p>
          <span className="text-[10px] text-industrial-400">Transfers & compliance</span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <EMISSearchBar
          value={searchQuery}
          onChangeValue={setSearchQuery}
          placeholder="Filter actions by description, part number, source..."
          className="w-full sm:w-80"
        />

        {selectedSeverity !== 'ALL' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-industrial-400">Filtering:</span>
            <EMISBadge variant="brand" size="sm">
              {selectedSeverity}
            </EMISBadge>
            <button
              onClick={() => setSelectedSeverity('ALL')}
              className="text-xs text-brand-400 hover:text-white cursor-pointer underline"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <EMISEmptyState
            icon={CheckCircle2}
            title="All Operational Clear"
            description="No pending actions or critical alerts match your current filter. All materials and operational workflows are in nominal state."
            action={{
              label: 'Return to Command Center',
              onClick: () => onNavigateToTab('dashboard'),
              icon: ArrowRight
            }}
          />
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id ? `${item.id}-${idx}` : `action-item-${idx}`}
              className={`p-4 sm:p-5 rounded-2xl border bg-industrial-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.severity === 'CRITICAL'
                  ? 'border-rose-500/30 hover:border-rose-500/50 bg-rose-950/10'
                  : item.severity === 'PENDING'
                  ? 'border-amber-500/30 hover:border-amber-500/50 bg-amber-950/10'
                  : item.severity === 'WARNING'
                  ? 'border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-950/10'
                  : 'border-industrial-800 hover:border-industrial-700'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {getSeverityBadge(item.severity)}
                  <span className="text-[11px] text-industrial-400 font-mono">
                    Source: {item.source}
                  </span>
                  {item.relatedRecordId && (
                    <span className="text-[11px] font-mono text-brand-400 font-bold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                      PN: {item.relatedRecordId}
                    </span>
                  )}
                  <span className="text-[10px] text-industrial-500">
                    Role: {item.responsibleRole}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-industrial-300 leading-relaxed max-w-3xl">
                  {item.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-industrial-800">
                <EMISButton
                  variant={item.severity === 'CRITICAL' ? 'danger' : 'primary'}
                  size="sm"
                  icon={ChevronRight}
                  iconPosition="right"
                  onClick={() => handleActionClick(item)}
                >
                  {item.actionLabel}
                </EMISButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
