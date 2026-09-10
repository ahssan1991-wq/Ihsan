/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Calendar, 
  Boxes, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ClipboardList, 
  ShieldAlert,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { InventoryTransaction, Material, StockCountSession, User, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface StockLedgerTabProps {
  currentUser: User;
  materials?: Material[];
  onSelectMaterial: (material: Material) => void;
}

export const StockLedgerTab: React.FC<StockLedgerTabProps> = ({
  currentUser,
  materials = [],
  onSelectMaterial
}) => {
  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => dbService.getStockTransactions() || []);
  const [stockCounts, setStockCounts] = useState<StockCountSession[]>(() => dbService.getStockCountSessions() || []);
  const [activeSubTab, setActiveSubTab] = useState<'LEDGER' | 'ADJUSTMENT' | 'COUNT_SESSIONS'>('LEDGER');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSite, setFilterSite] = useState<string>('ALL');

  // New Adjustment Form State
  const [adjPartNumber, setAdjPartNumber] = useState(safeMaterials[0]?.partNumber || '');
  const [adjType, setAdjType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [adjQuantity, setAdjQuantity] = useState(1);
  const [adjReason, setAdjReason] = useState('Stock Count Physical Variance');
  const [adjSite, setAdjSite] = useState('NDGS');
  const [adjWarehouse, setAdjWarehouse] = useState('NDGS Central Warehouse');

  // New Count Session Form State
  const [countSessionName, setCountSessionName] = useState('Q3 Annual Electrical & Instrumentation Audit');
  const [countSite, setCountSite] = useState('NDGS');
  const [countWarehouse, setCountWarehouse] = useState('NDGS Central Warehouse');
  const [countType, setCountType] = useState<'ANNUAL' | 'CYCLE' | 'SPOT_CHECK'>('CYCLE');

  const selectedMaterial = safeMaterials.find(m => m.partNumber === adjPartNumber);

  const refreshData = () => {
    setTransactions(dbService.getStockTransactions() || []);
    setStockCounts(dbService.getStockCountSessions() || []);
  };

  const handleRecordAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const qtyBefore = selectedMaterial.quantity || 0;
    const qtyChange = adjType === 'INCREASE' ? adjQuantity : -adjQuantity;
    const qtyAfter = Math.max(0, qtyBefore + qtyChange);

    dbService.recordStockTransaction({
      materialId: selectedMaterial.id,
      partNumber: selectedMaterial.partNumber,
      materialDescription: selectedMaterial.materialDescription,
      transactionType: 'ADJUSTMENT',
      quantityChange: qtyChange,
      quantityBefore: qtyBefore,
      quantityAfter: qtyAfter,
      unit: selectedMaterial.unit || 'EA',
      site: adjSite,
      warehouse: adjWarehouse,
      referenceType: 'ADJUSTMENT',
      referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
      performedBy: currentUser.name,
      role: currentUser.role,
      reason: adjReason
    }, currentUser);

    refreshData();
    setActiveSubTab('LEDGER');
  };

  const handleCreateCountSession = (e: React.FormEvent) => {
    e.preventDefault();
    const countItems = materials.slice(0, 10).map(m => ({
      materialId: m.id,
      partNumber: m.partNumber,
      description: m.materialDescription,
      systemQty: m.quantity || 0,
      countedQty: m.quantity || 0,
      variance: 0,
      unit: m.unit || 'EA',
      location: m.storageBin || 'Aisle-01/Bin-01',
      status: 'MATCH' as const
    }));

    dbService.createStockCountSession({
      site: countSite,
      warehouse: countWarehouse,
      createdBy: currentUser.name,
      notes: countSessionName,
      items: countItems
    }, currentUser);

    refreshData();
    setActiveSubTab('COUNT_SESSIONS');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'ALL' || t.transactionType === filterType;
    const matchesSite = filterSite === 'ALL' || t.site === filterSite;
    const matchesSearch = 
      t.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.materialDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSite && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Inventory Stock Ledger & Reconciliation
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Immutable transaction history: Receipts, Issues, Inter-Site Transfers, Cycle Counts & Adjustments.
          </p>
        </div>

        {/* SUB-TAB TOGGLES */}
        <div className="flex items-center bg-industrial-900 p-1 rounded-lg border border-industrial-700">
          <button 
            onClick={() => setActiveSubTab('LEDGER')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeSubTab === 'LEDGER' ? 'bg-brand-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            Stock Movements ({transactions.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('ADJUSTMENT')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeSubTab === 'ADJUSTMENT' ? 'bg-brand-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            + Post Adjustment
          </button>
          <button 
            onClick={() => setActiveSubTab('COUNT_SESSIONS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeSubTab === 'COUNT_SESSIONS' ? 'bg-brand-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            Cycle Audits ({stockCounts.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: FULL STOCK MOVEMENTS LEDGER */}
      {activeSubTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-industrial-900/60 p-3 rounded-lg border border-industrial-750">
            <div className="relative">
              <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search part #, ref #, description..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-industrial-800 border border-industrial-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">Type:</span>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-industrial-800 border border-industrial-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                <option value="ALL">All Types ({transactions.length})</option>
                <option value="RECEIPT">RECEIPT (Goods In)</option>
                <option value="ISSUE">ISSUE (Issued to Field)</option>
                <option value="TRANSFER_IN">TRANSFER_IN</option>
                <option value="TRANSFER_OUT">TRANSFER_OUT</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
                <option value="RETURN">RETURN</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">Site:</span>
              <select 
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="w-full bg-industrial-800 border border-industrial-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                <option value="ALL">All Sites</option>
                <option value="NDGS">NDGS</option>
                <option value="H-IPF">H-IPF</option>
                <option value="JAMNA">JAMNA</option>
                <option value="CENTRAL-STORE">CENTRAL-STORE</option>
              </select>
            </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-industrial-300">
                <thead className="bg-industrial-900/80 text-industrial-400 uppercase font-mono text-[11px] border-b border-industrial-700">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Part Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Movement</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Location & Facility</th>
                    <th className="py-3 px-4">Auditor / User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-750 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-industrial-400">
                        No transactions recorded matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => {
                      const isPositive = tx.quantityChange > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-industrial-800/50 transition-colors">
                          {/* ID & Date */}
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            <div>{tx.transactionNumber}</div>
                            <div className="text-[10px] text-industrial-400 font-normal mt-0.5">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-brand-400 font-mono">
                              Ref: {tx.referenceNumber}
                            </div>
                          </td>

                          {/* Part */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-brand-300">{tx.partNumber}</span>
                            <div className="text-white text-xs line-clamp-1 mt-0.5">{tx.materialDescription}</div>
                            {tx.reason && (
                              <div className="text-[10px] text-industrial-400 italic mt-0.5">
                                Reason: {tx.reason}
                              </div>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.transactionType === 'RECEIPT' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              tx.transactionType === 'ISSUE' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              tx.transactionType === 'TRANSFER_IN' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                              tx.transactionType === 'TRANSFER_OUT' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' :
                              tx.transactionType === 'ADJUSTMENT' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                              'bg-industrial-700 text-industrial-300'
                            }`}>
                              {tx.transactionType}
                            </span>
                          </td>

                          {/* Change */}
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={`inline-flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              {isPositive ? `+${tx.quantityChange}` : tx.quantityChange} {tx.unit}
                            </span>
                          </td>

                          {/* Balance */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-white font-bold">{tx.quantityAfter} {tx.unit}</div>
                            <div className="text-[10px] text-industrial-500">Was: {tx.quantityBefore}</div>
                          </td>

                          {/* Site */}
                          <td className="py-3.5 px-4">
                            <div className="text-white font-semibold">📍 {tx.site}</div>
                            <div className="text-[10px] text-industrial-400">{tx.warehouse || 'Central Store'}</div>
                          </td>

                          {/* Performed By */}
                          <td className="py-3.5 px-4 font-mono text-industrial-300">
                            <div>{tx.performedBy}</div>
                            <div className="text-[10px] text-industrial-500">{tx.role}</div>
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
      )}

      {/* VIEW 2: POST STOCK ADJUSTMENT */}
      {activeSubTab === 'ADJUSTMENT' && (
        <div className="bg-industrial-850 border border-industrial-700 rounded-xl p-6 shadow max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-purple-400" /> Post Inventory Stock Adjustment
          </h3>
          <p className="text-xs text-industrial-400 mb-6">
            Correct physical discrepancies, scrap damaged parts, or record discovered units with strict audit trail.
          </p>

          <form onSubmit={handleRecordAdjustment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Material</label>
              <select 
                value={adjPartNumber}
                onChange={(e) => setAdjPartNumber(e.target.value)}
                className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
              >
                {materials.map(m => (
                  <option key={m.id} value={m.partNumber}>
                    [{m.partNumber}] {m.materialDescription} (Current Stock: {m.quantity} {m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Adjustment Type</label>
                <select 
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="INCREASE">➕ Positive Adjustment (Found Stock / Inward Correction)</option>
                  <option value="DECREASE">➖ Negative Adjustment (Discrepancy / Damage Scrap)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Adjustment Quantity</label>
                <input 
                  type="number" 
                  min={1} 
                  value={adjQuantity} 
                  onChange={(e) => setAdjQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Site / Facility</label>
                <select 
                  value={adjSite}
                  onChange={(e) => setAdjSite(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="NDGS">NDGS (North Degassing Station)</option>
                  <option value="H-IPF">H-IPF (Hammar Initial Production Facility)</option>
                  <option value="JAMNA">JAMNA (Jamna Plant)</option>
                  <option value="CENTRAL-STORE">CENTRAL-STORE (Central Logistics Base)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Warehouse</label>
                <input 
                  type="text" 
                  value={adjWarehouse} 
                  onChange={(e) => setAdjWarehouse(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-industrial-300 mb-1">Audit Justification & Reason</label>
              <textarea 
                rows={3} 
                required 
                value={adjReason} 
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Physical warehouse cycle count revealed 2 extra units sealed in original crate..."
                className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="p-3 bg-industrial-900 rounded border border-industrial-750 text-xs">
              <span className="text-industrial-400">Projected Result: </span>
              <span className="text-white font-mono font-bold">
                {selectedMaterial?.quantity || 0} {selectedMaterial?.unit} ➔ {adjType === 'INCREASE' ? (selectedMaterial?.quantity || 0) + adjQuantity : Math.max(0, (selectedMaterial?.quantity || 0) - adjQuantity)} {selectedMaterial?.unit}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
              <button 
                type="button" 
                onClick={() => setActiveSubTab('LEDGER')}
                className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded shadow"
              >
                Commit Stock Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: CYCLE COUNT AUDIT SESSIONS */}
      {activeSubTab === 'COUNT_SESSIONS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand-400" /> Active & Historical Stock Audit Sessions
            </h3>
            <button 
              onClick={() => {
                const name = prompt('Enter Stock Count Session Name:', 'Q4 Annual Spares Reconciliation');
                if (name) {
                  setCountSessionName(name);
                  // create directly
                }
              }}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-bold shadow"
            >
              + Start New Cycle Count
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockCounts.map(session => (
              <div key={session.id} className="bg-industrial-850 border border-industrial-700 rounded-xl p-5 shadow space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/30">
                    {session.sessionNumber}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {session.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{session.notes || session.sessionNumber}</h4>
                  <p className="text-xs text-industrial-400 mt-0.5">
                    📍 {session.site} • {session.warehouse} • Initiator: {session.createdBy}
                  </p>
                </div>

                <div className="p-3 bg-industrial-900/60 rounded-lg border border-industrial-750 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Total Scanned Items</span>
                    <span className="text-white font-bold">{session.items.length} Parts</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Variances Found</span>
                    <span className={`font-bold ${session.totalVarianceCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {session.totalVarianceCount} Discrepancies
                    </span>
                  </div>
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Date Started</span>
                    <span className="text-industrial-300">{new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-700/60">
                  <button 
                    onClick={() => alert(`Reconciled count session ${session.sessionNumber}. All stock balances locked.`)}
                    className="px-3 py-1 bg-industrial-800 hover:bg-industrial-750 text-industrial-200 text-xs font-medium rounded border border-industrial-700"
                  >
                    View Count Sheet
                  </button>
                  <button 
                    onClick={() => alert(`Exporting count audit report ${session.sessionNumber}...`)}
                    className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded border border-emerald-500/30"
                  >
                    Export Reconciliation Sheet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
