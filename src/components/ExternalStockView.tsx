/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Search,
  Building2,
  Layers,
  ArrowRightLeft,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  Info,
  ChevronRight,
  Database,
  ShieldCheck,
  Hash,
  Copy,
  Check,
  PlusCircle,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExternalFile, ExternalMaterial, User, Material } from '../types';
import { dbService } from '../services/dbService';

interface ExternalStockViewProps {
  currentUser: User;
  onNavigateToMaterial?: (partNumber: string) => void;
}

export const ExternalStockView: React.FC<ExternalStockViewProps> = ({
  currentUser,
  onNavigateToMaterial
}) => {
  // Navigation tabs within External Stock
  const [activeTab, setActiveTab] = useState<'files' | 'import' | 'viewer' | 'search'>('files');

  // Core data states
  const [externalFiles, setExternalFiles] = useState<ExternalFile[]>([]);
  const [externalMaterials, setExternalMaterials] = useState<ExternalMaterial[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');

  // Search & Filter state for Viewer tab
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [viewerManufacturerFilter, setViewerManufacturerFilter] = useState('');

  // Cross-File Search tab state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalWarehouseFilter, setGlobalWarehouseFilter] = useState('');

  // Import / Replace Flow States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedSheets, setParsedSheets] = useState<{ sheetName: string; rows: any[] }[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  
  // Column Mappings
  const [sequenceCol, setSequenceCol] = useState<string>('');
  const [partNumberCol, setPartNumberCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [mfgCol, setMfgCol] = useState<string>('');
  const [modelCol, setModelCol] = useState<string>('');
  const [qtyCol, setQtyCol] = useState<string>('');
  const [unitCol, setUnitCol] = useState<string>('');
  const [storeCol, setStoreCol] = useState<string>('');
  const [rackCol, setRackCol] = useState<string>('');
  const [shelfCol, setShelfCol] = useState<string>('');
  const [serialCol, setSerialCol] = useState<string>('');
  
  // File Metadata Inputs
  const [warehouseInput, setWarehouseInput] = useState('Basrah Central Store');
  const [customFileId, setCustomFileId] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  // Replace Modal State
  const [replaceTargetFile, setReplaceTargetFile] = useState<ExternalFile | null>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  // Transfer to Station Modal State
  const [transferTargetMat, setTransferTargetMat] = useState<ExternalMaterial | null>(null);
  const [targetStationStore, setTargetStationStore] = useState('ZFOD Central Warehouse');
  const [targetMinStock, setTargetMinStock] = useState(5);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete File Modal State
  const [fileToDelete, setFileToDelete] = useState<ExternalFile | null>(null);

  // Notification Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Load files on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const files = dbService.getExternalFiles() || [];
    const mats = dbService.getExternalMaterials() || [];
    setExternalFiles(files);
    setExternalMaterials(mats);
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  };

  const showBanner = (type: 'success' | 'error' | 'info', message: string) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner(null);
    }, 6000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // EXCEL PARSING LOGIC (STRICT ORIGINAL SEQUENCE PRESERVATION)
  // -------------------------------------------------------------

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', raw: false, cellDates: true });
        
        const sheetsData = wb.SheetNames.map(sheetName => {
          const ws = wb.Sheets[sheetName];
          // Use header: 1 to get raw 2D array and preserve exact row indices
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          return { sheetName, rows: rawRows };
        });

        setParsedSheets(sheetsData);
        setSelectedSheetIndex(0);

        if (sheetsData.length > 0 && sheetsData[0].rows.length > 0) {
          analyzeSheetHeaders(sheetsData[0].rows);
        }

        // Set default warehouse name based on filename if possible
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        if (!warehouseInput || warehouseInput === 'Basrah Central Store') {
          if (baseName.toLowerCase().includes('basrah')) setWarehouseInput('Basrah Central Store');
          else if (baseName.toLowerCase().includes('baghdad')) setWarehouseInput('Baghdad Central Store');
          else if (baseName.toLowerCase().includes('erbil')) setWarehouseInput('Erbil Regional Hub');
          else setWarehouseInput(`${baseName} Warehouse`);
        }
      } catch (err: any) {
        showBanner('error', `Failed to parse Excel file: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const analyzeSheetHeaders = (rawRows: any[][]) => {
    // Find header row: usually first row with non-empty strings
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const nonEmpties = rawRows[i].filter((cell: any) => String(cell).trim() !== '');
      if (nonEmpties.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const headers: string[] = rawRows[headerRowIdx].map((c: any, colIdx: number) => {
      const str = String(c || '').trim();
      return str || `Column_${colIdx + 1}`;
    });

    setDetectedHeaders(headers);

    // Auto-detect columns intelligently
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      
      // Sequence column (Seq, No, التسلسل, Index, Item, #)
      if (lower.includes('seq') || lower.includes('تسلسل') || lower === 'no' || lower === 'no.' || lower === '#' || lower === 'sn' || lower === 'item') {
        if (!sequenceCol) setSequenceCol(h);
      }
      // Part Number (Part, Material, Code, رقم المادة, رقم القطعة, P/N, Mat_No)
      else if (lower.includes('part') || lower.includes('مادة') || lower.includes('قطعة') || lower.includes('mat') || lower.includes('code') || lower.includes('item no') || lower.includes('p/n')) {
        if (!partNumberCol) setPartNumberCol(h);
      }
      // Description (Desc, Description, الوصف, البيان, Name, المواصفات)
      else if (lower.includes('desc') || lower.includes('وصف') || lower.includes('بيان') || lower.includes('specification') || lower.includes('item name')) {
        if (!descCol) setDescCol(h);
      }
      // Manufacturer (Mfg, Manufacturer, المصنع, Brand, الشركة, Make)
      else if (lower.includes('mfg') || lower.includes('manuf') || lower.includes('مصنع') || lower.includes('brand') || lower.includes('شركة') || lower.includes('make')) {
        if (!mfgCol) setMfgCol(h);
      }
      // Model (Model, موديل, الطراز, Type)
      else if (lower.includes('model') || lower.includes('موديل') || lower.includes('طراز') || lower.includes('type')) {
        if (!modelCol) setModelCol(h);
      }
      // Quantity (Qty, Quantity, الكمية, العدد, QTY_AVAIL)
      else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('كمية') || lower.includes('عدد')) {
        if (!qtyCol) setQtyCol(h);
      }
      // Unit (Unit, UOM, الوحدة, القياس)
      else if (lower.includes('unit') || lower.includes('uom') || lower.includes('وحدة')) {
        if (!unitCol) setUnitCol(h);
      }
      // Store / Warehouse (Store, Wh, المخزن, الموقع, Location)
      else if (lower.includes('store') || lower.includes('wh') || lower.includes('مخزن') || lower.includes('موقع')) {
        if (!storeCol) setStoreCol(h);
      }
      // Rack (Rack, رف)
      else if (lower.includes('rack') || lower.includes('رف')) {
        if (!rackCol) setRackCol(h);
      }
      // Shelf (Shelf, Bin, درج, خانة)
      else if (lower.includes('shelf') || lower.includes('bin') || lower.includes('درج') || lower.includes('خانة')) {
        if (!shelfCol) setShelfCol(h);
      }
      // Serial Number (Serial, S/N, الرقم التسلسلي)
      else if (lower.includes('serial') || lower.includes('s/n') || lower.includes('تسلسلي')) {
        if (!serialCol) setSerialCol(h);
      }
    });
  };

  // Build mapped items preview
  const mappedPreviewData = useMemo(() => {
    if (!parsedSheets.length || !parsedSheets[selectedSheetIndex]) {
      return { items: [], warnings: [], duplicateSeqs: [] };
    }

    const rawRows = parsedSheets[selectedSheetIndex].rows;
    if (rawRows.length <= 1) return { items: [], warnings: [], duplicateSeqs: [] };

    // Find header index
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const nonEmpties = rawRows[i].filter((cell: any) => String(cell).trim() !== '');
      if (nonEmpties.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = rawRows[headerRowIdx].map((c: any, idx: number) => String(c || '').trim() || `Column_${idx + 1}`);

    const seqIdx = headers.indexOf(sequenceCol);
    const pNumIdx = headers.indexOf(partNumberCol);
    const descIdx = headers.indexOf(descCol);
    const mfgIdx = headers.indexOf(mfgCol);
    const modelIdx = headers.indexOf(modelCol);
    const qtyIdx = headers.indexOf(qtyCol);
    const unitIdx = headers.indexOf(unitCol);
    const storeIdx = headers.indexOf(storeCol);
    const rackIdx = headers.indexOf(rackCol);
    const shelfIdx = headers.indexOf(shelfCol);
    const serialIdx = headers.indexOf(serialCol);

    const items: Array<{
      originalSequence: number | string;
      originalExcelRow: number;
      partNumber: string;
      description: string;
      manufacturer?: string;
      model?: string;
      quantity: number;
      unit?: string;
      store?: string;
      rack?: string;
      shelf?: string;
      serialNumber?: string;
      notes?: string;
    }> = [];

    const seqMap: { [key: string]: number[] } = {};
    const warnings: string[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c: any) => String(c || '').trim() === '')) continue;

      const excelRowNumber = r + 1; // 1-indexed Excel row

      // Original Sequence: if column mapped, take exact value; if empty or missing, note it
      let rawSeqVal = seqIdx >= 0 && row[seqIdx] !== undefined ? String(row[seqIdx]).trim() : '';
      let origSeq: number | string = rawSeqVal;
      
      if (!origSeq) {
        origSeq = excelRowNumber; // Fallback to Excel row if file has no sequence column
      } else if (!isNaN(Number(origSeq)) && String(Number(origSeq)) === origSeq) {
        origSeq = Number(origSeq);
      }

      // Track duplicate sequences
      const seqKey = String(origSeq);
      if (!seqMap[seqKey]) seqMap[seqKey] = [];
      seqMap[seqKey].push(excelRowNumber);

      const pNum = pNumIdx >= 0 ? String(row[pNumIdx] || '').trim() : '';
      const desc = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
      const mfg = mfgIdx >= 0 ? String(row[mfgIdx] || '').trim() : '';
      const model = modelIdx >= 0 ? String(row[modelIdx] || '').trim() : '';
      const rawQty = qtyIdx >= 0 ? row[qtyIdx] : 1;
      const parsedQty = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty).replace(/[^0-9.-]/g, '')) || 0;
      const unit = unitIdx >= 0 ? String(row[unitIdx] || '').trim() : 'PCS';
      const store = storeIdx >= 0 ? String(row[storeIdx] || '').trim() : warehouseInput;
      const rack = rackIdx >= 0 ? String(row[rackIdx] || '').trim() : '';
      const shelf = shelfIdx >= 0 ? String(row[shelfIdx] || '').trim() : '';
      const serial = serialIdx >= 0 ? String(row[serialIdx] || '').trim() : '';

      // If both Part Number and Description are empty, skip row
      if (!pNum && !desc) continue;

      items.push({
        originalSequence: origSeq,
        originalExcelRow: excelRowNumber,
        partNumber: pNum || `EXT-ITEM-${excelRowNumber}`,
        description: desc || 'External item with no description',
        manufacturer: mfg,
        model: model,
        quantity: Math.max(0, parsedQty),
        unit: unit || 'PCS',
        store: store || warehouseInput,
        rack: rack,
        shelf: shelf,
        serialNumber: serial
      });
    }

    const duplicateSeqs: Array<{ sequence: number | string; rows: number[] }> = [];
    Object.entries(seqMap).forEach(([seq, rows]) => {
      if (rows.length > 1) {
        duplicateSeqs.push({ sequence: seq, rows });
      }
    });

    if (duplicateSeqs.length > 0) {
      warnings.push(`تم اكتشاف ${duplicateSeqs.length} أرقام تسلسل مكررة داخل نفس ملف Excel. سيتم الحفاظ عليها بدقة كما هي في ملفك الأصلي دون تعديل أو إعادة ترقيم.`);
    }

    return { items, warnings, duplicateSeqs };
  }, [
    parsedSheets,
    selectedSheetIndex,
    sequenceCol,
    partNumberCol,
    descCol,
    mfgCol,
    modelCol,
    qtyCol,
    unitCol,
    storeCol,
    rackCol,
    shelfCol,
    serialCol,
    warehouseInput
  ]);

  // Execute Import
  const handleExecuteImport = () => {
    if (!uploadFile) {
      showBanner('error', 'يرجى اختيار ملف Excel أولاً');
      return;
    }
    if (mappedPreviewData.items.length === 0) {
      showBanner('error', 'لم يتم العثور على سجلات صالحة للاستيراد. يرجى التحقق من مطابقة الأعمدة.');
      return;
    }
    if (!warehouseInput.trim()) {
      showBanner('error', 'يرجى تحديد اسم المخزن الخارجي');
      return;
    }

    const res = dbService.importExternalFile(
      {
        sourceFileId: customFileId || undefined,
        fileName: uploadFile.name,
        warehouseName: warehouseInput.trim(),
        description: descriptionInput.trim() || `Excel import from ${uploadFile.name}`,
        detectedDuplicateSequences: mappedPreviewData.duplicateSeqs
      },
      mappedPreviewData.items,
      currentUser
    );

    if (res.success) {
      showBanner('success', `تم استيراد ملف "${res.file.fileName}" بنجاح (${res.count} مادة مسجلة مع الحفاظ التام على التسلسل الأصلي).`);
      loadData();
      setSelectedFileId(res.file.id);
      setActiveTab('viewer');
      // Reset upload state
      setUploadFile(null);
      setParsedSheets([]);
    } else {
      showBanner('error', res.error || 'فشل استيراد الملف');
    }
  };

  // Execute Replace File
  const handleExecuteReplace = () => {
    if (!replaceTargetFile || !uploadFile) {
      showBanner('error', 'يرجى اختيار الملف الجديد للاستبدال');
      return;
    }
    if (mappedPreviewData.items.length === 0) {
      showBanner('error', 'لم يتم استخراج أي سجلات من الملف الجديد');
      return;
    }

    const res = dbService.replaceExternalFile(
      replaceTargetFile.id,
      uploadFile.name,
      warehouseInput.trim() || replaceTargetFile.warehouseName,
      mappedPreviewData.items,
      currentUser
    );

    if (res.success) {
      showBanner(
        'success',
        `تم تحديث واستبدال ملف "${res.updatedFile.fileName}" بنجاح (الإصدار v${res.updatedFile.version}: تم تحديث ${res.newRecordsCount} مادة خارجية بأمان).`
      );
      loadData();
      setIsReplaceModalOpen(false);
      setReplaceTargetFile(null);
      setUploadFile(null);
      setParsedSheets([]);
      setSelectedFileId(res.updatedFile.id);
      setActiveTab('viewer');
    } else {
      showBanner('error', res.error || 'فشل تحديث واستبدال الملف');
    }
  };

  // Execute Delete File
  const handleExecuteDeleteFile = () => {
    if (!fileToDelete) return;
    const res = dbService.deleteExternalFile(fileToDelete.id, currentUser);
    if (res.success) {
      showBanner('success', `تم حذف ملف "${fileToDelete.fileName}" وسجلاته الخارجية فقط بنجاح دون أي مساس بمواد المحطة.`);
      setFileToDelete(null);
      loadData();
      const remaining = externalFiles.filter(f => f.id !== fileToDelete.id);
      if (remaining.length > 0) {
        setSelectedFileId(remaining[0].id);
      } else {
        setSelectedFileId('');
      }
    } else {
      showBanner('error', res.error || 'فشل حذف الملف');
    }
  };

  // Execute Transfer to Station Materials
  const handleExecuteTransfer = () => {
    if (!transferTargetMat) return;
    setTransferLoading(true);
    setTransferMessage(null);

    const res = dbService.transferExternalMaterialToStation(
      transferTargetMat,
      currentUser,
      targetStationStore,
      targetMinStock
    );

    setTransferLoading(false);
    if (res.success) {
      setTransferMessage({
        type: 'success',
        text: `تم نقل المادة ${transferTargetMat.partNumber} بنجاح إلى سجل مواد المحطة (Materials Ledger) في مخزن "${targetStationStore}".`
      });
      setTimeout(() => {
        setTransferTargetMat(null);
        setTransferMessage(null);
        if (onNavigateToMaterial && res.createdMaterial) {
          onNavigateToMaterial(res.createdMaterial.partNumber);
        }
      }, 2000);
    } else {
      setTransferMessage({
        type: 'error',
        text: res.error || 'فشل نقل المادة إلى المحطة'
      });
    }
  };

  // Export File to Excel
  const handleExportFile = (file: ExternalFile) => {
    const items = externalMaterials.filter(m => m.sourceFileId === file.id);
    const exportRows = items.map(m => ({
      'Original Sequence': m.originalSequence,
      'Excel Row': m.originalExcelRow,
      'Part Number': m.partNumber,
      'Description': m.description,
      'Manufacturer': m.manufacturer || '',
      'Model': m.model || '',
      'Quantity': m.quantity,
      'Unit': m.unit || 'PCS',
      'Store': m.store || m.warehouseName,
      'Rack': m.rack || '',
      'Shelf': m.shelf || '',
      'Serial Number': m.serialNumber || '',
      'Source File': m.sourceFileName,
      'Import Version': `v${m.importVersion}`
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ExternalStock');
    XLSX.writeFile(wb, `${file.fileName.replace(/\.[^/.]+$/, "")}_EMIS_Export.xlsx`);
    showBanner('success', `تم تصدير ملف ${file.fileName} بنجاح.`);
  };

  // Filtered materials for Viewer Tab
  const activeFile = useMemo(() => {
    return externalFiles.find(f => f.id === selectedFileId) || externalFiles[0] || null;
  }, [externalFiles, selectedFileId]);

  const activeFileMaterials = useMemo(() => {
    if (!activeFile) return [];
    let list = externalMaterials.filter(m => m.sourceFileId === activeFile.id);

    if (viewerSearchQuery.trim()) {
      const qLower = viewerSearchQuery.toLowerCase();
      list = list.filter(m =>
        String(m.originalSequence) === viewerSearchQuery.trim() ||
        String(m.originalExcelRow) === viewerSearchQuery.trim() ||
        m.partNumber.toLowerCase().includes(qLower) ||
        m.description.toLowerCase().includes(qLower) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(qLower)) ||
        (m.model && m.model.toLowerCase().includes(qLower)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(qLower))
      );
    }

    if (viewerManufacturerFilter) {
      list = list.filter(m => m.manufacturer === viewerManufacturerFilter);
    }

    return list;
  }, [activeFile, externalMaterials, viewerSearchQuery, viewerManufacturerFilter]);

  // Unique manufacturers in active file
  const activeFileManufacturers = useMemo(() => {
    if (!activeFile) return [];
    const list = externalMaterials.filter(m => m.sourceFileId === activeFile.id);
    const mfgs = new Set<string>();
    list.forEach(m => {
      if (m.manufacturer) mfgs.add(m.manufacturer);
    });
    return Array.from(mfgs).sort();
  }, [activeFile, externalMaterials]);

  // Cross-File Search Results
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim() && !globalWarehouseFilter) {
      return externalMaterials.slice(0, 50); // Show recent 50
    }

    const qLower = globalSearchQuery.trim().toLowerCase();
    const qNorm = dbService.normalizeToken(globalSearchQuery.trim());

    return externalMaterials.filter(em => {
      if (globalWarehouseFilter && em.warehouseName !== globalWarehouseFilter) {
        return false;
      }
      if (!globalSearchQuery.trim()) return true;

      const seqMatch = String(em.originalSequence) === globalSearchQuery.trim();
      const rowMatch = String(em.originalExcelRow) === globalSearchQuery.trim();
      const pMatch = em.partNumber.toLowerCase().includes(qLower) || dbService.normalizeToken(em.partNumber).includes(qNorm);
      const descMatch = em.description.toLowerCase().includes(qLower);
      const mfgMatch = em.manufacturer ? em.manufacturer.toLowerCase().includes(qLower) : false;
      const modelMatch = em.model ? em.model.toLowerCase().includes(qLower) : false;
      const serialMatch = em.serialNumber ? em.serialNumber.toLowerCase().includes(qLower) : false;
      const whMatch = em.warehouseName.toLowerCase().includes(qLower);
      const fileMatch = em.sourceFileName.toLowerCase().includes(qLower);

      return seqMatch || rowMatch || pMatch || descMatch || mfgMatch || modelMatch || serialMatch || whMatch || fileMatch;
    });
  }, [externalMaterials, globalSearchQuery, globalWarehouseFilter]);

  // Distinct Warehouses
  const distinctWarehouses = useMemo(() => {
    const whSet = new Set<string>();
    externalFiles.forEach(f => whSet.add(f.warehouseName));
    return Array.from(whSet);
  }, [externalFiles]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">External Company Stock</h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full">
                    مخزون الشركة الخارجي
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-0.5">
                  نظام مستقل ومعزول لإدارة واستيراد ملفات مخازن الشركة الخارجية مع الحفاظ التام على التسلسل الأصلي لملفات Excel
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('import')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
            >
              <Upload className="w-4 h-4" />
              استيراد ملف Excel جديد
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-all"
            >
              <Search className="w-4 h-4" />
              بحث شامل في المخازن
            </button>
          </div>
        </div>

        {/* Isolation & Integrity Guarantee Banner */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام معزول 100%: لا يتم دمج أو تعديل أو إعادة ترقيم أي مواد في سجل المحطة (Station Materials Ledger)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>الملفات المسجلة: <strong className="text-white">{externalFiles.length}</strong></span>
            <span>إجمالي المواد الخارجية: <strong className="text-white">{externalMaterials.length}</strong></span>
            <span>المخازن المفهرسة: <strong className="text-white">{distinctWarehouses.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {banner && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : banner.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : banner.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <Info className="w-5 h-5 text-blue-400" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs opacity-75 hover:opacity-100 transition-opacity"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'files'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          ملفات المخزون الخارجي ({externalFiles.length})
        </button>

        <button
          onClick={() => setActiveTab('viewer')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'viewer'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          مستعرض جدول الملف ({activeFile ? activeFile.fileName : 'اختر ملفاً'})
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          البحث الشامل عبر المخازن
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'import'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          استيراد ملف جديد
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXTERNAL FILES REGISTER LIST */}
      {/* ========================================================================= */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              سجل ملفات المخازن الخارجية المسجلة
            </h2>
            <button
              onClick={() => setActiveTab('import')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              إضافة ملف جديد
            </button>
          </div>

          {externalFiles.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">لا توجد ملفات مخزون خارجي حالياً</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                قم باستيراد أول ملف Excel لمخزن الشركة الخارجي لتتمكن من البحث فيه ومطابقة المواد بأمان تام.
              </p>
              <button
                onClick={() => setActiveTab('import')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl"
              >
                استيراد ملف Excel الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {externalFiles.map((file) => {
                const countInDb = externalMaterials.filter(m => m.sourceFileId === file.id).length;
                return (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                              {file.fileName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                                {file.warehouseName}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                ID: {file.id}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800">
                          الإصدار v{file.version}
                        </span>
                      </div>

                      {file.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                          {file.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 mb-4">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 block text-[11px]">عدد السجلات المفهرسة:</span>
                          <strong className="text-slate-900 dark:text-white text-sm">{countInDb} مادة</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 block text-[11px]">نطاق التسلسل الأصلي:</span>
                          <strong className="text-slate-900 dark:text-white text-sm font-mono">{file.sequenceRange || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 block text-[11px]">تاريخ الاستيراد:</span>
                          <span>{new Date(file.importDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 block text-[11px]">آخر تحديث:</span>
                          <span>{new Date(file.lastUpdated).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>

                      {file.detectedDuplicateSequences && file.detectedDuplicateSequences.length > 0 && (
                        <div className="mb-4 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>يحتوي على {file.detectedDuplicateSequences.length} أرقام تسلسل مكررة محفوظة كما هي.</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedFileId(file.id);
                          setActiveTab('viewer');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض جدول المواد
                      </button>

                      <button
                        onClick={() => {
                          setReplaceTargetFile(file);
                          setWarehouseInput(file.warehouseName);
                          setIsReplaceModalOpen(true);
                        }}
                        title="استبدال وتحديث الملف"
                        className="p-2 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleExportFile(file)}
                        title="تصدير إلى Excel"
                        className="p-2 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setFileToDelete(file)}
                        title="حذف هذا الملف وسجلاته فقط"
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMPORT NEW EXCEL FILE */}
      {/* ========================================================================= */}
      {activeTab === 'import' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              استيراد ملف Excel جديد لمخزون الشركة الخارجي
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              يتم استيراد الملف ككتالوج خارجي مستقل تماماً. التسلسل الأصلي داخل ملف Excel يتم الحفاظ عليه كمرجع أساسي.
            </p>
          </div>

          {/* Step 1: Upload Box */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center transition-all bg-slate-50 dark:bg-slate-800/40">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id="excel-file-input"
            />
            <FileSpreadsheet className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            {uploadFile ? (
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  الملف المحدد: {uploadFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  الحجم: {(uploadFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg"
                >
                  تغيير الملف
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  اسحب ملف Excel هنا أو اضغط للاختيار
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  يدعم صيغ .xlsx و .xls و .csv
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                >
                  اختيار ملف من الجهاز
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Sheet Selector & Metadata Inputs */}
          {parsedSheets.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {parsedSheets.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اختر ورقة العمل (Sheet):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {parsedSheets.map((s, idx) => (
                      <button
                        key={s.sheetName}
                        onClick={() => {
                          setSelectedSheetIndex(idx);
                          analyzeSheetHeaders(s.rows);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          selectedSheetIndex === idx
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {s.sheetName} ({s.rows.length} صف)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المخزن الخارجي (Warehouse Name) *
                  </label>
                  <input
                    type="text"
                    value={warehouseInput}
                    onChange={(e) => setWarehouseInput(e.target.value)}
                    placeholder="مثال: Basrah Central Store أو Baghdad Store"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رمز الملف التعريفي (Source File ID - اختياري)
                  </label>
                  <input
                    type="text"
                    value={customFileId}
                    onChange={(e) => setCustomFileId(e.target.value)}
                    placeholder="تلقائي: EXT-BASRAH-001"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    وصف أو ملاحظات الملف
                  </label>
                  <input
                    type="text"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder="ملاحظات حول الشحنة أو تاريخ الجرد"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Step 3: Column Mappings */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    مطابقة أعمدة ملف Excel (Column Mapping)
                  </h3>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    تم التعرف التلقائي على الأعمدة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Original Sequence - CRITICAL */}
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      التسلسل الأصلي (Seq) *
                    </label>
                    <select
                      value={sequenceCol}
                      onChange={(e) => setSequenceCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختر عمود التسلسل --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                      يحفظ كما هو في Excel دون أي تعديل
                    </span>
                  </div>

                  {/* Part Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم المادة / القطعة (Part Number) *
                    </label>
                    <select
                      value={partNumberCol}
                      onChange={(e) => setPartNumberCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختر العمود --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الوصف الفني (Description) *
                    </label>
                    <select
                      value={descCol}
                      onChange={(e) => setDescCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختر العمود --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الشركة المصنعة (Manufacturer)
                    </label>
                    <select
                      value={mfgCol}
                      onChange={(e) => setMfgCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الموديل (Model)
                    </label>
                    <select
                      value={modelCol}
                      onChange={(e) => setModelCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الكمية (Quantity)
                    </label>
                    <select
                      value={qtyCol}
                      onChange={(e) => setQtyCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الوحدة (Unit)
                    </label>
                    <select
                      value={unitCol}
                      onChange={(e) => setUnitCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الرقم التسلسلي (Serial Number)
                    </label>
                    <select
                      value={serialCol}
                      onChange={(e) => setSerialCol(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">-- اختياري --</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 4: Preview & Duplicate Sequence Analysis */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    معاينة السجلات المستخرجة ({mappedPreviewData.items.length} مادة صالحة)
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    عرض أول 5 مواد
                  </span>
                </div>

                {mappedPreviewData.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {mappedPreviewData.warnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5">التسلسل الأصلي</th>
                        <th className="p-2.5">صف Excel</th>
                        <th className="p-2.5">رقم المادة</th>
                        <th className="p-2.5">الوصف</th>
                        <th className="p-2.5">الشركة المصنعة</th>
                        <th className="p-2.5">الموديل</th>
                        <th className="p-2.5">الكمية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {mappedPreviewData.items.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400 font-mono">
                            #{item.originalSequence}
                          </td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 font-mono">
                            Row {item.originalExcelRow}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                            {item.partNumber}
                          </td>
                          <td className="p-2.5 max-w-xs truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="p-2.5">{item.manufacturer || '-'}</td>
                          <td className="p-2.5">{item.model || '-'}</td>
                          <td className="p-2.5 font-bold">{item.quantity} {item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Submission Button */}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setUploadFile(null);
                      setParsedSheets([]);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    disabled={mappedPreviewData.items.length === 0}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    حفظ واستيراد {mappedPreviewData.items.length} مادة في المخزون الخارجي
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FILE SPREADSHEET & VIEWER */}
      {/* ========================================================================= */}
      {activeTab === 'viewer' && (
        <div className="space-y-4">
          {/* File Selector Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الملف النشط:
              </label>
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {externalFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fileName} ({f.warehouseName} - v{f.version})
                  </option>
                ))}
              </select>

              {activeFile && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold rounded-md">
                    {activeFile.warehouseName}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    نطاق التسلسل: {activeFile.sequenceRange}
                  </span>
                </div>
              )}
            </div>

            {activeFile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportFile(activeFile)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  تصدير Excel
                </button>
                <button
                  onClick={() => {
                    setReplaceTargetFile(activeFile);
                    setWarehouseInput(activeFile.warehouseName);
                    setIsReplaceModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث واستبدال الملف
                </button>
              </div>
            )}
          </div>

          {/* Filter Bar within File */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={viewerSearchQuery}
                onChange={(e) => setViewerSearchQuery(e.target.value)}
                placeholder="بحث برقم التسلسل الأصلي (مثال: 184)، رقم المادة، الوصف، أو السيريال..."
                className="w-full pl-3 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {viewerSearchQuery && (
                <button
                  onClick={() => setViewerSearchQuery('')}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  مسح
                </button>
              )}
            </div>

            <div>
              <select
                value={viewerManufacturerFilter}
                onChange={(e) => setViewerManufacturerFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none"
              >
                <option value="">جميع الشركات المصنعة ({activeFileManufacturers.length})</option>
                {activeFileManufacturers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Materials Spreadsheet Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                المواد المعروضة: {activeFileMaterials.length} مادة
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                رقم التسلسل الأصلي (Seq) يطابق بدقة ملفك المصدري
              </span>
            </div>

            {activeFileMaterials.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                لا توجد مواد تطابق معايير البحث الحالية داخل هذا الملف.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">التسلسل الأصلي</th>
                      <th className="p-3">صف Excel</th>
                      <th className="p-3">رقم المادة (Part Number)</th>
                      <th className="p-3">الوصف الفني</th>
                      <th className="p-3">الشركة والموديل</th>
                      <th className="p-3">الكمية والموقع</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {activeFileMaterials.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <td className="p-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        
                        {/* Original Sequence - Bold Blue Badge */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold font-mono rounded-lg text-xs">
                            <Hash className="w-3 h-3" />
                            {item.originalSequence}
                          </span>
                        </td>

                        {/* Real Excel Row */}
                        <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                          Row {item.originalExcelRow}
                        </td>

                        {/* Part Number */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {item.partNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(item.partNumber, item.id)}
                              title="نسخ رقم المادة"
                              className="text-slate-400 hover:text-blue-500"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {item.serialNumber && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              S/N: {item.serialNumber}
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="p-3 max-w-sm">
                          <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                            {item.description}
                          </p>
                          {item.notes && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </td>

                        {/* Mfg & Model */}
                        <td className="p-3">
                          <div className="font-medium">{item.manufacturer || '-'}</div>
                          <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {item.model || '-'}
                          </div>
                        </td>

                        {/* Qty & Location */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.quantity} {item.unit || 'PCS'}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {item.rack ? `Rack: ${item.rack}` : ''} {item.shelf ? `| Shelf: ${item.shelf}` : ''}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setTransferTargetMat(item);
                              setTransferMessage(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg transition-all text-xs border border-emerald-200 dark:border-emerald-800"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            نقل إلى المحطة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CROSS-WAREHOUSE SEARCH */}
      {/* ========================================================================= */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              البحث الشامل عبر جميع مخازن الشركة الخارجية
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ابحث فورياً في كافة الملفات المستوردة برقم التسلسل الأصلي (مثل 184)، أو رقم المادة، أو الوصف، أو المخزن.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="ابحث برقم التسلسل (184)، أو P/N، أو الوصف الفني..."
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={globalWarehouseFilter}
                  onChange={(e) => setGlobalWarehouseFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none"
                >
                  <option value="">كافة المخازن الخارجية ({distinctWarehouses.length})</option>
                  {distinctWarehouses.map((wh) => (
                    <option key={wh} value={wh}>{wh}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 gap-3">
            {globalSearchResults.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                لم يتم العثور على أي مواد مطابقة في المخازن الخارجية.
              </div>
            ) : (
              globalSearchResults.map((em) => (
                <div
                  key={em.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold font-mono text-xs rounded-lg flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Seq #{em.originalSequence}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono rounded">
                        Row {em.originalExcelRow}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded">
                        {em.warehouseName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {em.sourceFileName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        {em.partNumber}
                      </h4>
                      {em.manufacturer && (
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          ({em.manufacturer} {em.model ? `- ${em.model}` : ''})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                      {em.description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>الكمية: <strong className="text-slate-900 dark:text-white">{em.quantity} {em.unit}</strong></span>
                      {em.rack && <span>الرف: {em.rack}</span>}
                      {em.shelf && <span>الدرج: {em.shelf}</span>}
                      {em.serialNumber && <span className="font-mono">S/N: {em.serialNumber}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setTransferTargetMat(em);
                        setTransferMessage(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      نقل إلى مواد المحطة
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REPLACE / UPDATE FILE MODAL */}
      {/* ========================================================================= */}
      {isReplaceModalOpen && replaceTargetFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  استبدال وتحديث ملف: {replaceTargetFile.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الإصدار الحالي v{replaceTargetFile.version} ({replaceTargetFile.recordCount} مادة مسجلة)
                </p>
              </div>
              <button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setReplaceTargetFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                ضمان الأمان والعزل الكامل:
              </div>
              <p>
                عملية الاستبدال ستقوم بتحديث سجلات هذا الملف الخارجي فقط وزيادة رقم الإصدار إلى v{replaceTargetFile.version + 1}. لن يتم المساس بأي مادة في مخزن المحطة (Materials Ledger) أو أي ملف خارجي آخر.
              </p>
            </div>

            {/* Upload New File */}
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
              <input
                type="file"
                ref={replaceFileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                onClick={() => replaceFileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
              >
                {uploadFile ? `الملف الجديد: ${uploadFile.name}` : 'اختر ملف Excel المحدث'}
              </button>
              {uploadFile && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                  تم استخراج {mappedPreviewData.items.length} مادة جديدة جاهزة للاستبدال
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setReplaceTargetFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteReplace}
                disabled={!uploadFile || mappedPreviewData.items.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow"
              >
                تأكيد واستبدال الملف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TRANSFER TO STATION MATERIALS MODAL */}
      {/* ========================================================================= */}
      {transferTargetMat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
                  نقل مادة من المخزون الخارجي إلى سجل مواد المحطة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المصدر: {transferTargetMat.warehouseName} (Seq #{transferTargetMat.originalSequence})
                </p>
              </div>
              <button
                onClick={() => setTransferTargetMat(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Material Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {transferTargetMat.partNumber}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {transferTargetMat.quantity} {transferTargetMat.unit}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                {transferTargetMat.description}
              </p>
              <div className="text-slate-500 text-[11px]">
                {transferTargetMat.manufacturer} {transferTargetMat.model ? `- ${transferTargetMat.model}` : ''}
              </div>
            </div>

            {/* Target Station Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مخزن المحطة المستهدف (Station Store) *
                </label>
                <input
                  type="text"
                  value={targetStationStore}
                  onChange={(e) => setTargetStationStore(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  حد إعادة الطلب الأدنى (Min Stock Level)
                </label>
                <input
                  type="number"
                  value={targetMinStock}
                  onChange={(e) => setTargetMinStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {transferMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  transferMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {transferMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setTransferTargetMat(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteTransfer}
                disabled={transferLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2"
              >
                {transferLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                تأكيد النقل إلى سجل مواد المحطة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE FILE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  حذف ملف المخزون الخارجي
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {fileToDelete.fileName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              هل أنت متأكد من رغبتك في حذف هذا الملف وسجلاته الخارجية فقط ({fileToDelete.recordCount} مادة)؟
            </p>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[11px] text-slate-500">
              لن يتم المساس بأي مواد مسجلة في سجل المحطة الرئيسي (Station Materials).
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                تراجع
              </button>
              <button
                onClick={handleExecuteDeleteFile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow"
              >
                نعم، احذف الملف وسجلاته فقط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
