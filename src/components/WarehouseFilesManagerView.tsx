/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Upload, 
  FolderPlus, 
  FolderKanban, 
  Search, 
  Eye, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  Building2, 
  Warehouse, 
  Table, 
  Check, 
  X, 
  Edit3, 
  ShieldCheck, 
  Tag, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  FileCheck2,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { WarehouseFile, Material, User, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { searchUniversalCatalog } from '../services/universalSearchIndex';
import { detectDuplicateMaterial } from '../services/duplicateDetectionService';

interface WarehouseFilesManagerViewProps {
  currentUser: User;
  onInspectMaterial: (material: Material) => void;
  onNavigateToTab?: (tabId: string, query?: string) => void;
}

export default function WarehouseFilesManagerView({
  currentUser,
  onInspectMaterial,
  onNavigateToTab
}: WarehouseFilesManagerViewProps) {
  // Navigation within the files manager
  const [activeSubView, setActiveSubView] = useState<'files-list' | 'file-materials' | 'import-wizard'>('files-list');
  const [warehouseFiles, setWarehouseFiles] = useState<WarehouseFile[]>(() => dbService.getWarehouseFiles());
  const [selectedFile, setSelectedFile] = useState<WarehouseFile | null>(null);

  // Search & Filters in file materials view
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // New File Import Wizard State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // Metadata form for new file
  const [newFileName, setNewFileName] = useState('');
  const [newWarehouseCode, setNewWarehouseCode] = useState('WH-NDGS-01');
  const [newWarehouseName, setNewWarehouseName] = useState('NDGS Station Warehouse');
  const [newFileDescription, setNewFileDescription] = useState('');
  const [sequencePrefix, setSequencePrefix] = useState('');

  // Column Mappings for new file
  const [colPartNumber, setColPartNumber] = useState('');
  const [colSequence, setColSequence] = useState('');
  const [colDescription, setColDescription] = useState('');
  const [colManufacturer, setColManufacturer] = useState('');
  const [colModel, setColModel] = useState('');
  const [colQuantity, setColQuantity] = useState('');
  const [colUnit, setColUnit] = useState('');
  const [colStore, setColStore] = useState('');
  const [colRack, setColRack] = useState('');
  const [colShelf, setColShelf] = useState('');
  const [colTagNumber, setColTagNumber] = useState('');
  const [colSerialNumber, setColSerialNumber] = useState('');
  const [colLocation, setColLocation] = useState('');

  // Import processing state
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Delete modal state
  const [fileToDelete, setFileToDelete] = useState<WarehouseFile | null>(null);
  const [deleteCascadeMaterials, setDeleteCascadeMaterials] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize files list on events
  useEffect(() => {
    const refresh = () => setWarehouseFiles(dbService.getWarehouseFiles());
    window.addEventListener('emis:warehouse-files-changed', refresh);
    window.addEventListener('emis:materials-changed', refresh);
    return () => {
      window.removeEventListener('emis:warehouse-files-changed', refresh);
      window.removeEventListener('emis:materials-changed', refresh);
    };
  }, []);

  // Compute materials for selected file
  const activeFileMaterials = useMemo(() => {
    if (!selectedFile) return [];
    return dbService.getMaterialsForFile(selectedFile.id);
  }, [selectedFile, warehouseFiles]);

  // Filtered materials inside the active file view
  const filteredFileMaterials = useMemo(() => {
    let result = activeFileMaterials;
    const q = fileSearchQuery.trim().toLowerCase();

    if (q) {
      result = result.filter(m => 
        (m.partNumber && m.partNumber.toLowerCase().includes(q)) ||
        (m.model && m.model.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(q)) ||
        (m.tagNumber && m.tagNumber.toLowerCase().includes(q)) ||
        (m.fileSequence && String(m.fileSequence).includes(q)) ||
        (m.sequence && String(m.sequence).includes(q))
      );
    }

    if (statusFilter === 'AVAILABLE') {
      result = result.filter(m => m.quantity > m.minStockLevel);
    } else if (statusFilter === 'LOW_STOCK') {
      result = result.filter(m => m.quantity > 0 && m.quantity <= m.minStockLevel);
    } else if (statusFilter === 'OUT_OF_STOCK') {
      result = result.filter(m => m.quantity === 0);
    }

    return result.sort((a, b) => (a.fileSequence ?? a.sequence ?? 0) - (b.fileSequence ?? b.sequence ?? 0));
  }, [activeFileMaterials, fileSearchQuery, statusFilter]);

  // File picker handler
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setNewFileName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          loadSheetRows(wb, firstSheet);
        }
      } catch (err: any) {
        setImportNotice({ type: 'error', text: `فشل قراءة الملف: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadSheetRows = (wb: XLSX.WorkBook, sheet: string) => {
    const ws = wb.Sheets[sheet];
    const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setRawRows(data);

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      setDetectedHeaders(headers);
      autoMapColumns(headers);
    }
  };

  // Heuristic auto mapping
  const autoMapColumns = (headers: string[]) => {
    const find = (keywords: string[]) => {
      return headers.find(h => {
        const clean = h.trim().toLowerCase().replace(/[\s\-_/.]/g, '');
        return keywords.some(k => clean.includes(k));
      }) || '';
    };

    setColPartNumber(find(['partnumber', 'partno', 'pn', 'itemno', 'itemcode', 'code']));
    setColSequence(find(['sequence', 'seq', 'no', 'item', 'تسلسل', 'الرقم', 'ser']));
    setColDescription(find(['description', 'desc', 'itemdesc', 'specification', 'وصف', 'المادة']));
    setColManufacturer(find(['manufacturer', 'mfg', 'maker', 'brand', 'المصنع', 'الشركة']));
    setColModel(find(['model', 'type', 'series', 'موديل', 'طراز']));
    setColQuantity(find(['quantity', 'qty', 'stock', 'balance', 'كمية', 'العدد']));
    setColUnit(find(['unit', 'uom', 'meas', 'وحدة']));
    setColStore(find(['store', 'warehouse', 'location', 'مستودع', 'مخزن']));
    setColRack(find(['rack', 'shelf', 'رف']));
    setColShelf(find(['shelf', 'bin', 'درج', 'خانة']));
    setColTagNumber(find(['tag', 'tagno', 'تاغ', 'بطاقة']));
    setColSerialNumber(find(['serial', 'serialno', 'sn', 'تسلسلي']));
    setColLocation(find(['installation', 'mounted', 'field', 'موقع']));
  };

  // Commit new warehouse file import
  const handleCommitImport = () => {
    if (!importFile || rawRows.length === 0) {
      setImportNotice({ type: 'error', text: 'يرجى اختيار ملف Excel يحتوي على بيانات صالحة أولاً.' });
      return;
    }

    if (!newFileName.trim()) {
      setImportNotice({ type: 'error', text: 'يرجى إدخال اسم مميز لملف المخزن الجديد.' });
      return;
    }

    setIsProcessingImport(true);
    setImportNotice(null);

    try {
      const createdFile = dbService.addWarehouseFile({
        name: newFileName.trim(),
        fileName: importFile.name,
        warehouseCode: newWarehouseCode.trim(),
        warehouseName: newWarehouseName.trim(),
        description: newFileDescription.trim() || `ملف مخزن تم استيراده بواسطة ${currentUser.name}`,
        totalRecords: rawRows.length,
        currentMaxSequence: rawRows.length,
        sequencePrefix: sequencePrefix.trim() || undefined,
        sheetName: selectedSheet,
        fileSize: importFile.size,
        columnMapping: {
          partNumber: colPartNumber,
          sequence: colSequence,
          description: colDescription,
          manufacturer: colManufacturer,
          model: colModel,
          quantity: colQuantity,
          unit: colUnit
        },
        originalHeaders: detectedHeaders,
        status: 'ACTIVE'
      }, currentUser);

      // Map rows into Material items bound to this fileId
      const newMaterials: Material[] = rawRows.map((row, idx) => {
        const fileSeq = colSequence && row[colSequence] 
          ? parseInt(String(row[colSequence]).replace(/[^0-9]/g, ''), 10) || (idx + 1)
          : (idx + 1);

        const rawPn = colPartNumber ? String(row[colPartNumber] || '').trim() : '';
        const rawDesc = colDescription ? String(row[colDescription] || '').trim() : `Item #${fileSeq}`;
        const rawMfg = colManufacturer ? String(row[colManufacturer] || '').trim() : 'Unknown OEM';
        const rawModel = colModel ? String(row[colModel] || '').trim() : 'N/A';
        const rawQty = colQuantity ? parseFloat(String(row[colQuantity]).replace(/[^0-9.-]/g, '')) || 0 : 0;
        const rawUnit = colUnit ? String(row[colUnit] || 'pcs').trim() : 'pcs';

        return {
          id: `mat-${createdFile.id}-${fileSeq}-${Date.now().toString(36)}-${idx}`,
          fileId: createdFile.id,
          fileName: createdFile.fileName,
          fileSequence: fileSeq,
          sequence: fileSeq,
          rawOriginalRow: row, // 100% full original columns preserved without data loss!
          partNumber: rawPn,
          isPartNumberAutoGenerated: !rawPn,
          description: rawDesc,
          manufacturer: rawMfg,
          model: rawModel,
          quantity: Math.max(0, rawQty),
          unit: rawUnit,
          store: (colStore && row[colStore]) ? String(row[colStore]).trim() : newWarehouseName,
          rack: (colRack && row[colRack]) ? String(row[colRack]).trim() : '',
          shelf: (colShelf && row[colShelf]) ? String(row[colShelf]).trim() : '',
          tagNumber: (colTagNumber && row[colTagNumber]) ? String(row[colTagNumber]).trim() : undefined,
          serialNumber: (colSerialNumber && row[colSerialNumber]) ? String(row[colSerialNumber]).trim() : undefined,
          installationLocation: (colLocation && row[colLocation]) ? String(row[colLocation]).trim() : undefined,
          notes: `Imported via file ${createdFile.fileName}`,
          minStockLevel: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      // Append materials into database
      const existingMaterials = dbService.getMaterials();
      dbService.saveMaterials([...newMaterials, ...existingMaterials]);

      // Update file record count
      createdFile.totalRecords = newMaterials.length;
      createdFile.currentMaxSequence = Math.max(...newMaterials.map(m => m.fileSequence ?? 1));
      dbService.updateWarehouseFile(createdFile, currentUser);

      setWarehouseFiles(dbService.getWarehouseFiles());
      setSelectedFile(createdFile);
      setActiveSubView('file-materials');

      // Clear wizard
      setImportFile(null);
      setWorkbook(null);
      setRawRows([]);
      setImportNotice({
        type: 'success',
        text: `تم استيراد وحفظ ملف المخزن (${createdFile.name}) بنجاح بواقع ${newMaterials.length} مادة مستقلة!`
      });
    } catch (err: any) {
      setImportNotice({ type: 'error', text: `حدث خطأ أثناء الاستيراد: ${err.message}` });
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Standalone Excel Export for this specific file
  const handleExportFileStandalone = (file: WarehouseFile) => {
    const materials = dbService.getMaterialsForFile(file.id);
    if (materials.length === 0) {
      alert('لا توجد مواد مسجلة في هذا الملف لتصديرها.');
      return;
    }

    const rows = materials.map(m => {
      // If rawOriginalRow exists, use original layout plus EMIS verified columns
      if (m.rawOriginalRow && Object.keys(m.rawOriginalRow).length > 0) {
        return {
          ...m.rawOriginalRow,
          'EMIS_Sequence': m.fileSequence ?? m.sequence,
          'EMIS_PartNumber': m.partNumber,
          'EMIS_Quantity': m.quantity,
          'EMIS_Warehouse': m.store,
          'EMIS_LastUpdated': m.updatedAt
        };
      }

      return {
        'Sequence / التسلسل': m.fileSequence ?? m.sequence,
        'Part Number / رقم القطعة': m.partNumber,
        'Description / الوصف': m.description,
        'Manufacturer / المصنع': m.manufacturer,
        'Model / الموديل': m.model,
        'Quantity / الكمية': m.quantity,
        'Unit / الوحدة': m.unit,
        'Warehouse / المستودع': m.store,
        'Rack / الرف': m.rack,
        'Shelf / الدرج': m.shelf,
        'Tag / بطاقة المعدة': m.tagNumber || '',
        'Serial Number / الرقم التسلسلي': m.serialNumber || '',
        'Status / الحالة': m.status
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, file.name.slice(0, 30));

    const cleanName = file.name.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
    XLSX.writeFile(wb, `${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Confirm delete file
  const handleConfirmDeleteFile = () => {
    if (!fileToDelete) return;
    const res = dbService.deleteWarehouseFile(fileToDelete.id, currentUser, deleteCascadeMaterials);
    if (res.success) {
      setWarehouseFiles(dbService.getWarehouseFiles());
      setFileToDelete(null);
      if (selectedFile?.id === fileToDelete.id) {
        setSelectedFile(null);
        setActiveSubView('files-list');
      }
    } else {
      alert(res.error || 'فشل حذف الملف.');
    }
  };

  return (
    <div className="space-y-6 font-sans text-right" dir="rtl" id="warehouse-files-manager">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-industrial-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-200 shadow-2xs">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-industrial-900 tracking-tight">
                إدارة ملفات المخازن والمجموعات المستقلة
              </h1>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {warehouseFiles.length} ملفات مسجلة
              </span>
            </div>
            <p className="text-xs text-industrial-500 mt-1">
              إدارة كل مخزن أو ملف Excel ككيان مستقل يحتفظ بمواده وتسلسلاته ومعلوماته الخاصة دون اختلاط في الشاشة الرئيسية.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeSubView !== 'files-list' && (
            <button
              type="button"
              onClick={() => {
                setActiveSubView('files-list');
                setSelectedFile(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-700 bg-industrial-100 hover:bg-industrial-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              <span>قائمة ملفات المخازن</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubView('import-wizard')}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-700 hover:to-brand-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            <span>استيراد ملف مخزن جديد (Excel)</span>
          </button>
        </div>
      </div>

      {importNotice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            importNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
            <span>{importNotice.text}</span>
          </div>
          <button type="button" onClick={() => setImportNotice(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* VIEW 1: FILES LIST (GRID CARDS) */}
      {activeSubView === 'files-list' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouseFiles.map(file => {
              const fileCount = dbService.getMaterialsForFile(file.id).length;
              return (
                <motion.div
                  key={file.id}
                  whileHover={{ y: -3 }}
                  className="bg-white rounded-3xl border border-industrial-200/90 hover:border-brand-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200 shadow-2xs">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-industrial-900 group-hover:text-brand-600 transition-colors">
                            {file.name}
                          </h3>
                          <span className="text-[11px] font-mono text-industrial-400 block truncate max-w-[200px]" title={file.fileName}>
                            {file.fileName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {file.status}
                      </span>
                    </div>

                    <p className="text-xs text-industrial-600 line-clamp-2 leading-relaxed">
                      {file.description || 'مجموعة مواد هندسية مسجلة في مستودع مستقل.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-industrial-50/70 border border-industrial-100">
                      <div>
                        <span className="text-industrial-400 block">المستودع:</span>
                        <span className="font-bold text-industrial-800 truncate block">{file.warehouseName || 'مستودع رئيسي'}</span>
                      </div>
                      <div>
                        <span className="text-industrial-400 block">عدد المواد:</span>
                        <span className="font-bold font-mono text-brand-700">{fileCount} مادة</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-industrial-50/50 border-t border-industrial-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(file);
                        setActiveSubView('file-materials');
                        setFileSearchQuery('');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>فتح مواد الملف</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportFileStandalone(file)}
                      title="تصدير ملف Excel مستقل"
                      className="p-2 rounded-xl border border-industrial-200 bg-white hover:bg-industrial-100 text-industrial-600 transition-colors cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {currentUser.role === UserRole.ADMIN && (
                      <button
                        type="button"
                        onClick={() => setFileToDelete(file)}
                        title="حذف هذا الملف"
                        className="p-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SPECIFIC FILE MATERIALS VIEWER */}
      {activeSubView === 'file-materials' && selectedFile && (
        <div className="space-y-5">
          {/* Active File Header Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-industrial-900 via-industrial-850 to-brand-950 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center border border-white/15">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight">{selectedFile.name}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {activeFileMaterials.length} مادة
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  ملف المصدر: <span className="font-mono text-emerald-200">{selectedFile.fileName}</span> • المستودع: {selectedFile.warehouseName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleExportFileStandalone(selectedFile)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تصدير Excel للملف</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTab) {
                    onNavigateToTab('add-material');
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة مادة لهذا الملف</span>
              </button>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-industrial-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-industrial-400" />
              <input
                type="text"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="بحث داخل هذا الملف (رقم القطعة، الموديل، الوصف، التسلسل)..."
                className="w-full pr-10 pl-4 py-2 bg-industrial-50 border border-industrial-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none text-industrial-900"
              />
              {fileSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFileSearchQuery('')}
                  className="absolute left-3 top-2.5 text-industrial-400 hover:text-industrial-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-500 font-semibold">حالة المخزون:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-industrial-50 border border-industrial-200 rounded-xl px-3 py-2 text-industrial-800 font-semibold focus:outline-none"
              >
                <option value="ALL">جميع المواد</option>
                <option value="AVAILABLE">متوفر بالمخزن</option>
                <option value="LOW_STOCK">منخفض (أقل من الحد)</option>
                <option value="OUT_OF_STOCK">نافد</option>
              </select>
            </div>
          </div>

          {/* Materials Table for this file */}
          <div className="bg-white rounded-3xl border border-industrial-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200 text-industrial-600 font-bold">
                    <th className="py-3 px-4 w-16 text-center">التسلسل</th>
                    <th className="py-3 px-4">رقم القطعة / Part No</th>
                    <th className="py-3 px-4">المصنع والموديل</th>
                    <th className="py-3 px-4">الوصف الفني</th>
                    <th className="py-3 px-4">الكمية</th>
                    <th className="py-3 px-4">الموقع بالمخزن</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {filteredFileMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-industrial-400 font-semibold">
                        لا توجد مواد مطابقة للبحث في هذا الملف.
                      </td>
                    </tr>
                  ) : (
                    filteredFileMaterials.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-brand-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-center text-amber-700 bg-amber-50/50">
                          #{m.fileSequence ?? m.sequence ?? (idx + 1)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-industrial-900">
                          {m.partNumber || <span className="text-industrial-400 italic">بدون رقم قطعة</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-industrial-800">{m.manufacturer}</div>
                          <div className="text-[11px] font-mono text-industrial-500">{m.model}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="line-clamp-2 text-industrial-700 leading-snug">
                            {m.description}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded-md ${
                            m.quantity === 0
                              ? 'bg-rose-100 text-rose-800'
                              : (m.quantity <= m.minStockLevel ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                          }`}>
                            {m.quantity} {m.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-industrial-600">
                          <div>{m.store}</div>
                          {(m.rack || m.shelf) && (
                            <span className="font-mono text-[10px] text-industrial-400">
                              رف: {m.rack || '-'} / خانة: {m.shelf || '-'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onInspectMaterial(m)}
                            className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors cursor-pointer"
                            title="فحص ومعاينة بطاقة المادة"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: IMPORT WIZARD */}
      {activeSubView === 'import-wizard' && (
        <div className="bg-white rounded-3xl border border-industrial-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-industrial-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-industrial-900">
                استيراد ملف مخزن جديد من Excel (.xlsx, .xls, .csv)
              </h2>
              <p className="text-xs text-industrial-500 mt-0.5">
                إنشاء مخزن مستقل بالكامل ببياناته وتسلسلاته وأعمدته الأصلية دون المساس بالملفات الأخرى.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubView('files-list')}
              className="text-xs font-bold text-industrial-500 hover:text-industrial-800"
            >
              إلغاء والعودة
            </button>
          </div>

          {/* Step 1: Upload File */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-industrial-300 hover:border-brand-500 rounded-3xl p-8 text-center cursor-pointer transition-all bg-industrial-50/50 hover:bg-brand-50/20 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileSelected}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-industrial-800">
                  {importFile ? importFile.name : 'اضغط لاختيار ملف Excel أو اسحبه إلى هنا'}
                </p>
                <p className="text-xs text-industrial-400 mt-1">
                  {importFile ? `${(importFile.size / 1024).toFixed(1)} KB • جاهز لتعيين الأعمدة والمعاينة` : 'يدعم كافة صيغ الجداول وقراءة الأعمدة الأصلية'}
                </p>
              </div>
            </div>
          </div>

          {rawRows.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              {/* Sheet selector if multiple */}
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-industrial-700">اختر ورقة العمل (Sheet):</span>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSelectedSheet(s);
                          if (workbook) loadSheetRows(workbook, s);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          selectedSheet === s
                            ? 'bg-brand-600 text-white'
                            : 'bg-industrial-100 text-industrial-700 hover:bg-industrial-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-industrial-50/70 border border-industrial-100">
                <div>
                  <label className="block text-xs font-bold text-industrial-700 mb-1">اسم ملف المخزن (عرض بالواجهة):</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="مثال: NDGS Instrument Materials"
                    className="w-full bg-white border border-industrial-250 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-industrial-700 mb-1">المستودع أو القسم التابع له:</label>
                  <input
                    type="text"
                    value={newWarehouseName}
                    onChange={(e) => setNewWarehouseName(e.target.value)}
                    placeholder="مثال: NDGS Station Warehouse"
                    className="w-full bg-white border border-industrial-250 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-industrial-700 mb-1">بادئة الترقيم (اختياري):</label>
                  <input
                    type="text"
                    value={sequencePrefix}
                    onChange={(e) => setSequencePrefix(e.target.value)}
                    placeholder="مثال: NDGS- (يبدأ التسلسل 1, 2, 3..)"
                    className="w-full bg-white border border-industrial-250 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-industrial-800 uppercase tracking-wider flex items-center gap-2">
                  <Table className="h-4 w-4 text-brand-600" />
                  <span>تعيين الأعمدة (مع حفظ كافة الأعمدة الأصلية بنسبة 100%):</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">رقم القطعة (PN):</label>
                    <select
                      value={colPartNumber}
                      onChange={(e) => setColPartNumber(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">التسلسل الأصلي:</label>
                    <select
                      value={colSequence}
                      onChange={(e) => setColSequence(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- توليد تلقائي (1 → N) --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">الوصف الفني:</label>
                    <select
                      value={colDescription}
                      onChange={(e) => setColDescription(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">الشركة المصنعة:</label>
                    <select
                      value={colManufacturer}
                      onChange={(e) => setColManufacturer(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">الموديل / Model:</label>
                    <select
                      value={colModel}
                      onChange={(e) => setColModel(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">الكمية:</label>
                    <select
                      value={colQuantity}
                      onChange={(e) => setColQuantity(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد (0) --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">الوحدة:</label>
                    <select
                      value={colUnit}
                      onChange={(e) => setColUnit(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- الافتراضي (pcs) --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-industrial-600 mb-1">بطاقة المعدة (Tag):</label>
                    <select
                      value={colTagNumber}
                      onChange={(e) => setColTagNumber(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 rounded-lg p-2 text-xs font-mono"
                    >
                      <option value="">-- غير محدد --</option>
                      {detectedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview (First 5 rows) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-industrial-700">معاينة أولية للبيانات المستخرجة ({rawRows.length} سطر إجمالي):</span>
                <div className="border border-industrial-200 rounded-2xl overflow-x-auto max-h-56">
                  <table className="w-full text-xs text-right divide-y divide-industrial-200">
                    <thead className="bg-industrial-100 text-industrial-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">رقم القطعة</th>
                        <th className="p-2">الوصف</th>
                        <th className="p-2">المصنع</th>
                        <th className="p-2">الكمية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-100 bg-white">
                      {rawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-center">{idx + 1}</td>
                          <td className="p-2 font-mono font-bold">{colPartNumber ? row[colPartNumber] : '-'}</td>
                          <td className="p-2 truncate max-w-xs">{colDescription ? row[colDescription] : '-'}</td>
                          <td className="p-2">{colManufacturer ? row[colManufacturer] : '-'}</td>
                          <td className="p-2 font-mono">{colQuantity ? row[colQuantity] : '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm Import Action */}
              <div className="pt-4 border-t border-industrial-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubView('files-list')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-600 hover:bg-industrial-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isProcessingImport}
                  onClick={handleCommitImport}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessingImport ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>اعتماد وحفظ ملف المخزن في النظام</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/70 backdrop-blur-xs font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-industrial-200 shadow-xl space-y-4 text-right"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-industrial-900">
                تأكيد حذف ملف المخزن: {fileToDelete.name}
              </h3>
              <p className="text-xs text-industrial-500 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا الملف؟ هذا الإجراء سيقوم بإزالة مرجع الملف من النظام.
              </p>
            </div>

            <div className="p-3 bg-industrial-50 rounded-xl border border-industrial-200 text-xs text-industrial-700 flex items-center gap-2">
              <input
                type="checkbox"
                id="cascadeDeleteCheck"
                checked={deleteCascadeMaterials}
                onChange={(e) => setDeleteCascadeMaterials(e.target.checked)}
                className="rounded border-industrial-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="cascadeDeleteCheck" className="cursor-pointer font-semibold select-none">
                حذف المواد المرتبطة بهذا الملف أيضاً من قاعدة البيانات
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-industrial-600 hover:bg-industrial-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
