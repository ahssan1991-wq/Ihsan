/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Sparkles,
  FileText,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  FileCheck,
  Clock,
  UserCheck,
  Check,
  X,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { 
  CrossVerificationMatrixRow, 
  TechnicalConflict, 
  AIEvidenceItem, 
  User, 
  ConflictSeverity,
  MaterialVerificationReport,
  WebSearchSource
} from '../../types';
import { normalizeEngineeringUnits } from '../../services/aiProviderService';

interface VerificationMatrixTabProps {
  currentUser: User;
  partNumber: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  description: string;
  mrNumber: string;
  poNumber: string;
  matrixRows: CrossVerificationMatrixRow[];
  conflicts: TechnicalConflict[];
  evidence: AIEvidenceItem[];
  sources: WebSearchSource[];
  confidenceScore: number;
  technicalMatchScore: number;
  recommendation: string;
  isLoading: boolean;
  onRunFullVerification: () => void;
  onEngineerDecision: (decision: 'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION', comments: string) => void;
  onCreateReport: () => void;
}

export const VerificationMatrixTab: React.FC<VerificationMatrixTabProps> = ({
  currentUser,
  partNumber,
  manufacturer,
  model,
  serialNumber,
  description,
  mrNumber,
  poNumber,
  matrixRows,
  conflicts,
  evidence,
  sources,
  confidenceScore,
  technicalMatchScore,
  recommendation,
  isLoading,
  onRunFullVerification,
  onEngineerDecision,
  onCreateReport
}) => {
  const [selectedConflict, setSelectedConflict] = useState<TechnicalConflict | null>(null);
  const [engineerComment, setEngineerComment] = useState<string>('');
  const [decisionModalOpen, setDecisionModalOpen] = useState<boolean>(false);
  const [activeDecisionType, setActiveDecisionType] = useState<'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION'>('ACCEPT');
  const [showUnitNormalizer, setShowUnitNormalizer] = useState<boolean>(false);
  const [normField, setNormField] = useState<string>('Process Pressure');
  const [normVal1, setNormVal1] = useState<string>('275.8 bar');
  const [normVal2, setNormVal2] = useState<string>('4000 psi');

  const normalizedResult = normalizeEngineeringUnits(normField, normVal1, normVal2);

  const getSeverityBadge = (sev: ConflictSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'MAJOR':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'MINOR':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'INFORMATIONAL':
      default:
        return 'bg-industrial-500/10 text-industrial-600 dark:text-industrial-400 border-industrial-500/30';
    }
  };

  const getResultBadge = (res: string) => {
    switch (res) {
      case 'MATCH':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'MISMATCH':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'INSUFFICIENT_DATA':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-industrial-500/10 text-industrial-500 border-industrial-500/30';
    }
  };

  const getConfidenceTier = (score: number) => {
    if (score >= 90) return { label: 'Tier 1 - High Verification Confidence', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (score >= 75) return { label: 'Tier 2 - Moderate Verification Confidence', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' };
    if (score >= 50) return { label: 'Tier 3 - Advisory Verification Confidence', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'Tier 4 - Critical Discrepancy / Inconclusive', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' };
  };

  const tier = getConfidenceTier(confidenceScore);

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Overall Confidence Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-industrial-500 font-semibold mb-1">
              <span>IDENTIFICATION CONFIDENCE</span>
              <span className="font-mono">{confidenceScore}%</span>
            </div>
            <div className="w-full bg-industrial-100 dark:bg-industrial-800 h-2.5 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  confidenceScore >= 85 ? 'bg-emerald-500' : confidenceScore >= 70 ? 'bg-blue-500' : confidenceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, confidenceScore))}%` }}
              />
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${tier.bg} ${tier.color} inline-block`}>
              {tier.label}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-industrial-100 dark:border-industrial-800 text-[11px] text-industrial-500">
            Rule Match: {technicalMatchScore}% • Conflict Count: {conflicts.length}
          </div>
        </div>

        {/* Advisory Verdict Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <h3 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">AI Advisory Recommendation</h3>
            </div>
            <p className="text-xs text-industrial-600 dark:text-industrial-300 leading-relaxed">
              {recommendation || 'Full multi-document verification has not been run yet. Click "Run Full Verification" to compare MR, PO, Nameplate, and OEM Datasheet.'}
            </p>
          </div>
          <div className="mt-3 pt-2 text-[11px] text-industrial-400 italic">
            * Advisory Rule: AI analysis is advisory. Final technical acceptance remains the responsibility of the authorized engineer.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col justify-center gap-2.5">
          <button
            onClick={onRunFullVerification}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing Documents...' : 'Run Full Verification'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setActiveDecisionType('ACCEPT');
                setDecisionModalOpen(true);
              }}
              className="py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Engineer Accept</span>
            </button>
            <button
              onClick={() => {
                setActiveDecisionType('HOLD');
                setDecisionModalOpen(true);
              }}
              className="py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Hold / Review</span>
            </button>
          </div>

          <button
            onClick={onCreateReport}
            className="py-2 px-3 rounded-xl bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 dark:hover:bg-industrial-750 text-industrial-700 dark:text-industrial-200 text-xs font-bold border border-industrial-200 dark:border-industrial-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileCheck className="h-3.5 w-3.5 text-blue-500" />
            <span>Generate Official Report</span>
          </button>
        </div>
      </div>

      {/* Conflicts & Discrepancies Panel (if any) */}
      {conflicts.length > 0 && (
        <div className="p-5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
                Technical Conflicts Detected ({conflicts.length})
              </h3>
            </div>
            <span className="text-xs text-red-500 font-mono">Requires Resolution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conflicts.map((conf) => (
              <div 
                key={conf.id}
                className="p-3.5 rounded-xl bg-white dark:bg-industrial-850 border border-red-500/20 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-industrial-900 dark:text-white">{conf.field}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getSeverityBadge(conf.severity)}`}>
                    {conf.severity}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-industrial-50 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-750">
                    <span className="text-[10px] text-industrial-400 block font-semibold">Expected ({conf.expectedSource}):</span>
                    <span className="font-mono text-industrial-800 dark:text-industrial-200">{conf.expectedValue}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                    <span className="text-[10px] text-red-500 block font-semibold">Actual ({conf.actualSource}):</span>
                    <span className="font-mono text-red-600 dark:text-red-400">{conf.actualValue}</span>
                  </div>
                </div>
                <p className="text-xs text-industrial-500 dark:text-industrial-400">
                  <strong>Impact:</strong> {conf.impact}
                </p>
                <p className="text-xs text-brand-600 dark:text-brand-400">
                  <strong>Recommended Action:</strong> {conf.recommendedAction}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Verification Matrix Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-500" />
            <h2 className="text-sm font-bold text-industrial-900 dark:text-white">
              Multi-Document Cross-Verification Matrix
            </h2>
          </div>

          <button
            onClick={() => setShowUnitNormalizer(!showUnitNormalizer)}
            className="text-xs text-industrial-600 dark:text-industrial-300 hover:text-brand-500 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-brand-500" />
            <span>{showUnitNormalizer ? 'Hide Unit Normalizer' : 'Open Unit Normalizer'}</span>
          </button>
        </div>

        {/* Unit Normalizer Tool (Collapsible) */}
        {showUnitNormalizer && (
          <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 space-y-3">
            <h4 className="text-xs font-bold text-industrial-900 dark:text-white flex items-center gap-1.5">
              <Info className="h-4 w-4 text-blue-500" />
              <span>Unit & Spec Normalization Calculator (bar/psi/kPa, °C/°F, 4-20mA HART)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-industrial-500 block mb-1">Parameter Field</label>
                <input
                  type="text"
                  value={normField}
                  onChange={(e) => setNormField(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-industrial-300 dark:border-industrial-600 bg-white dark:bg-industrial-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-industrial-500 block mb-1">Source Value 1</label>
                <input
                  type="text"
                  value={normVal1}
                  onChange={(e) => setNormVal1(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-industrial-300 dark:border-industrial-600 bg-white dark:bg-industrial-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-industrial-500 block mb-1">Source Value 2</label>
                <input
                  type="text"
                  value={normVal2}
                  onChange={(e) => setNormVal2(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-industrial-300 dark:border-industrial-600 bg-white dark:bg-industrial-900"
                />
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-industrial-700 dark:text-industrial-300">Equivalence Verdict:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${normalizedResult.isMatch ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {normalizedResult.isMatch ? 'EQUIVALENT MATCH' : 'DISCREPANCY'}
                </span>
                <span className="text-industrial-500">({normalizedResult.notes})</span>
              </div>
              <span className="text-[11px] font-mono text-industrial-400">
                {normalizedResult.normalizedVal1} vs {normalizedResult.normalizedVal2}
              </span>
            </div>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-750">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-industrial-50 dark:bg-industrial-800/80 text-industrial-600 dark:text-industrial-300 border-b border-industrial-200 dark:border-industrial-750">
                <th className="p-3 font-semibold">Parameter / Field</th>
                <th className="p-3 font-semibold">MR Document</th>
                <th className="p-3 font-semibold">PO Document</th>
                <th className="p-3 font-semibold">Physical Nameplate</th>
                <th className="p-3 font-semibold">OEM Datasheet</th>
                <th className="p-3 font-semibold">Cert of Conformity (CoC)</th>
                <th className="p-3 font-semibold text-center">Cross Result</th>
                <th className="p-3 font-semibold">Engineering Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
              {matrixRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40">
                  <td className="p-3 font-bold text-industrial-900 dark:text-white whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="p-3 font-mono text-industrial-700 dark:text-industrial-300">
                    {row.mrValue || <span className="text-industrial-400 italic">N/A</span>}
                  </td>
                  <td className="p-3 font-mono text-industrial-700 dark:text-industrial-300">
                    {row.poValue || <span className="text-industrial-400 italic">N/A</span>}
                  </td>
                  <td className="p-3 font-mono text-industrial-700 dark:text-industrial-300 font-semibold text-brand-600 dark:text-brand-400">
                    {row.nameplateValue || <span className="text-industrial-400 italic">N/A</span>}
                  </td>
                  <td className="p-3 font-mono text-industrial-700 dark:text-industrial-300">
                    {row.datasheetValue || <span className="text-industrial-400 italic">N/A</span>}
                  </td>
                  <td className="p-3 font-mono text-industrial-700 dark:text-industrial-300">
                    {row.cocValue || <span className="text-industrial-400 italic">N/A</span>}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getResultBadge(row.result)}`}>
                      {row.result}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-industrial-500 dark:text-industrial-400 max-w-xs">
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sourced Evidence & Verified Web References */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evidence List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">
              Document Evidence Items ({evidence.length})
            </h3>
          </div>

          <div className="space-y-2">
            {evidence.map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-industrial-900 dark:text-white">{ev.parameter}:</span>
                    <span className="font-mono text-industrial-700 dark:text-industrial-300">{ev.actualValue}</span>
                  </div>
                  <span className="text-[10px] text-industrial-400 block mt-0.5">
                    Source: {ev.sourceTitle} ({ev.sourceType})
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ev.status === 'MATCH' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                  {ev.confidence}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Web Sources & Quality Level */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-blue-500" />
            <h3 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">
              OEM & Distributor Sources
            </h3>
          </div>

          <div className="space-y-2">
            {sources.map((src, idx) => (
              <a
                key={idx}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-xs block hover:border-brand-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-industrial-900 dark:text-white truncate">{src.title}</span>
                  <span className="text-[10px] font-semibold text-blue-500">{src.website}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {src.isOfficialManufacturer ? 'Level 1: Official Manufacturer' : 'Level 4: Distributor / Catalog'}
                  </span>
                  <span className="text-[10px] text-industrial-400 font-mono">Relevance: {src.relevance}%</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Engineer Decision Modal */}
      {decisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand-500" />
                <span>Record Engineer Decision</span>
              </h3>
              <button 
                onClick={() => setDecisionModalOpen(false)}
                className="p-1 rounded-lg text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Decision Action</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ACCEPT', 'HOLD', 'REJECT', 'REQUEST_MORE_INFORMATION'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveDecisionType(type)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                        activeDecisionType === type
                          ? type === 'ACCEPT' ? 'bg-emerald-500 text-white border-emerald-600' : type === 'REJECT' ? 'bg-red-500 text-white border-red-600' : 'bg-amber-500 text-white border-amber-600'
                          : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                  Engineering Rationale / Technical Comments
                </label>
                <textarea
                  rows={3}
                  value={engineerComment}
                  onChange={(e) => setEngineerComment(e.target.value)}
                  placeholder="Enter technical justification, plant loop application notes, or missing document conditions..."
                  className="w-full text-xs p-3 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 text-[11px] text-industrial-500">
                Signing as: <strong>{currentUser.name}</strong> ({currentUser.role})
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100 dark:hover:bg-industrial-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onEngineerDecision(activeDecisionType, engineerComment);
                  setDecisionModalOpen(false);
                }}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-xs"
              >
                Confirm & Record Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
