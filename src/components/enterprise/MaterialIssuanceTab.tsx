/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PackageMinus, 
  PackagePlus, 
  Bookmark, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { MaterialIssue, MaterialReturn, MaterialReservation, Material, User as AppUser, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface MaterialIssuanceTabProps {
  currentUser: AppUser;
  materials?: Material[];
  onRefreshData: () => void;
  onSelectMaterial: (material: Material) => void;
}

export const MaterialIssuanceTab: React.FC<MaterialIssuanceTabProps> = ({
  currentUser,
  materials = [],
  onRefreshData,
  onSelectMaterial
}) => {
  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const [activeSubTab, setActiveSubTab] = useState<'ISSUES' | 'RETURNS' | 'RESERVATIONS'>('ISSUES');
  const [issues, setIssues] = useState<MaterialIssue[]>(() => dbService.getMaterialIssues() || []);
  const [returns, setReturns] = useState<MaterialReturn[]>(() => dbService.getMaterialReturns() || []);
  const [reservations, setReservations] = useState<MaterialReservation[]>(() => dbService.getMaterialReservations() || []);

  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);

  // Issue Form State
  const [issuePartNumber, setIssuePartNumber] = useState(safeMaterials[0]?.partNumber || '');
  const [issuedTo, setIssuedTo] = useState('Ahmed Al-Mansouri (Maintenance Lead)');
  const [issueDepartment, setIssueDepartment] = useState('INSTRUMENTATION');
  const [issueWorkOrder, setIssueWorkOrder] = useState('WO-2025-NDGS-4412');
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issuePurpose, setIssuePurpose] = useState('Emergency replacement on wellhead WH-12 RTU manifold');

  // Return Form State
  const [returnPartNumber, setReturnPartNumber] = useState(safeMaterials[0]?.partNumber || '');
  const [returnFrom, setReturnFrom] = useState('Area 3 Overhaul Team');
  const [returnCondition, setReturnCondition] = useState<'NEW' | 'GOOD' | 'USED' | 'DAMAGED' | 'QUARANTINED'>('NEW');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('Job completed without utilizing extra reserve unit');

  // Reservation Form State
  const [reservePartNumber, setReservePartNumber] = useState(safeMaterials[0]?.partNumber || '');
  const [reserveFor, setReserveFor] = useState('Major Turnaround Q4 Shutdown');
  const [reserveWorkOrder, setReserveWorkOrder] = useState('TA-2025-SHUTDOWN');
  const [reserveQuantity, setReserveQuantity] = useState(2);
  const [reservePurpose, setReservePurpose] = useState('Reserved for planned turnaround work order');

  const selectedMaterialForIssue = materials.find(m => m.partNumber === issuePartNumber);
  const selectedMaterialForReturn = materials.find(m => m.partNumber === returnPartNumber);
  const selectedMaterialForReserve = materials.find(m => m.partNumber === reservePartNumber);

  const refreshAll = () => {
    setIssues(dbService.getMaterialIssues());
    setReturns(dbService.getMaterialReturns());
    setReservations(dbService.getMaterialReservations());
    onRefreshData();
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialForIssue) return;

    dbService.issueMaterial({
      materialId: selectedMaterialForIssue.id,
      partNumber: selectedMaterialForIssue.partNumber,
      description: selectedMaterialForIssue.materialDescription,
      quantity: issueQuantity,
      unit: selectedMaterialForIssue.unit || 'EA',
      site: selectedMaterialForIssue.store || 'NDGS',
      warehouse: 'NDGS Main Store',
      issuedTo,
      department: issueDepartment,
      workOrderNumber: issueWorkOrder,
      purpose: issuePurpose,
      requestedBy: currentUser.name
    }, currentUser);

    refreshAll();
    setShowIssueModal(false);
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialForReturn) return;

    dbService.returnMaterial({
      materialId: selectedMaterialForReturn.id,
      partNumber: selectedMaterialForReturn.partNumber,
      description: selectedMaterialForReturn.materialDescription,
      quantity: returnQuantity,
      unit: selectedMaterialForReturn.unit || 'EA',
      returnToSite: selectedMaterialForReturn.store || 'NDGS',
      returnToWarehouse: 'NDGS Main Store',
      returnToLocation: 'Staging-Returns-01',
      returnFrom,
      condition: returnCondition,
      returnedBy: currentUser.name,
      reason: returnReason,
      inspectionRequired: true
    }, currentUser);

    refreshAll();
    setShowReturnModal(false);
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialForReserve) return;

    dbService.createReservation({
      materialId: selectedMaterialForReserve.id,
      partNumber: selectedMaterialForReserve.partNumber,
      description: selectedMaterialForReserve.materialDescription,
      quantity: reserveQuantity,
      unit: selectedMaterialForReserve.unit || 'EA',
      site: selectedMaterialForReserve.store || 'NDGS',
      reservedFor: reserveFor || reserveWorkOrder || 'Scheduled Plant Overhaul',
      purpose: reservePurpose || 'Reserved for planned turnaround work order',
      reservedBy: currentUser.name,
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString()
    }, currentUser);

    refreshAll();
    setShowReserveModal(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-amber-400" />
            Material Issuance, Returns & Reservations
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Issue materials against Work Orders, manage field returns with condition checks, and hold stock reservations.
          </p>
        </div>

        {/* SUB-TAB TOGGLE */}
        <div className="flex items-center bg-industrial-900 p-1 rounded-lg border border-industrial-700">
          <button 
            onClick={() => setActiveSubTab('ISSUES')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'ISSUES' ? 'bg-amber-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            <PackageMinus className="w-3.5 h-3.5" /> Issues ({issues.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('RETURNS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'RETURNS' ? 'bg-emerald-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" /> Returns ({returns.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('RESERVATIONS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'RESERVATIONS' ? 'bg-blue-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Reservations ({reservations.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: MATERIAL ISSUES LIST */}
      {activeSubTab === 'ISSUES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Work Order Material Issues Log</h3>
            <button 
              onClick={() => setShowIssueModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Issue Material to Work Order
            </button>
          </div>

          <div className="bg-industrial-850 border border-industrial-700 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-industrial-300">
              <thead className="bg-industrial-900/80 text-industrial-400 uppercase font-mono text-[11px] border-b border-industrial-700">
                <tr>
                  <th className="py-3 px-4">Issue #</th>
                  <th className="py-3 px-4">Material Details</th>
                  <th className="py-3 px-4">Issued To / Dept</th>
                  <th className="py-3 px-4">Work Order / Project</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Site / Store</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-750 font-medium">
                {issues.map(iss => (
                  <tr key={iss.id} className="hover:bg-industrial-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div>{iss.issueNumber}</div>
                      <div className="text-[10px] text-industrial-400 font-normal mt-0.5">
                        {new Date(iss.issueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-brand-300">[{iss.partNumber}]</span>
                      <div className="text-white text-xs line-clamp-1 mt-0.5">{iss.description}</div>
                      <div className="text-[10px] text-industrial-400 mt-0.5 italic">{iss.purpose}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white font-semibold">{iss.issuedTo}</div>
                      <div className="text-[10px] text-industrial-400">{iss.department}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                      {iss.workOrderNumber || 'General Maintenance'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {iss.quantity} <span className="text-[10px] text-industrial-400">{iss.unit}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white font-semibold">📍 {iss.site}</div>
                      <div className="text-[10px] text-industrial-400">{iss.warehouse}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {iss.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MATERIAL RETURNS LIST */}
      {activeSubTab === 'RETURNS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Field Material Returns Log</h3>
            <button 
              onClick={() => setShowReturnModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Process Material Return
            </button>
          </div>

          <div className="bg-industrial-850 border border-industrial-700 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-industrial-300">
              <thead className="bg-industrial-900/80 text-industrial-400 uppercase font-mono text-[11px] border-b border-industrial-700">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Material Details</th>
                  <th className="py-3 px-4">Returned From</th>
                  <th className="py-3 px-4">Condition Check</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Inspection Req</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-750 font-medium">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-industrial-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <div>{ret.returnNumber}</div>
                      <div className="text-[10px] text-industrial-400 font-normal mt-0.5">
                        {new Date(ret.returnDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-brand-300">[{ret.partNumber}]</span>
                      <div className="text-white text-xs line-clamp-1 mt-0.5">{ret.description}</div>
                      <div className="text-[10px] text-industrial-400 mt-0.5 italic">{ret.reason}</div>
                    </td>
                    <td className="py-3.5 px-4 text-white font-semibold">
                      {ret.returnFrom}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ret.condition === 'NEW_UNUSED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        ret.condition === 'USED' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {ret.condition}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {ret.quantity} {ret.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      {ret.inspectionRequired ? (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Re-Inspection Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Restocked
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ret.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>
                        {ret.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: STOCK RESERVATIONS LIST */}
      {activeSubTab === 'RESERVATIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Active Stock Reservations</h3>
            <button 
              onClick={() => setShowReserveModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Place Material Reservation
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservations.map(res => (
              <div key={res.id} className="p-4 bg-industrial-850 border border-industrial-700 rounded-xl space-y-3 shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{res.reservationNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    res.status === 'ACTIVE' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {res.status}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-brand-300">[{res.partNumber}]</span>
                  <h4 className="text-xs font-semibold text-white mt-0.5">{res.description}</h4>
                  <div className="text-xs text-industrial-300 mt-1">
                    Reserved for: <span className="font-semibold text-white">{res.reservedFor}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-industrial-900/70 rounded-lg border border-industrial-750 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Held Quantity</span>
                    <span className="text-blue-400 font-bold">{res.quantity} {res.unit}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Site Store</span>
                    <span className="text-white">{res.site}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 block text-[10px]">Work Order</span>
                    <span className="text-amber-400 font-bold">{res.workOrderNumber}</span>
                  </div>
                </div>

                {res.status === 'ACTIVE' && (
                  <div className="pt-2 border-t border-industrial-700/60 flex items-center justify-end">
                    <button 
                      onClick={() => {
                        dbService.fulfillReservation(res.id, currentUser);
                        refreshAll();
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"
                    >
                      Fulfill & Complete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ISSUE MATERIAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PackageMinus className="w-5 h-5 text-amber-400" /> Issue Material To Work Order
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Deduct inventory from warehouse and assign directly to field work order.
            </p>

            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Material</label>
                <select 
                  value={issuePartNumber}
                  onChange={(e) => setIssuePartNumber(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.partNumber}>
                      [{m.partNumber}] {m.materialDescription} (Stock: {m.quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Issue Quantity</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={selectedMaterialForIssue?.quantity || 10}
                    value={issueQuantity} 
                    onChange={(e) => setIssueQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Work Order #</label>
                  <input 
                    type="text" 
                    required 
                    value={issueWorkOrder} 
                    onChange={(e) => setIssueWorkOrder(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Issued To (Technician/Engineer)</label>
                  <input 
                    type="text" 
                    required 
                    value={issuedTo} 
                    onChange={(e) => setIssuedTo(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Department</label>
                  <select 
                    value={issueDepartment}
                    onChange={(e) => setIssueDepartment(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="INSTRUMENTATION">INSTRUMENTATION</option>
                    <option value="ELECTRICAL">ELECTRICAL</option>
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="TELECOM_SCADA">TELECOM / SCADA</option>
                    <option value="OPERATIONS">OPERATIONS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Operational Purpose</label>
                <textarea 
                  rows={2} 
                  value={issuePurpose} 
                  onChange={(e) => setIssuePurpose(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded shadow"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETURN MATERIAL */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-emerald-400" /> Process Field Material Return
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Return unused or replaced materials to warehouse stock with physical condition assessment.
            </p>

            <form onSubmit={handleCreateReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Part Number</label>
                <select 
                  value={returnPartNumber}
                  onChange={(e) => setReturnPartNumber(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.partNumber}>
                      [{m.partNumber}] {m.materialDescription}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Quantity Returned</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={returnQuantity} 
                    onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Physical Condition</label>
                  <select 
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as any)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="NEW">NEW (Direct Restock)</option>
                    <option value="GOOD">GOOD (Reusable)</option>
                    <option value="USED">USED (Requires Bench Inspection)</option>
                    <option value="DAMAGED">DAMAGED (Quarantine & Review)</option>
                    <option value="QUARANTINED">QUARANTINED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Returned From (Team / Job)</label>
                <input 
                  type="text" 
                  required 
                  value={returnFrom} 
                  onChange={(e) => setReturnFrom(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Return Reason / Notes</label>
                <textarea 
                  rows={2} 
                  value={returnReason} 
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESERVE MATERIAL */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-400" /> Place Material Reservation
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Hold critical spare parts in stock for upcoming maintenance turnaround.
            </p>

            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Part Number</label>
                <select 
                  value={reservePartNumber}
                  onChange={(e) => setReservePartNumber(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.partNumber}>
                      [{m.partNumber}] {m.materialDescription} (Stock: {m.quantity} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Quantity To Reserve</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={reserveQuantity} 
                    onChange={(e) => setReserveQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Work Order / Project</label>
                  <input 
                    type="text" 
                    required 
                    value={reserveWorkOrder} 
                    onChange={(e) => setReserveWorkOrder(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Reservation Purpose / Project</label>
                <input 
                  type="text" 
                  required 
                  value={reserveFor} 
                  onChange={(e) => setReserveFor(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowReserveModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow"
                >
                  Save Stock Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
