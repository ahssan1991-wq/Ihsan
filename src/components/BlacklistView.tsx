/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  Search, 
  PlusCircle, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  User, 
  Building2, 
  Hash, 
  X, 
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { BlacklistItem, User as UserType, UserRole, Material } from '../types';
import { dbService } from '../services/dbService';

interface BlacklistViewProps {
  currentUser: UserType;
  materials?: Material[];
  onNavigateToTab?: (tabId: string, query?: string) => void;
}

export default function BlacklistView({ currentUser, materials = [], onNavigateToTab }: BlacklistViewProps) {
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>(() => dbService.getBlacklist() || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New item form
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [reason, setReason] = useState('');
  const [supplier, setSupplier] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const refreshBlacklist = () => {
    setBlacklist(dbService.getBlacklist());
  };

  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!partNumber.trim() && !serialNumber.trim()) {
      setFormError('Either Part Number or Serial Number must be provided.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Quarantine / Blacklist reason is mandatory for engineering audit.');
      return;
    }

    const res = dbService.addBlacklistItem({
      partNumber: partNumber.trim().toUpperCase(),
      serialNumber: serialNumber.trim().toUpperCase(),
      reason: reason.trim(),
      supplierName: supplier.trim() || 'General / Unknown Supplier',
      reporterName: currentUser.name
    }, currentUser);

    if (res.success) {
      refreshBlacklist();
      setIsAddModalOpen(false);
      setPartNumber('');
      setSerialNumber('');
      setReason('');
      setSupplier('');
    } else {
      setFormError(res.error || 'Failed to add item to blacklist.');
    }
  };

  const handleDeleteItem = (id: string) => {
    const res = dbService.deleteBlacklistItem(id, currentUser);
    if (res.success) {
      refreshBlacklist();
      setDeleteConfirmId(null);
    }
  };

  const filteredList = blacklist.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.partNumber.toLowerCase().includes(q) ||
      item.serialNumber.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(q)) ||
      (item.reporterName && item.reporterName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6" id="blacklist-view">
      {/* Header Banner */}
      <div className="bg-white dark:bg-industrial-900 p-6 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-industrial-900 dark:text-white heading-display flex items-center gap-2">
                Blacklist & Counterfeit Prevention Registry
              </h1>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Flagged part numbers, compromised serial numbers, and unverified supplier batches quarantined from plant installation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Flag Part / Serial</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs flex items-center gap-3">
          <Search className="h-4 w-4 text-industrial-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quarantined part number, serial number, vendor, or defect reason..."
            className="w-full bg-transparent text-xs text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-industrial-400 hover:text-industrial-600 dark:hover:text-white p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs flex items-center justify-between">
          <span className="text-xs font-medium text-industrial-500 dark:text-industrial-400">Total Flagged</span>
          <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
            {blacklist.length} Items
          </span>
        </div>
      </div>

      {/* Blacklist Table & Grid */}
      <div className="bg-white dark:bg-industrial-900 rounded-2xl border border-industrial-200 dark:border-industrial-800 overflow-hidden shadow-xs">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-industrial-800 dark:text-white">
              No Quarantined Items Found
            </h3>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 max-w-sm mx-auto">
              All inventory items and incoming shipments pass standard quality protocols or no items match your search filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-850/80 border-b border-industrial-200 dark:border-industrial-800 text-industrial-500 dark:text-industrial-400 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Part Number</th>
                  <th className="px-5 py-3">Serial / Batch #</th>
                  <th className="px-5 py-3">Supplier / Origin</th>
                  <th className="px-5 py-3">Quarantine Reason & Defect</th>
                  <th className="px-5 py-3">Reported By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {filteredList.map((item) => {
                  const hasInventoryMatch = materials.some(
                    m => m.partNumber.toLowerCase() === item.partNumber.toLowerCase()
                  );

                  return (
                    <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {item.partNumber || '—'}
                          </span>
                          {hasInventoryMatch && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              Present In Stock!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-industrial-700 dark:text-industrial-300">
                        {item.serialNumber || 'ALL SERIALS'}
                      </td>
                      <td className="px-5 py-3.5 text-industrial-700 dark:text-industrial-300">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-industrial-400" />
                          <span>{item.supplier || 'Unspecified'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-industrial-900 dark:text-industrial-100 font-medium line-clamp-2">
                          {item.reason}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-industrial-600 dark:text-industrial-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-industrial-400" />
                          <span>{item.reporterName || 'Quality Dept'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-industrial-500 dark:text-industrial-400 font-mono text-[11px] whitespace-nowrap">
                        {item.reportedDate ? new Date(item.reportedDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {onNavigateToTab && item.partNumber && (
                            <button
                              onClick={() => onNavigateToTab('search', item.partNumber)}
                              className="p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg cursor-pointer"
                              title="Search part in catalog"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}
                          {currentUser.role === UserRole.ADMIN && (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                              title="Remove from blacklist"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Add to Blacklist Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 p-6 rounded-2xl shadow-2xl space-y-5 text-industrial-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-industrial-100 dark:border-industrial-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base heading-display">Quarantine Material / Serial</h3>
                    <p className="text-xs text-industrial-500 dark:text-industrial-400">Flag compromised or non-compliant parts from inventory.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-industrial-400 hover:text-industrial-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddBlacklist} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-industrial-700 dark:text-industrial-300">Part Number</label>
                    <input
                      type="text"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. 6003-2RS"
                      className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl font-mono text-industrial-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-industrial-700 dark:text-industrial-300">Serial Number / Batch</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. BATCH-2024-X4"
                      className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl font-mono text-industrial-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-industrial-700 dark:text-industrial-300">Supplier / Vendor Name</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Unverified Third-Party Distributor"
                    className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-industrial-700 dark:text-industrial-300">Reason for Quarantine & Field Risks *</label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain failure mode, non-compliant alloy composition, unverified COC, or counterfeit markings..."
                    className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-industrial-100 dark:border-industrial-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100 dark:hover:bg-industrial-800 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Flag and Quarantine
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 p-6 rounded-2xl shadow-2xl space-y-4 text-industrial-900 dark:text-white"
            >
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm heading-display">Remove Item from Blacklist?</h3>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                This will unblock this part/serial number from safety warnings in the inventory ledger. Are you sure?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 text-xs text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteItem(deleteConfirmId)}
                  className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Confirm Removal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
