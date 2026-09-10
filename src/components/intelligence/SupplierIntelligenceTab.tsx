/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Search, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  HelpCircle,
  Truck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SupplierRiskProfile } from '../../types';
import { dbService } from '../../services/dbService';

interface SupplierIntelligenceTabProps {
  onRefresh?: () => void;
}

export default function SupplierIntelligenceTab({
  onRefresh
}: SupplierIntelligenceTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRiskProfile | null>(null);

  const suppliers: SupplierRiskProfile[] = dbService.getSupplierRiskProfiles() || [];

  const filteredSuppliers = suppliers.filter(s => {
    if (riskFilter !== 'ALL' && s.riskTier !== riskFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        s.supplierName.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Supplier Quality & Vendor Risk Intelligence
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Correlating receiving rejection rates, missing MTR certificates, technical spec mismatches, and on-time shipment metrics.
            </p>
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setRiskFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                riskFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              All Vendors ({suppliers.length})
            </button>
            <button
              onClick={() => setRiskFilter('LOW')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                riskFilter === 'LOW' ? 'bg-emerald-600 text-white' : 'bg-industrial-950 text-emerald-400 border border-industrial-800'
              }`}
            >
              Low Risk (Approved)
            </button>
            <button
              onClick={() => setRiskFilter('MEDIUM')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                riskFilter === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-industrial-950 text-amber-400 border border-industrial-800'
              }`}
            >
              Medium (Monitor)
            </button>
            <button
              onClick={() => setRiskFilter('HIGH')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                riskFilter === 'HIGH' ? 'bg-orange-600 text-white' : 'bg-industrial-950 text-orange-400 border border-industrial-800'
              }`}
            >
              High Risk
            </button>
            <button
              onClick={() => setRiskFilter('CRITICAL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                riskFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-industrial-950 text-red-400 border border-industrial-800'
              }`}
            >
              Critical (Hold)
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by Name, Code, Product Category, or Country of Origin..."
            className="w-full pl-10 pr-4 py-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(sup => {
          const isLow = sup.riskTier === 'LOW';
          const isMedium = sup.riskTier === 'MEDIUM';
          const isHigh = sup.riskTier === 'HIGH';
          const isCritical = sup.riskTier === 'CRITICAL';

          return (
            <div 
              key={sup.supplierId}
              className={`bg-industrial-900 border rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                isLow ? 'border-industrial-800 hover:border-emerald-500/40' :
                isMedium ? 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10' :
                isHigh ? 'border-orange-500/30 hover:border-orange-500/60 bg-orange-950/10' :
                'border-red-500/40 hover:border-red-500/70 bg-red-950/15'
              }`}
            >
              <div>
                {/* Header: Name, Country & Risk Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">{sup.supplierName}</h3>
                    <div className="text-[11px] text-industrial-400 font-mono mt-0.5">
                      Code: {sup.supplierCode} &bull; {sup.country}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isLow ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    isMedium ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    isHigh ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {sup.arabicRiskTier}
                  </span>
                </div>

                {/* Score & Delivery Rates */}
                <div className="mt-4 p-3 bg-industrial-950 rounded-lg border border-industrial-800 grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-industrial-400 uppercase">Risk Score</div>
                    <div className="text-base font-extrabold text-white mt-0.5">{sup.overallScore}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-industrial-400 uppercase">On-Time</div>
                    <div className="text-base font-extrabold text-emerald-400 mt-0.5">{sup.onTimeDeliveryRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-industrial-400 uppercase">Rejection</div>
                    <div className={`text-base font-extrabold mt-0.5 ${sup.rejectionRate > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {sup.rejectionRate}%
                    </div>
                  </div>
                </div>

                {/* Deficiencies Breakdown */}
                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between text-industrial-400">
                    <span>Delivered Batches:</span>
                    <span className="font-mono text-white font-semibold">{sup.totalDeliveries}</span>
                  </div>
                  <div className="flex justify-between text-industrial-400">
                    <span>Missing MTR / CoC:</span>
                    <span className={`font-mono font-semibold ${sup.missingDocsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {sup.missingDocsCount} batches
                    </span>
                  </div>
                  <div className="flex justify-between text-industrial-400">
                    <span>Spec Mismatches:</span>
                    <span className={`font-mono font-semibold ${sup.mismatchCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {sup.mismatchCount} line items
                    </span>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="mt-3 p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80 text-[11px] text-industrial-300">
                  <span className="font-semibold text-industrial-200">Protocol: </span>
                  {sup.recommendation}
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-industrial-800 flex justify-end">
                <button
                  onClick={() => setSelectedSupplier(sup)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Quality Evidence Audit</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Evidence Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-industrial-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-wider">Vendor Quality Dossier</span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">{selectedSupplier.supplierName}</h3>
                <div className="text-xs text-industrial-400">{selectedSupplier.category} &bull; {selectedSupplier.country}</div>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-industrial-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-industrial-950 rounded-lg border border-industrial-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-industrial-400">Composite QA Rating</div>
                  <div className="text-xl font-bold font-mono text-white mt-0.5">{selectedSupplier.overallScore}%</div>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold ${
                  selectedSupplier.riskTier === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' :
                  selectedSupplier.riskTier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {selectedSupplier.arabicRiskTier}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-bold text-industrial-300 uppercase tracking-wider font-mono mb-1.5">
                  Verified Empirical Evidence:
                </div>
                <ul className="space-y-1.5">
                  {selectedSupplier.evidence.map((ev, i) => (
                    <li key={i} className="p-2 bg-industrial-950 rounded border border-industrial-800 text-industrial-300 flex items-start gap-2 text-[11px]">
                      <span className="text-brand-400 font-mono font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-industrial-950 rounded-lg border border-industrial-800">
                <div className="text-[11px] font-bold text-industrial-300 uppercase tracking-wider font-mono mb-1">
                  Advisory Protocol:
                </div>
                <p className="text-industrial-300 text-[11px]">{selectedSupplier.recommendation}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
