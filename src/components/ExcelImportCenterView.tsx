/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Database,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  Building2,
  Table,
  Check,
  X,
  History,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExternalSource, ExternalFile, ExternalMaterial, ImportBatch, User } from '../types';
import { dbService } from '../services/dbService';

interface ExcelImportCenterViewProps {
  currentUser: User;
  onImportSuccess?: () => void;
  onNavigateToExternalStores?: () => void;
}

export const ExcelImportCenterView: React.FC<ExcelImportCenterViewProps> = ({
  currentUser,
  onImportSuccess,
  onNavigateToExternalStores
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  
  // Source metadata inputs
  const [sourceId, setSourceId] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('');
  const [warehouseName, setWarehouseName] = useState<string>('Company Central Logistics Store');
  const [description, setDescription] = useState<string>('External catalog imported into EMIS v0.4');
  
  // Column Mappings
  const [partNumberCol, setPartNumberCol] = useState<string>('');
  const [sequenceCol, setSequenceCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [mfgCol, setMfgCol] = useState<string>('');
  const [modelCol, setModelCol] = useState<string>('');
  const [qtyCol, setQtyCol] = useState<string>('');
  const [unitCol, setUnitCol] = useState<string>('');
  const [storeCol, setStoreCol] = useState<string>('');
  const [rackCol, setRackCol] = useState<string>('');
  const [shelfCol, setShelfCol] = useState<string>('');
  const [serialCol, setSerialCol] = useState<string>('');
  const [mrCol, setMrCol] = useState<string>('');
  const [poCol, setPoCol] = useState<string>('');
  const [woCol, setWoCol] = useState<string>('');
  const [tagCol, setTagCol] = useState<string>('');
  const [locationCol, setLocationCol] = useState<string>('');
  
  // Import Execution state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    failedCount: number;
    batchId: string;
    message: string;
  } | null>(null);

  // History state
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(() => dbService.getImportBatches());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect header fields from row columns
  const autoDetectColumns = (headers: string[]) => {
    const findMatch = (patterns: string[]) => {
      return headers.find(h => {
        const clean = h.trim().toLowerCase().replace(/[_\s\-\.\/]/g, '');
        return patterns.some(p => clean === p || clean.includes(p));
      }) || '';
    };

    setPartNumberCol(findMatch(['partnumber', 'partno', 'pn', 'itemcode', 'materialno', 'part', 'رقمالمادة', 'رقم']));
    setSequenceCol(findMatch(['sequence', 'seq', 'itemno', 'no', 'pos', 'index', 'تسلسل']));
    setDescCol(findMatch(['description', 'desc', 'itemdescription', 'materialdesc', 'specification', 'وصف', 'المادة']));
    setMfgCol(findMatch(['manufacturer', 'mfg', 'make', 'brand', 'vendor', 'الشركة']));
    setModelCol(findMatch(['model', 'modelno', 'type', 'الموديل', 'النوع']));
    setQtyCol(findMatch(['quantity', 'qty', 'stock', 'balance', 'count', 'الكمية', 'العدد']));
    setUnitCol(findMatch(['unit', 'uom', 'unitofmeasure', 'الوحدة']));
    setStoreCol(findMatch(['store', 'warehouse', 'location', 'المستودع', 'المخزن']));
    setRackCol(findMatch(['rack', 'رف']));
    setShelfCol(findMatch(['shelf', 'خانة']));
    setSerialCol(findMatch(['serial', 'serialnumber', 'sn', 'تسلسلي']));
    setMrCol(findMatch(['mr', 'mrnumber', 'mrf', 'طلب', 'طلبالصرف']));
    setPoCol(findMatch(['po', 'ponumber', 'شراء']));
    setWoCol(findMatch(['wo', 'workorder', 'عمل', 'امرالعمل']));
    setTagCol(findMatch(['tag', 'tagnumber', 'tagno', 'tag#', 'التاغ', 'بطاقة', 'رقمبطاقةالمعدة']));
    setLocationCol(findMatch(['installation', 'installationlocation', 'installloc', 'مكانالتثبيت', 'موقعالتثبيت', 'مكانالتركيب', 'موقعالتركيب']));
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);

    // Default source naming
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanId = `EXT-${baseName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 16)}-${Date.now().toString().slice(-4)}`;
    setSourceId(cleanId);
    setSourceName(`${baseName.replace(/[_\-]/g, ' ')} Source`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          loadSheetData(wb, firstSheet);
        }
      } catch (err) {
        console.error('Error parsing Excel file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (jsonRows.length === 0) return;

    // Find header row (first non-empty row)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, jsonRows.length); i++) {
      if (jsonRows[i].some((cell: any) => String(cell).trim().length > 0)) {
        headerRowIdx = i;
        break;
      }
    }

    const headers: string[] = jsonRows[headerRowIdx].map((h: any, idx: number) => String(h || `Column_${idx + 1}`).trim());
    const dataRows = jsonRows.slice(headerRowIdx + 1).filter((r: any) => r.some((c: any) => String(c).trim().length > 0));

    // Convert to row objects with 1-based original Excel row numbers
    const mappedRows = dataRows.map((row, idx) => {
      const obj: Record<string, any> = {
        _excelRowNumber: headerRowIdx + 2 + idx // 1-indexed master row number in original file
      };
      headers.forEach((h, cIdx) => {
        obj[h] = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
      });
      return obj;
    });

    setDetectedHeaders(headers);
    setRawRows(mappedRows);
    autoDetectColumns(headers);
  };

  // Preview slice (first 20 rows)
  const previewRows = useMemo(() => {
    return rawRows.slice(0, 20);
  }, [rawRows]);

  // Execute Import
  const handleExecuteImport = async () => {
    if (!selectedFile || rawRows.length === 0) return;
    if (!partNumberCol) {
      alert('Please select at least the Part Number column.');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    const batchId = `BATCH-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`;
    const effectiveSourceId = sourceId.trim() || `EXT-${Date.now()}`;
    const effectiveSourceName = sourceName.trim() || `${selectedFile.name} Source`;
    const effectiveWarehouse = warehouseName.trim() || 'Central Company Warehouse';

    const importedMaterials: ExternalMaterial[] = [];
    const failedRows: Array<{ rowNumber: number; reason: string }> = [];

    // Process rows
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const pn = String(row[partNumberCol] || '').trim();
      const excelRow = row._excelRowNumber || (i + 2);

      if (!pn) {
        failedRows.push({ rowNumber: excelRow, reason: 'Missing Part Number in mapped column' });
        continue;
      }

      const seq = sequenceCol && row[sequenceCol] ? row[sequenceCol] : (i + 1);
      const desc = descCol && row[descCol] ? String(row[descCol]).trim() : 'External Item';
      const mfg = mfgCol && row[mfgCol] ? String(row[mfgCol]).trim() : '';
      const model = modelCol && row[modelCol] ? String(row[modelCol]).trim() : '';
      const qtyNum = qtyCol && row[qtyCol] ? parseFloat(String(row[qtyCol]).replace(/[^0-9\.-]/g, '')) : 1;
      const unit = unitCol && row[unitCol] ? String(row[unitCol]).trim() : 'PCS';
      const store = storeCol && row[storeCol] ? String(row[storeCol]).trim() : effectiveWarehouse;
      const rack = rackCol && row[rackCol] ? String(row[rackCol]).trim() : '';
      const shelf = shelfCol && row[shelfCol] ? String(row[shelfCol]).trim() : '';
      const serial = serialCol && row[serialCol] ? String(row[serialCol]).trim() : '';
      const mr = mrCol && row[mrCol] ? String(row[mrCol]).trim() : '';
      const po = poCol && row[poCol] ? String(row[poCol]).trim() : '';
      const wo = woCol && row[woCol] ? String(row[woCol]).trim() : '';
      const tagNumber = tagCol && row[tagCol] ? String(row[tagCol]).trim() : '';
      const installationLocation = locationCol && row[locationCol] ? String(row[locationCol]).trim() : '';

      const normPn = dbService.normalizeToken(pn);
      const normSn = dbService.normalizeToken(serial);

      importedMaterials.push({
        id: `ext-mat-${effectiveSourceId}-${excelRow}-${Math.random().toString(36).substring(2, 6)}`,
        sourceId: effectiveSourceId,
        sourceFileId: effectiveSourceId,
        sourceName: effectiveSourceName,
        sourceFileName: selectedFile.name,
        fileName: selectedFile.name,
        warehouseName: effectiveWarehouse,
        originalSequence: seq,
        originalRowNumber: excelRow,
        originalExcelRow: excelRow,
        partNumber: pn,
        normalizedPartNumber: normPn,
        serialNumber: serial,
        normalizedSerialNumber: normSn,
        description: desc,
        manufacturer: mfg,
        model,
        quantity: isNaN(qtyNum) ? 1 : Math.max(0, qtyNum),
        unit,
        store,
        rack,
        shelf,
        mr,
        mrf: mr,
        mrfNumber: mr,
        po,
        wo,
        woNumber: wo,
        tagNumber: tagNumber || undefined,
        installationLocation: installationLocation || undefined,
        tagLocation: installationLocation || undefined,
        status: 'Available',
        importVersion: 1,
        importBatchId: batchId,
        importedAt: new Date().toISOString(),
        originalDataJson: JSON.stringify(row)
      });

      if (i % 50 === 0) {
        setImportProgress(Math.min(90, Math.round((i / rawRows.length) * 100)));
      }
    }

    // Sequence range
    const seqs = importedMaterials.map(m => Number(m.originalSequence)).filter(n => !isNaN(n));
    const sequenceRange = seqs.length > 0 ? `${Math.min(...seqs)} - ${Math.max(...seqs)}` : `Count: ${importedMaterials.length}`;

    // Create source
    const newSource: ExternalFile = {
      id: effectiveSourceId,
      sourceId: effectiveSourceId,
      sourceName: effectiveSourceName,
      warehouseName: effectiveWarehouse,
      fileName: selectedFile.name,
      description: description.trim() || `External catalog imported from ${selectedFile.name}`,
      importDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      recordCount: importedMaterials.length,
      version: 1,
      status: 'Active',
      checksum: `sha256-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      active: true,
      sequenceRange,
      fileSize: selectedFile.size
    };

    // Save records and batch
    const existingFiles = dbService.getExternalFiles();
    const updatedFiles = [newSource, ...existingFiles.filter(f => f.id !== effectiveSourceId)];
    dbService.saveExternalFiles(updatedFiles);

    const existingMats = dbService.getExternalMaterials();
    const filteredExisting = existingMats.filter(m => m.sourceFileId !== effectiveSourceId);
    dbService.saveExternalMaterials([...filteredExisting, ...importedMaterials]);

    // Record Batch History
    const newBatch: ImportBatch = {
      importBatchId: batchId,
      sourceId: effectiveSourceId,
      sourceName: effectiveSourceName,
      fileName: selectedFile.name,
      date: new Date().toISOString(),
      user: currentUser.name,
      recordsImported: importedMaterials.length,
      recordsFailed: failedRows.length,
      status: failedRows.length === 0 ? 'COMPLETED' : 'PARTIAL',
      failedRows,
      notes: `Imported ${importedMaterials.length} rows with exact Excel row numbers preserved.`
    };
    dbService.addImportBatch(newBatch);
    setImportBatches(dbService.getImportBatches());

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Excel Import Center: Imported ${importedMaterials.length} external records from "${selectedFile.name}" into source "${effectiveSourceName}" (Batch: ${batchId})`
    });

    setImportProgress(100);
    setIsImporting(false);
    setImportResult({
      success: true,
      importedCount: importedMaterials.length,
      failedCount: failedRows.length,
      batchId,
      message: `Successfully indexed ${importedMaterials.length} records into External Stores.`
    });

    if (onImportSuccess) {
      onImportSuccess();
    }
  };

  return (
    <div className="space-y-6" id="excel-import-center-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-industrial-900 dark:text-white">Excel Import Center</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                v0.4 Smart Engine
              </span>
            </div>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Multi-file Excel parser preserving exact row numbers, master sequences, and independent source isolation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200 dark:hover:bg-industrial-750'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>New Import</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200 dark:hover:bg-industrial-750'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Import History ({importBatches.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'import' ? (
        <div className="space-y-6">
          {/* File Picker Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs">
            <h2 className="text-sm font-bold text-industrial-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-brand-500" />
              <span>Step 1: Select Master Excel File (.xlsx, .xls, .csv)</span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-industrial-300 dark:border-industrial-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-industrial-50/50 dark:bg-industrial-900/40 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-industrial-800 dark:text-industrial-200">
                    {selectedFile ? selectedFile.name : 'Click to browse or drag & drop company inventory spreadsheet'}
                  </p>
                  <p className="text-xs text-industrial-400 dark:text-industrial-500 mt-1">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready for column mapping` : 'Supports multi-sheet workbooks with auto header detection'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sheet Selector if multiple */}
            {sheetNames.length > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold text-industrial-700 dark:text-industrial-300">Select Sheet:</span>
                <div className="flex flex-wrap gap-2">
                  {sheetNames.map(sName => (
                    <button
                      key={sName}
                      type="button"
                      onClick={() => {
                        setSelectedSheet(sName);
                        if (workbook) loadSheetData(workbook, sName);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        selectedSheet === sName
                          ? 'bg-brand-600 text-white font-bold'
                          : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-200'
                      }`}
                    >
                      {sName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Configuration & Mapping Card (Visible once file loaded) */}
          {rawRows.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-6">
              <h2 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-500" />
                <span>Step 2: Source Metadata & Column Mapping</span>
                <span className="text-xs font-normal text-industrial-400">({rawRows.length} total rows detected)</span>
              </h2>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Source Identifier (Unique Code)
                  </label>
                  <input
                    type="text"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                    placeholder="e.g. EXT-BASRAH-002"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Source Display Name
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                    placeholder="e.g. Basrah Southern Hub Catalog"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Warehouse / Storage Facility
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                    placeholder="e.g. Basrah Central Warehouse"
                  />
                </div>
              </div>

              {/* Column Selectors Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-industrial-800 dark:text-industrial-200">
                    Map Excel Columns to EMIS Fields:
                  </span>
                  <button
                    type="button"
                    onClick={() => autoDetectColumns(detectedHeaders)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Re-run Auto Detection</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-industrial-50 dark:bg-industrial-900/50 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800">
                  {/* Part Number (Required) */}
                  <div>
                    <label className="block text-[11px] font-bold text-industrial-900 dark:text-white mb-1">
                      Part Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={partNumberCol}
                      onChange={(e) => setPartNumberCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Sequence */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Original Sequence #
                    </label>
                    <select
                      value={sequenceCol}
                      onChange={(e) => setSequenceCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Auto-generate --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Description
                    </label>
                    <select
                      value={descCol}
                      onChange={(e) => setDescCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Manufacturer / OEM
                    </label>
                    <select
                      value={mfgCol}
                      onChange={(e) => setMfgCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Model / Type
                    </label>
                    <select
                      value={modelCol}
                      onChange={(e) => setModelCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Quantity
                    </label>
                    <select
                      value={qtyCol}
                      onChange={(e) => setQtyCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Default to 1 --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Serial Number
                    </label>
                    <select
                      value={serialCol}
                      onChange={(e) => setSerialCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Rack / Shelf */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Rack
                    </label>
                    <select
                      value={rackCol}
                      onChange={(e) => setRackCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Tag Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Tag Number (رقم التاغ)
                    </label>
                    <select
                      value={tagCol}
                      onChange={(e) => setTagCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Installation Location */}
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                      Installation Location (مكان التثبيت والتركيب)
                    </label>
                    <select
                      value={locationCol}
                      onChange={(e) => setLocationCol(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white"
                    >
                      <option value="">-- Select Column --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Interactive First 20 Rows Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                    <Table className="h-4 w-4 text-emerald-500" />
                    <span>First 20 Rows Live Preview (Showing Preserved Excel Row Numbers)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-industrial-500">
                    Row 1 to {Math.min(20, rawRows.length)} of {rawRows.length}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-750 max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 sticky top-0 font-mono text-[11px]">
                      <tr>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700 bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          Original Row #
                        </th>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700">Part Number</th>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700">Description</th>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700">Manufacturer</th>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700">Model</th>
                        <th className="p-2.5 border-b border-industrial-200 dark:border-industrial-700">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-200 dark:divide-industrial-750 bg-white dark:bg-industrial-850">
                      {previewRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                          <td className="p-2.5 font-mono text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/5">
                            Row {r._excelRowNumber}
                          </td>
                          <td className="p-2.5 font-mono font-semibold text-industrial-900 dark:text-white">
                            {partNumberCol && r[partNumberCol] ? r[partNumberCol] : <span className="text-industrial-400 italic">unmapped</span>}
                          </td>
                          <td className="p-2.5 text-industrial-700 dark:text-industrial-300 max-w-xs truncate">
                            {descCol && r[descCol] ? r[descCol] : <span className="text-industrial-400 italic">unmapped</span>}
                          </td>
                          <td className="p-2.5 text-industrial-600 dark:text-industrial-400">
                            {mfgCol && r[mfgCol] ? r[mfgCol] : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-industrial-600 dark:text-industrial-400">
                            {modelCol && r[modelCol] ? r[modelCol] : '-'}
                          </td>
                          <td className="p-2.5 font-mono text-industrial-800 dark:text-industrial-200">
                            {qtyCol && r[qtyCol] ? r[qtyCol] : '1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress & Submit Action */}
              <div className="pt-4 border-t border-industrial-200 dark:border-industrial-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-industrial-500">
                  <Info className="h-4 w-4 text-brand-500 shrink-0" />
                  <span>External records will be isolated in External Stores and will never modify the Station Materials Ledger.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setRawRows([]);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-industrial-300 dark:border-industrial-700 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-100 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isImporting || !partNumberCol}
                    onClick={handleExecuteImport}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Importing ({importProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Index {rawRows.length} Records to External Stores</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Success Result Banner */}
              {importResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{importResult.message}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Batch ID: <span className="font-mono font-bold">{importResult.batchId}</span> • Imported: {importResult.importedCount} rows
                      </p>
                    </div>
                  </div>
                  {onNavigateToExternalStores && (
                    <button
                      type="button"
                      onClick={onNavigateToExternalStores}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>Open External Stores</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="p-6 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-brand-500" />
              <span>Import History & Master Batches</span>
            </h2>
            <span className="text-xs text-industrial-400">Total Batches: {importBatches.length}</span>
          </div>

          {importBatches.length === 0 ? (
            <p className="text-xs text-industrial-400 py-8 text-center">No previous import batches registered.</p>
          ) : (
            <div className="divide-y divide-industrial-200 dark:divide-industrial-800">
              {importBatches.map(batch => (
                <div key={batch.importBatchId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-industrial-900 dark:text-white">
                        {batch.fileName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        {batch.importBatchId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                        {batch.status}
                      </span>
                    </div>
                    <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-1">
                      Source: <span className="font-semibold">{batch.sourceName}</span> • User: {batch.user} • {new Date(batch.date).toLocaleString()}
                    </p>
                    {batch.notes && (
                      <p className="text-[11px] text-industrial-400 mt-0.5">{batch.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{batch.recordsImported}</span>
                      <span className="text-industrial-400 text-[10px] block">imported</span>
                    </div>
                    {batch.recordsFailed > 0 && (
                      <div className="text-right">
                        <span className="text-red-500 font-bold">{batch.recordsFailed}</span>
                        <span className="text-industrial-400 text-[10px] block">failed</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
