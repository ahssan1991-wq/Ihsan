/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Layers, 
  Copy, 
  FileText, 
  RefreshCw, 
  ArrowRight, 
  Check, 
  X, 
  Sparkles,
  Sliders,
  Building2,
  Warehouse
} from 'lucide-react';
import { Material, User, UserRole, DataQualityIssue, DataQualitySeverity } from '../types';
import { scanDataQualityIssues } from '../services/port14Service';
import { dbService } from '../services/dbService';
import { 
  EMISPageHeader, 
  EMISCard, 
  EMISBadge, 
  EMISButton, 
  EMISEmptyState,
  EMISSearchBar,
  EMISDialog
} from './design-system';

interface DataQualityCenterViewProps {
  materials: Material[];
  currentUser: User;
  onUpdateMaterial: (material: Material) => void;
  onInspectMaterial?: (material: Material) => void;
  onNavigateToTab: (tabId: string, search?: string) => void;
}

export default function DataQualityCenterView({
  materials,
  currentUser,
  onUpdateMaterial,
  onInspectMaterial,
  onNavigateToTab
}: DataQualityCenterViewProps) {
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<DataQualitySeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWorkflowIssue, setActiveWorkflowIssue] = useState<DataQualityIssue | null>(null);
  const [fixValue, setFixValue] = useState('');
  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const runScan = () => {
    const detected = scanDataQualityIssues(materials);
    setIssues(detected);
  };

  useEffect(() => {
    runScan();
  }, [materials]);

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const highCount = issues.filter(i => i.severity === 'HIGH').length;
  const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowCount = issues.filter(i => i.severity === 'LOW').length;

  const filteredIssues = issues.filter(issue => {
    if (selectedSeverity !== 'ALL' && issue.severity !== selectedSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        issue.recordTitle.toLowerCase().includes(q) ||
        issue.reason.toLowerCase().includes(q) ||
        issue.suggestedFix.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenWorkflow = (issue: DataQualityIssue) => {
    setActiveWorkflowIssue(issue);
    setFixValue(issue.suggestedValue !== undefined ? String(issue.suggestedValue) : '');
  };

  const handleApplyFix = () => {
    if (!activeWorkflowIssue) return;

    // Find the material to update
    const targetMat = materials.find(m => m.partNumber === activeWorkflowIssue.recordId);
    if (targetMat && activeWorkflowIssue.field) {
      const updated: Material = {
        ...targetMat,
        [activeWorkflowIssue.field]: activeWorkflowIssue.field === 'quantity' ? Number(fixValue) : fixValue
      };
      onUpdateMaterial(updated);

      // Record audit in dbService
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Data Quality Engine: Corrected ${targetMat.partNumber} field [${activeWorkflowIssue.field}] to "${fixValue}"`
      });

      setAuditMessage(`Fixed issue on ${targetMat.partNumber} and logged to audit.`);
      setTimeout(() => setAuditMessage(null), 4000);
    }

    // Remove resolved issue
    setIssues(prev => prev.filter(i => i.id !== activeWorkflowIssue.id));
    setActiveWorkflowIssue(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <EMISPageHeader
        title="EMIS Data Quality Center"
        subtitle="Automated anomaly detection, duplicate intelligence, catalog completeness audits, and corrective engineering workflows."
        badge="Port 14 Quality"
        icon={ShieldCheck}
        actions={
          <EMISButton
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={runScan}
          >
            Re-scan Catalog
          </EMISButton>
        }
      />

      {/* Success Audit Banner */}
      {auditMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{auditMessage}</span>
          </div>
          <button onClick={() => setAuditMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">Critical Defects</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{criticalCount}</p>
          <span className="text-[10px] text-industrial-400">Duplicates & missing PNs</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'HIGH'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">High Severity</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{highCount}</p>
          <span className="text-[10px] text-industrial-400">Missing manufacturer</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'MEDIUM'
              ? 'bg-yellow-950/40 border-yellow-500 ring-2 ring-yellow-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-yellow-300">Medium</span>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{mediumCount}</p>
          <span className="text-[10px] text-industrial-400">Unassigned location</span>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            selectedSeverity === 'LOW'
              ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/30'
              : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300">Catalog Health</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-mono">
            {materials.length > 0 
              ? `${Math.round(((materials.length - issues.length) / materials.length) * 100)}%` 
              : '100%'}
          </p>
          <span className="text-[10px] text-industrial-400">Clean records ratio</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <EMISSearchBar
          value={searchQuery}
          onChangeValue={setSearchQuery}
          placeholder="Search quality issues..."
          className="w-full sm:w-80"
        />

        {selectedSeverity !== 'ALL' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-industrial-400">Severity:</span>
            <EMISBadge variant="brand" size="sm">
              {selectedSeverity}
            </EMISBadge>
            <button
              onClick={() => setSelectedSeverity('ALL')}
              className="text-xs text-brand-400 hover:text-white cursor-pointer underline"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Issues Table / List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <EMISEmptyState
            icon={CheckCircle2}
            title="Zero Quality Defects Found"
            description="The material catalog conforms fully to technical traceability, unique Part Number constraints, and manufacturer integrity standards."
          />
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 sm:p-5 rounded-2xl border bg-industrial-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                issue.severity === 'CRITICAL'
                  ? 'border-rose-500/30 bg-rose-950/10'
                  : issue.severity === 'HIGH'
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : 'border-industrial-800'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <EMISBadge
                    variant={
                      issue.severity === 'CRITICAL' ? 'danger' :
                      issue.severity === 'HIGH' ? 'warning' : 'neutral'
                    }
                    size="xs"
                  >
                    {issue.type}
                  </EMISBadge>
                  <span className="text-[11px] font-mono text-brand-400 font-semibold">
                    ID: {issue.recordId}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white">
                  {issue.recordTitle}
                </h3>
                <p className="text-xs text-industrial-300">
                  {issue.reason}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <Sparkles className="h-3 w-3" />
                  <span>Suggested Fix: {issue.suggestedFix}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <EMISButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenWorkflow(issue)}
                >
                  Review & Fix
                </EMISButton>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Corrective Workflow Dialog (Port 14 Requirement 59) */}
      {activeWorkflowIssue && (
        <EMISDialog
          isOpen={!!activeWorkflowIssue}
          onClose={() => setActiveWorkflowIssue(null)}
          title="Data Quality Corrective Workflow"
          subtitle={`Issue: ${activeWorkflowIssue.type} • Record: ${activeWorkflowIssue.recordId}`}
          maxWidth="lg"
          actions={
            <>
              <EMISButton
                variant="outline"
                size="sm"
                onClick={() => setActiveWorkflowIssue(null)}
              >
                Cancel
              </EMISButton>
              <EMISButton
                variant="primary"
                size="sm"
                icon={Check}
                onClick={handleApplyFix}
              >
                Apply & Record Audit
              </EMISButton>
            </>
          }
        >
          <div className="space-y-4">
            {/* Step 1: Issue & Record */}
            <div className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 text-xs space-y-1">
              <span className="text-industrial-400 font-mono uppercase text-[10px]">Affected Record</span>
              <p className="text-white font-bold text-sm">{activeWorkflowIssue.recordTitle}</p>
              <p className="text-industrial-300">{activeWorkflowIssue.reason}</p>
            </div>

            {/* Step 2: Suggested Fix & Value Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-industrial-200">
                Corrective Value ({activeWorkflowIssue.field || 'Value'})
              </label>
              <input
                type="text"
                value={fixValue}
                onChange={(e) => setFixValue(e.target.value)}
                placeholder="Enter verified value..."
                className="w-full px-3.5 py-2.5 bg-industrial-850 border border-industrial-700 rounded-xl text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[11px] text-industrial-400">
                Suggested default: <span className="font-mono text-brand-300">{String(activeWorkflowIssue.suggestedValue)}</span>
              </p>
            </div>

            {/* Step 3: Audit Sign-off Note */}
            <div className="p-3 rounded-xl bg-brand-950/20 border border-brand-500/20 text-xs text-brand-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Audited Mutation</span>
              </p>
              <p className="text-[11px] text-industrial-300">
                Applying this fix will immediately update the catalog record and write an append-only audit record stamped with your credentials ({currentUser.name}, {currentUser.role}).
              </p>
            </div>
          </div>
        </EMISDialog>
      )}
    </div>
  );
}
