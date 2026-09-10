/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Network, 
  ArrowLeftRight, 
  TrendingUp, 
  Truck, 
  PackageMinus, 
  Users2, 
  FileCheck2,
  Boxes,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { User, Material, EnterpriseHierarchyNode } from '../types';
import { dbService } from '../services/dbService';

// Sub-component tabs
import { EnterpriseOverviewTab } from './enterprise/EnterpriseOverviewTab';
import { MultiSiteHierarchyTab } from './enterprise/MultiSiteHierarchyTab';
import { MaterialTransfersTab } from './enterprise/MaterialTransfersTab';
import { StockLedgerTab } from './enterprise/StockLedgerTab';
import { DigitalReceivingTab } from './enterprise/DigitalReceivingTab';
import { MaterialIssuanceTab } from './enterprise/MaterialIssuanceTab';
import { SupplierDirectoryTab } from './enterprise/SupplierDirectoryTab';
import { TaskApprovalCenterTab } from './enterprise/TaskApprovalCenterTab';

export type EnterpriseSubTab = 
  | 'OVERVIEW' 
  | 'HIERARCHY' 
  | 'TRANSFERS' 
  | 'LEDGER' 
  | 'RECEIVING' 
  | 'ISSUANCE' 
  | 'SUPPLIERS' 
  | 'APPROVALS';

interface EnterpriseOperationsViewProps {
  currentUser: User;
  initialSubTab?: EnterpriseSubTab;
  onNavigateToTab?: (tabId: string, query?: string) => void;
  onInspectMaterial?: (material: Material) => void;
}

export const EnterpriseOperationsView: React.FC<EnterpriseOperationsViewProps> = ({
  currentUser,
  initialSubTab = 'OVERVIEW',
  onNavigateToTab,
  onInspectMaterial
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EnterpriseSubTab>(initialSubTab);
  const [materials, setMaterials] = useState<Material[]>(dbService.getMaterials());
  const [sites, setSites] = useState<EnterpriseHierarchyNode[]>(dbService.getHierarchyNodes());

  // Listen for initialSubTab prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const refreshGlobalState = () => {
    setMaterials(dbService.getMaterials());
    setSites(dbService.getHierarchyNodes());
  };

  const handleSelectMaterial = (mat: Material) => {
    if (onInspectMaterial) {
      onInspectMaterial(mat);
    } else if (onNavigateToTab) {
      onNavigateToTab('materials', mat.partNumber);
    }
  };

  const tabsConfig = [
    { id: 'OVERVIEW' as const, label: 'Enterprise Overview', icon: Building2, count: null },
    { id: 'HIERARCHY' as const, label: 'Site Hierarchy', icon: Network, count: sites.length },
    { id: 'TRANSFERS' as const, label: 'Inter-Site Transfers', icon: ArrowLeftRight, count: dbService.getMaterialTransfers().filter(t => t.status === 'REQUESTED' || t.status === 'IN_TRANSIT').length || null },
    { id: 'LEDGER' as const, label: 'Stock Ledger & Counts', icon: TrendingUp, count: null },
    { id: 'RECEIVING' as const, label: 'Digital Receiving', icon: Truck, count: dbService.getReceivingSessions().filter(s => s.status === 'IN_PROGRESS').length || null },
    { id: 'ISSUANCE' as const, label: 'Issues & Returns', icon: PackageMinus, count: null },
    { id: 'SUPPLIERS' as const, label: 'Supplier Directory', icon: Users2, count: dbService.getSuppliers().length },
    { id: 'APPROVALS' as const, label: 'Approvals & Tasks', icon: FileCheck2, count: dbService.getApprovalRequests().filter(a => a.status === 'PENDING').length || null }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ENTERPRISE COMMAND HEADER */}
      <div className="bg-linear-to-r from-industrial-900 via-industrial-850 to-industrial-900 border border-industrial-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-brand-500/20 to-blue-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white heading-display">
                  Enterprise Operations & Material Lifecycle
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  EMIS v0.7
                </span>
              </div>
              <p className="text-xs text-industrial-400 mt-0.5">
                Multi-site facility hierarchy, inter-warehouse transfers, immutable stock ledger, digital receiving check-in & approval workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button 
              onClick={refreshGlobalState}
              className="p-2 bg-industrial-800 hover:bg-industrial-750 text-industrial-300 hover:text-white rounded-lg border border-industrial-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE MULTI-SITE LEDGER
            </div>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION BAR */}
        <div className="mt-6 pt-4 border-t border-industrial-750/70 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {tabsConfig.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected 
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-950/50 font-bold' 
                      : 'bg-industrial-800/70 text-industrial-300 hover:text-white hover:bg-industrial-800 border border-industrial-750/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-industrial-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE ENTERPRISE SUB-VIEW */}
      <div className="transition-all duration-200">
        {activeSubTab === 'OVERVIEW' && (
          <EnterpriseOverviewTab
            currentUser={currentUser}
            materials={materials}
            sites={sites}
            onNavigateSubTab={(tab) => setActiveSubTab(tab)}
            onNavigateTab={(tabId) => {
              const subTabMap: Record<string, EnterpriseSubTab> = {
                'stock-ledger': 'LEDGER',
                'ledger': 'LEDGER',
                'receiving': 'RECEIVING',
                'transfers': 'TRANSFERS',
                'tasks': 'APPROVALS',
                'approvals': 'APPROVALS',
                'hierarchy': 'HIERARCHY',
                'issuance': 'ISSUANCE',
                'suppliers': 'SUPPLIERS',
              };
              if (subTabMap[tabId.toLowerCase()]) {
                setActiveSubTab(subTabMap[tabId.toLowerCase()]);
              } else if (onNavigateToTab) {
                onNavigateToTab(tabId);
              }
            }}
            onNavigateToTab={onNavigateToTab}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'HIERARCHY' && (
          <MultiSiteHierarchyTab
            currentUser={currentUser}
            materials={materials}
            onRefreshHierarchy={refreshGlobalState}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'TRANSFERS' && (
          <MaterialTransfersTab
            currentUser={currentUser}
            materials={materials}
            sites={sites}
            onRefreshTransfers={refreshGlobalState}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'LEDGER' && (
          <StockLedgerTab
            currentUser={currentUser}
            materials={materials}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'RECEIVING' && (
          <DigitalReceivingTab
            currentUser={currentUser}
            materials={materials}
            sites={sites}
            onRefreshSessions={refreshGlobalState}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'ISSUANCE' && (
          <MaterialIssuanceTab
            currentUser={currentUser}
            materials={materials}
            onRefreshData={refreshGlobalState}
            onSelectMaterial={handleSelectMaterial}
          />
        )}

        {activeSubTab === 'SUPPLIERS' && (
          <SupplierDirectoryTab
            currentUser={currentUser}
            onRefreshSuppliers={refreshGlobalState}
          />
        )}

        {activeSubTab === 'APPROVALS' && (
          <TaskApprovalCenterTab
            currentUser={currentUser}
            onRefreshData={refreshGlobalState}
          />
        )}
      </div>
    </div>
  );
};
