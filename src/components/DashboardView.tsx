/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Layers, 
  AlertOctagon, 
  Search, 
  PlusCircle, 
  History, 
  UserCheck, 
  ArrowRight,
  Shield,
  Activity,
  Boxes,
  Database,
  FileSpreadsheet,
  Download,
  Award,
  Network,
  ArrowDownToLine
} from 'lucide-react';
import { Material, ActivityLog, User, UserRole } from '../types';

interface DashboardViewProps {
  materials: Material[];
  activities: ActivityLog[];
  currentUser: User;
  onNavigateToTab: (tabId: string, initialSearch?: string) => void;
}

export default function DashboardView({ materials, activities, currentUser, onNavigateToTab }: DashboardViewProps) {
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  // Computations
  const totalMaterials = materials.length;
  const lowStockCount = materials.filter(m => m.quantity <= m.minStockLevel).length;
  const totalPartsCount = materials.reduce((sum, m) => sum + m.quantity, 0);

  // ZFOD Reports Computations
  const zeroStockCount = materials.filter(m => m.quantity === 0).length;
  const uniqueStations = new Set(materials.map(m => m.station).filter(Boolean)).size;
  const uniqueBrands = new Set(materials.map(m => m.brand || m.manufacturer).filter(Boolean)).size;
  const calibrationCount = materials.filter(m => m.documents?.calibrationCertificate).length;
  const totalConsumedVolume = materials.reduce((sum, m) => {
    const orig = m.originalQuantity ?? m.quantity;
    return sum + Math.max(0, orig - m.quantity);
  }, 0);

  const downloadReport = (type: string) => {
    let csvContent = "\uFEFF"; // Byte Order Mark for Excel UTF-8 compatibility
    let filename = "";

    if (type === 'low_stock') {
      filename = "ZFOD_Low_Stock_Report.csv";
      csvContent += "Sequence,Part Number,Brand,Model,Description,Quantity,Unit,Min Stock Level,Warehouse,Rack,Shelf\n";
      materials.filter(m => m.quantity <= m.minStockLevel).forEach(m => {
        csvContent += `"${m.sequence || ''}","${m.partNumber}","${m.brand || m.manufacturer}","${m.model}","${m.description.replace(/"/g, '""')}","${m.quantity}","${m.unit}","${m.minStockLevel}","${m.store}","${m.rack}","${m.shelf}"\n`;
      });
    } else if (type === 'station_inventory') {
      filename = "ZFOD_Station_Inventory_Report.csv";
      csvContent += "Sequence,Part Number,Brand,Model,Station Code,Quantity,Unit,Warehouse,Rack,Shelf\n";
      materials.forEach(m => {
        csvContent += `"${m.sequence || ''}","${m.partNumber}","${m.brand || m.manufacturer}","${m.model}","${m.station || 'N/A'}","${m.quantity}","${m.unit}","${m.store}","${m.rack}","${m.shelf}"\n`;
      });
    } else if (type === 'consumption') {
      filename = "ZFOD_WO_MRF_Consumption_Report.csv";
      csvContent += "Sequence,Part Number,Brand,Model,Original Qty,Remaining Qty,Consumed Qty,Unit,Warehouse\n";
      materials.forEach(m => {
        const orig = m.originalQuantity ?? m.quantity;
        const rem = m.quantity;
        const consumed = Math.max(0, orig - rem);
        csvContent += `"${m.sequence || ''}","${m.partNumber}","${m.brand || m.manufacturer}","${m.model}","${orig}","${rem}","${consumed}","${m.unit}","${m.store}"\n`;
      });
    } else if (type === 'calibration') {
      filename = "ZFOD_Calibration_Status_Report.csv";
      csvContent += "Part Number,Brand,Model,Description,Calibration Req,Has Calibration Cert,Last Calibration Date\n";
      materials.forEach(m => {
        const hasCert = m.documents?.calibrationCertificate ? 'YES' : 'NO';
        csvContent += `"${m.partNumber}","${m.brand || m.manufacturer}","${m.model}","${m.description.replace(/"/g, '""')}","YES","${hasCert}","${m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : 'N/A'}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToTab('materials', quickSearchQuery.trim());
  };

  const getRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'update':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'delete':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'auth':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-industrial-500/10 text-industrial-400 border-industrial-500/20';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Dynamic Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-industrial-800 heading-display">
            Operational Dashboard
          </h2>
          <p className="text-xs text-industrial-500 mt-1 flex items-center gap-1.5 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected to EMIS Local Database Engine (Primary Node)
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 bg-industrial-100/80 px-4 py-2.5 rounded-xl border border-industrial-200">
          <UserCheck className="h-4.5 w-4.5 text-brand-600 shrink-0" />
          <div className="text-left font-sans">
            <p className="text-[10px] text-industrial-400 uppercase tracking-widest font-mono font-medium">Logged in as</p>
            <p className="text-xs font-semibold text-industrial-700">{currentUser.name}</p>
          </div>
        </div>
      </div>

      {/* METRIC CARD TRIO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Materials */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs flex items-center gap-4 cursor-pointer"
          onClick={() => onNavigateToTab('materials')}
        >
          <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-600 shadow-inner">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-industrial-500 uppercase tracking-wider">Total SKU Materials</p>
            <h3 className="text-2xl font-bold text-industrial-800 mt-1 font-mono">{totalMaterials}</h3>
            <p className="text-[10px] text-industrial-400 mt-0.5">Unique item catalog parts</p>
          </div>
        </motion.div>

        {/* Low Stock Materials */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className={`p-5 rounded-2xl border shadow-xs flex items-center gap-4 cursor-pointer ${
            lowStockCount > 0 
              ? 'bg-red-50/40 border-red-200 hover:bg-red-50/60' 
              : 'bg-white border-industrial-200'
          }`}
          onClick={() => onNavigateToTab('materials', 'lowstock')}
        >
          <div className={`p-3 rounded-xl border shadow-inner ${
            lowStockCount > 0 
              ? 'bg-red-500/10 border-red-200 text-red-600' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-industrial-500 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className={`text-2xl font-bold mt-1 font-mono ${lowStockCount > 0 ? 'text-red-600' : 'text-industrial-800'}`}>
              {lowStockCount}
            </h3>
            <p className="text-[10px] text-industrial-400 mt-0.5">
              {lowStockCount > 0 ? 'Action required immediately' : 'All quantities sufficient'}
            </p>
          </div>
        </motion.div>

        {/* Total Stock Volume */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs flex items-center gap-4"
        >
          <div className="p-3 bg-industrial-100 border border-industrial-200 rounded-xl text-industrial-600 shadow-inner">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-industrial-500 uppercase tracking-wider">Total Quantity Volume</p>
            <h3 className="text-2xl font-bold text-industrial-800 mt-1 font-mono">{totalPartsCount.toLocaleString()}</h3>
            <p className="text-[10px] text-industrial-400 mt-0.5">Sum of all parts in inventory</p>
          </div>
        </motion.div>
      </div>

      {/* QUICK SEARCH & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Quick Search Panel */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-industrial-850 tracking-tight flex items-center gap-2 mb-2">
              <Search className="h-4.5 w-4.5 text-brand-600" /> Quick Stock Query
            </h3>
            <p className="text-xs text-industrial-500 mb-5 leading-normal">
              Directly look up a part by part number, description, model, or manufacturer. Press enter to open the ledger with matched results.
            </p>
            
            <form onSubmit={handleQuickSearchSubmit} className="relative mb-4">
              <input
                type="text"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Enter Part Number, Manufacturer, or Model..."
                className="w-full bg-industrial-50/80 border border-industrial-200 text-industrial-800 text-sm px-4 py-3 pl-11 rounded-xl placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                id="dashboard-quick-search"
              />
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-industrial-400" />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-industrial-100">
            <span className="text-[10px] font-mono text-industrial-400 uppercase mr-1">Suggested:</span>
            {['STM32', 'SKF', 'Regulator', 'M4 Screw'].map((suggest) => (
              <button
                key={suggest}
                type="button"
                onClick={() => onNavigateToTab('materials', suggest)}
                className="text-[11px] bg-industrial-100 hover:bg-industrial-200 text-industrial-600 font-mono px-2 py-1 rounded border border-industrial-200 transition-colors cursor-pointer"
              >
                {suggest}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm">
          <h3 className="text-base font-semibold text-industrial-850 tracking-tight flex items-center gap-2 mb-4">
            <Shield className="h-4.5 w-4.5 text-brand-600" /> Command Shortcuts
          </h3>
          <div className="space-y-3">
            {currentUser.role !== UserRole.VIEWER ? (
              <button
                onClick={() => onNavigateToTab('add-material')}
                className="w-full flex items-center justify-between p-3.5 bg-brand-50/40 hover:bg-brand-50 border border-brand-100 hover:border-brand-200 text-brand-700 text-xs font-semibold rounded-xl transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <PlusCircle className="h-4.5 w-4.5 text-brand-500" />
                  <span>Register New Material SKU</span>
                </span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="p-3 bg-industrial-50 border border-industrial-200 text-industrial-500 text-[11px] rounded-xl flex items-center gap-2.5">
                <Shield className="h-4.5 w-4.5 text-industrial-400 shrink-0" />
                <span>Your Viewer account has read-only clearance. Registering materials is locked.</span>
              </div>
            )}

            <button
              onClick={() => onNavigateToTab('search')}
              className="w-full flex items-center justify-between p-3.5 bg-industrial-50/60 hover:bg-industrial-50 border border-industrial-200 text-industrial-700 text-xs font-semibold rounded-xl transition-all group cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Search className="h-4.5 w-4.5 text-industrial-500" />
                <span>Multi-Field Advanced Filtering</span>
              </span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateToTab('materials')}
              className="w-full flex items-center justify-between p-3.5 bg-industrial-50/60 hover:bg-industrial-50 border border-industrial-200 text-industrial-700 text-xs font-semibold rounded-xl transition-all group cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Database className="h-4.5 w-4.5 text-industrial-500" />
                <span>Open Material Ledger Table</span>
              </span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITIES & SYSTEM STATE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Activity Logs */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-industrial-100 pb-3">
            <h3 className="text-base font-semibold text-industrial-850 tracking-tight flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-brand-600" /> Audit Logging Stream
            </h3>
            <span className="text-[10px] font-mono text-industrial-400 font-medium">Auto-Refreshing</span>
          </div>

          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <p className="text-xs text-industrial-400 text-center py-6">No recent operational logs.</p>
            ) : (
              activities.map((log, idx) => {
                let roleColor = 'text-red-500';
                const rStr = log.userRole as string;
                if (rStr === 'supervisor' || rStr === 'engineer') roleColor = 'text-amber-500';
                if (rStr === 'warehouse') roleColor = 'text-blue-500';
                if (rStr === 'readonly' || rStr === 'viewer') roleColor = 'text-emerald-500';

                return (
                  <div key={`${log.id}-${idx}`} className="flex gap-3 text-xs items-start border-b border-industrial-50 pb-3 last:border-0 last:pb-0">
                    <div className={`mt-0.5 p-1 rounded border shrink-0 ${getActionBadgeColor(log.action)}`}>
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-industrial-700 leading-normal">
                        <span className="font-semibold text-industrial-900">{log.userName}</span>{' '}
                        <span className="text-[10px] font-mono font-medium text-industrial-400">({log.userRole.toUpperCase()})</span>{' '}
                        <span className="text-industrial-600 font-mono">{log.details}</span>
                      </p>
                      <span className="text-[10px] text-industrial-400 font-mono mt-0.5 block">{getRelativeTime(log.timestamp)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Specs Sidebar */}
        <div className="lg:col-span-2 bg-industrial-800 text-white p-6 rounded-2xl border border-industrial-700 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono text-brand-400 mb-4 flex items-center gap-2">
              <Database className="h-4.5 w-4.5" /> Technical Specification
            </h3>
            
            <div className="space-y-3 font-mono text-[11px] text-industrial-300">
              <div className="flex justify-between border-b border-industrial-700/60 pb-1.5">
                <span className="text-industrial-400">Database Engine:</span>
                <span className="text-white font-medium">Hybrid Sync DB v1.0</span>
              </div>
              <div className="flex justify-between border-b border-industrial-700/60 pb-1.5">
                <span className="text-industrial-400">Unique Index Key:</span>
                <span className="text-brand-400 font-semibold">Part Number (PK)</span>
              </div>
              <div className="flex justify-between border-b border-industrial-700/60 pb-1.5">
                <span className="text-industrial-400">Security Clearance:</span>
                <span className="text-white font-medium uppercase">{currentUser.role} Level</span>
              </div>
              <div className="flex justify-between border-b border-industrial-700/60 pb-1.5">
                <span className="text-industrial-400">Sync Status:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Synchronized
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-industrial-900/60 border border-industrial-700 rounded-xl mt-5">
            <h4 className="text-[10px] font-bold text-industrial-400 uppercase tracking-widest mb-1 font-mono">System Integrity Checklist</h4>
            <p className="text-[10px] text-industrial-300 leading-relaxed font-mono">
              - Unique Constraint Validation: Active<br />
              - Client Auth Guardrails: Active<br />
              - Version 0.1 Foundation: Standard
            </p>
          </div>
        </div>
      </div>

      {/* ENGINEERING REPORTS SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm space-y-4" id="engineering-reports-panel">
        <div>
          <h3 className="text-base font-semibold text-industrial-850 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-brand-600" /> تقارير قسم الأجهزة والتحكم / Instrument Department Reports & Metrics
          </h3>
          <p className="text-xs text-industrial-500 mt-1">
            Generate and export official spreadsheets directly. Real-time engineering indexes calculated across active ledgers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Low / Zero Stock Report */}
          <div className="border border-industrial-200 rounded-xl p-4 flex flex-col justify-between hover:border-red-300 transition-colors bg-industrial-50/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-red-600 bg-red-50 border border-red-100 font-bold px-2 py-0.5 rounded">
                  Critical / Safety
                </span>
                <AlertOctagon className="h-4 w-4 text-red-500" />
              </div>
              <h4 className="text-xs font-bold text-industrial-800">تقارير نقص المخزون</h4>
              <p className="text-[10px] text-industrial-500 mt-1">Low, Zero, and Critical Safety Level spreadsheet.</p>
              
              <div className="mt-4 grid grid-cols-2 gap-2 text-center py-2 border-t border-b border-industrial-100 my-3 bg-white rounded-lg">
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">Low Stock</span>
                  <span className="text-sm font-extrabold text-amber-600 font-mono">{lowStockCount}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">Out / Zero</span>
                  <span className="text-sm font-extrabold text-red-600 font-mono">{zeroStockCount}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadReport('low_stock')}
              className="mt-2 w-full text-[11px] font-bold bg-white border border-industrial-200 hover:border-brand-500 hover:text-brand-700 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-industrial-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تحميل التقرير (Excel / CSV)</span>
            </button>
          </div>

          {/* Station Inventory Report */}
          <div className="border border-industrial-200 rounded-xl p-4 flex flex-col justify-between hover:border-brand-300 transition-colors bg-industrial-50/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-brand-600 bg-brand-50 border border-brand-100 font-bold px-2 py-0.5 rounded">
                  Operational Units
                </span>
                <Network className="h-4 w-4 text-brand-500" />
              </div>
              <h4 className="text-xs font-bold text-industrial-800">مخزون المحطات</h4>
              <p className="text-[10px] text-industrial-500 mt-1">Full inventory grouped by Station Codes & units.</p>
              
              <div className="mt-4 grid grid-cols-2 gap-2 text-center py-2 border-t border-b border-industrial-100 my-3 bg-white rounded-lg">
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">Stations</span>
                  <span className="text-sm font-extrabold text-brand-600 font-mono">{uniqueStations}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">Unique Brands</span>
                  <span className="text-sm font-extrabold text-industrial-700 font-mono">{uniqueBrands}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadReport('station_inventory')}
              className="mt-2 w-full text-[11px] font-bold bg-white border border-industrial-200 hover:border-brand-500 hover:text-brand-700 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-industrial-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تحميل التقرير (Excel / CSV)</span>
            </button>
          </div>

          {/* Consumption & Issue Status */}
          <div className="border border-industrial-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors bg-industrial-50/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 font-bold px-2 py-0.5 rounded">
                  Work Orders / MRF
                </span>
                <Boxes className="h-4 w-4 text-emerald-500" />
              </div>
              <h4 className="text-xs font-bold text-industrial-800">تقارير الاستهلاك والطلب</h4>
              <p className="text-[10px] text-industrial-500 mt-1">Consumption log tracking issued vs remaining quantities.</p>
              
              <div className="mt-4 grid grid-cols-1 gap-2 text-center py-2 border-t border-b border-industrial-100 my-3 bg-white rounded-lg">
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">Consumed Items</span>
                  <span className="text-sm font-extrabold text-emerald-600 font-mono">{totalConsumedVolume.toLocaleString()} units</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadReport('consumption')}
              className="mt-2 w-full text-[11px] font-bold bg-white border border-industrial-200 hover:border-brand-500 hover:text-brand-700 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-industrial-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تحميل التقرير (Excel / CSV)</span>
            </button>
          </div>

          {/* Calibration / Certificates Report */}
          <div className="border border-industrial-200 rounded-xl p-4 flex flex-col justify-between hover:border-purple-300 transition-colors bg-industrial-50/40">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-purple-600 bg-purple-50 border border-purple-100 font-bold px-2 py-0.5 rounded">
                  Calibration Logs
                </span>
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <h4 className="text-xs font-bold text-industrial-800">تقارير المعايرة والشهادات</h4>
              <p className="text-[10px] text-industrial-500 mt-1">Tracks calibration certs coverage & expiration.</p>
              
              <div className="mt-4 grid grid-cols-1 gap-2 text-center py-2 border-t border-b border-industrial-100 my-3 bg-white rounded-lg">
                <div>
                  <span className="block text-[9px] font-mono text-industrial-400 uppercase">With Calibration Certs</span>
                  <span className="text-sm font-extrabold text-purple-600 font-mono">
                    {calibrationCount} / {totalMaterials} ({totalMaterials > 0 ? Math.round((calibrationCount / totalMaterials) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadReport('calibration')}
              className="mt-2 w-full text-[11px] font-bold bg-white border border-industrial-200 hover:border-brand-500 hover:text-brand-700 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-industrial-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تحميل التقرير (Excel / CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
