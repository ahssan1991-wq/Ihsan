/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Building2,
  Layers,
  Cpu,
  ShieldCheck,
  History,
  QrCode,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Warehouse,
  FileCheck
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { User, Material, ExternalMaterial } from '../types';

interface MaterialTraceabilityViewProps {
  currentUser: User;
  initialPartNumber?: string;
  onNavigateToVerification?: (partNumber: string) => void;
  onNavigateToDocuments?: (partNumber: string) => void;
}

export const MaterialTraceabilityView: React.FC<MaterialTraceabilityViewProps> = ({
  currentUser,
  initialPartNumber = 'PT-3051S-01',
  onNavigateToVerification,
  onNavigateToDocuments
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialPartNumber);
  const [selectedPartNumber, setSelectedPartNumber] = useState<string>(initialPartNumber);

  // Get traceability graph for the selected part number
  const traceData = useMemo(() => {
    if (!selectedPartNumber) return null;
    return dbService.getMaterialTraceability(selectedPartNumber);
  }, [selectedPartNumber]);

  // Quick suggestions list
  const suggestedMaterials = useMemo(() => {
    const station = dbService.getMaterials().slice(0, 4).map(m => m.partNumber);
    const external = dbService.getExternalMaterials().slice(0, 3).map(m => m.partNumber);
    return Array.from(new Set([...station, ...external]));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedPartNumber(searchQuery.trim());
    }
  };

  const h = traceData?.hierarchy;

  return (
    <div className="space-y-6" id="material-traceability-view">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/30">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-industrial-900 dark:text-white">Material Traceability Engine</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-semibold">
                v0.4 End-to-End Lineage
              </span>
            </div>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Comprehensive visual provenance graph connecting OEM specifications, procurement orders, storage locations, plant loops, and QA compliance.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-industrial-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Part Number or S/N..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-industrial-50 dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            Trace
          </button>
        </form>
      </div>

      {/* Suggested Quick Trace Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-industrial-400 font-semibold flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Quick Select:</span>
        </span>
        {suggestedMaterials.map(pn => (
          <button
            key={pn}
            onClick={() => {
              setSearchQuery(pn);
              setSelectedPartNumber(pn);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              selectedPartNumber === pn
                ? 'bg-brand-600 text-white font-bold'
                : 'bg-white dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border border-industrial-200 dark:border-industrial-750 hover:bg-industrial-100'
            }`}
          >
            {pn}
          </button>
        ))}
      </div>

      {/* Traceability Content */}
      {traceData && h ? (
        <div className="space-y-6">
          {/* Blacklist Critical Alert Banner if present */}
          {h.blacklistAlert && (
            <div className="p-4 rounded-2xl bg-black text-white border-2 border-red-500 flex items-start gap-3 shadow-lg animate-pulse">
              <AlertOctagon className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
                  CRITICAL SECURITY ALERT: ITEM ON BLACKLIST REGISTRY
                </h3>
                <p className="text-xs text-industrial-300 mt-1">
                  Reason: <span className="text-white font-semibold">{h.blacklistAlert.reason}</span> • Supplier: {h.blacklistAlert.supplier}
                </p>
                <p className="text-[11px] text-industrial-400 mt-0.5">
                  Reported on {new Date(h.blacklistAlert.reportedDate).toLocaleDateString()} - Mandatory quarantine protocol in effect.
                </p>
              </div>
            </div>
          )}

          {/* Primary Material Summary Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-industrial-200 dark:border-industrial-750">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold text-industrial-900 dark:text-white">
                    {h.partNumber}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    traceData.sourceType === 'STATION_MATERIAL'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : traceData.sourceType === 'EXTERNAL_STOCK'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'bg-industrial-500/10 text-industrial-400'
                  }`}>
                    {traceData.sourceType === 'STATION_MATERIAL' ? 'Station Materials Ledger' : traceData.sourceType === 'EXTERNAL_STOCK' ? 'External Company Catalog' : 'Unregistered Query'}
                  </span>
                </div>
                <p className="text-sm text-industrial-700 dark:text-industrial-300 mt-1 font-medium">
                  {h.materialName}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {onNavigateToVerification && (
                  <button
                    onClick={() => onNavigateToVerification(h.partNumber)}
                    className="px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Run Verification</span>
                  </button>
                )}
                {onNavigateToDocuments && (
                  <button
                    onClick={() => onNavigateToDocuments(h.partNumber)}
                    className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View Docs ({h.documents.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hierarchical Provenance Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Node 1: OEM & Specs */}
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-900/60 border border-industrial-200 dark:border-industrial-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-700 dark:text-industrial-300">
                  <Cpu className="h-4 w-4 text-brand-500" />
                  <span>1. OEM & Specs</span>
                </div>
                <div className="text-xs space-y-1">
                  <div><span className="text-industrial-400">Manufacturer:</span> <span className="font-semibold text-industrial-900 dark:text-white">{h.manufacturer}</span></div>
                  <div><span className="text-industrial-400">Model:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.model}</span></div>
                  <div><span className="text-industrial-400">Serial No:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.serialNumber}</span></div>
                </div>
              </div>

              {/* Node 2: Procurement */}
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-900/60 border border-industrial-200 dark:border-industrial-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-700 dark:text-industrial-300">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span>2. Procurement & Orders</span>
                </div>
                <div className="text-xs space-y-1">
                  <div><span className="text-industrial-400">MR / MRF:</span> <span className="font-mono font-semibold text-industrial-900 dark:text-white">{h.mrNumber}</span></div>
                  <div><span className="text-industrial-400">PO:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.purchaseOrder}</span></div>
                  <div><span className="text-industrial-400">WO:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.workOrder}</span></div>
                  <div><span className="text-industrial-400">Supplier:</span> <span className="text-industrial-800 dark:text-industrial-200">{h.supplier}</span></div>
                </div>
              </div>

              {/* Node 3: Physical Location */}
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-900/60 border border-industrial-200 dark:border-industrial-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-700 dark:text-industrial-300">
                  <Warehouse className="h-4 w-4 text-emerald-500" />
                  <span>3. Storage & Coordinates</span>
                </div>
                <div className="text-xs space-y-1">
                  <div><span className="text-industrial-400">Warehouse:</span> <span className="font-semibold text-industrial-900 dark:text-white">{h.warehouse}</span></div>
                  <div><span className="text-industrial-400">Store / Bin:</span> <span className="text-industrial-800 dark:text-industrial-200">{h.storageStore}</span></div>
                  <div><span className="text-industrial-400">Rack / Shelf:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.rack} / {h.shelf}</span></div>
                  <div><span className="text-industrial-400">Source File:</span> <span className="text-industrial-500 text-[11px] truncate block">{h.sourceFileName}</span></div>
                </div>
              </div>

              {/* Node 4: Excel Row Mapping */}
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-900/60 border border-industrial-200 dark:border-industrial-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-industrial-700 dark:text-industrial-300">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  <span>4. Master Row Tracking</span>
                </div>
                <div className="text-xs space-y-1">
                  <div><span className="text-industrial-400">Exact Excel Row:</span> <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{h.originalExcelRow}</span></div>
                  <div><span className="text-industrial-400">Sequence Index:</span> <span className="font-mono text-industrial-800 dark:text-industrial-200">{h.originalSequence}</span></div>
                  <div><span className="text-industrial-400">Active Station Link:</span> <span className="text-industrial-800 dark:text-industrial-200">{traceData.sourceType === 'STATION_MATERIAL' ? 'Direct Primary' : 'External Isolated'}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Plant Equipment Loops & Engineering Decisions Dual Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compatible Plant Loops */}
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  <span>Compatible Plant Equipment Loops ({h.equipmentLoops.length})</span>
                </h3>
              </div>

              {h.equipmentLoops.length === 0 ? (
                <p className="text-xs text-industrial-400 py-6 text-center">No mapped plant equipment loops for this part.</p>
              ) : (
                <div className="space-y-2">
                  {h.equipmentLoops.map(eq => (
                    <div key={eq.tagNumber} className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-900/50 border border-industrial-200 dark:border-industrial-800 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-industrial-900 dark:text-white">{eq.tagNumber}</span>
                        <p className="text-[11px] text-industrial-500">{eq.name} ({eq.plant})</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Technical Documents & Certificates */}
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-500" />
                  <span>Technical Documents & Certificates ({h.documents.length})</span>
                </h3>
              </div>

              {h.documents.length === 0 ? (
                <p className="text-xs text-industrial-400 py-6 text-center">No attached technical documentation found in registry.</p>
              ) : (
                <div className="space-y-2">
                  {h.documents.map(doc => (
                    <div key={doc.id} className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-900/50 border border-industrial-200 dark:border-industrial-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-industrial-900 dark:text-white">{doc.name}</span>
                        <p className="text-[11px] text-industrial-500 font-mono">{doc.type} • {doc.fileName}</p>
                      </div>
                      <span className="text-[10px] text-industrial-400 font-mono">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-brand-500" />
              <span>Full Audit Trail & Movement History</span>
            </h3>

            {h.activities.length === 0 ? (
              <p className="text-xs text-industrial-400 py-4 text-center">No explicit activity records linked to this part number.</p>
            ) : (
              <div className="divide-y divide-industrial-200 dark:divide-industrial-800">
                {h.activities.map(act => (
                  <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-industrial-900 dark:text-white">{act.userName}</span>
                      <span className="text-industrial-400 ml-2 font-mono text-[10px]">[{act.action.toUpperCase()}]</span>
                      <p className="text-industrial-600 dark:text-industrial-300 mt-0.5">{act.details}</p>
                    </div>
                    <span className="text-[11px] font-mono text-industrial-400 shrink-0">
                      {new Date(act.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 text-industrial-400">
          <Info className="h-8 w-8 mx-auto mb-2 text-industrial-300" />
          <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">No material selected for traceability</p>
          <p className="text-xs mt-1">Enter a part number above to generate the full end-to-end lineage graph.</p>
        </div>
      )}
    </div>
  );
};
