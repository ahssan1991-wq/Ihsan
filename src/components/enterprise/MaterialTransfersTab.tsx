/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  QrCode, 
  Printer, 
  Search, 
  Filter, 
  FileText, 
  Send, 
  PackageCheck,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { MaterialTransfer, Material, EnterpriseHierarchyNode, User as AppUser, UserRole } from '../../types';
import { dbService } from '../../services/dbService';
import { executePrint } from '../../utils/printManager';

interface MaterialTransfersTabProps {
  currentUser: AppUser;
  materials?: Material[];
  sites?: EnterpriseHierarchyNode[];
  onRefreshTransfers: () => void;
  onSelectMaterial: (material: Material) => void;
}

export const MaterialTransfersTab: React.FC<MaterialTransfersTabProps> = ({
  currentUser,
  materials = [],
  sites = [],
  onRefreshTransfers,
  onSelectMaterial
}) => {
  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const safeSites = Array.isArray(sites) && sites.length > 0 ? sites : (dbService.getHierarchyNodes() || []);
  const [transfers, setTransfers] = useState<MaterialTransfer[]>(() => dbService.getMaterialTransfers() || []);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransferForSlip, setSelectedTransferForSlip] = useState<MaterialTransfer | null>(null);

  // Dispatch Action Modal State
  const [dispatchTargetTransfer, setDispatchTargetTransfer] = useState<MaterialTransfer | null>(null);
  const [dispatchTrackingNum, setDispatchTrackingNum] = useState('');
  const [dispatchCarrier, setDispatchCarrier] = useState('Field Logistics Truck #4');

  // Receive Action Modal State
  const [receiveTargetTransfer, setReceiveTargetTransfer] = useState<MaterialTransfer | null>(null);
  const [receiveTargetLocation, setReceiveTargetLocation] = useState('Rack-A/Bin-02');
  const [receiveNotes, setReceiveNotes] = useState('');

  // Create Transfer Form State
  const [selectedPartNumber, setSelectedPartNumber] = useState(safeMaterials[0]?.partNumber || '');
  const [fromSite, setFromSite] = useState('NDGS');
  const [fromWarehouse, setFromWarehouse] = useState('NDGS Central Warehouse');
  const [toSite, setToSite] = useState('H-IPF');
  const [toWarehouse, setToWarehouse] = useState('H-IPF Plant Storage');
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [reason, setReason] = useState('Preventive maintenance spares replenishment');
  const [referenceWorkOrder, setReferenceWorkOrder] = useState('WO-2025-9921');

  const selectedMaterial = materials.find(m => m.partNumber === selectedPartNumber);

  const refreshData = () => {
    setTransfers(dbService.getMaterialTransfers());
    onRefreshTransfers();
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    dbService.createMaterialTransfer({
      materialId: selectedMaterial.id,
      partNumber: selectedMaterial.partNumber,
      description: selectedMaterial.materialDescription,
      fromSite,
      fromWarehouse,
      fromLocation: selectedMaterial.storageBin || 'Aisle-01/Bin-01',
      toSite,
      toWarehouse,
      toLocation: 'Unassigned/Staging',
      quantity,
      unit: selectedMaterial.unit || 'EA',
      requestedBy: currentUser.name,
      urgency,
      reason,
      notes: referenceWorkOrder ? `Work Order: ${referenceWorkOrder}` : undefined
    }, currentUser);

    refreshData();
    setShowCreateModal(false);
  };

  const handleApprove = (transfer: MaterialTransfer) => {
    dbService.approveMaterialTransfer(transfer.id, currentUser, 'Standard logistics approval granted');
    refreshData();
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTargetTransfer) return;

    dbService.dispatchMaterialTransfer(
      dispatchTargetTransfer.id,
      dispatchTrackingNum || `TRK-${Date.now().toString().slice(-6)}`,
      dispatchCarrier,
      currentUser
    );

    setDispatchTargetTransfer(null);
    refreshData();
  };

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveTargetTransfer) return;

    dbService.receiveMaterialTransfer(
      receiveTargetTransfer.id,
      receiveTargetLocation,
      currentUser,
      receiveNotes
    );

    setReceiveTargetTransfer(null);
    refreshData();
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch = 
      t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fromSite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.toSite.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            Inter-Site Material Transfers & Dispatch Logistics
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            End-to-end chain of custody: Request ➔ Engineering Approval ➔ Dispatch Slip ➔ Carrier In-Transit ➔ Warehouse Receipt.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> New Material Transfer Request
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-industrial-900/60 p-3 rounded-lg border border-industrial-750">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="Search by transfer #, part #, description, site..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-industrial-800 border border-industrial-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-industrial-400" />
          <span className="text-xs text-industrial-300">Status:</span>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-industrial-800 border border-industrial-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses ({transfers.length})</option>
            <option value="REQUESTED">Requested (Pending Approval)</option>
            <option value="APPROVED">Approved (Ready for Dispatch)</option>
            <option value="IN_TRANSIT">In Transit (Dispatched)</option>
            <option value="RECEIVED">Received & Restocked</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* TRANSFERS LIST TABLE */}
      <div className="bg-industrial-850 border border-industrial-700 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-industrial-300">
            <thead className="bg-industrial-900/80 text-industrial-400 uppercase font-mono text-[11px] border-b border-industrial-700">
              <tr>
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Material Details</th>
                <th className="py-3 px-4">Route (From ➔ To)</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-750 font-medium">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-industrial-400">
                    No material transfers matching the current criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-industrial-800/50 transition-colors">
                    {/* Transfer # */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div>{t.transferNumber}</div>
                      <div className="text-[10px] text-industrial-400 font-normal mt-0.5">
                        {new Date(t.requestDate).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Material */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-brand-300">{t.partNumber}</div>
                      <div className="text-white text-xs line-clamp-1 mt-0.5">{t.description}</div>
                      <div className="text-[10px] text-industrial-400 mt-0.5 font-mono">
                        Ref: {t.referenceWorkOrder || 'Standard stock replenishment'}
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-white font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-200 border border-industrial-700">
                          {t.fromSite}
                        </span>
                        <span className="text-industrial-500">➔</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-600/40">
                          {t.toSite}
                        </span>
                      </div>
                      <div className="text-[10px] text-industrial-400 mt-1">
                        {t.fromWarehouse} ➔ {t.toWarehouse}
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {t.quantity} <span className="text-industrial-400 text-[10px]">{t.unit}</span>
                    </td>

                    {/* Urgency */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.urgency === 'EMERGENCY' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        t.urgency === 'URGENT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-industrial-800 text-industrial-300'
                      }`}>
                        {t.urgency}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                        t.status === 'REQUESTED' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        t.status === 'APPROVED' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        t.status === 'IN_TRANSIT' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 animate-pulse' :
                        t.status === 'RECEIVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        'bg-rose-500/15 text-rose-400'
                      }`}>
                        {t.status === 'REQUESTED' && <Clock className="w-3 h-3" />}
                        {t.status === 'APPROVED' && <ShieldCheck className="w-3 h-3" />}
                        {t.status === 'IN_TRANSIT' && <Truck className="w-3 h-3" />}
                        {t.status === 'RECEIVED' && <CheckCircle2 className="w-3 h-3" />}
                        {t.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Dispatch Slip */}
                        <button 
                          onClick={() => setSelectedTransferForSlip(t)}
                          title="Print / View Transfer Dispatch Slip"
                          className="p-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded border border-industrial-700 hover:text-white"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* Step 1: Approve (if requested & user is Admin/Engineer) */}
                        {t.status === 'REQUESTED' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ENGINEER) && (
                          <button 
                            onClick={() => handleApprove(t)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                        )}

                        {/* Step 2: Dispatch (if approved) */}
                        {t.status === 'APPROVED' && (
                          <button 
                            onClick={() => setDispatchTargetTransfer(t)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow"
                          >
                            <Truck className="w-3 h-3" /> Dispatch
                          </button>
                        )}

                        {/* Step 3: Receive & Acknowledge (if in transit) */}
                        {t.status === 'IN_TRANSIT' && (
                          <button 
                            onClick={() => setReceiveTargetTransfer(t)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow"
                          >
                            <PackageCheck className="w-3 h-3" /> Receive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE TRANSFER REQUEST */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-400" /> New Material Inter-Site Transfer
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Initiate an official transfer requisition between field warehouses or central storerooms.
            </p>

            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Material / Part Number</label>
                <select 
                  value={selectedPartNumber}
                  onChange={(e) => setSelectedPartNumber(e.target.value)}
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
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Source Site (From)</label>
                  <select 
                    value={fromSite}
                    onChange={(e) => {
                      setFromSite(e.target.value);
                      setFromWarehouse(`${e.target.value} Main Store`);
                    }}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    {safeSites.filter(s => s.type === 'SITE').map(s => (
                      <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Destination Site (To)</label>
                  <select 
                    value={toSite}
                    onChange={(e) => {
                      setToSite(e.target.value);
                      setToWarehouse(`${e.target.value} Plant Storage`);
                    }}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    {safeSites.filter(s => s.type === 'SITE').map(s => (
                      <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={selectedMaterial?.quantity || 100}
                    value={quantity} 
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Urgency Level</label>
                  <select 
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="ROUTINE">ROUTINE (Standard)</option>
                    <option value="URGENT">URGENT (24-48 Hours)</option>
                    <option value="EMERGENCY">EMERGENCY (Shutdown Critical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Ref Work Order #</label>
                  <input 
                    type="text" 
                    value={referenceWorkOrder} 
                    onChange={(e) => setReferenceWorkOrder(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Transfer Justification / Reason</label>
                <textarea 
                  rows={2} 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  placeholder="Explain why parts are being relocated..."
                />
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow"
                >
                  Submit Transfer Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH SHIPMENT */}
      {dispatchTargetTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400" /> Dispatch Transfer {dispatchTargetTransfer.transferNumber}
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Deduct items from source stock and assign field transport details.
            </p>

            <form onSubmit={handleDispatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Carrier / Truck Identifier</label>
                <input 
                  type="text" 
                  required 
                  value={dispatchCarrier} 
                  onChange={(e) => setDispatchCarrier(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Waybill / Tracking Number</label>
                <input 
                  type="text" 
                  placeholder="TRK-NDGS-2025-01" 
                  value={dispatchTrackingNum} 
                  onChange={(e) => setDispatchTrackingNum(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="p-3 bg-industrial-900/60 rounded border border-industrial-750 text-xs text-industrial-300">
                <span className="font-semibold text-white">Item:</span> {dispatchTargetTransfer.partNumber} ({dispatchTargetTransfer.quantity} {dispatchTargetTransfer.unit})
                <div className="text-industrial-400 mt-1">Route: {dispatchTargetTransfer.fromSite} ➔ {dispatchTargetTransfer.toSite}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setDispatchTargetTransfer(null)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow"
                >
                  Confirm Dispatch & Print Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEIVE SHIPMENT */}
      {receiveTargetTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-400" /> Acknowledge Transfer Receipt
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Confirm material arrival at destination warehouse and restock into ledger.
            </p>

            <form onSubmit={handleReceive} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Target Storage Bin / Rack</label>
                <input 
                  type="text" 
                  required 
                  value={receiveTargetLocation} 
                  onChange={(e) => setReceiveTargetLocation(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Receipt Notes / Condition Check</label>
                <textarea 
                  rows={2} 
                  value={receiveNotes} 
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  placeholder="Material received in good sealed condition..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setReceiveTargetTransfer(null)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow"
                >
                  Confirm Receipt & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE DISPATCH SLIP WITH QR CODE */}
      {selectedTransferForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-slate-900 rounded-xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Slip Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Zubair Field Operating Division (ZFOD)</div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 mt-0.5">MATERIAL DISPATCH & TRANSFER SLIP</h1>
                <div className="text-xs text-slate-600 font-mono mt-0.5">Document No: {selectedTransferForSlip.dispatchSlipNumber || selectedTransferForSlip.transferNumber}</div>
              </div>
              <div className="text-right">
                <div className="p-2 border border-slate-300 rounded inline-block bg-slate-50">
                  <QrCode className="w-14 h-14 text-slate-800" />
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">{selectedTransferForSlip.transferNumber}</div>
              </div>
            </div>

            {/* Transfer Metadata Table */}
            <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Dispatch Date:</span>
                <span className="font-bold text-slate-800">{new Date(selectedTransferForSlip.requestDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Urgency Classification:</span>
                <span className="font-bold text-slate-800">{selectedTransferForSlip.urgency}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Originating Site & Store:</span>
                <span className="font-bold text-slate-800">{selectedTransferForSlip.fromSite} ({selectedTransferForSlip.fromWarehouse})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Destination Site & Store:</span>
                <span className="font-bold text-slate-800">{selectedTransferForSlip.toSite} ({selectedTransferForSlip.toWarehouse})</span>
              </div>
            </div>

            {/* Material Manifest */}
            <table className="w-full text-left text-xs border border-slate-300 my-4">
              <thead className="bg-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="p-2 border border-slate-300">Part Number</th>
                  <th className="p-2 border border-slate-300">Description</th>
                  <th className="p-2 border border-slate-300">Quantity</th>
                  <th className="p-2 border border-slate-300">From Bin</th>
                  <th className="p-2 border border-slate-300">Destination Bin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-slate-300 font-mono font-bold">{selectedTransferForSlip.partNumber}</td>
                  <td className="p-2 border border-slate-300">{selectedTransferForSlip.description}</td>
                  <td className="p-2 border border-slate-300 font-mono font-bold">{selectedTransferForSlip.quantity} {selectedTransferForSlip.unit}</td>
                  <td className="p-2 border border-slate-300 font-mono">{selectedTransferForSlip.fromLocation}</td>
                  <td className="p-2 border border-slate-300 font-mono">{selectedTransferForSlip.toLocation}</td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-[11px] text-slate-600 mt-6">
              <div>
                <div className="font-bold text-slate-800 mb-6">Requested By:</div>
                <div className="border-b border-slate-400 pb-1 font-mono">{selectedTransferForSlip.requestedBy}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Signature & Date</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-6">Dispatched / Carrier:</div>
                <div className="border-b border-slate-400 pb-1 font-mono">{selectedTransferForSlip.carrier || 'Field Transport'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Signature & Date</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-6">Received By:</div>
                <div className="border-b border-slate-400 pb-1 font-mono">{selectedTransferForSlip.receivedBy || 'Destination Custodian'}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Signature & Date</div>
              </div>
            </div>

            {/* Print / Close Buttons */}
            <div className="flex items-center justify-end gap-2 mt-8 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setSelectedTransferForSlip(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-xs font-semibold"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  if (!selectedTransferForSlip) return;
                  const html = `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                      <head>
                        <meta charset="utf-8">
                        <title>بوليصة نقل مادة - ${selectedTransferForSlip.transferNumber}</title>
                        <style>
                          @media print { @page { margin: 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; direction: rtl; background: #fff; }
                          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
                          th { background: #f1f5f9; font-weight: bold; }
                          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
                          .sig-box { border-top: 1px solid #475569; width: 180px; text-align: center; padding-top: 5px; font-size: 11px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div>
                            <h2 style="margin:0; font-size: 20px;">بوليصة شحن ونقل مواد مستودعية</h2>
                            <p style="margin:4px 0 0 0; color: #64748b; font-size: 11px;">EMIS Material Transfer Waybill & Dispatch Slip</p>
                          </div>
                          <div style="text-align: left; direction: ltr; font-family: monospace; font-size: 11px;">
                            <div><strong>Slip #:</strong> ${selectedTransferForSlip.transferNumber}</div>
                            <div><strong>Date:</strong> ${new Date(selectedTransferForSlip.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>

                        <table>
                          <tr>
                            <th>رقم القطعة / Part #</th>
                            <td style="font-family: monospace; font-weight: bold;">${selectedTransferForSlip.partNumber}</td>
                            <th>الكمية المنقولة</th>
                            <td style="font-weight: bold;">${selectedTransferForSlip.quantity} وحدة</td>
                          </tr>
                          <tr>
                            <th>من موقع / مستودع</th>
                            <td>${selectedTransferForSlip.fromSiteName || 'المستودع الرئيسي'}</td>
                            <th>إلى موقع / مستودع</th>
                            <td>${selectedTransferForSlip.toSiteName || 'الموقع الميداني'}</td>
                          </tr>
                          <tr>
                            <th>الناقل / وسيلة النقل</th>
                            <td>${selectedTransferForSlip.carrier || 'النقل الداخلي'}</td>
                            <th>حالة النقل</th>
                            <td>${selectedTransferForSlip.status}</td>
                          </tr>
                          <tr>
                            <th>ملاحظات وتوجيهات</th>
                            <td colspan="3">${selectedTransferForSlip.notes || 'لا توجد ملاحظات إضافية'}</td>
                          </tr>
                        </table>

                        <div class="signatures">
                          <div class="sig-box">توقيع مسؤول الإرسال</div>
                          <div class="sig-box">توقيع السائق / الناقل</div>
                          <div class="sig-box">توقيع المستلم بالوجهة</div>
                        </div>

                        <script>
                          window.onload = function() {
                            setTimeout(function() { try { window.print(); } catch(e){} }, 400);
                          };
                        </script>
                      </body>
                    </html>
                  `;
                  executePrint(`بوليصة_${selectedTransferForSlip.transferNumber}`, html, `Waybill_${selectedTransferForSlip.transferNumber}.html`);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Waybill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
