/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  FileText, 
  Search, 
  Filter, 
  Info, 
  ChevronRight, 
  ExternalLink,
  CheckCircle,
  XCircle,
  HelpCircle,
  Package,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Material, MaterialHealthScore } from '../../types';
import { dbService } from '../../services/dbService';

interface MaterialIntelligenceTabProps {
  materials: Material[];
  selectedSite: string;
  onOpenMaterialModal?: (material: Material) => void;
  onSelectForTransfer?: (material: Material) => void;
}

export default function MaterialIntelligenceTab({
  materials = [],
  selectedSite,
  onOpenMaterialModal,
  onSelectForTransfer
}: MaterialIntelligenceTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'HEALTHY' | 'ATTENTION' | 'HIGH_RISK' | 'CRITICAL'>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [healthModalScore, setHealthModalScore] = useState<MaterialHealthScore | null>(null);

  const safeMaterials = Array.isArray(materials) ? materials : (dbService.getMaterials() || []);
  const filteredMaterials = safeMaterials.filter(m => {
    if (selectedSite !== 'ALL' && m.store !== selectedSite) return false;
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPn = m.partNumber.toLowerCase().includes(q);
      const matchDesc = (m.description || '').toLowerCase().includes(q);
      const matchMfr = (m.manufacturer || '').toLowerCase().includes(q);
      if (!matchPn && !matchDesc && !matchMfr) return false;
    }

    if (gradeFilter !== 'ALL') {
      const scoreObj = dbService.calculateMaterialHealthScore(m);
      if (scoreObj.grade !== gradeFilter) return false;
    }

    return true;
  });

  const handleOpenWhyScore = (material: Material) => {
    const score = dbService.calculateMaterialHealthScore(material);
    setSelectedMaterial(material);
    setHealthModalScore(score);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
              Material Health & Integrity Index
            </h2>
            <p className="text-xs text-industrial-400 mt-1">
              Multi-dimensional evaluation of technical completeness, MTR certificates, purchase order reconciliations, and QA status.
            </p>
          </div>

          {/* Grade Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setGradeFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                gradeFilter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              All ({materials.length})
            </button>
            <button
              onClick={() => setGradeFilter('HEALTHY')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                gradeFilter === 'HEALTHY' ? 'bg-emerald-600 text-white' : 'bg-industrial-950 text-emerald-400 border border-industrial-800'
              }`}
            >
              Healthy (&gt;=85%)
            </button>
            <button
              onClick={() => setGradeFilter('ATTENTION')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                gradeFilter === 'ATTENTION' ? 'bg-amber-600 text-white' : 'bg-industrial-950 text-amber-400 border border-industrial-800'
              }`}
            >
              Needs Review
            </button>
            <button
              onClick={() => setGradeFilter('HIGH_RISK')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                gradeFilter === 'HIGH_RISK' ? 'bg-orange-600 text-white' : 'bg-industrial-950 text-orange-400 border border-industrial-800'
              }`}
            >
              High Risk
            </button>
            <button
              onClick={() => setGradeFilter('CRITICAL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                gradeFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-industrial-950 text-red-400 border border-industrial-800'
              }`}
            >
              Critical Non-Conforming
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <Search className="w-4 h-4 text-industrial-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search material records by Part Number, Description, Manufacturer, or Model..."
            className="w-full pl-10 pr-4 py-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
      </div>

      {/* Materials Health Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-industrial-950 text-industrial-400 uppercase font-mono text-[10px] border-b border-industrial-800">
              <tr>
                <th className="py-3 px-4">Part Number / Description</th>
                <th className="py-3 px-4">Site / Bin</th>
                <th className="py-3 px-4">QA Status</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Evaluation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-industrial-500 font-mono text-xs">
                    No material records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m, idx) => {
                  const health = dbService.calculateMaterialHealthScore(m);
                  const isHealthy = health.grade === 'HEALTHY';
                  const isAttention = health.grade === 'ATTENTION';
                  const isHighRisk = health.grade === 'HIGH_RISK';
                  const isCritical = health.grade === 'CRITICAL';

                  return (
                    <tr key={m.id || (m.sequence !== undefined ? `mat-seq-${m.sequence}` : '') || m.partNumber || `mat-intel-${idx}`} className="hover:bg-industrial-850/50 transition-colors">
                      {/* Part Number & Specs */}
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-white flex items-center gap-1.5">
                          <span>{m.partNumber}</span>
                          {(m.datasheet || (m.documents && Object.keys(m.documents).length > 0)) && (
                            <span className="p-0.5 bg-brand-500/20 text-brand-400 rounded text-[9px]" title="Datasheet Attached">
                              DOC
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-industrial-300 line-clamp-1 max-w-sm mt-0.5">
                          {m.description}
                        </div>
                        <div className="text-[10px] text-industrial-500 font-mono mt-0.5">
                          Mfr: {m.manufacturer || 'OEM'} &bull; Model: {m.model || 'N/A'}
                        </div>
                      </td>

                      {/* Site / Bin */}
                      <td className="py-3 px-4 font-mono">
                        <div className="text-industrial-200 font-semibold">{m.store || 'NDGS'}</div>
                        <div className="text-[10px] text-industrial-500">{m.binLocation || (m.rack ? `Rack ${m.rack} / ${m.shelf}` : 'Bin Unassigned')}</div>
                      </td>

                      {/* QA Status */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          m.inspectionStatus === 'PASSED' || m.inspectionStatus === 'ACCEPTED' || m.status === 'Available'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {m.inspectionStatus || m.status || 'PENDING'}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 font-mono">
                        <div className={`font-bold ${
                          (m.quantity || 0) === 0 ? 'text-red-400' :
                          (m.quantity || 0) <= (m.minStockLevel || 1) ? 'text-yellow-400' :
                          'text-emerald-400'
                        }`}>
                          {m.quantity || 0} {m.unit || 'EA'}
                        </div>
                        <div className="text-[10px] text-industrial-500">Min: {m.minStockLevel || 1}</div>
                      </td>

                      {/* Health Score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-white">{health.overallScore}%</span>
                          <div className="w-16 bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                            <div 
                              className={`h-full rounded-full ${
                                isHealthy ? 'bg-emerald-500' :
                                isAttention ? 'bg-amber-500' :
                                isHighRisk ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${health.overallScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Evaluation Grade */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isHealthy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          isAttention ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          isHighRisk ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {health.arabicGrade}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenWhyScore(m)}
                            className="px-2 py-1 bg-industrial-800 hover:bg-industrial-700 text-brand-400 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Inspect mathematical breakdown"
                          >
                            <Info className="w-3 h-3" />
                            <span>Score Audit</span>
                          </button>
                          {onOpenMaterialModal && (
                            <button
                              onClick={() => onOpenMaterialModal(m)}
                              className="p-1 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white rounded transition-colors cursor-pointer"
                              title="Full Material Record"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Why This Score?" Transparent Modal */}
      {healthModalScore && selectedMaterial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-industrial-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-wider">Health Score Lineage Audit</span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">{selectedMaterial.partNumber}</h3>
                <p className="text-xs text-industrial-400 line-clamp-1">{selectedMaterial.materialDescription}</p>
              </div>
              <button
                onClick={() => setHealthModalScore(null)}
                className="text-industrial-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Total Score Banner */}
            <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-industrial-400 font-medium">Calculated Health Index</div>
                <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                  {healthModalScore.overallScore}/100
                </div>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-bold ${
                healthModalScore.grade === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                healthModalScore.grade === 'ATTENTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                healthModalScore.grade === 'HIGH_RISK' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {healthModalScore.arabicGrade} ({healthModalScore.grade})
              </span>
            </div>

            {/* 6 Dimensions Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="text-[11px] font-bold text-industrial-300 uppercase tracking-wider font-mono">
                Dimensional Breakdown:
              </div>

              {/* 1. Identity */}
              <div className="p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80">
                <div className="flex justify-between font-semibold text-white">
                  <span>1. Technical Identity Completeness</span>
                  <span className="font-mono text-brand-400">
                    {healthModalScore.dimensions.identityCompleteness.score}/{healthModalScore.dimensions.identityCompleteness.max}
                  </span>
                </div>
                <div className="text-[10px] text-industrial-400 mt-1 flex flex-wrap gap-1">
                  {healthModalScore.dimensions.identityCompleteness.factors.map((f, i) => (
                    <span key={i} className="bg-industrial-900 px-1.5 py-0.5 rounded text-emerald-400">✓ {f}</span>
                  ))}
                </div>
              </div>

              {/* 2. Documents */}
              <div className="p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80">
                <div className="flex justify-between font-semibold text-white">
                  <span>2. MTR & Engineering Documents</span>
                  <span className="font-mono text-brand-400">
                    {healthModalScore.dimensions.documentCompleteness.score}/{healthModalScore.dimensions.documentCompleteness.max}
                  </span>
                </div>
                <div className="text-[10px] text-industrial-400 mt-1 flex flex-wrap gap-1">
                  {healthModalScore.dimensions.documentCompleteness.factors.length > 0 ? (
                    healthModalScore.dimensions.documentCompleteness.factors.map((f, i) => (
                      <span key={i} className="bg-industrial-900 px-1.5 py-0.5 rounded text-emerald-400">✓ {f}</span>
                    ))
                  ) : (
                    <span className="text-red-400">✗ No engineering certificates or datasheets attached</span>
                  )}
                </div>
              </div>

              {/* 3. Matching */}
              <div className="p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80">
                <div className="flex justify-between font-semibold text-white">
                  <span>3. MR / PO Cross-Verification</span>
                  <span className="font-mono text-brand-400">
                    {healthModalScore.dimensions.matchingStatus.score}/{healthModalScore.dimensions.matchingStatus.max}
                  </span>
                </div>
                <div className="text-[10px] text-industrial-400 mt-1 flex flex-wrap gap-1">
                  {healthModalScore.dimensions.matchingStatus.factors.map((f, i) => (
                    <span key={i} className="bg-industrial-900 px-1.5 py-0.5 rounded text-emerald-400">✓ {f}</span>
                  ))}
                </div>
              </div>

              {/* 4. Inspection */}
              <div className="p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80">
                <div className="flex justify-between font-semibold text-white">
                  <span>4. QA Receiving Inspection Status</span>
                  <span className="font-mono text-brand-400">
                    {healthModalScore.dimensions.inspectionStatus.score}/{healthModalScore.dimensions.inspectionStatus.max}
                  </span>
                </div>
                <div className="text-[10px] text-industrial-400 mt-1 flex flex-wrap gap-1">
                  {healthModalScore.dimensions.inspectionStatus.factors.map((f, i) => (
                    <span key={i} className="bg-industrial-900 px-1.5 py-0.5 rounded text-emerald-400">✓ {f}</span>
                  ))}
                </div>
              </div>

              {/* 5. Stock & Lifecycle */}
              <div className="p-2.5 bg-industrial-950/60 rounded-lg border border-industrial-800/80 flex justify-between">
                <div>
                  <span className="font-semibold text-white">5. Stock & Lifecycle Buffers</span>
                  <div className="text-[10px] text-industrial-400 mt-0.5">
                    Stock: {healthModalScore.dimensions.stockStatus.score}/10 &bull; Lifecycle: {healthModalScore.dimensions.lifecycleStatus.score}/10
                  </div>
                </div>
                <span className="font-mono text-brand-400">
                  {healthModalScore.dimensions.stockStatus.score + healthModalScore.dimensions.lifecycleStatus.score}/20
                </span>
              </div>
            </div>

            {/* Identified Vulnerabilities / Deficiencies */}
            {healthModalScore.reasons.length > 0 && (
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Deficiencies to Remediate:</span>
                </div>
                <ul className="list-disc list-inside text-industrial-300 text-[11px] space-y-0.5">
                  {healthModalScore.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHealthModalScore(null)}
                className="px-4 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
