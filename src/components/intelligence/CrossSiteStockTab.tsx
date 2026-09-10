/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Truck, 
  Building2, 
  Plus, 
  Check, 
  Search,
  Sparkles,
  Info,
  ShieldCheck
} from 'lucide-react';
import { CrossSiteOpportunity, User, MaterialTransfer } from '../../types';
import { dbService } from '../../services/dbService';

interface CrossSiteStockTabProps {
  selectedSite: string;
  currentUser: User;
  onRefresh?: () => void;
}

export default function CrossSiteStockTab({
  selectedSite,
  currentUser,
  onRefresh
}: CrossSiteStockTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);
  const [selectedOppForTransfer, setSelectedOppForTransfer] = useState<CrossSiteOpportunity | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');

  const opportunities: CrossSiteOpportunity[] = dbService.getCrossSiteOpportunities(selectedSite) || [];

  const filteredOpportunities = opportunities.filter(opp => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        opp.partNumber.toLowerCase().includes(q) ||
        opp.description.toLowerCase().includes(q) ||
        opp.matchingSite.toLowerCase().includes(q) ||
        opp.requestingSite.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenTransferModal = (opp: CrossSiteOpportunity) => {
    setSelectedOppForTransfer(opp);
    setTransferQty(Math.min(opp.shortageQuantity, opp.availableQuantity));
    setTransferNotes(`Autonomous cross-site redistribution to resolve stock outage at ${opp.requestingSite}.`);
  };

  const handleExecuteTransfer = () => {
    if (!selectedOppForTransfer) return;

    const created = dbService.createMaterialTransfer({
      materialId: `MAT-${selectedOppForTransfer.partNumber}`,
      partNumber: selectedOppForTransfer.partNumber,
      description: selectedOppForTransfer.description,
      quantity: transferQty,
      unit: 'EA',
      fromSite: selectedOppForTransfer.matchingSite,
      fromWarehouse: selectedOppForTransfer.matchingWarehouse,
      fromLocation: 'Bay 1',
      toSite: selectedOppForTransfer.requestingSite,
      toWarehouse: 'Main Receiving Bay',
      toLocation: 'Inbound Staging',
      reason: selectedOppForTransfer.reason,
      urgency: selectedOppForTransfer.urgency === 'CRITICAL' ? 'EMERGENCY' : selectedOppForTransfer.urgency === 'HIGH' ? 'URGENT' : 'ROUTINE',
      requestedBy: currentUser.name,
      notes: transferNotes
    }, currentUser);

    setTransferSuccessMsg(`Successfully initiated transfer ${created.transferNumber} for ${transferQty} EA from ${created.fromSite} to ${created.toSite}.`);
    setSelectedOppForTransfer(null);
    if (onRefresh) onRefresh();

    setTimeout(() => {
      setTransferSuccessMsg(null);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Cross-Site Inventory Balancing & Redistribution
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Autonomous algorithm identifies site-specific zero/low-stock positions and correlates them with surplus buffers at sister facilities.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded-lg font-bold">
              {opportunities.length} Matches Detected
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search opportunities by Part Number, Description, or Source/Destination Site..."
            className="w-full pl-10 pr-4 py-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
      </div>

      {/* Success Notification */}
      {transferSuccessMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{transferSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setTransferSuccessMsg(null)}
            className="text-emerald-400 hover:text-white font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Opportunities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOpportunities.length === 0 ? (
          <div className="col-span-2 p-10 bg-industrial-900 border border-industrial-800 rounded-xl text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">All Site Stock Levels Balanced</h3>
            <p className="text-xs text-industrial-400 mt-1">
              No shortages with corresponding sister-site surpluses were found for the selected site filter.
            </p>
          </div>
        ) : (
          filteredOpportunities.map(opp => (
            <div 
              key={opp.id}
              className="bg-industrial-900 border border-industrial-800 hover:border-brand-500/40 transition-all rounded-xl p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header: Part Number & Urgency */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-white">{opp.partNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      opp.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {opp.urgency === 'CRITICAL' ? 'CRITICAL DEFICIT' : 'BUFFER SHORTAGE'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-industrial-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-brand-400" />
                    ~{opp.estimatedLeadTimeHours}h lead time
                  </span>
                </div>

                {/* Description */}
                <div className="text-xs text-industrial-200 mt-2 font-medium">
                  {opp.description}
                </div>
                <div className="text-[11px] text-industrial-400 mt-0.5">
                  OEM / Brand: <span className="text-industrial-300 font-semibold">{opp.manufacturer}</span>
                </div>

                {/* Transfer Logistics Flow */}
                <div className="mt-4 p-3 bg-industrial-950 rounded-lg border border-industrial-800 flex items-center justify-between">
                  {/* Destination */}
                  <div>
                    <div className="text-[10px] uppercase font-mono text-red-400 font-bold">Requesting Deficit</div>
                    <div className="text-xs font-bold text-white mt-0.5">{opp.requestingSite}</div>
                    <div className="text-[10px] text-red-400 font-mono mt-0.5 font-semibold">Shortage: -{opp.shortageQuantity} EA</div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex flex-col items-center px-2">
                    <ArrowLeftRight className="w-4 h-4 text-brand-400" />
                    <span className="text-[9px] text-industrial-500 font-mono mt-0.5">Internal Route</span>
                  </div>

                  {/* Source */}
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Available Surplus</div>
                    <div className="text-xs font-bold text-white mt-0.5">{opp.matchingSite}</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-semibold">Surplus: +{opp.availableQuantity} EA</div>
                  </div>
                </div>

                {/* Reason Explanation */}
                <div className="mt-3 text-[11px] text-industrial-400 bg-industrial-850/40 p-2.5 rounded border border-industrial-800/80">
                  <span className="text-industrial-300 font-semibold">Engineering Justification: </span>
                  {opp.reason}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-industrial-800 flex justify-end">
                <button
                  onClick={() => handleOpenTransferModal(opp)}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Initiate Inter-Site Transfer</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transfer Execution Modal */}
      {selectedOppForTransfer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-industrial-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-wider">Inter-Site Transfer Protocol</span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">{selectedOppForTransfer.partNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOppForTransfer(null)}
                className="text-industrial-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-industrial-950 rounded-lg border border-industrial-800 space-y-1">
                <div className="text-industrial-400 text-[11px]">Material Description:</div>
                <div className="text-white font-medium">{selectedOppForTransfer.description}</div>
                <div className="text-[11px] text-industrial-400 mt-2 flex justify-between">
                  <span>Source Site: <strong className="text-emerald-400">{selectedOppForTransfer.matchingSite}</strong></span>
                  <span>Destination: <strong className="text-red-400">{selectedOppForTransfer.requestingSite}</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase font-mono mb-1">
                  Transfer Quantity (Max available: {selectedOppForTransfer.availableQuantity})
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedOppForTransfer.availableQuantity}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-industrial-400 uppercase font-mono mb-1">
                  Operational Notes & Waybill Reference
                </label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOppForTransfer(null)}
                className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Dispatch Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
