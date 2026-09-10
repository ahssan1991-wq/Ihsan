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
  Search,
  Cpu,
  FileCheck,
  GitBranch,
  Building2,
  QrCode,
  Sparkles,
  Info,
  Layers,
  Sliders,
  BookOpen,
  FileText,
  RefreshCw,
  Clock,
  UserCheck
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { 
  User, 
  EngineeringVerificationResult, 
  CrossVerificationMatrixRow, 
  TechnicalConflict, 
  AIEvidenceItem, 
  WebSearchSource,
  MaterialVerificationReport,
  MaterialCandidate,
  AITaskType
} from '../types';
import { VerificationMatrixTab } from './verification/VerificationMatrixTab';
import { UnknownMaterialWorkflow } from './verification/UnknownMaterialWorkflow';
import { VerificationReportsTab } from './verification/VerificationReportsTab';
import { KnowledgeBaseTab } from './verification/KnowledgeBaseTab';
import { AIProviderConfigModal } from './verification/AIProviderConfigModal';
import { executeAIEngineeringTask } from '../services/aiProviderService';

interface EngineeringVerificationViewProps {
  currentUser: User;
  initialPartNumber?: string;
  onNavigateToTraceability?: (partNumber: string) => void;
  onNavigateToDocuments?: (partNumber: string) => void;
}

