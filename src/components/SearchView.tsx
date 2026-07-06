/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Layers, 
  SlidersHorizontal, 
  MapPin, 
  Eye, 
  X, 
  RefreshCcw, 
  Cpu, 
  AlertOctagon, 
  CheckCircle,
  FileSpreadsheet,
  Camera,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Material, User, UserRole } from '../types';
import NameplateScanner from './NameplateScanner';

interface SearchViewProps {
  materials: Material[];
  currentUser: User;
  onInspectMaterial: (material: Material) => void;
}

export default function SearchView({ materials, currentUser, onInspectMaterial }: SearchViewProps) {
  // Advanced Search Inputs
  const [seqQuery, setSeqQuery] = useState('');
  const [partQuery, setPartQuery] = useState('');
  const [descQuery, setDescQuery] = useState('');
  const [mfgQuery, setMfgQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');

  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  const [scanStatus, setScanStatus] = useState<{
    status: 'idle' | 'success' | 'not-found';
    message: string;
    matchedMaterial?: Material;
  }>({ status: 'idle', message: '' });

  const handleResetFilters = () => {
    setSeqQuery('');
    setPartQuery('');
    setDescQuery('');
    setMfgQuery('');
    setModelQuery('');
    setMinQty('');
    setMaxQty('');
    setScanStatus({ status: 'idle', message: '' });
  };

  const handleScanSuccess = (data: Record<string, string | null>) => {
    const scannedPart = data.partNumber ? data.partNumber.trim().toUpperCase() : '';
    const scannedSerial = data.serialNumber ? data.serialNumber.trim().toUpperCase() : '';
    const scannedModel = data.model ? data.model.trim().toUpperCase() : '';
    
    const sanitize = (str: string) => str.replace(/[^A-Z0-9]/ig, '');
    const cleanScannedPart = sanitize(scannedPart);
    const cleanScannedSerial = sanitize(scannedSerial);
    const cleanScannedModel = sanitize(scannedModel);

    let found: Material | undefined = undefined;

    if (cleanScannedPart) {
      found = materials.find(m => {
        const cleanM = sanitize(m.partNumber.toUpperCase());
        return cleanM === cleanScannedPart || cleanM.includes(cleanScannedPart) || cleanScannedPart.includes(cleanM);
      });
    }

    if (!found && cleanScannedSerial) {
      found = materials.find(m => {
        if (!m.serialNumber) return false;
        const cleanM = sanitize(m.serialNumber.toUpperCase());
        return cleanM === cleanScannedSerial || cleanM.includes(cleanScannedSerial) || cleanScannedSerial.includes(cleanM);
      });
    }

    if (!found && cleanScannedModel) {
      found = materials.find(m => {
        const cleanM = sanitize(m.model.toUpperCase());
        return cleanM === cleanScannedModel || cleanM.includes(cleanScannedModel) || cleanScannedModel.includes(cleanM);
      });
    }

    if (found) {
      setScanStatus({
        status: 'success',
        message: `🎯 تم العثور على المادة المطابقة في قاعدة البيانات: ${found.partNumber} · ${found.description}. جاري الانتقال لصفحة المادة وتفاصيلها...`,
        matchedMaterial: found
      });
      setTimeout(() => {
        onInspectMaterial(found!);
        setScanStatus({ status: 'idle', message: '' });
      }, 2000);
    } else {
      if (scannedPart) setPartQuery(scannedPart);
      if (scannedModel) setModelQuery(scannedModel);
      if (data.manufacturer) setMfgQuery(data.manufacturer);

      setScanStatus({
        status: 'not-found',
        message: `⚠️ لم نجد مادة مطابقة تماماً لرقم القطعة "${scannedPart || 'N/A'}". تم ملء حقول البحث ببيانات اللوحة الممسوحة لمساعدتك في العثور عليها أو تسجيلها يدوياً.`,
      });
    }
  };

  // Filter Materials logically
  const matchedMaterials = materials.filter(m => {
    const matchSeq = !seqQuery.trim() || (m.sequence !== undefined && m.sequence.toString().includes(seqQuery.trim()));
    const matchPart = !partQuery.trim() || m.partNumber.toLowerCase().includes(partQuery.trim().toLowerCase());
    const matchDesc = !descQuery.trim() || m.description.toLowerCase().includes(descQuery.trim().toLowerCase());
    const matchMfg = !mfgQuery.trim() || m.manufacturer.toLowerCase().includes(mfgQuery.trim().toLowerCase());
    const matchModel = !modelQuery.trim() || m.model.toLowerCase().includes(modelQuery.trim().toLowerCase());

    let matchMinQty = true;
    if (minQty !== '') {
      const min = parseInt(minQty);
      if (!isNaN(min)) {
        matchMinQty = m.quantity >= min;
      }
    }

    let matchMaxQty = true;
    if (maxQty !== '') {
      const max = parseInt(maxQty);
      if (!isNaN(max)) {
        matchMaxQty = m.quantity <= max;
      }
    }

    return matchSeq && matchPart && matchDesc && matchMfg && matchModel && matchMinQty && matchMaxQty;
  });

  const getStockBadge = (m: Material) => {
    const isLow = m.quantity <= m.minStockLevel;
    if (m.quantity === 0) {
      return (
        <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
          Out of Stock
        </span>
      );
    }
    if (isLow) {
      return (
        <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded animate-pulse">
          Low Stock Warning
        </span>
      );
    }
    return (
      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
        In Stock
      </span>
    );
  };

  return (
    <div className="space-y-6" id="search-view">
      {/* Search Dashboard Header */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
            <SlidersHorizontal className="h-5.5 w-5.5 text-brand-600" /> Multi-Field Advanced Query
          </h2>
          <p className="text-xs text-industrial-500 mt-1">
            Perform granular inventory filtration across individual index keys. Matches are executed in real time.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* AI Visual Scan Search */}
          <NameplateScanner 
            onScanSuccess={handleScanSuccess} 
            renderTrigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-brand-700 cursor-pointer shadow-sm"
              >
                <Camera className="h-4 w-4 animate-pulse" />
                <span>البحث البصري / Camera Search</span>
              </button>
            )}
          />

          <button
            onClick={handleResetFilters}
            className="text-xs bg-industrial-100 hover:bg-industrial-200 text-industrial-700 font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 border border-industrial-200 cursor-pointer"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>Reset Search Fields</span>
          </button>
        </div>
      </div>

      {/* AI Visual Search feedback status */}
      <AnimatePresence>
        {scanStatus.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              scanStatus.status === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {scanStatus.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs font-medium flex-1">
              {scanStatus.message}
            </div>
            <button 
              onClick={() => setScanStatus({ status: 'idle', message: '' })}
              className="text-industrial-400 hover:text-industrial-600"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Filters Form Column */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono pb-2.5 border-b border-industrial-100">
            Query Specifiers
          </h3>

          {/* Material Sequence Number */}
          <div className="space-y-1">
            <label htmlFor="search-seq-input" className="block text-[11px] font-bold text-brand-700 uppercase tracking-wider">
              Material Sequence Number
            </label>
            <input
              id="search-seq-input"
              type="text"
              value={seqQuery}
              onChange={(e) => setSeqQuery(e.target.value)}
              placeholder="e.g. 15, 42..."
              className="w-full bg-brand-50/30 border border-brand-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-brand-900 font-bold"
            />
          </div>

          {/* Part Number */}
          <div className="space-y-1">
            <label htmlFor="search-part-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Part Number
            </label>
            <input
              id="search-part-input"
              type="text"
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              placeholder="e.g. STM32..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Manufacturer */}
          <div className="space-y-1">
            <label htmlFor="search-mfg-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Manufacturer
            </label>
            <input
              id="search-mfg-input"
              type="text"
              value={mfgQuery}
              onChange={(e) => setMfgQuery(e.target.value)}
              placeholder="e.g. Texas Instruments..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Model */}
          <div className="space-y-1">
            <label htmlFor="search-model-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Model / Series
            </label>
            <input
              id="search-model-input"
              type="text"
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="e.g. LM2596..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="search-desc-input" className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Description keywords
            </label>
            <input
              id="search-desc-input"
              type="text"
              value={descQuery}
              onChange={(e) => setDescQuery(e.target.value)}
              placeholder="e.g. Microcontroller, SMD..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
            />
          </div>

          {/* Quantity Min / Max Range */}
          <div className="space-y-1 border-t border-industrial-100 pt-3">
            <span className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider mb-1.5">
              Stock Quantity Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                placeholder="Min Qty"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                id="search-min-qty"
              />
              <input
                type="number"
                min="0"
                value={maxQty}
                onChange={(e) => setMaxQty(e.target.value)}
                placeholder="Max Qty"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                id="search-max-qty"
              />
            </div>
          </div>
        </div>

        {/* Results Stream Column */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Results count indicator */}
          <div className="bg-white px-5 py-3 rounded-xl border border-industrial-200 shadow-xs flex justify-between items-center text-xs text-industrial-500 font-mono">
            <span>Query Results:</span>
            <span className="font-semibold text-industrial-800">{matchedMaterials.length} matching SKUs found</span>
          </div>

          {/* Results grid */}
          {matchedMaterials.length === 0 ? (
            <div className="bg-white text-center p-12 rounded-2xl border border-industrial-200 shadow-sm space-y-3">
              <div className="inline-flex p-4 bg-industrial-100 rounded-full text-industrial-400">
                <Search className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-industrial-800">No Query Matches</p>
              <p className="text-xs text-industrial-500 max-w-sm mx-auto">
                No inventory records match the combined filter search criteria. Try relaxing some query parameters in the side form.
              </p>
              <button
                onClick={handleResetFilters}
                className="text-xs bg-brand-50 text-brand-700 font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer mt-2"
              >
                Reset All Fields
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedMaterials.map((material, idx) => (
                <motion.div
                  key={`${material.partNumber}-${idx}`}
                  whileHover={{ y: -2 }}
                  className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs flex flex-col justify-between hover:border-brand-300 transition-colors cursor-pointer relative overflow-hidden"
                  onClick={() => onInspectMaterial(material)}
                >
                  {/* Card content */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {material.sequence !== undefined && (
                          <span className="text-[10.5px] font-mono font-black text-brand-800 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 shrink-0 shadow-3xs">
                            #{material.sequence}
                          </span>
                        )}
                        <span className="font-mono font-bold text-sm text-industrial-900 truncate tracking-tight">
                          {material.partNumber}
                        </span>
                      </div>
                      {getStockBadge(material)}
                    </div>
                    
                    <p className="text-xs text-industrial-550 leading-relaxed font-sans line-clamp-2 min-h-8 mb-4">
                      {material.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-industrial-500 border-t border-industrial-100 pt-3 mb-3">
                      <div>
                        <span className="text-industrial-400 block uppercase">Manufacturer:</span>
                        <span className="font-semibold text-industrial-700 block truncate">{material.manufacturer}</span>
                      </div>
                      <div>
                        <span className="text-industrial-400 block uppercase">Model Number:</span>
                        <span className="font-semibold text-industrial-700 block truncate">{material.model}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono bg-industrial-50/70 p-2.5 rounded-lg border border-industrial-150">
                      <span className="text-industrial-450 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {material.store.split(' ')[0]}
                      </span>
                      <span className="text-industrial-800 font-semibold">
                        Qty: <span className="text-xs font-extrabold">{material.quantity}</span> {material.unit}
                      </span>
                    </div>
                  </div>

                  {/* Actions inside card */}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect File
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
