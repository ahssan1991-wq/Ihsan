/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle, 
  Info, 
  Database, 
  ShieldCheck, 
  Target, 
  Layers, 
  BarChart3, 
  Filter, 
  RefreshCw 
} from 'lucide-react';
import { EngineeringKpiMetric } from '../../types';
import { dbService } from '../../services/dbService';

interface EngineeringKpiTabProps {
  selectedSite: string;
  dateRange: string;
  onRefresh?: () => void;
}

export default function EngineeringKpiTab({
  selectedSite,
  dateRange,
  onRefresh
}: EngineeringKpiTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expandedKpiId, setExpandedKpiId] = useState<string | null>(null);

  const kpis: EngineeringKpiMetric[] = dbService.getEngineeringKpis(selectedSite) || [];

  const filteredKpis = kpis.filter(kpi => {
    if (categoryFilter !== 'ALL' && kpi.category !== categoryFilter) return false;
    return true;
  });

  const categories = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'QUALITY', label: 'QA & Inspection Quality' },
    { id: 'COMPLIANCE', label: 'Technical Compliance' },
    { id: 'OPERATIONS', label: 'Operations & SLA' },
    { id: 'SUPPLY_CHAIN', label: 'Supply Chain & SCM' }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Category Filter */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Engineering KPI & Performance Center
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Deterministic metrics calculated directly from immutable material ledgers, inspection sheets, and enterprise registers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-industrial-950 border border-industrial-800 rounded-lg p-1">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    categoryFilter === c.id 
                      ? 'bg-brand-600 text-white shadow' 
                      : 'text-industrial-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded-lg border border-industrial-700 cursor-pointer transition-colors"
                title="Recalculate KPIs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredKpis.map(kpi => {
          const isExpanded = expandedKpiId === kpi.id;
          const isOptimal = kpi.status === 'OPTIMAL';
          const isWarning = kpi.status === 'WARNING';
          const isCritical = kpi.status === 'CRITICAL';

          return (
            <div 
              key={kpi.id}
              className={`bg-industrial-900 border rounded-xl p-5 transition-all flex flex-col justify-between shadow-lg ${
                isOptimal ? 'border-industrial-800 hover:border-emerald-500/40' :
                isWarning ? 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10' :
                'border-red-500/30 hover:border-red-500/60 bg-red-950/10'
              }`}
            >
              <div>
                {/* Category & Status Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-industrial-800 text-industrial-400 border border-industrial-700">
                    {kpi.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                    isOptimal ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    isWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {isOptimal && <CheckCircle2 className="w-3 h-3" />}
                    {isWarning && <AlertTriangle className="w-3 h-3" />}
                    {isCritical && <AlertCircle className="w-3 h-3" />}
                    {kpi.status}
                  </span>
                </div>

                {/* KPI Title & Arabic Subtitle */}
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-white tracking-wide">{kpi.name}</h3>
                  <div className="text-xs text-industrial-400 font-arabic mt-0.5">{kpi.arabicName}</div>
                </div>

                {/* Primary Metric Display */}
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-3xl font-extrabold text-white font-mono heading-display">
                    {kpi.currentValue}{kpi.unit}
                  </span>
                  <div className={`flex items-center text-xs font-semibold font-mono ${
                    kpi.trend === 'UP' ? 'text-emerald-400' :
                    kpi.trend === 'DOWN' ? (kpi.name.includes('Rejection') ? 'text-emerald-400' : 'text-red-400') :
                    'text-industrial-400'
                  }`}>
                    {kpi.trend === 'UP' && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                    {kpi.trend === 'DOWN' && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {kpi.trend === 'STABLE' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
                    {kpi.changePercent > 0 ? `+${kpi.changePercent}%` : `${kpi.changePercent}%`}
                  </div>
                </div>

                {/* Progress Towards Target Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-industrial-400 font-mono mb-1">
                    <span>Target: {kpi.target}{kpi.unit}</span>
                    <span>Prev: {kpi.previousValue}{kpi.unit}</span>
                  </div>
                  <div className="w-full bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isOptimal ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (kpi.currentValue / kpi.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expandable Mathematical Transparency Details */}
              <div className="mt-4 pt-3 border-t border-industrial-800">
                <button
                  onClick={() => setExpandedKpiId(isExpanded ? null : kpi.id)}
                  className="w-full flex items-center justify-between text-[11px] text-industrial-400 hover:text-brand-400 font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Hide Formula & Source' : 'Formula & Data Lineage'}</span>
                  </span>
                  <span className="font-mono">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="mt-2.5 p-3 bg-industrial-950 rounded-lg border border-industrial-800 space-y-2 text-[11px]">
                    <div>
                      <div className="text-[10px] font-semibold text-industrial-400 uppercase font-mono">Calculation Formula:</div>
                      <div className="text-industrial-200 font-mono text-[10px] mt-0.5 bg-industrial-900 p-1.5 rounded border border-industrial-800/80">
                        {kpi.formula}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-industrial-400 uppercase font-mono">Data Source:</div>
                      <div className="text-brand-400 font-mono text-[10px] mt-0.5 flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {kpi.dataSource}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-industrial-400 uppercase font-mono">Industry Benchmark:</div>
                      <div className="text-emerald-400 text-[10px] mt-0.5">{kpi.benchmark}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
