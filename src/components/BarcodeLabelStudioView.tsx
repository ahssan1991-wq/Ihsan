/**
 * EMIS Industrial Barcode & Shelf Label Studio
 * Professional thermal and sheet label designer for warehouse racks, bin boxes, and asset tags.
 */

import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  QrCode, 
  Barcode as BarcodeIcon, 
  Layers, 
  Search, 
  CheckSquare, 
  Square, 
  Sliders, 
  FileText, 
  Tag, 
  Warehouse, 
  Sparkles, 
  Eye, 
  Download,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { Material, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { generateBarcodeSVG } from '../utils/barcodeGenerator';
import { openPrintPreview } from '../utils/printManager';

interface BarcodeLabelStudioProps {
  materials: Material[];
  currentUser: User | null;
  onInspectMaterial?: (m: Material) => void;
}

export type LabelPresetId = 'shelf_50x25' | 'bin_100x50' | 'compact_38x19' | 'a4_sheet_24';

interface LabelConfig {
  preset: LabelPresetId;
  copiesPerItem: number;
  showBarcode: boolean;
  showQRCode: boolean;
  showPartNumber: boolean;
  showDescription: boolean;
  showArabicName: boolean;
  showLocation: boolean;
  showManufacturer: boolean;
  showStockStatus: boolean;
  showSite: boolean;
  barcodeType: 'CODE128' | 'QR';
}

export const BarcodeLabelStudioView: React.FC<BarcodeLabelStudioProps> = ({
  materials,
  currentUser,
  onInspectMaterial
}) => {
  const { language, isRTL } = useLanguage();

  // Selected materials for printing
  const [selectedPartNumbers, setSelectedPartNumbers] = useState<string[]>(() => {
    // Default select first 3 items or empty
    return materials.slice(0, 3).map(m => m.partNumber);
  });

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  // Label configuration
  const [config, setConfig] = useState<LabelConfig>({
    preset: 'shelf_50x25',
    copiesPerItem: 1,
    showBarcode: true,
    showQRCode: true,
    showPartNumber: true,
    showDescription: true,
    showArabicName: true,
    showLocation: true,
    showManufacturer: true,
    showStockStatus: false,
    showSite: true,
    barcodeType: 'CODE128'
  });

  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Available categories & warehouses
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => { if (m.category) set.add(m.category); });
    return Array.from(set).sort();
  }, [materials]);

  const warehouses = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => { if (m.warehouse) set.add(m.warehouse); });
    return Array.from(set).sort();
  }, [materials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return materials.filter(m => {
      const matchesSearch = !q || 
        m.partNumber.toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.arabicDescription || '').toLowerCase().includes(q) ||
        (m.model || '').toLowerCase().includes(q) ||
        (m.manufacturer || '').toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchesWh = warehouseFilter === 'ALL' || m.warehouse === warehouseFilter;

      return matchesSearch && matchesCat && matchesWh;
    });
  }, [materials, searchQuery, categoryFilter, warehouseFilter]);

  // Selected materials objects
  const selectedMaterials = useMemo(() => {
    const set = new Set(selectedPartNumbers);
    return materials.filter(m => set.has(m.partNumber));
  }, [materials, selectedPartNumbers]);

  const activePreviewMaterial = selectedMaterials[activePreviewIndex] || selectedMaterials[0] || materials[0];

  // Toggle selection
  const toggleSelect = (partNo: string) => {
    setSelectedPartNumbers(prev => 
      prev.includes(partNo) ? prev.filter(p => p !== partNo) : [...prev, partNo]
    );
  };

  const selectAllFiltered = () => {
    const allFilteredParts = filteredMaterials.map(m => m.partNumber);
    setSelectedPartNumbers(prev => Array.from(new Set([...prev, ...allFilteredParts])));
  };

  const deselectAll = () => {
    setSelectedPartNumbers([]);
  };

  // Generate Print HTML
  const handlePrintLabels = () => {
    if (selectedMaterials.length === 0) return;

    const host = window.location.origin;
    const isA4 = config.preset === 'a4_sheet_24';
    
    // Label sizing CSS based on preset
    let labelWidthMm = 50;
    let labelHeightMm = 25;
    let pageCss = '';

    if (config.preset === 'shelf_50x25') {
      labelWidthMm = 50;
      labelHeightMm = 25;
      pageCss = `@page { size: 50mm 25mm; margin: 0; } body { margin: 0; background: #fff; }`;
    } else if (config.preset === 'bin_100x50') {
      labelWidthMm = 100;
      labelHeightMm = 50;
      pageCss = `@page { size: 100mm 50mm; margin: 0; } body { margin: 0; background: #fff; }`;
    } else if (config.preset === 'compact_38x19') {
      labelWidthMm = 38;
      labelHeightMm = 19;
      pageCss = `@page { size: 38mm 19mm; margin: 0; } body { margin: 0; background: #fff; }`;
    } else if (isA4) {
      pageCss = `@page { size: A4 portrait; margin: 10mm; } body { margin: 0; background: #fff; }`;
    }

    // Build items list according to copiesPerItem
    const printQueue: Material[] = [];
    selectedMaterials.forEach(m => {
      for (let c = 0; c < config.copiesPerItem; c++) {
        printQueue.push(m);
      }
    });

    const labelsHtml = printQueue.map(m => {
      const passportUrl = `${host}/?passport=${encodeURIComponent(m.partNumber)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(passportUrl)}`;
      const barcodeSvg = generateBarcodeSVG(m.partNumber, {
        height: config.preset === 'bin_100x50' ? 42 : config.preset === 'compact_38x19' ? 22 : 30,
        barWidth: config.preset === 'compact_38x19' ? 1.4 : 1.8,
        includeText: false
      });

      if (config.preset === 'shelf_50x25') {
        return `
          <div class="label-box shelf-label">
            <div class="label-header">
              <span class="part-number">${m.partNumber}</span>
              ${config.showSite ? `<span class="site-tag">${m.site || 'MAIN'}</span>` : ''}
            </div>
            <div class="desc-line">${m.description || m.name || ''}</div>
            ${config.showArabicName && m.arabicDescription ? `<div class="desc-line-ar" dir="rtl">${m.arabicDescription}</div>` : ''}
            <div class="footer-row">
              <div class="barcode-container">
                ${config.showBarcode ? barcodeSvg : ''}
                <div class="code-subtext">${m.manufacturer || ''} ${m.model || ''}</div>
              </div>
              <div class="loc-box">
                <span class="loc-title">LOC / الرف</span>
                <span class="loc-val">${m.location || `${m.warehouse || 'WH-01'}`}</span>
              </div>
              ${config.showQRCode ? `<img class="qr-code-img" src="${qrApiUrl}" alt="QR" />` : ''}
            </div>
          </div>
        `;
      } else if (config.preset === 'bin_100x50') {
        return `
          <div class="label-box bin-label">
            <div class="bin-header">
              <div>
                <span class="bin-sys">EMIS INDUSTRIAL ASSET</span>
                <div class="bin-part">${m.partNumber}</div>
              </div>
              <div class="bin-loc-block">
                <span class="loc-lbl">LOCATION / الموقع</span>
                <span class="loc-val-large">${m.location || 'RACK-01'}</span>
                <span class="loc-sub">${m.warehouse || 'MAIN STORE'}</span>
              </div>
            </div>
            <div class="bin-body">
              <div class="bin-desc">${m.description}</div>
              ${config.showArabicName && m.arabicDescription ? `<div class="bin-desc-ar" dir="rtl">${m.arabicDescription}</div>` : ''}
              <div class="bin-meta-row">
                <span><b>MFG:</b> ${m.manufacturer || 'OEM'}</span>
                <span><b>MODEL:</b> ${m.model || 'STD'}</span>
                <span><b>CAT:</b> ${m.category || 'GEN'}</span>
                ${config.showStockStatus ? `<span><b>MIN:</b> ${m.minStockLevel || 0} ${m.unit || 'EA'}</span>` : ''}
              </div>
            </div>
            <div class="bin-footer">
              <div class="barcode-wrapper">
                ${config.showBarcode ? barcodeSvg : ''}
                <div class="barcode-legend">${m.partNumber}</div>
              </div>
              ${config.showQRCode ? `
                <div class="qr-wrapper">
                  <img class="qr-code-img-large" src="${qrApiUrl}" alt="QR" />
                  <span class="qr-lbl">SCAN PASSPORT</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else if (config.preset === 'compact_38x19') {
        return `
          <div class="label-box compact-label">
            <div class="compact-left">
              <div class="compact-part">${m.partNumber}</div>
              <div class="compact-desc">${(m.description || '').slice(0, 32)}</div>
              ${config.showBarcode ? barcodeSvg : ''}
              <div class="compact-loc">${m.location || m.warehouse || 'LOC'}</div>
            </div>
            ${config.showQRCode ? `<img class="compact-qr" src="${qrApiUrl}" alt="QR" />` : ''}
          </div>
        `;
      } else {
        // A4 24-up
        return `
          <div class="a4-cell">
            <div class="a4-cell-inner">
              <div class="a4-part">${m.partNumber}</div>
              <div class="a4-desc">${(m.description || '').slice(0, 35)}</div>
              <div class="a4-barcode">${barcodeSvg}</div>
              <div class="a4-loc">LOC: ${m.location || m.warehouse || 'STORE'}</div>
            </div>
          </div>
        `;
      }
    }).join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>EMIS Labels - ${selectedMaterials.length} Items</title>
        <style>
          ${pageCss}
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          
          /* Single Thermal Label Styling */
          .label-box {
            background: #fff;
            color: #000;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
          }

          /* Shelf 50x25mm */
          .shelf-label {
            width: 50mm;
            height: 25mm;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 0.5pt solid #000;
            padding-bottom: 0.8pt;
          }
          .part-number { font-size: 8.5pt; font-weight: 900; letter-spacing: 0.5px; font-family: monospace; }
          .site-tag { font-size: 5pt; font-weight: bold; background: #000; color: #fff; padding: 1pt 2pt; border-radius: 1pt; }
          .desc-line { font-size: 5.5pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1pt; }
          .desc-line-ar { font-size: 5.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .footer-row {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 2mm;
          }
          .barcode-container { flex: 1; overflow: hidden; }
          .barcode-container svg { max-height: 8mm; width: 100%; display: block; }
          .code-subtext { font-size: 4.5pt; font-family: monospace; color: #333; }
          .loc-box {
            border: 0.8pt solid #000;
            border-radius: 1.5pt;
            padding: 1pt 2.5pt;
            text-align: center;
            min-width: 12mm;
          }
          .loc-title { display: block; font-size: 4pt; font-weight: bold; }
          .loc-val { display: block; font-size: 6.5pt; font-weight: 900; }
          .qr-code-img { width: 8mm; height: 8mm; }

          /* Bin Card 100x50mm */
          .bin-label {
            width: 100mm;
            height: 50mm;
            padding: 3mm 4mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 0.5pt solid #ccc;
          }
          .bin-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1.5pt solid #000;
            padding-bottom: 2mm;
          }
          .bin-sys { font-size: 6.5pt; font-weight: bold; letter-spacing: 1px; color: #444; }
          .bin-part { font-size: 15pt; font-weight: 900; font-family: monospace; }
          .bin-loc-block {
            border: 1.5pt solid #000;
            border-radius: 2pt;
            padding: 1mm 3mm;
            text-align: right;
            min-width: 25mm;
          }
          .loc-lbl { display: block; font-size: 5pt; font-weight: bold; }
          .loc-val-large { display: block; font-size: 11pt; font-weight: 900; }
          .loc-sub { display: block; font-size: 6pt; color: #555; }
          .bin-body { flex: 1; margin: 2mm 0; }
          .bin-desc { font-size: 9pt; font-weight: 700; line-height: 1.2; }
          .bin-desc-ar { font-size: 8.5pt; line-height: 1.2; margin-top: 1mm; }
          .bin-meta-row { display: flex; gap: 4mm; font-size: 6.5pt; color: #333; margin-top: 1.5mm; }
          .bin-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.5pt solid #888; padding-top: 1.5mm; }
          .barcode-wrapper { flex: 1; }
          .barcode-wrapper svg { max-height: 14mm; width: 85%; }
          .barcode-legend { font-size: 7.5pt; font-family: monospace; font-weight: bold; margin-top: 1pt; }
          .qr-wrapper { text-align: center; }
          .qr-code-img-large { width: 14mm; height: 14mm; }
          .qr-lbl { display: block; font-size: 4.5pt; font-weight: bold; margin-top: 1pt; }

          /* Compact 38x19mm */
          .compact-label {
            width: 38mm;
            height: 19mm;
            padding: 1mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .compact-left { flex: 1; overflow: hidden; }
          .compact-part { font-size: 7pt; font-weight: 900; font-family: monospace; }
          .compact-desc { font-size: 4.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .compact-loc { font-size: 5pt; font-weight: bold; }
          .compact-qr { width: 8mm; height: 8mm; margin-left: 1mm; }

          /* A4 Sheet 24-up */
          .a4-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(8, 1fr);
            gap: 2mm;
            width: 100%;
            height: 277mm;
            page-break-after: always;
          }
          .a4-cell {
            border: 0.5pt dashed #aaa;
            padding: 2mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .a4-cell-inner { width: 100%; text-align: center; }
          .a4-part { font-size: 9pt; font-weight: 900; font-family: monospace; }
          .a4-desc { font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .a4-barcode svg { max-height: 8mm; width: 90%; margin: 1mm auto; }
          .a4-loc { font-size: 6pt; font-weight: bold; }
        </style>
      </head>
      <body>
        ${isA4 ? `<div class="a4-grid">${labelsHtml}</div>` : labelsHtml}
      </body>
      </html>
    `;

    openPrintPreview(
      `Labels_${selectedMaterials.length}_Items`,
      fullHtml,
      `EMIS_Labels_${Date.now()}.html`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-industrial-900 via-industrial-850 to-brand-950 p-6 rounded-2xl border border-industrial-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand-500/20 border border-brand-500/30 rounded-xl text-brand-400 shrink-0">
            <BarcodeIcon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black heading-display">
                {language === 'ar' ? 'استوديو طباعة ملصقات الباركود والرفوف' : 'Barcode & Shelf Label Studio'}
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 font-bold">
                THERMAL & DOCKET READY
              </span>
            </div>
            <p className="text-xs text-industrial-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'توليد وطباعة ملصقات الرفوف الصناعية وحاويات الصناديق بدقة عالية بمقاسات الطابعات الحرارية (Zebra / Dymo / TSC) مع رموز Code 128 وروابط جواز المادة الرقمي QR.'
                : 'High-precision industrial label generation for shelf racks, bin cards, and asset tags. Tuned for Zebra, Dymo, Brother thermal printers and standard A4 sheets.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handlePrintLabels}
            disabled={selectedMaterials.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>
              {language === 'ar'
                ? `طباعة ${selectedMaterials.length * config.copiesPerItem} ملصق`
                : `Print ${selectedMaterials.length * config.copiesPerItem} Labels`}
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Material Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-500" />
                <h2 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
                  {language === 'ar' ? 'اختيار المواد للطباعة' : 'Select Materials'}
                </h2>
                <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {selectedPartNumbers.length} / {materials.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline px-1.5 py-0.5"
                >
                  {language === 'ar' ? 'تحديد الكل' : 'Select All'}
                </button>
                <span className="text-industrial-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] font-semibold text-industrial-500 hover:underline px-1.5 py-0.5"
                >
                  {language === 'ar' ? 'إلغاء' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث برقم المادة أو الوصف أو الموقع...' : 'Search part #, name, rack location...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-800"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-800"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع المستودعات' : 'All Warehouses'}</option>
                  {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            {/* Material List with Checkboxes */}
            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {filteredMaterials.length === 0 ? (
                <div className="p-6 text-center text-xs text-industrial-400">
                  {language === 'ar' ? 'لا توجد مواد مطابقة للبحث' : 'No matching materials found.'}
                </div>
              ) : (
                filteredMaterials.map((m) => {
                  const isChecked = selectedPartNumbers.includes(m.partNumber);
                  return (
                    <div
                      key={m.partNumber}
                      onClick={() => toggleSelect(m.partNumber)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-brand-50/60 dark:bg-brand-950/30 border-brand-300 dark:border-brand-700'
                          : 'bg-white dark:bg-industrial-850 hover:bg-industrial-50 dark:hover:bg-industrial-800/60 border-industrial-200 dark:border-industrial-750'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-brand-600 dark:text-brand-400 shrink-0"
                      >
                        {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-industrial-300" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-industrial-900 dark:text-industrial-100">
                            {m.partNumber}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300">
                            {m.location || m.warehouse || 'RACK-01'}
                          </span>
                        </div>

                        <p className="text-[11px] text-industrial-600 dark:text-industrial-300 truncate mt-0.5">
                          {m.description || m.name}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-industrial-400 mt-1 font-mono">
                          <span>Qty: {m.quantity} {m.unit}</span>
                          {m.manufacturer && <span>• {m.manufacturer}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Label Settings & Live Interactive Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Label Presets & Formatting Controls */}
          <div className="bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-500" />
                <h2 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
                  {language === 'ar' ? 'إعدادات وقالب الملصق' : 'Label Format & Layout'}
                </h2>
              </div>

              {/* Copies input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-industrial-500 font-semibold">
                  {language === 'ar' ? 'نسخ لكل مادة:' : 'Copies each:'}
                </span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.copiesPerItem}
                  onChange={(e) => setConfig({ ...config, copiesPerItem: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-16 px-2 py-1 text-xs text-center font-bold rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-800"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'shelf_50x25',
                  name: language === 'ar' ? 'ملصق رف 50×25 مم' : 'Shelf (50x25mm)',
                  desc: 'Standard metal rack edge',
                  badge: '2" x 1"'
                },
                {
                  id: 'bin_100x50',
                  name: language === 'ar' ? 'بطاقة صندوق 100×50 مم' : 'Bin Card (100x50mm)',
                  desc: 'Pallet / Box card',
                  badge: '4" x 2"'
                },
                {
                  id: 'compact_38x19',
                  name: language === 'ar' ? 'ملصق أسلاك 38×19 مم' : 'Compact (38x19mm)',
                  desc: 'Cable / small parts',
                  badge: '1.5" x 0.75"'
                },
                {
                  id: 'a4_sheet_24',
                  name: language === 'ar' ? 'ورقة A4 (24 ملصق)' : 'A4 Sheet (24-up)',
                  desc: 'Office sticker paper',
                  badge: 'Laser / Inkjet'
                }
              ].map(p => {
                const isSelected = config.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConfig({ ...config, preset: p.id as LabelPresetId })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-brand-800 dark:text-brand-200 ring-2 ring-brand-500/20 shadow-2xs'
                        : 'bg-industrial-50/50 dark:bg-industrial-800/50 border-industrial-200 dark:border-industrial-700 hover:bg-industrial-100 dark:hover:bg-industrial-800 text-industrial-700 dark:text-industrial-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700">
                      {p.badge}
                    </span>
                    <div className="font-bold text-xs mt-1.5 truncate">{p.name}</div>
                    <div className="text-[10px] text-industrial-400 mt-0.5 truncate">{p.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Content Toggles */}
            <div className="pt-2 border-t border-industrial-100 dark:border-industrial-800">
              <span className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider block mb-2">
                {language === 'ar' ? 'العناصر المراد إظهارها في الملصق:' : 'Label Elements & Information:'}
              </span>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'showBarcode', label: language === 'ar' ? 'باركود Code 128' : 'Barcode 128', icon: BarcodeIcon },
                  { key: 'showQRCode', label: language === 'ar' ? 'رمز QR جواز المادة' : 'QR Passport', icon: QrCode },
                  { key: 'showArabicName', label: language === 'ar' ? 'الوصف العربي' : 'Arabic Name', icon: Tag },
                  { key: 'showLocation', label: language === 'ar' ? 'الموقع والرف' : 'Location / Bin', icon: Warehouse },
                  { key: 'showManufacturer', label: language === 'ar' ? 'المصنع والطراز' : 'Manufacturer & Model', icon: FileText },
                  { key: 'showStockStatus', label: language === 'ar' ? 'الحد الأدنى للمخزون' : 'Min Stock Level', icon: Layers }
                ].map(opt => {
                  const isActive = config[opt.key as keyof LabelConfig];
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setConfig({ ...config, [opt.key]: !isActive })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                          : 'bg-white dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700 hover:bg-industrial-100'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Live Label Preview */}
          <div className="bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-bold text-industrial-900 dark:text-industrial-100">
                  {language === 'ar' ? 'المعاينة المباشرة للملصق الحراري' : 'Live High-DPI Label Preview'}
                </h3>
              </div>

              {selectedMaterials.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activePreviewIndex === 0}
                    onClick={() => setActivePreviewIndex(p => Math.max(0, p - 1))}
                    className="px-2 py-1 text-xs rounded border border-industrial-200 dark:border-industrial-700 disabled:opacity-30 cursor-pointer"
                  >
                    ‹
                  </button>
                  <span className="text-xs font-mono">
                    {activePreviewIndex + 1} / {selectedMaterials.length}
                  </span>
                  <button
                    type="button"
                    disabled={activePreviewIndex >= selectedMaterials.length - 1}
                    onClick={() => setActivePreviewIndex(p => Math.min(selectedMaterials.length - 1, p + 1))}
                    className="px-2 py-1 text-xs rounded border border-industrial-200 dark:border-industrial-700 disabled:opacity-30 cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* Realistic Label Canvas Box */}
            <div className="bg-industrial-100 dark:bg-industrial-950 p-8 rounded-xl flex items-center justify-center min-h-[260px] border border-industrial-200 dark:border-industrial-800">
              {activePreviewMaterial ? (
                <div 
                  className={`bg-white text-black shadow-xl rounded-md border border-industrial-300 flex flex-col justify-between transition-all select-none ${
                    config.preset === 'bin_100x50'
                      ? 'w-[420px] min-h-[210px] p-4'
                      : config.preset === 'compact_38x19'
                      ? 'w-[280px] min-h-[140px] p-2.5'
                      : 'w-[360px] min-h-[180px] p-3'
                  }`}
                >
                  {/* Top Bar: Part No & Site */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-1">
                    <div>
                      <span className="text-[10px] font-mono tracking-wider font-bold text-industrial-500 uppercase block">
                        EMIS ASSET TAG
                      </span>
                      <span className="text-base font-black font-mono tracking-wide">
                        {activePreviewMaterial.partNumber}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold bg-black text-white px-2 py-0.5 rounded font-mono">
                        {activePreviewMaterial.site || 'SITE-A'}
                      </span>
                      {config.showLocation && (
                        <div className="text-xs font-black mt-0.5">
                          {activePreviewMaterial.location || 'RACK-01'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Descriptions */}
                  <div className="my-2 space-y-1">
                    {config.showDescription && (
                      <div className="text-xs font-bold leading-tight line-clamp-2">
                        {activePreviewMaterial.description || activePreviewMaterial.name}
                      </div>
                    )}

                    {config.showArabicName && activePreviewMaterial.arabicDescription && (
                      <div className="text-xs text-industrial-800 line-clamp-1" dir="rtl">
                        {activePreviewMaterial.arabicDescription}
                      </div>
                    )}

                    {config.showManufacturer && (activePreviewMaterial.manufacturer || activePreviewMaterial.model) && (
                      <div className="text-[10px] text-industrial-600 font-mono">
                        MFG: {activePreviewMaterial.manufacturer || 'OEM'} | MDL: {activePreviewMaterial.model || 'STD'}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Barcode and QR */}
                  <div className="flex items-end justify-between gap-3 pt-2 border-t border-industrial-300">
                    {config.showBarcode && (
                      <div className="flex-1 overflow-hidden">
                        <div 
                          dangerouslySetInnerHTML={{
                            __html: generateBarcodeSVG(activePreviewMaterial.partNumber, {
                              height: config.preset === 'bin_100x50' ? 36 : 26,
                              barWidth: 1.5,
                              includeText: false
                            })
                          }}
                        />
                        <span className="text-[9px] font-mono font-bold block text-center mt-0.5 tracking-wider">
                          {activePreviewMaterial.partNumber}
                        </span>
                      </div>
                    )}

                    {config.showQRCode && (
                      <div className="shrink-0 text-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/?passport=${activePreviewMaterial.partNumber}`)}`}
                          alt="QR"
                          className="w-12 h-12 border border-black p-0.5 rounded"
                        />
                        <span className="text-[7px] font-mono font-bold uppercase block mt-0.5">
                          PASSPORT
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-industrial-400">
                  {language === 'ar' ? 'حدد مادة لمعاينتها' : 'Select a material to preview label'}
                </div>
              )}
            </div>

            {/* Quick Actions footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-industrial-100 dark:border-industrial-800 text-xs">
              <div className="text-industrial-500">
                {language === 'ar'
                  ? `الإجمالي المحدد: ${selectedMaterials.length} مادة (${selectedMaterials.length * config.copiesPerItem} ملصق)`
                  : `Total Selected: ${selectedMaterials.length} items (${selectedMaterials.length * config.copiesPerItem} labels)`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintLabels}
                  disabled={selectedMaterials.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'بدء الطباعة الآن' : 'Print Queue'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
