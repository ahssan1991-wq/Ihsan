/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  Clock, 
  Building2, 
  ArrowLeftRight, 
  Sparkles, 
  FileText, 
  Filter, 
  RefreshCw, 
  Calendar,
  Compass
} from 'lucide-react';
import { Material, User } from '../types';
import { dbService } from '../services/dbService';
import { smartAlertService } from '../services/smartAlertService';

import IntelligenceOverviewTab from './intelligence/IntelligenceOverviewTab';
import EngineeringKpiTab from './intelligence/EngineeringKpiTab';
import MaterialIntelligenceTab from './intelligence/MaterialIntelligenceTab';
import CrossSiteStockTab from './intelligence/CrossSiteStockTab';
import SupplierIntelligenceTab from './intelligence/SupplierIntelligenceTab';
import AgingAnalysisTab from './intelligence/AgingAnalysisTab';
import SmartAlertCenterTab from './intelligence/SmartAlertCenterTab';
import AiEngineeringInsightsTab from './intelligence/AiEngineeringInsightsTab';
import ManagementReportsTab from './intelligence/ManagementReportsTab';

interface IntelligenceDashboardViewProps {
  materials?: Material[];
  currentUser: User;
  onOpenMaterialModal?: (material: Material) => void;
  initialTab?: string;
}

export default function IntelligenceDashboardView({
  materials = [],
  currentUser,
  onOpenMaterialModal,
  initialTab = 'overview'
}: IntelligenceDashboardViewProps) {
  const safeMaterials = Array.isArray(materials) && materials.length > 0 ? materials : (dbService.getMaterials() || []);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('30_DAYS');
  const [refreshTick, setRefreshTick] = useState(0);

  // Auto-run rules on initial mount
  useEffect(() => {
    smartAlertService.evaluateAllRules(currentUser);
  }, []);

  const handleRefresh = () => {
    smartAlertService.evaluateAllRules(currentUser);
    setRefreshTick(prev => prev + 1);
  };

  const handleNavigateToTab = (subTab: string, query?: string) => {
    setActiveTab(subTab);
  };

  const alertSummary = smartAlertService.getAlertSummary(selectedSite);

  const tabs = [
    { id: 'overview', label: 'Command Hub', icon: Compass },
    { id: 'kpis', label: 'Engineering KPIs', icon: BarChart3 },
    { id: 'materials', label: 'Material Health', icon: ShieldCheck },
    { id: 'cross-site', label: 'Cross-Site Stock', icon: ArrowLeftRight },
    { id: 'suppliers', label: 'Supplier Quality', icon: Building2 },
    { id: 'aging', label: 'Aging & SLA', icon: Clock },
    { 
      id: 'alerts', 
      label: 'Smart Alerts', 
      icon: ShieldAlert, 
      badge: alertSummary.active > 0 ? alertSummary.active : undefined,
      badgeColor: alertSummary.critical > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
    },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText }
  ];

  const siteOptions = [
    { id: 'ALL', label: 'All Enterprise Sites' },
    { id: 'NDGS', label: 'NDGS Field' },
    { id: 'H-IPF DGS', label: 'H-IPF DGS Field' },
    { id: 'DGS North', label: 'DGS North' },
    { id: 'DGS South', label: 'DGS South' },
    { id: 'Jumna', label: 'Jumna Field' },
    { id: 'PETROMAINT', label: 'PETROMAINT Base' }
  ];

  const dateOptions = [
    { id: 'TODAY', label: 'Today (Live)' },
    { id: '7_DAYS', label: 'Last 7 Days' },
    { id: '30_DAYS', label: 'Current 30 Days' },
    { id: '90_DAYS', label: 'Quarter (90D)' },
    { id: 'YEAR', label: 'Year-to-Date' },
    { id: 'ALL_TIME', label: 'Full Historical' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Universal Control Header */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded text-[10px] font-mono font-bold">
                EMIS PORT 8 &bull; ENTERPRISE INTELLIGENCE
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-wide mt-1">
              Engineering Material Intelligence & Analytics Center
            </h1>
            <p className="text-xs text-industrial-400 mt-0.5">
              Comprehensive telemetry, real-time KPI synthesis, cross-site balancing, and grounded AI decision support.
            </p>
          </div>

          {/* Global Site and Date Range Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Site Selector */}
            <div className="flex items-center gap-1.5 bg-industrial-950 px-3 py-1.5 rounded-lg border border-industrial-800">
              <Building2 className="w-3.5 h-3.5 text-industrial-400" />
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="bg-transparent text-xs text-white font-mono focus:outline-none cursor-pointer"
              >
                {siteOptions.map(s => (
                  <option key={s.id} value={s.id} className="bg-industrial-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-industrial-950 px-3 py-1.5 rounded-lg border border-industrial-800">
              <Calendar className="w-3.5 h-3.5 text-industrial-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-xs text-white font-mono focus:outline-none cursor-pointer"
              >
                {dateOptions.map(d => (
                  <option key={d.id} value={d.id} className="bg-industrial-900 text-white">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white rounded-lg border border-industrial-700 transition-colors cursor-pointer"
              title="Refresh All Analytics & Re-evaluate Rules"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="mt-5 pt-3 border-t border-industrial-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-industrial-950 text-industrial-400 hover:text-white hover:bg-industrial-850 border border-industrial-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${tab.badgeColor || 'bg-brand-500 text-white'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div key={`${selectedSite}-${dateRange}-${refreshTick}`}>
        {activeTab === 'overview' && (
          <IntelligenceOverviewTab
            materials={safeMaterials}
            selectedSite={selectedSite}
            dateRange={dateRange}
            currentUser={currentUser}
            onNavigateToTab={handleNavigateToTab}
            onOpenMaterialModal={onOpenMaterialModal}
          />
        )}

        {activeTab === 'kpis' && (
          <EngineeringKpiTab
            selectedSite={selectedSite}
            dateRange={dateRange}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialIntelligenceTab
            materials={safeMaterials}
            selectedSite={selectedSite}
            onOpenMaterialModal={onOpenMaterialModal}
          />
        )}

        {activeTab === 'cross-site' && (
          <CrossSiteStockTab
            selectedSite={selectedSite}
            currentUser={currentUser}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierIntelligenceTab
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'aging' && (
          <AgingAnalysisTab
            selectedSite={selectedSite}
          />
        )}

        {activeTab === 'alerts' && (
          <SmartAlertCenterTab
            selectedSite={selectedSite}
            currentUser={currentUser}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'ai-insights' && (
          <AiEngineeringInsightsTab
            selectedSite={selectedSite}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'reports' && (
          <ManagementReportsTab
            selectedSite={selectedSite}
            dateRange={dateRange}
            currentUser={currentUser}
            onNavigateToTab={handleNavigateToTab}
          />
        )}
      </div>
    </div>
  );
}
