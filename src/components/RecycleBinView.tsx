/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldAlert,
  Calendar,
  Layers,
  Building2,
  FileText,
  Boxes,
  Bell,
  Check
} from 'lucide-react';
import { 
  RecycleBinItem, 
  RecycleBinRecordType, 
  RecycleBinStatus, 
  RecycleBinSettings, 
  User, 
  UserRole,
  Material 
} from '../types';
import { dbService } from '../services/dbService';
import {
  getRecycleBinItems,
  saveRecycleBinItems,
  getRecycleBinSettings,
  saveRecycleBinSettings,
  calculateDaysRemaining,
  runAutomaticPurge
} from '../services/port13Service';

interface RecycleBinViewProps {
  currentUser: User;
  onRestoreSuccess?: (item: RecycleBinItem) => void;
  onNavigateToTab?: (tabId: string, query?: string, prefillData?: Record<string, string>) => void;
  onInspectMaterial?: (material: Material) => void;
}

export default function RecycleBinView({ currentUser, onRestoreSuccess }: RecycleBinViewProps) {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [settings, setSettings] = useState<RecycleBinSettings>(getRecycleBinSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);
  
  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<RecycleBinItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RecycleBinItem | null>(null);
  const [restoreConflictError, setRestoreConflictError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setItems(getRecycleBinItems());
    setSettings(getRecycleBinSettings());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('emis:recycle-bin-updated', handleUpdate);
    return () => window.removeEventListener('emis:recycle-bin-updated', handleUpdate);
  }, []);

  const totalDeleted = items.length;
  const recoverableCount = items.filter(i => i.status === 'DELETED / RECOVERABLE').length;
  const expiringSoonCount = items.filter(i => {
    if (i.status !== 'DELETED / RECOVERABLE') return false;
    const days = calculateDaysRemaining(i.restoreAvailableUntil);
    return days <= 5 && days > 0;
  }).length;

  const filteredItems = items.filter(item => {
    // Type filter
    if (selectedType !== 'ALL' && item.recordType !== selectedType) return false;

    // Status filter
    if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

    // Expiring soon filter (< 5 days)
    if (filterExpiringSoon) {
      if (item.status !== 'DELETED / RECOVERABLE') return false;
      const days = calculateDaysRemaining(item.restoreAvailableUntil);
      if (days > 5) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.recordTitle || '').toLowerCase().includes(q);
      const matchId = (item.recordId || '').toLowerCase().includes(q);
      const matchUser = (item.deletedBy || '').toLowerCase().includes(q);
      const matchReason = (item.deletionReason || '').toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchUser && !matchReason) return false;
    }

    return true;
  });

  const handleOpenRestore = (item: RecycleBinItem) => {
    setRestoreConflictError(null);
    // Pre-validation: Check for Part Number conflict if restoring a material
    if (item.recordType === 'Material') {
      const activeMaterials = dbService.getMaterials();
      const conflict = activeMaterials.find(
        m => m.partNumber.toUpperCase() === item.recordId.toUpperCase()
      );
      if (conflict) {
        setRestoreConflictError(
          `Conflict Detected: An active material with Part #${conflict.partNumber} (${conflict.description}) already exists in the active catalog. You must rename or archive the existing item before restoring.`
        );
      }
    }
    setRestoreTarget(item);
  };

  const handleConfirmRestore = () => {
    if (!restoreTarget) return;

    // 1. Re-insert item into its appropriate table
    if (restoreTarget.recordType === 'Material') {
      const activeMaterials = dbService.getMaterials();
      activeMaterials.unshift(restoreTarget.data);
      dbService.saveMaterials(activeMaterials);
    }

    // 2. Mark item as RESTORED in recycle bin
    const updated = items.map(item => {
      if (item.id === restoreTarget.id) {
        return {
          ...item,
          status: 'RESTORED' as RecycleBinStatus,
          restoredAt: new Date().toISOString(),
          restoredBy: currentUser.name
        };
      }
      return item;
    });

    saveRecycleBinItems(updated);
    setItems(updated);

    // 3. Log Audit
    dbService.logAudit({
      action: 'Record Restored from Recycle Bin',
      entity: restoreTarget.recordType,
      entityId: restoreTarget.recordId,
      user: currentUser.name,
      userId: currentUser.id,
      userRole: currentUser.role,
      reason: `Restored back to active database from Recycle Bin`,
      result: 'SUCCESS'
    });

    if (onRestoreSuccess) {
      onRestoreSuccess(restoreTarget);
    }

    setActionSuccessMessage(`Successfully restored ${restoreTarget.recordType} #${restoreTarget.recordId} to active catalog!`);
    setRestoreTarget(null);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  const handleConfirmPurge = () => {
    if (!purgeTarget) return;

    // Permanently remove item from recycle bin
    const updated = items.filter(item => item.id !== purgeTarget.id);
    saveRecycleBinItems(updated);
    setItems(updated);

    // Log permanent purge in Audit Logs (Audit logs are permanently retained)
    dbService.logAudit({
      action: 'Permanent Record Purge',
      entity: purgeTarget.recordType,
      entityId: purgeTarget.recordId,
      user: currentUser.name,
      userId: currentUser.id,
      userRole: currentUser.role,
      reason: `Permanent destruction confirmed by administrator`,
      result: 'SUCCESS'
    });

    setActionSuccessMessage(`Permanently purged ${purgeTarget.recordTitle} from Recycle Bin.`);
    setPurgeTarget(null);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  const handleRunAutoPurge = () => {
    const res = runAutomaticPurge();
    loadData();
    setActionSuccessMessage(`Automated Purge Cycle complete: ${res.purgedCount} expired items purged.`);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  const handleSaveRetention = (days: 7 | 14 | 30 | 60 | 90) => {
    const updated: RecycleBinSettings = {
      ...settings,
      retentionDays: days
    };
    saveRecycleBinSettings(updated);
    setSettings(updated);
    setShowSettingsModal(false);
    setActionSuccessMessage(`Recycle Bin retention policy updated to ${days} days.`);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6" id="recycle-bin-view">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-industrial-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Deleted</span>
            <Trash2 className="h-4 w-4" />
          </div>
          <span className="text-2xl font-bold text-industrial-900 dark:text-white">{totalDeleted}</span>
          <span className="text-[11px] text-industrial-400 block mt-0.5">Across all entities</span>
        </div>

        <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Recoverable</span>
            <RotateCcw className="h-4 w-4" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{recoverableCount}</span>
          <span className="text-[11px] text-industrial-400 block mt-0.5">Active retention window</span>
        </div>

        <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-2xl font-bold text-amber-500">{expiringSoonCount}</span>
          <span className="text-[11px] text-industrial-400 block mt-0.5">&le; 5 days remaining</span>
        </div>

        <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-brand-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Retention Policy</span>
            <Calendar className="h-4 w-4" />
          </div>
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{settings.retentionDays} Days</span>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="text-[11px] text-brand-500 hover:underline font-semibold block mt-0.5 cursor-pointer text-left"
          >
            Configure retention &rarr;
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* Control & Filter Toolbar */}
      <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-industrial-400" />
            <input
              type="text"
              placeholder="Search by ID, name, deleted by..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterExpiringSoon(!filterExpiringSoon)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterExpiringSoon
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
              }`}
            >
              Expiring Soon (&le; 5 Days)
            </button>

            {currentUser.role === UserRole.ADMIN && (
              <button
                onClick={handleRunAutoPurge}
                className="flex items-center gap-1.5 px-3 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-750 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold transition-all border border-industrial-200 dark:border-industrial-700 cursor-pointer"
                title="Evaluate retention policies and purge expired entries"
              >
                <RefreshCw className="h-3.5 w-3.5 text-brand-500" />
                <span>Run Auto-Purge</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-industrial-100 dark:border-industrial-800">
          <span className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider mr-1">Entity:</span>
          {['ALL', 'Material', 'Site', 'Warehouse', 'Supplier', 'Document', 'Notification'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-industrial-50 dark:bg-industrial-800/80 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100'
              }`}
            >
              {type}
            </button>
          ))}

          <span className="text-[11px] font-semibold text-industrial-500 uppercase tracking-wider ml-3 mr-1">Status:</span>
          {['ALL', 'DELETED / RECOVERABLE', 'RESTORED', 'EXPIRED'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-industrial-800 text-white dark:bg-white dark:text-industrial-900 shadow-xs'
                  : 'bg-industrial-50 dark:bg-industrial-800/80 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Recycle Bin Records Table */}
      <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-industrial-400 space-y-2">
            <Trash2 className="h-8 w-8 mx-auto opacity-40 mb-2" />
            <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">
              Recycle Bin is clean
            </p>
            <p className="text-xs">
              No soft-deleted records match the current filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50/80 dark:bg-industrial-900/60 text-industrial-500 uppercase text-[10px] tracking-wider border-b border-industrial-200 dark:border-industrial-700">
                <tr>
                  <th className="py-3 px-4">Record Title & Identifier</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Deleted By</th>
                  <th className="py-3 px-3">Deleted Date</th>
                  <th className="py-3 px-3">Days Remaining</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {filteredItems.map(item => {
                  const daysRemaining = calculateDaysRemaining(item.restoreAvailableUntil);
                  const isExpiringSoon = daysRemaining <= 5 && daysRemaining > 0;

                  return (
                    <tr key={item.id} className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-industrial-900 dark:text-white block">
                          {item.recordTitle}
                        </span>
                        <span className="font-mono text-[11px] text-brand-600 dark:text-brand-400">
                          {item.recordId} {item.originalSite ? `• Site: ${item.originalSite}` : ''}
                        </span>
                        {item.deletionReason && (
                          <span className="text-[10px] text-industrial-400 block mt-0.5">
                            Reason: {item.deletionReason}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-300">
                          {item.recordType}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-medium text-industrial-900 dark:text-white block">
                          {item.deletedBy}
                        </span>
                        <span className="text-[10px] text-industrial-400">
                          {item.deletedByRole || 'User'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[11px] text-industrial-600 dark:text-industrial-400">
                        {new Date(item.deletedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-3">
                        {item.status === 'DELETED / RECOVERABLE' ? (
                          <span className={`font-bold font-mono text-xs ${
                            isExpiringSoon ? 'text-amber-500 animate-pulse' : 'text-industrial-700 dark:text-industrial-300'
                          }`}>
                            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-industrial-400">--</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.status === 'DELETED / RECOVERABLE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : item.status === 'RESTORED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'DELETED / RECOVERABLE' && (
                            <button
                              onClick={() => handleOpenRestore(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Restore to Active Database"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restore</span>
                            </button>
                          )}

                          {currentUser.role === UserRole.ADMIN && (
                            <button
                              onClick={() => setPurgeTarget(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Permanently Purge Record"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Purge</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESTORE PRE-VALIDATION & CONFLICT MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-industrial-200 dark:border-industrial-700">
              <h4 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-emerald-500" />
                <span>Confirm Restoration</span>
              </h4>
              <button onClick={() => setRestoreTarget(null)} className="text-industrial-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-industrial-900 dark:text-white block">
                {restoreTarget.recordTitle}
              </span>
              <span className="font-mono text-brand-600 dark:text-brand-400 block">
                {restoreTarget.recordType} ID: {restoreTarget.recordId}
              </span>
              <span className="text-industrial-500 block">
                Deleted on {new Date(restoreTarget.deletedAt).toLocaleString()} by {restoreTarget.deletedBy}
              </span>
            </div>

            {restoreConflictError ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Restoration Blocked:</span>
                  <p>{restoreConflictError}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Pre-validation passed. No ID collisions or dependency issues detected.</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRestoreTarget(null)}
                className="flex-1 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmRestore}
                disabled={Boolean(restoreConflictError)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Confirm Restore
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PURGE DOUBLE CONFIRMATION MODAL */}
      {purgeTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-industrial-900 dark:text-white">Permanent Purge Warning</h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Irreversible Administrative Destruction</p>
              </div>
            </div>

            <p className="text-xs text-industrial-600 dark:text-industrial-300">
              Are you absolutely sure you want to permanently purge <strong>{purgeTarget.recordTitle}</strong> ({purgeTarget.recordId})?
            </p>

            <div className="p-3 bg-industrial-50 dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700 text-xs text-industrial-500 space-y-1">
              <span className="font-semibold text-industrial-800 dark:text-industrial-200 block">Compliance Guarantee:</span>
              <p>Critical transaction history, the Stock Ledger, and immutable Audit Logs will NOT be affected and remain preserved forever.</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPurgeTarget(null)}
                className="flex-1 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmPurge}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Yes, Purge Permanently
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RETENTION SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-industrial-200 dark:border-industrial-700">
              <h4 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-500" />
                <span>Recycle Bin Retention Policy</span>
              </h4>
              <button onClick={() => setShowSettingsModal(false)} className="text-industrial-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-industrial-500">
              Select how many days soft-deleted records remain recoverable before eligible for automatic purging:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[7, 14, 30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => handleSaveRetention(days as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    settings.retentionDays === days
                      ? 'bg-brand-600 text-white border-brand-500 shadow-xs'
                      : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 border-industrial-200 dark:border-industrial-700 hover:border-brand-500'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold cursor-pointer mt-2"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