export const EngineeringVerificationView: React.FC<EngineeringVerificationViewProps> = ({
  currentUser,
  initialPartNumber = '',
  onNavigateToTraceability,
  onNavigateToDocuments
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'unknown' | 'reports' | 'knowledge' | 'rules'>('matrix');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Material Input State
  const [partNumber, setPartNumber] = useState<string>(initialPartNumber || '3051S2TG4A2B11A1AB4');
  const [manufacturer, setManufacturer] = useState<string>('Rosemount / Emerson');
  const [model, setModel] = useState<string>('3051S2TG4A2B11A1AB4');
  const [serialNumber, setSerialNumber] = useState<string>('SN-8842109');
  const [description, setDescription] = useState<string>('Scalable In-Line Coplanar Gage Pressure Transmitter 0-4000 psig');
  const [mrNumber, setMrNumber] = useState<string>('MR-1225-14237');
  const [poNumber, setPoNumber] = useState<string>('PO-2024-8891');

  // AI Verification State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(96);
  const [technicalMatchScore, setTechnicalMatchScore] = useState<number>(98);
  const [recommendation, setRecommendation] = useState<string>(
    'Cross-document analysis indicates 100% parameter alignment across Material Requisition MR-1225-14237, Purchase Order PO-2024-8891, physical laser nameplate engraving, and OEM specification catalog.'
  );

  const [matrixRows, setMatrixRows] = useState<CrossVerificationMatrixRow[]>([
    { field: 'Manufacturer', mrValue: 'Rosemount', poValue: 'Emerson / Rosemount', nameplateValue: 'Rosemount / Emerson', datasheetValue: 'Emerson Process Management', cocValue: 'Emerson', result: 'MATCH', notes: 'OEM matched across all documents' },
    { field: 'Model / Part Number', mrValue: '3051S2TG4A2B11A1AB4', poValue: '3051S2TG4A2B11A1AB4', nameplateValue: '3051S2TG4A2B11A1AB4', datasheetValue: '3051S Series', cocValue: '3051S2TG4A2B11A1AB4', result: 'MATCH', notes: 'Exact part number match' },
    { field: 'Pressure Range', mrValue: '0-4000 PSI', poValue: '0-4000 PSI', nameplateValue: '0-4000 PSI', datasheetValue: '0-4000 psig (275.8 bar)', cocValue: '0-4000 PSI', result: 'MATCH', notes: 'Pressure limits equivalent' },
    { field: 'Protocol / Output', mrValue: '4-20mA HART', poValue: '4-20mA HART', nameplateValue: '4-20mA HART', datasheetValue: '4-20mA HART 7', cocValue: 'HART Protocol', result: 'MATCH', notes: 'Protocol confirmed' },
    { field: 'Hazardous Area Rating', mrValue: 'ATEX Ex ia IIC T4', poValue: 'ATEX Ex ia IIC T4', nameplateValue: 'ATEX Ex ia IIC T4 Ga', datasheetValue: 'ATEX/IECEx Ex ia IIC T4', cocValue: 'ATEX Directive 2014/34/EU', result: 'MATCH', notes: 'Zone 0/1 explosion proof rating verified' }
  ]);

  const [conflicts, setConflicts] = useState<TechnicalConflict[]>([]);
  const [evidence, setEvidence] = useState<AIEvidenceItem[]>([
    {
      id: 'ev-1',
      type: 'NAMEPLATE',
      parameter: 'Model / Part Number',
      actualValue: '3051S2TG4A2B11A1AB4',
      sourceTitle: 'Nameplate Optical Scan',
      sourceType: 'Physical Nameplate Scan',
      sourceQualityLevel: 1,
      confidence: 99,
      status: 'MATCH',
      isVerifiedByEngineer: true
    },
    {
      id: 'ev-2',
      type: 'COC',
      parameter: 'Factory Test Certificate',
      actualValue: 'ISO 9001:2015 & ATEX Ex ia',
      sourceTitle: 'Factory Certificate of Conformity',
      sourceType: 'Official OEM PDF Document',
      sourceQualityLevel: 2,
      confidence: 98,
      status: 'MATCH',
      isVerifiedByEngineer: true
    }
  ]);

  const [sources, setSources] = useState<WebSearchSource[]>([
    {
      source: 'Emerson Official Catalog',
      title: 'Rosemount 3051S Technical Overview & Datasheet',
      url: 'https://www.emerson.com/en-us/catalog/rosemount-3051s-coplanar-pressure-transmitter',
      website: 'emerson.com',
      relevance: 99,
      isOfficialManufacturer: true
    }
  ]);

  // Legacy Rule-based verification result
  const [ruleResult, setRuleResult] = useState<EngineeringVerificationResult | null>(() => {
    return dbService.verifyMaterial({
      partNumber: partNumber || 'PT-3051S-01',
      manufacturer,
      model,
      serialNumber,
      description
    }, currentUser.name);
  });

  const handleRunRuleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = dbService.verifyMaterial({
      partNumber: partNumber.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      description: description.trim()
    }, currentUser.name);
    setRuleResult(res);
  };

  const handleRunFullVerification = async () => {
    setIsLoading(true);
    try {
      const res = await executeAIEngineeringTask(
        AITaskType.DOCUMENT_ANALYSIS,
        {
          material: {
            partNumber,
            manufacturer,
            model,
            serialNumber,
            description
          },
          mrNumber,
          poNumber
        }
      );

      if (res.success && res.data) {
        const d = res.data;
        setConfidenceScore(d.confidence || 95);
        setTechnicalMatchScore(d.technicalMatchScore || 96);
        setRecommendation(d.recommendationSummary || d.recommendation || 'Multi-document verification completed successfully.');
      }
    } catch (e) {
      console.warn("Full verification run error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEngineerDecision = (
    decision: 'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION',
    comments: string
  ) => {
    const reportId = `rep-vr-${Date.now()}`;
    const reportNumber = `EMIS-VR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newReport: MaterialVerificationReport = {
      id: reportId,
      reportNumber,
      partNumber,
      status: decision === 'ACCEPT' ? 'FINAL' : 'UNDER_REVIEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      materialInfo: {
        partNumber,
        manufacturer,
        model,
        description,
        serialNumber
      },
      mrData: { mrNumber, requestedModel: model },
      poData: { poNumber, orderedModel: model },
      crossMatrix: matrixRows,
      conflicts,
      missingDocuments: [],
      evidence,
      sources,
      recommendation,
      engineerDecision: {
        decision,
        reviewer: `${currentUser.name} (${currentUser.role})`,
        date: new Date().toISOString(),
        comments
      },
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: currentUser.name,
          userRole: currentUser.role,
          action: decision === 'ACCEPT' ? 'Material Accepted' : decision === 'REJECT' ? 'Material Rejected' : 'Status Changed',
          entity: 'Material',
          entityId: partNumber,
          reason: comments
        }
      ],
      finalizedBy: decision === 'ACCEPT' ? currentUser.name : undefined,
      finalizedDate: decision === 'ACCEPT' ? new Date().toISOString() : undefined
    };

    dbService.addVerificationReport(newReport, currentUser);
    setActiveTab('reports');
  };

  const handleCreateReport = () => {
    handleEngineerDecision('ACCEPT', 'Automated Verification Report generation signed off.');
  };

  return (
    <div className="space-y-6" id="engineering-verification-view">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-industrial-900 dark:text-white">
                Engineering Verification & Intelligence Engine
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30 font-bold">
                EMIS v0.6 AI Core
              </span>
            </div>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Live multi-document cross-verification (MR, PO, Delivery Note, Nameplate, Datasheet, CoC), conflict analysis, and OEM intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-200 text-xs font-bold border border-industrial-200 dark:border-industrial-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5 text-brand-500" />
            <span>AI Provider Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-industrial-200 dark:border-industrial-750 pb-2 overflow-x-auto">
        {[
          { id: 'matrix', label: 'Cross-Verification Matrix', icon: Layers },
          { id: 'unknown', label: 'Unknown Material Recovery', icon: HelpCircle },
          { id: 'reports', label: 'Verification Reports Vault', icon: FileCheck },
          { id: 'knowledge', label: 'OEM Knowledge Base', icon: BookOpen },
          { id: 'rules', label: 'Rule-Based QA Checker', icon: Cpu }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100 dark:hover:bg-industrial-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'matrix' && (
        <VerificationMatrixTab
          currentUser={currentUser}
          partNumber={partNumber}
          manufacturer={manufacturer}
          model={model}
          serialNumber={serialNumber}
          description={description}
          mrNumber={mrNumber}
          poNumber={poNumber}
          matrixRows={matrixRows}
          conflicts={conflicts}
          evidence={evidence}
          sources={sources}
          confidenceScore={confidenceScore}
          technicalMatchScore={technicalMatchScore}
          recommendation={recommendation}
          isLoading={isLoading}
          onRunFullVerification={handleRunFullVerification}
          onEngineerDecision={handleEngineerDecision}
          onCreateReport={handleCreateReport}
        />
      )}

      {activeTab === 'unknown' && (
        <UnknownMaterialWorkflow
          currentUser={currentUser}
          onMaterialAddedToLedger={(pNum) => {
            setPartNumber(pNum);
            setActiveTab('matrix');
          }}
          onStartVerificationForCandidate={(cand: MaterialCandidate) => {
            setPartNumber(cand.possiblePartNumber || cand.model);
            setManufacturer(cand.manufacturer);
            setModel(cand.model);
            setDescription(cand.technicalDescription);
            setActiveTab('matrix');
          }}
        />
      )}

      {activeTab === 'reports' && (
        <VerificationReportsTab currentUser={currentUser} />
      )}

      {activeTab === 'knowledge' && (
        <KnowledgeBaseTab currentUser={currentUser} />
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Form */}
          <form onSubmit={handleRunRuleVerify} className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-500" />
              <span>Direct Rule-Based Ledger Verification Checks</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-industrial-800 dark:text-industrial-200 mb-1">
                  Part Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. PT-3051S-01"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                  Manufacturer / OEM
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Rosemount / Emerson"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                  Model / Specification
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. 3051S2CD2A2E11A1A"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Execute Rule Verification</span>
              </button>
            </div>
          </form>

          {/* Rule Verification Result Display */}
          {ruleResult && (
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white">
                  Verification Status: {ruleResult.status}
                </h3>
                <span className="text-xs font-mono font-bold">
                  Compliance Score: {ruleResult.complianceScore}%
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ruleResult.checks.map((chk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-industrial-900 dark:text-white">{chk.name}</div>
                      <div className="text-industrial-500 text-[11px]">{chk.details}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${chk.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {chk.passed ? 'PASSED' : 'FLAGGED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Provider Config Modal */}
      <AIProviderConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};
