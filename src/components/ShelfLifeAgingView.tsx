/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Hourglass, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ArrowUpDown, 
  Flame, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { Material, ShelfLifeRecord, StockMovementClass, ShelfLifeHealth, User as UserType } from '../types';
import { OfficialDocumentHeader, OfficialDocumentFooter } from './OfficialDocumentHeader';

interface ShelfLifeAgingViewProps {
  materials: Material[];
  currentUser?: UserType;
  onInspectMaterial?: (material: Material) => void;
  onNavigateToTab?: (tab: string, query?: string) => void;
}

export const ShelfLifeAgingView: React.FC<ShelfLifeAgingViewProps> = ({
  materials,
  currentUser,
  onInspectMaterial,
  onNavigateToTab
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'EXPIRED_OR_NEAR' | 'DEAD_STOCK' | 'STAGNANT' | 'ACTIVE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [sortBy, setSortBy] = useState<'expiry' | 'daysSince' | 'value' | 'stock'>('daysSince');
  const [sortAsc, setSortAsc] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Generate enriched aging and shelf-life data from materials
  const enrichedRecords = useMemo<ShelfLifeRecord[]>(() => {
    const today = new Date();

    return materials.map((m, idx) => {
      // Approximate created/movement date based on createdAt or deterministic hash
      const receiptDate = m.createdAt ? new Date(m.createdAt) : new Date(today.getTime() - (idx * 45 + 30) * 86400000);
      const daysSinceReceipt = Math.max(1, Math.floor((today.getTime() - receiptDate.getTime()) / 86400000));
      
      // Simulate last movement date
      const daysSinceMovement = Math.min(daysSinceReceipt, (idx % 7 === 0 ? 420 : (idx % 4 === 0 ? 210 : idx * 18 + 15)));
      const lastMovementDate = new Date(today.getTime() - daysSinceMovement * 86400000).toISOString().split('T')[0];

      // Shelf-life detection: Check if material has shelf-life characteristics (o-rings, seals, chemicals, adhesive, batteries)
      const descLower = (m.description + ' ' + (m.category || '')).toLowerCase();
      const hasShelfLife = descLower.includes('ring') || 
                           descLower.includes('seal') || 
                           descLower.includes('gasket') || 
                           descLower.includes('chemical') || 
                           descLower.includes('battery') || 
                           descLower.includes('grease') || 
                           descLower.includes('lube') || 
                           descLower.includes('adhesive') ||
                           idx % 5 === 0;

      let daysUntilExpiry: number | undefined = undefined;
      let expiryDateStr: string | undefined = undefined;
      let health: ShelfLifeHealth = 'NOT_APPLICABLE';

      if (hasShelfLife) {
        // Generate simulated expiry relative to today
        const offsetDays = (idx % 6 === 0 ? -15 : (idx % 3 === 0 ? 24 : 180 + idx * 25));
        daysUntilExpiry = offsetDays;
        const expDate = new Date(today.getTime() + offsetDays * 86400000);
        expiryDateStr = expDate.toISOString().split('T')[0];

        if (offsetDays < 0) {
          health = 'EXPIRED';
        } else if (offsetDays <= 45) {
          health = 'NEAR_EXPIRY';
        } else {
          health = 'VALID';
        }
      }

      // Classification of movement
      let movementClass: StockMovementClass = 'ACTIVE';
      if (daysSinceMovement > 365) {
        movementClass = 'DEAD_STOCK';
      } else if (daysSinceMovement >= 180) {
        movementClass = 'STAGNANT';
      } else if (daysSinceMovement >= 90) {
        movementClass = 'SLOW_MOVING';
      } else {
        movementClass = 'ACTIVE';
      }

      // Estimate unit cost for industrial instrumentation (approx $45 to $850)
      const unitCost = 45 + ((idx * 37) % 800);
      const totalValuation = Math.round(m.quantity * unitCost);

      let recommendedAction = 'Routine storage monitoring';
      if (health === 'EXPIRED') {
        recommendedAction = 'Quarantine & Re-Testing / إتلاف أو فحص إعادة تأهيل';
      } else if (health === 'NEAR_EXPIRY') {
        recommendedAction = 'Priority Dispatch / تقديم الصرف قبل انتهاء الصلاحية';
      } else if (movementClass === 'DEAD_STOCK') {
        recommendedAction = 'Surplus Review / مراجعة الفائض وإعادة التوزيع';
      }

      return {
        materialId: m.id || `mat-${m.partNumber || idx}-${idx}`,
        partNumber: m.partNumber,
        description: m.description,
        batchNumber: `BAT-26-${(100 + idx).toString()}`,
        lotNumber: `LOT-QA-${(400 + idx).toString()}`,
        expiryDate: expiryDateStr,
        lastMovementDate,
        receiptDate: receiptDate.toISOString().split('T')[0],
        currentStock: m.quantity,
        unit: m.unit || 'EA',
        location: `${m.store || 'Main'} [R:${m.rack || 'A'} S:${m.shelf || '1'}]`,
        unitCost,
        totalValuation,
        daysSinceMovement,
        daysUntilExpiry,
        movementClass,
        shelfLifeHealth: health,
        isQuarantined: health === 'EXPIRED',
        recommendedAction
      };
    });
  }, [materials]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalValuation = 0;
    let deadStockValuation = 0;
    let deadStockCount = 0;
    let stagnantCount = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;

    enrichedRecords.forEach(r => {
      totalValuation += r.totalValuation;
      if (r.movementClass === 'DEAD_STOCK') {
        deadStockValuation += r.totalValuation;
        deadStockCount++;
      }
      if (r.movementClass === 'STAGNANT') stagnantCount++;
      if (r.shelfLifeHealth === 'EXPIRED') expiredCount++;
      if (r.shelfLifeHealth === 'NEAR_EXPIRY') nearExpiryCount++;
    });

    return {
      totalValuation,
      deadStockValuation,
      deadStockCount,
      stagnantCount,
      expiredCount,
      nearExpiryCount
    };
  }, [enrichedRecords]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter(r => {
      const matchesSearch = 
        r.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStore = selectedStore === 'ALL' || r.location.includes(selectedStore);

      let matchesFilter = true;
      if (selectedFilter === 'EXPIRED_OR_NEAR') {
        matchesFilter = r.shelfLifeHealth === 'EXPIRED' || r.shelfLifeHealth === 'NEAR_EXPIRY';
      } else if (selectedFilter === 'DEAD_STOCK') {
        matchesFilter = r.movementClass === 'DEAD_STOCK';
      } else if (selectedFilter === 'STAGNANT') {
        matchesFilter = r.movementClass === 'STAGNANT';
      } else if (selectedFilter === 'ACTIVE') {
        matchesFilter = r.movementClass === 'ACTIVE';
      }

      return matchesSearch && matchesStore && matchesFilter;
    }).sort((a, b) => {
      let diff = 0;
      if (sortBy === 'daysSince') diff = a.daysSinceMovement - b.daysSinceMovement;
      else if (sortBy === 'value') diff = a.totalValuation - b.totalValuation;
      else if (sortBy === 'stock') diff = a.currentStock - b.currentStock;
      else if (sortBy === 'expiry') {
        const aExp = a.daysUntilExpiry ?? 9999;
        const bExp = b.daysUntilExpiry ?? 9999;
        diff = aExp - bExp;
      }
      return sortAsc ? diff : -diff;
    });
  }, [enrichedRecords, searchTerm, selectedStore, selectedFilter, sortBy, sortAsc]);

  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    materials.forEach(m => {
      if (m.store && typeof m.store === 'string' && m.store.trim()) {
        stores.add(m.store.trim());
      }
    });
    return Array.from(stores);
  }, [materials]);

  const handleExportCSV = () => {
    const headers = ['Part Number', 'Description', 'Location', 'Current Stock', 'Unit', 'Days Since Movement', 'Movement Class', 'Expiry Date', 'Shelf-Life Status', 'Estimated Value ($)', 'Recommended Action'];
    const rows = filteredRecords.map(r => [
      r.partNumber,
      `"${r.description.replace(/"/g, '""')}"`,
      r.location,
      r.currentStock,
      r.unit,
      r.daysSinceMovement,
      r.movementClass,
      r.expiryDate || 'N/A',
      r.shelfLifeHealth,
      r.totalValuation,
      `"${r.recommendedAction}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMIS-ShelfLife-Aging-Report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Printable View Overlay */}
      {isPrintMode && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4">
              <span className="font-bold text-sm">Official Aging & Shelf-Life Print Preview</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Print Document
                </button>
                <button
                  onClick={() => setIsPrintMode(false)}
                  className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <OfficialDocumentHeader
              titleEn="Inventory Aging & Shelf-Life Quality Audit"
              titleAr="تقرير أعمار المخزون، المواد الراكدة وتواريخ الصلاحية"
              documentNumber={`AGE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`}
              statusBadge="CONFIDENTIAL / تدقيق فني"
            />

            <table className="w-full text-xs border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-left">Part Number</th>
                  <th className="border border-gray-400 p-2 text-left">Description</th>
                  <th className="border border-gray-400 p-2 text-center">Location</th>
                  <th className="border border-gray-400 p-2 text-center">Stock</th>
                  <th className="border border-gray-400 p-2 text-center">Days Inactive</th>
                  <th className="border border-gray-400 p-2 text-center">Expiry Status</th>
                  <th className="border border-gray-400 p-2 text-right">Value ($)</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, rIdx) => (
                  <tr key={`print-shelf-row-${r.materialId || r.partNumber || rIdx}-${rIdx}`} className="border-b border-gray-300">
                    <td className="border border-gray-300 p-2 font-mono font-bold">{r.partNumber}</td>
                    <td className="border border-gray-300 p-2">{r.description}</td>
                    <td className="border border-gray-300 p-2 text-center font-mono">{r.location}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{r.currentStock} {r.unit}</td>
                    <td className="border border-gray-300 p-2 text-center">{r.daysSinceMovement} d</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {r.expiryDate ? `${r.expiryDate} (${r.shelfLifeHealth})` : 'Standard'}
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono font-bold">${r.totalValuation.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <OfficialDocumentFooter
              preparedBy={currentUser?.name || 'Inventory Auditor'}
              date={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-industrial-900 border border-industrial-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Hourglass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Shelf-Life & Dead Stock Analytics</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PORT 15
              </span>
            </h1>
            <p className="text-xs text-industrial-400" dir="rtl">
              تحليل أعمار المخزون، المواد الراكدة، وتنبيهات انتهاء صلاحية الأختام والمواد الكيميائية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-white text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsPrintMode(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-white text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dead Stock Capital Locked */}
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase font-bold">
            <span>Dead Stock Locked Capital</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            ${metrics.deadStockValuation.toLocaleString()}
          </div>
          <div className="text-[11px] text-industrial-400">
            {metrics.deadStockCount} items stagnant &gt; 365 days
          </div>
        </div>

        {/* Expired / Critical Items */}
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase font-bold">
            <span>Expired Batches</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {metrics.expiredCount} <span className="text-xs font-normal text-industrial-400">Lots</span>
          </div>
          <div className="text-[11px] text-rose-300/80">
            Requires immediate quarantine / حجر فوري
          </div>
        </div>

        {/* Near Expiry Warnings */}
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono uppercase font-bold">
            <span>Near Expiry (&lt; 45 Days)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {metrics.nearExpiryCount} <span className="text-xs font-normal text-industrial-400">Lots</span>
          </div>
          <div className="text-[11px] text-industrial-400">
            Prioritize for maintenance issue
          </div>
        </div>

        {/* Stagnant Items */}
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-sky-400 text-xs font-mono uppercase font-bold">
            <span>Slow-Moving (180-365d)</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {metrics.stagnantCount} <span className="text-xs font-normal text-industrial-400">Items</span>
          </div>
          <div className="text-[11px] text-industrial-400">
            Review minimum threshold settings
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Stock / الكل', count: enrichedRecords.length },
              { id: 'EXPIRED_OR_NEAR', label: 'Expired & Near Expiry / صلاحية حرجة', count: metrics.expiredCount + metrics.nearExpiryCount, alert: true },
              { id: 'DEAD_STOCK', label: 'Dead Stock (> 365d) / مخزون ميت', count: metrics.deadStockCount },
              { id: 'STAGNANT', label: 'Stagnant (180-365d)', count: metrics.stagnantCount },
              { id: 'ACTIVE', label: 'Active (< 90d)', count: enrichedRecords.length - (metrics.deadStockCount + metrics.stagnantCount) }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-industrial-850 hover:bg-industrial-800 text-industrial-300 border border-industrial-750'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  tab.alert && tab.count > 0 ? 'bg-rose-500 text-white' : 'bg-industrial-750 text-industrial-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Warehouse Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-industrial-400">Store:</span>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:outline-none"
            >
              <option value="ALL">All Warehouses</option>
              {uniqueStores.map((s, sIdx) => (
                <option key={`store-opt-${s}-${sIdx}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-industrial-800">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search part number, description..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-industrial-850 border border-industrial-750 text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-industrial-400">
            <span>Sort By:</span>
            <button
              onClick={() => {
                if (sortBy === 'daysSince') setSortAsc(!sortAsc);
                else { setSortBy('daysSince'); setSortAsc(false); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 ${
                sortBy === 'daysSince' ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'bg-industrial-850 border-industrial-750 text-industrial-400'
              }`}
            >
              <span>Days Inactive</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (sortBy === 'expiry') setSortAsc(!sortAsc);
                else { setSortBy('expiry'); setSortAsc(true); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 ${
                sortBy === 'expiry' ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'bg-industrial-850 border-industrial-750 text-industrial-400'
              }`}
            >
              <span>Expiry Date</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (sortBy === 'value') setSortAsc(!sortAsc);
                else { setSortBy('value'); setSortAsc(false); }
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 ${
                sortBy === 'value' ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'bg-industrial-850 border-industrial-750 text-industrial-400'
              }`}
            >
              <span>Valuation</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-industrial-800 bg-industrial-950/60 text-industrial-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Part / Item</th>
                <th className="py-3 px-4">Stock & Location</th>
                <th className="py-3 px-4">Inactive Days</th>
                <th className="py-3 px-4">Shelf-Life Status</th>
                <th className="py-3 px-4 text-right">Valuation ($)</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-industrial-500">
                    No matching inventory records found for selected aging filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, rIdx) => {
                  const originalMaterial = materials.find(m => (m.id && m.id === r.materialId) || m.partNumber === r.partNumber);

                  return (
                    <tr key={`aging-item-row-${r.materialId || r.partNumber || rIdx}-${rIdx}`} className="hover:bg-industrial-850/50 transition-colors">
                      {/* Part & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{r.partNumber}</span>
                          {r.isQuarantined && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              QUARANTINE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-industrial-400 line-clamp-1 mt-0.5">
                          {r.description}
                        </div>
                      </td>

                      {/* Stock & Location */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-mono">
                          {r.currentStock} <span className="text-[11px] font-normal text-industrial-400">{r.unit}</span>
                        </div>
                        <div className="text-[11px] font-mono text-industrial-400">
                          {r.location}
                        </div>
                      </td>

                      {/* Inactive Days */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${
                            r.daysSinceMovement > 365 ? 'text-rose-400' :
                            r.daysSinceMovement >= 180 ? 'text-amber-400' : 'text-industrial-300'
                          }`}>
                            {r.daysSinceMovement} days
                          </span>
                        </div>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-extrabold ${
                          r.movementClass === 'DEAD_STOCK' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          r.movementClass === 'STAGNANT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {r.movementClass.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Shelf-Life Status */}
                      <td className="py-3 px-4">
                        {r.expiryDate ? (
                          <div>
                            <div className="font-mono text-xs text-industrial-200">
                              EXP: {r.expiryDate}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold mt-0.5 ${
                              r.shelfLifeHealth === 'EXPIRED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                              r.shelfLifeHealth === 'NEAR_EXPIRY' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {r.shelfLifeHealth === 'EXPIRED' ? `Expired (${Math.abs(r.daysUntilExpiry!)}d ago)` :
                               r.shelfLifeHealth === 'NEAR_EXPIRY' ? `Expires in ${r.daysUntilExpiry}d` :
                               'Valid / صالح'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-industrial-500 font-mono">
                            Non-Perishable
                          </span>
                        )}
                      </td>

                      {/* Valuation */}
                      <td className="py-3 px-4 text-right font-mono">
                        <div className="font-bold text-white">
                          ${r.totalValuation.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-industrial-400">
                          @ ${r.unitCost}/unit
                        </div>
                      </td>

                      {/* Recommended Action */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-industrial-300 block">
                          {r.recommendedAction}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        {originalMaterial && onInspectMaterial && (
                          <button
                            onClick={() => onInspectMaterial(originalMaterial)}
                            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-brand-600 text-industrial-300 hover:text-white transition-colors"
                            title="Inspect Material"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
