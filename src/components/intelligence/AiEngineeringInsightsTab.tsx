/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Layers, 
  Info,
  Clock,
  Cpu
} from 'lucide-react';
import { AiEngineeringInsight, User } from '../../types';
import { dbService } from '../../services/dbService';

interface AiEngineeringInsightsTabProps {
  selectedSite: string;
  currentUser: User;
}

export default function AiEngineeringInsightsTab({
  selectedSite,
  currentUser
}: AiEngineeringInsightsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestInsight, setLatestInsight] = useState<AiEngineeringInsight | null>(() => {
    const list = dbService.getAiInsights(selectedSite);
    return list.length > 0 ? list[0] : null;
  });

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const metrics = dbService.getEngineeringKpis(selectedSite);
      const shortages = dbService.getCrossSiteOpportunities(selectedSite);
      const agingInspection = dbService.getAgingAnalysis('INSPECTION', selectedSite);
      const agingApproval = dbService.getAgingAnalysis('APPROVAL', selectedSite);
      const suppliers = dbService.getSupplierRiskProfiles();

      const response = await fetch('/api/gemini/engineering-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: selectedSite,
          dateRange: 'CURRENT_OPERATIONAL_CYCLE',
          metrics: metrics.map(k => ({ name: k.name, value: k.currentValue, unit: k.unit, status: k.status })),
          shortages: shortages.slice(0, 5),
          aging: [
            { category: 'INSPECTION', total: agingInspection.totalPending, overdue: agingInspection.overdueCount },
            { category: 'APPROVAL', total: agingApproval.totalPending, overdue: agingApproval.overdueCount }
          ],
          suppliers: suppliers.map(s => ({ name: s.supplierName, score: s.overallScore, risk: s.riskTier, rejectionRate: s.rejectionRate }))
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: AiEngineeringInsight = await response.json();
      dbService.saveAiInsight(data);
      setLatestInsight(data);
    } catch (err: any) {
      console.error('Failed to generate insights:', err);
      setErrorMsg(err.message || 'Failed to generate AI engineering insights. Verify API key connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                AI-Assisted Engineering Intelligence & Insights
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Grounded Gemini 2.5 analysis synthesizing multi-field inventory, inspection trends, vendor quality, and supply chain constraints.
            </p>
          </div>

          <button
            onClick={handleGenerateInsights}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Synthesizing Telemetry...' : 'Generate Real-Time AI Insights'}</span>
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="mt-4 p-3 bg-industrial-950 rounded-lg border border-industrial-800 flex items-start gap-2.5 text-xs text-industrial-400">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-industrial-200">Strict Engineering Policy:</strong> AI recommendations provide decision support only. All inventory actions, QA dispositions, and procurement releases strictly require authorized human engineer approval.
          </span>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-xl text-xs text-red-400 font-semibold flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Insights Display */}
      {!latestInsight && !isLoading ? (
        <div className="p-12 bg-industrial-900 border border-industrial-800 rounded-xl text-center shadow-lg">
          <Cpu className="w-10 h-10 text-brand-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-white">No AI Insights Generated Yet</h3>
          <p className="text-xs text-industrial-400 mt-1 max-w-md mx-auto">
            Click "Generate Real-Time AI Insights" above to trigger a holistic analytical evaluation of plant telemetry and material health.
          </p>
        </div>
      ) : latestInsight ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Executive Engineering Synthesis
                </span>
                <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded text-[10px] font-mono">
                  Model: {latestInsight.model}
                </span>
              </div>
              <span className="text-[11px] font-mono text-industrial-400">
                Generated: {new Date(latestInsight.generatedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-1">
                <div className="text-[10px] font-bold text-industrial-400 uppercase font-mono">English Executive Brief</div>
                <p className="text-xs text-industrial-200 leading-relaxed font-sans mt-1">
                  {latestInsight.summary}
                </p>
              </div>

              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-1 text-right">
                <div className="text-[10px] font-bold text-industrial-400 uppercase font-mono text-left">ملخص الإدارة الهندسية</div>
                <p className="text-xs text-industrial-200 leading-relaxed font-arabic mt-1" dir="rtl">
                  {latestInsight.arabicSummary}
                </p>
              </div>
            </div>
          </div>

          {/* Three-Column Section: Risks, Opportunities, Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Risks */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Identified Technical Risks
                  </h3>
                  <span className="text-xs text-red-400 font-mono font-bold">
                    {latestInsight.risks.length} Detected
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {latestInsight.risks.map((risk, i) => (
                    <div key={i} className="p-3 bg-industrial-950 rounded-lg border border-industrial-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{risk.title}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          risk.severity === 'HIGH' || risk.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-industrial-300 text-[11px]">{risk.details}</p>
                      {risk.affectedEntities && risk.affectedEntities.length > 0 && (
                        <div className="text-[10px] text-industrial-500 font-mono pt-1">
                          Entities: {risk.affectedEntities.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Opportunities */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Optimization Opportunities
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    {latestInsight.opportunities.length} Actionable
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {latestInsight.opportunities.map((opp, i) => (
                    <div key={i} className="p-3 bg-industrial-950 rounded-lg border border-industrial-800/80 space-y-1 text-xs">
                      <div className="font-bold text-white">{opp.title}</div>
                      <p className="text-industrial-300 text-[11px]">{opp.details}</p>
                      <div className="text-[10px] text-emerald-400 font-mono pt-1 font-semibold">
                        Gain: {opp.potentialGain}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Action Recommendations */}
            <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    Engineering Recommendations
                  </h3>
                  <span className="text-xs text-brand-400 font-mono font-bold">
                    {latestInsight.recommendations.length} Steps
                  </span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {latestInsight.recommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-industrial-950 rounded-lg border border-industrial-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{rec.title}</span>
                        <span className="text-[9px] font-mono text-brand-400 bg-brand-500/10 px-1 py-0.2 rounded border border-brand-500/20 font-bold">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-industrial-300 text-[11px]">{rec.rationale}</p>
                      <div className="text-[10px] text-industrial-500 font-mono pt-1">
                        Type: {rec.actionType}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Grounding Ledger */}
          <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                Empirical Telemetry Lineage & Grounding Checklist
              </h3>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                Confidence: {latestInsight.confidence}% Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {latestInsight.evidence.map((ev, i) => (
                <div key={i} className="p-3 bg-industrial-950 rounded-lg border border-industrial-800 text-xs">
                  <div className="text-[10px] text-industrial-400 font-mono uppercase">{ev.metric}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{ev.value}</div>
                  <div className="text-[10px] text-brand-400 font-mono mt-1">Source: {ev.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
