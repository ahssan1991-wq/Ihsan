/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Camera, 
  QrCode, 
  FileText, 
  Check, 
  ChevronRight,
  Boxes,
  MapPin,
  Sparkles,
  ShieldCheck,
  Package
} from 'lucide-react';
import { ReceivingSession, ReceivingSessionItem, Material, EnterpriseHierarchyNode, User, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface DigitalReceivingTabProps {
  currentUser: User;
  materials?: Material[];
  sites?: EnterpriseHierarchyNode[];
  onRefreshSessions: () => void;
  onSelectMaterial: (material: Material) => void;
}

export const DigitalReceivingTab: React.FC<DigitalReceivingTabProps> = ({
  currentUser,
  materials = [],
  sites = [],
  onRefreshSessions,
  onSelectMaterial
}) => {
  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const safeSites = Array.isArray(sites) && sites.length > 0 ? sites : (dbService.getHierarchyNodes() || []);
  const [sessions, setSessions] = useState<ReceivingSession[]>(() => dbService.getReceivingSessions() || []);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Session Form State
  const [newPoNumber, setNewPoNumber] = useState('PO-2025-ZFOD-8812');
  const [newSupplier, setNewSupplier] = useState('Emerson Automation Solutions');
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('INV-EM-9921');
  const [newSite, setNewSite] = useState('NDGS');
  const [newWarehouse, setNewWarehouse] = useState('NDGS Central Warehouse');
  const [selectedPartsForSession, setSelectedPartsForSession] = useState<string[]>([safeMaterials[0]?.partNumber || '']);

  const activeSession = (sessions || []).find(s => s.id === selectedSessionId) || sessions[0];

  const refreshData = () => {
    setSessions(dbService.getReceivingSessions() || []);
    onRefreshSessions();
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const items: ReceivingSessionItem[] = selectedPartsForSession.map((pNum, idx) => {
      const mat = safeMaterials.find(m => m.partNumber === pNum);
      return {
        id: `rec-item-${Date.now()}-${idx}`,
        partNumber: pNum,
        description: mat?.materialDescription || 'Industrial instrument component',
        expectedQty: 5,
        receivedQty: 5,
        unit: mat?.unit || 'EA',
        inspectionResult: 'PENDING',
        assignedLocation: 'Aisle-01/Rack-A/Bin-02'
      };
    });

    const newSession = dbService.createReceivingSession({
      poNumber: newPoNumber,
      supplier: newSupplier,
      deliveryNote: newInvoiceNumber,
      carrier: 'Global Heavy Logistics Ltd.',
      site: newSite,
      warehouse: newWarehouse,
      receivedBy: currentUser.name,
      totalItems: items.length,
      items
    }, currentUser);

    refreshData();
    setSelectedSessionId(newSession.id);
    setShowCreateModal(false);
  };

  const handleUpdateItemInspection = (
    sessionId: string, 
    itemId: string, 
    result: 'ACCEPTED' | 'REJECTED' | 'ON_HOLD',
    notes?: string
  ) => {
    if (!activeSession) return;
    const updatedItems = activeSession.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          inspectionResult: result,
          notes: notes || `Marked as ${result} by ${currentUser.name}`
        };
      }
      return item;
    });

    dbService.updateReceivingSession(sessionId, { items: updatedItems }, currentUser);

    // If accepted, add stock transaction
    const targetItem = activeSession.items.find(i => i.id === itemId);
    if (targetItem && result === 'ACCEPTED') {
      const mat = materials.find(m => m.partNumber === targetItem.partNumber);
      const beforeQty = mat?.quantity || 0;
      dbService.recordStockTransaction({
        materialId: mat?.id || targetItem.partNumber,
        partNumber: targetItem.partNumber,
        materialDescription: targetItem.description,
        transactionType: 'RECEIPT',
        quantityChange: targetItem.receivedQty,
        quantityBefore: beforeQty,
        quantityAfter: beforeQty + targetItem.receivedQty,
        unit: targetItem.unit,
        site: activeSession.site,
        warehouse: activeSession.warehouse,
        location: targetItem.assignedLocation,
        referenceType: 'PO',
        referenceNumber: activeSession.poNumber || 'PO-VOUCHER',
        performedBy: currentUser.name,
        role: currentUser.role,
        reason: `PO Receiving Check-In (${activeSession.sessionNumber})`
      }, currentUser);
    }

    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-400" />
            Digital Receiving Sessions & Batch Check-In
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            PO invoice matching, Physical Nameplate AI OCR, Material Verification & Stock Inward Routing.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> Start New Receiving Session
        </button>
      </div>

      {/* 2-COLUMN LAYOUT: SESSIONS LIST (LEFT 4) & ACTIVE SESSION DETAIL (RIGHT 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SESSIONS LIST */}
        <div className="lg:col-span-4 bg-industrial-850 border border-industrial-700 rounded-xl p-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-industrial-700/80 mb-3">
            <span className="text-sm font-bold text-white">Receiving Sessions</span>
            <span className="text-[11px] text-industrial-400 font-mono">{sessions.length} Batches</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {sessions.map(s => {
              const isSelected = selectedSessionId === s.id;
              return (
                <div 
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-brand-600/15 border-brand-500/60 shadow' 
                      : 'bg-industrial-800/70 hover:bg-industrial-800 border-industrial-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{s.sessionNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-brand-300 mt-1.5 line-clamp-1">{s.supplier}</h4>
                  <div className="text-[11px] text-industrial-400 font-mono mt-0.5">PO: {s.poNumber || 'N/A'}</div>

                  <div className="mt-2 pt-2 border-t border-industrial-700/60 flex items-center justify-between text-[10px] text-industrial-400">
                    <span>📍 {s.site}</span>
                    <span>Items: {s.completedItems} / {s.totalItems} Checked</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SESSION DETAIL & ITEMS TABLE */}
        <div className="lg:col-span-8 space-y-6">
          {activeSession ? (
            <>
              {/* SESSION METADATA CARD */}
              <div className="bg-industrial-850 border border-industrial-700 rounded-xl p-5 shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-700/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                        Session: {activeSession.sessionNumber}
                      </span>
                      <span className="text-xs text-industrial-400 font-mono">PO: {activeSession.poNumber || 'N/A'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{activeSession.supplier}</h3>
                    <p className="text-xs text-industrial-400 mt-0.5">
                      Destination: {activeSession.site} ({activeSession.warehouse}) • Received By: {activeSession.receivedBy}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-industrial-400">Receipt Progress</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                      {activeSession.completedItems} / {activeSession.totalItems} Items Processed
                    </div>
                  </div>
                </div>

                {/* ITEMS IN RECEIVING BATCH */}
                <div className="mt-5 space-y-3">
                  <h4 className="text-xs font-bold text-industrial-300 uppercase tracking-wider">
                    Manifest Items ({activeSession.items.length})
                  </h4>

                  <div className="space-y-3">
                    {activeSession.items.map(item => (
                      <div key={item.id} className="p-4 bg-industrial-800/90 rounded-xl border border-industrial-700 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-brand-300">[{item.partNumber}]</span>
                              <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                item.inspectionResult === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                item.inspectionResult === 'REJECTED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                                'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}>
                                {item.inspectionResult}
                              </span>
                            </div>
                            <h5 className="text-xs font-semibold text-white mt-1">{item.description}</h5>
                            <div className="text-[11px] text-industrial-400 font-mono mt-0.5">
                              Expected: {item.expectedQty} {item.unit} | Received: {item.receivedQty} {item.unit}
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => handleUpdateItemInspection(activeSession.id, item.id, 'ACCEPTED', 'Material verified against PO specifications.')}
                              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                                item.inspectionResult === 'ACCEPTED' 
                                    ? 'bg-emerald-600 text-white shadow' 
                                    : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-700/50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Restock
                            </button>

                            <button 
                              onClick={() => handleUpdateItemInspection(activeSession.id, item.id, 'REJECTED', 'Visual damage or physical non-conformance.')}
                              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                                item.inspectionResult === 'REJECTED' 
                                    ? 'bg-rose-600 text-white shadow' 
                                    : 'bg-rose-950/40 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-700/50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </div>

                        {/* STORAGE ASSIGNMENT & AI OCR HINT */}
                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-industrial-700/60 text-industrial-400 font-mono">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            Suggested Bin: <span className="text-white">{item.assignedLocation || 'Staging Bin-01'}</span>
                          </span>
                          <span className="flex items-center gap-1 text-brand-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Inspection Ready
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-industrial-850 rounded-xl border border-industrial-700 text-industrial-400">
              No receiving session selected.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CREATE NEW RECEIVING SESSION */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-400" /> Start Digital Receiving Check-In
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Initialize a new digital receiving voucher against supplier purchase order.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Purchase Order #</label>
                  <input 
                    type="text" 
                    required 
                    value={newPoNumber} 
                    onChange={(e) => setNewPoNumber(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Supplier / Vendor</label>
                  <input 
                    type="text" 
                    required 
                    value={newSupplier} 
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Receiving Site</label>
                  <select 
                    value={newSite} 
                    onChange={(e) => {
                      setNewSite(e.target.value);
                      setNewWarehouse(`${e.target.value} Central Warehouse`);
                    }}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    {safeSites.filter(s => s.type === 'SITE').map(s => (
                      <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Warehouse / Store</label>
                  <input 
                    type="text" 
                    value={newWarehouse} 
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Incoming Materials (Batch)</label>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-industrial-900 p-2 rounded border border-industrial-700">
                  {safeMaterials.map(m => {
                    const isChecked = selectedPartsForSession.includes(m.partNumber);
                    return (
                      <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-industrial-800 rounded cursor-pointer text-xs text-industrial-200">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPartsForSession([...selectedPartsForSession, m.partNumber]);
                            } else {
                              setSelectedPartsForSession(selectedPartsForSession.filter(p => p !== m.partNumber));
                            }
                          }}
                          className="rounded border-industrial-600 bg-industrial-800 text-brand-500"
                        />
                        <span className="font-mono text-brand-300 font-bold">{m.partNumber}</span>
                        <span className="truncate">{m.materialDescription}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded shadow"
                >
                  Create Receiving Session ({selectedPartsForSession.length} items)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
