/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Layers, 
  ChevronRight, 
  Filter, 
  Building2, 
  Calendar,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { AgingAnalysis, AgingBucketItem } from '../../types';
import { dbService } from '../../services/dbService';

interface AgingAnalysisTabProps {
  selectedSite: string;
}

export default function AgingAnalysisTab({
  selectedSite
}: AgingAnalysisTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<'INSPECTION' | 'APPROVAL' | 'TRANSFER' | 'RECEIVING'>('INSPECTION');
  const [selectedBucketRange, setSelectedBucketRange] = useState<string | null>(null);

  const analysis: AgingAnalysis = dbService.getAgingAnalysis(selectedCategory, selectedSite);

  const categories = [
    { id: 'INSPECTION', label: 'QA Material Inspections' },
    { id: 'APPROVAL', label: 'Engineering Approvals' },
    { id: 'TRANSFER', label: 'Inter-Site Transfers' },
    { id: 'RECEIVING', label: 'Receiving Sessions' }
  ];

  const activeBucket = selectedBucketRange 
    ? analysis.buckets.find(b => b.range === selectedBucketRange) 
    : null;

  const displayItems = activeBucket 
    ? activeBucket.items 
    : analysis.buckets.flatMap(b => b.items);

  return (
    <div className="space-y-6">
      {/* Header & Category Switcher */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Operational Aging & SLA Backlog Analysis
              </h2>
            </div>
            <p className="text-xs text-industrial-400 mt-1">
              Time-bucketed monitoring of pending inspections, approvals, transfers, and receiving operations to prevent bottlenecks.
            </p>
          </div>

          <div className="flex items-center bg-industrial-950 border border-industrial-800 rounded-lg p-1">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id as any);
                  setSelectedBucketRange(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedCategory === c.id 
                    ? 'bg-amber-600 text-white shadow' 
                    : 'text-industrial-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-4 shadow">
          <div className="text-[11px] font-semibold text-industrial-400 uppercase font-mono">Total Pending Items</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{analysis.totalPending}</div>
          <div className="text-[10px] text-industrial-400 mt-1">Awaiting completion</div>
        </div>

        {/* Average Age */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-4 shadow">
          <div className="text-[11px] font-semibold text-industrial-400 uppercase font-mono">Average Aging (Days)</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{analysis.averageAgeDays} d</div>
          <div className="text-[10px] text-industrial-400 mt-1">Across all pending records</div>
        </div>

        {/* Oldest Item */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-4 shadow">
          <div className="text-[11px] font-semibold text-industrial-400 uppercase font-mono">Oldest Active Record</div>
          <div className="text-2xl font-extrabold text-red-400 font-mono mt-1">{analysis.oldestItemDays} d</div>
          <div className="text-[10px] text-red-400/80 mt-1">Requires immediate escalation</div>
        </div>

        {/* SLA Overdue Count */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-4 shadow">
          <div className="text-[11px] font-semibold text-industrial-400 uppercase font-mono">SLA Overdue Items</div>
          <div className="text-2xl font-extrabold text-red-500 font-mono mt-1">{analysis.overdueCount}</div>
          <div className="text-[10px] text-red-400/80 mt-1">&gt;= SLA Threshold</div>
        </div>
      </div>

      {/* 5 Time Buckets Visual Breakdown */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-400" />
            Time Aging Distribution Buckets
          </h3>
          {selectedBucketRange && (
            <button
              onClick={() => setSelectedBucketRange(null)}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold cursor-pointer"
            >
              Clear Bucket Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {analysis.buckets.map(b => {
            const isSelected = selectedBucketRange === b.range;
            const isCritical = b.range === '8_14_DAYS' || b.range === '15_PLUS_DAYS';
            const isWarning = b.range === '4_7_DAYS' || b.range === '2_3_DAYS';

            return (
              <div 
                key={b.range}
                onClick={() => setSelectedBucketRange(isSelected ? null : b.range)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected ? 'border-brand-500 bg-brand-950/30 shadow-lg' :
                  isCritical ? 'bg-red-950/20 border-red-800/40 hover:border-red-500' :
                  isWarning ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-500' :
                  'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-500'
                }`}
              >
                <div>
                  <div className="text-[11px] font-semibold text-industrial-300">{b.label}</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{b.count}</div>
                </div>

                <div className="mt-3 w-full bg-industrial-950 h-1.5 rounded-full overflow-hidden border border-industrial-800">
                  <div 
                    className={`h-full rounded-full ${
                      isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${analysis.totalPending > 0 ? (b.count / analysis.totalPending) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Drill-Down Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-industrial-950/80 border-b border-industrial-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase font-mono">
            {activeBucket ? `Drilldown: ${activeBucket.label} (${activeBucket.count} Items)` : `All Pending ${selectedCategory} Records (${displayItems.length})`}
          </span>
          <span className="text-[11px] text-industrial-400 font-mono">
            Sorted by Aging (Highest First)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-industrial-950 text-industrial-400 uppercase font-mono text-[10px] border-b border-industrial-800">
              <tr>
                <th className="py-3 px-4">Ref Number / Item</th>
                <th className="py-3 px-4">Site</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Age in Days</th>
                <th className="py-3 px-4">Assigned Engineer</th>
                <th className="py-3 px-4 text-right">Aging Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-industrial-500 font-mono">
                    No pending items recorded in this aging bucket.
                  </td>
                </tr>
              ) : (
                displayItems
                  .sort((a, b) => b.ageDays - a.ageDays)
                  .map(item => (
                    <tr key={item.id} className="hover:bg-industrial-850/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-mono">{item.referenceNumber}</div>
                        <div className="text-[11px] text-industrial-300 line-clamp-1 mt-0.5">{item.title}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-industrial-200">
                        {item.site}
                      </td>
                      <td className="py-3 px-4 font-mono text-industrial-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-white">{item.ageDays} Days</span>
                      </td>
                      <td className="py-3 px-4 text-industrial-300">
                        {item.assignedTo || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          item.urgency === 'OVERDUE' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          item.urgency === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
