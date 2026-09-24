/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  Info, 
  Database,
  Search,
  Settings,
  ShieldCheck,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Material, User, MaterialSerialNumber, MaterialHistoryEvent } from '../types';
import { dbService } from '../services/dbService';

interface ExcelImportModalProps {
  materials: Material[];
  currentUser: User;
  onClose: () => void;
  onImportSuccess: () => void;
}

export type ConflictStrategy = 
  | 'replace' 
  | 'update_qty' 
  | 'update_loc' 
  | 'update_mfr' 
  | 'update_desc' 
  | 'merge_notes' 
  | 'skip';

interface ParsedRow {
  index: number;
  partNumber: string;
  description: string;
  manufacturer: string;
  model: string;
  quantity: number;
  unit: string;
  warehouse: string;
  rack: string;
  shelf: string;
  minStockLevel: number;
  notes: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasConflict: boolean;
  conflictStrategy: ConflictStrategy;
  sequence?: number;
  station?: string;
  internalId?: string;
  materialCode?: string;
  engineeringComments?: string;
  isIncomplete?: boolean;
  additionalFields?: { [key: string]: any };

  // ZFOD Enterprise Fields
  brand?: string;
  serialNumber?: string;
  measuringRange?: string;
  originalQuantity?: number;
  remainingQuantity?: number;
}

export default function ExcelImportModal({ 
  materials, 
  currentUser, 
  onClose, 
  onImportSuccess 
}: ExcelImportModalProps) {
  // Wizard States: 'upload' -> 'mapping' -> 'preview' -> 'importing' -> 'summary'
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'summary'>('upload');
  
  const [file, setFile] = useState<File | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<any[][]>([]);
  
  // Custom Column Mapping State
  const [columnMap, setColumnMap] = useState<{ [key: string]: string }>({
    partNumber: '',
    description: '',
    manufacturer: '',
    model: '',
    quantity: '',
    unit: '',
    warehouse: '',
    rack: '',
    shelf: '',
    minStockLevel: '',
    notes: '',
    sequence: '',
    station: '',
    internalId: '',
    materialCode: '',
    engineeringComments: ''
  });

  // Default Station selection state
  const [defaultStation, setDefaultStation] = useState<string>('ZFOD Warehouse');

  // Final parsed data for preview
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [globalConflictStrategy, setGlobalConflictStrategy] = useState<ConflictStrategy>('merge_notes');
  
  // Filtering and Searching in Preview
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'conflicts'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  
  // Import Progress State
  const [progress, setProgress] = useState(0);
  const [ignoredEmptyRowsCount, setIgnoredEmptyRowsCount] = useState(0);
  const [importStats, setImportStats] = useState({
    total: 0,
    successful: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    incomplete: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Expected field descriptors for mapping guide
  const expectedFields = [
    { key: 'sequence', label: 'Material Sequence (التسلسل المادي)', required: false, keys: ['sequence', 'seq', 'seqno', 'order', 'الترتيب', 'التسلسل', 'sequence_number', 'sequenceno'] },
    { key: 'partNumber', label: 'Part Number / رقم القطعة (اختياري / Optional)', required: false, keys: ['partnumber', 'partno', 'part#', 'pn', 'sku', 'رقم_القطعة', 'رقمالقطعة', 'part'] },
    { key: 'description', label: 'Description / الوصف', required: false, keys: ['description', 'desc', 'details', 'itemname', 'item_name', 'الوصف', 'اسم_المادة', 'المادة'] },
    { key: 'manufacturer', label: 'Manufacturer / المصنع', required: false, keys: ['manufacturer', 'mfg', 'brand', 'maker', 'producer', 'المصنع', 'الشركة_المصنعة'] },
    { key: 'brand', label: 'Brand / الماركة', required: false, keys: ['brand', 'الماركة', 'براند', 'العلامة_التجارية'] },
    { key: 'model', label: 'Model / Series (الموديل)', required: false, keys: ['model', 'series', 'modelno', 'model_number', 'النوع', 'الموديل'] },
    { key: 'serialNumber', label: 'Serial Number / الرقم التسلسلي', required: false, keys: ['serialnumber', 'serial_number', 'serial', 'sn', 's/n', 'الرقم_التسلسلي', 'سيريال'] },
    { key: 'measuringRange', label: 'Measuring Range / مجال القياس', required: false, keys: ['measuringrange', 'measuring_range', 'range', 'span', 'مجال_القياس', 'المدى'] },
    { key: 'unit', label: 'Unit of Measure / الوحدة', required: false, keys: ['unit', 'uom', 'measure', 'pcs', 'الوحدة'] },
    { key: 'quantity', label: 'Quantity / Remaining Qty / الكمية', required: false, keys: ['quantity', 'qty', 'stock', 'instock', 'amount', 'count', 'الكمية', 'المخزون', 'remainingquantity', 'remaining_quantity', 'remqty', 'الكمية_المتبقية'] },
    { key: 'originalQuantity', label: 'Original Quantity / الكمية الأصلية', required: false, keys: ['originalquantity', 'original_quantity', 'origqty', 'الكمية_الأصلية', 'الكمية_الابتدائية'] },
    { key: 'remainingQuantity', label: 'Remaining Quantity / الكمية المتبقية', required: false, keys: ['remainingquantity', 'remaining_quantity', 'remqty', 'الكمية_المتبقية', 'quantity', 'qty'] },
    { key: 'minStockLevel', label: 'Minimum Stock Level / حد الطلب', required: false, keys: ['minimumstock', 'minstock', 'minlevel', 'min_stock', 'threshold', 'alert', 'الحد_الأدنى'] },
    { key: 'warehouse', label: 'Warehouse / Storage Facility / المستودع', required: false, keys: ['warehouse', 'store', 'location', 'storage', 'depot', 'المستودع', 'الموقع', 'المرفق'] },
    { key: 'rack', label: 'Rack Designation (الرف)', required: false, keys: ['rack', 'bin', 'الرف'] },
    { key: 'shelf', label: 'Shelf Coordinates (الخانة)', required: false, keys: ['shelf', 'position', 'coordinate', 'الخانة', 'الدرج'] },
    { key: 'materialCode', label: 'Material Code / رمز المادة', required: false, keys: ['materialcode', 'matcode', 'material_code', 'code', 'رمز_المادة', 'كود_المادة'] },
    { key: 'station', label: 'Station Code (رمز المحطة)', required: false, keys: ['station', 'stationcode', 'station_code', 'plant', 'site', 'المحطة', 'الموقع_الهندسي'] },
    { key: 'internalId', label: 'Internal ERP ID (المعرف الداخلي)', required: false, keys: ['internalid', 'internal_id', 'id', 'ref', 'المعرف'] },
    { key: 'notes', label: 'Personnel Remarks / ملاحظات المستودع', required: false, keys: ['notes', 'comments', 'remarks', 'note', 'ملاحظات'] },
    { key: 'engineeringComments', label: 'Engineering Comments / Notes / تعليقات هندسية', required: false, keys: ['engineeringcomments', 'engineering_comments', 'engcomments', 'تعليقات_هندسية', 'تعليق_المهندس', 'eng_comments'] }
  ];

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Convert Excel / CSV File into raw headers and rows
  const processFile = (inputFile: File) => {
    const name = inputFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      alert('Unsupported file format. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.');
      return;
    }

    setFile(inputFile);
    // Format file size
    const sizeKB = inputFile.size / 1024;
    setFileSizeStr(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        
        let workbook;
        if (name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary', codepage: 65001 }); // UTF-8 standard
        } else {
          workbook = XLSX.read(data, { type: 'binary' });
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert sheet to 2D row array
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (rawRows.length === 0) {
          alert('The uploaded sheet is empty.');
          return;
        }

        // Filter out completely empty spacer lines
        const cleanRows = rawRows.filter(row => row && row.some(cell => cell !== undefined && cell !== ''));
        setIgnoredEmptyRowsCount(rawRows.length - cleanRows.length);

        const headers = Array.from(cleanRows[0] || []).map(h => String(h || '').trim());
        setSheetHeaders(headers);
        setSheetRows(cleanRows.slice(1));

        // Auto Map Columns Based on Keyword Heuristics
        const newMap = { ...columnMap };
        expectedFields.forEach(field => {
          const matchIndex = headers.findIndex(h => {
            if (!h) return false;
            const normalized = h.toLowerCase().replace(/[\s_\-#/()]/g, '');
            return field.keys.some(k => normalized.includes(k) || k.includes(normalized));
          });
          if (matchIndex !== -1) {
            newMap[field.key] = headers[matchIndex];
          } else {
            newMap[field.key] = ''; // No automatic match found
          }
        });

        setColumnMap(newMap);
        setStep('mapping');
      } catch (err) {
        console.error('File parsing error: ', err);
        alert('An error occurred while parsing the file. Please ensure it is a valid spreadsheet.');
      }
    };
    reader.readAsBinaryString(inputFile);
  };

  // Switch to Preview Stage and Validate Row Data
  const handleGeneratePreview = () => {
    const headerIndices: { [key: string]: number } = {};
    expectedFields.forEach(field => {
      const mappedHeader = columnMap[field.key];
      headerIndices[field.key] = sheetHeaders.indexOf(mappedHeader);
    });

    const validated: ParsedRow[] = sheetRows.map((row, idx) => {
      const getVal = (key: string): string => {
        const index = headerIndices[key];
        if (index === -1 || index === undefined) return '';
        const val = row[index];
        return val !== undefined ? String(val).trim() : '';
      };

      let partNumber = getVal('partNumber');
      let isPartNumberAutoGenerated = false;
      if (!partNumber) {
        partNumber = '';
        isPartNumberAutoGenerated = true;
      }

      const description = getVal('description');
      const manufacturer = getVal('manufacturer');
      const model = getVal('model') || 'N/A';
      
      // ZFOD Fields
      const brand = getVal('brand') || manufacturer;
      const serialNumber = getVal('serialNumber');
      const measuringRange = getVal('measuringRange');
      const rawRemainingQty = getVal('remainingQuantity');
      const remainingQuantity = rawRemainingQty ? Math.max(0, parseInt(rawRemainingQty) || 0) : undefined;
      const rawOriginalQty = getVal('originalQuantity');
      const originalQuantity = rawOriginalQty ? Math.max(0, parseInt(rawOriginalQty) || 0) : undefined;

      const rawQty = getVal('quantity') || rawRemainingQty;
      const quantity = rawQty ? Math.max(0, parseInt(rawQty) || 0) : 0;
      
      const unit = getVal('unit') || 'pcs';
      const warehouse = getVal('warehouse') || 'Automation Depot';
      const rack = getVal('rack') || 'N/A';
      const shelf = getVal('shelf') || 'N/A';
      
      const rawMin = getVal('minStockLevel');
      const minStockLevel = rawMin ? Math.max(0, parseInt(rawMin) || 0) : 10;
      
      const notes = getVal('notes');

      // Preserve structure fields
      const rawSeq = getVal('sequence');
      const sequence = rawSeq ? parseInt(rawSeq) || undefined : undefined;
      const station = getVal('station') || defaultStation;
      const internalId = getVal('internalId') || undefined;

      const materialCode = getVal('materialCode');
      const engineeringComments = getVal('engineeringComments');

      // Unmapped columns
      const mappedHeadersValues = Object.values(columnMap).filter(Boolean);
      const unmappedHeaders = sheetHeaders.filter(h => !mappedHeadersValues.includes(h));
      const additionalFields: { [key: string]: any } = {};
      unmappedHeaders.forEach(h => {
        const headerIdx = sheetHeaders.indexOf(h);
        if (headerIdx !== -1) {
          const cellVal = row[headerIdx];
          if (cellVal !== undefined && cellVal !== '') {
            additionalFields[h] = String(cellVal).trim();
          }
        }
      });

      // Validation logic - missing fields produce warnings, but do NOT make the row invalid
      const errors: string[] = [];
      const warnings: string[] = [];

      const isIncomplete = isPartNumberAutoGenerated || !getVal('partNumber') || !description || !manufacturer || !model || model === 'N/A';

      if (isPartNumberAutoGenerated) {
        warnings.push('لم يتم تحديد رقم قطعة للمادة في الإكسل (سيتم عرضها كـ غير محدد — ويمكنك تعيينه لاحقاً).');
      }
      if (!description) {
        warnings.push('Description is missing.');
      }
      if (!manufacturer) {
        warnings.push('Manufacturer is missing.');
      }
      if (!getVal('model')) {
        warnings.push('Model designation is missing.');
      }
      if (rawQty && isNaN(parseInt(rawQty))) {
        warnings.push(`Invalid quantity format "${rawQty}", defaulted to 0.`);
      }
      if (rawMin && isNaN(parseInt(rawMin))) {
        warnings.push(`Invalid minimum stock level "${rawMin}", defaulted to 10.`);
      }

      const isValid = true; // Always valid since missing fields are accepted under Smart Import Mode

      // Duplicate Check with database
      const hasConflict = (!partNumber || isPartNumberAutoGenerated) ? false : materials.some(
        m => m.partNumber && m.partNumber.trim().toUpperCase() === partNumber.trim().toUpperCase()
      );

      return {
        index: idx + 1,
        partNumber,
        description,
        manufacturer,
        model,
        quantity,
        unit,
        warehouse,
        rack,
        shelf,
        minStockLevel,
        notes,
        isValid,
        errors,
        warnings,
        hasConflict,
        conflictStrategy: globalConflictStrategy,
        sequence,
        station,
        internalId,
        materialCode,
        engineeringComments,
        isIncomplete,
        additionalFields,
        brand,
        serialNumber,
        measuringRange,
        originalQuantity,
        remainingQuantity
      };
    });

    setParsedData(validated);
    setStep('preview');
  };

  // Change Conflict Strategy Globally
  const handleSetGlobalStrategy = (strategy: ConflictStrategy) => {
    setGlobalConflictStrategy(strategy);
    setParsedData(prev => prev.map(row => ({
      ...row,
      conflictStrategy: strategy
    })));
  };

  // Change Conflict Strategy for a specific row
  const handleSetRowStrategy = (idx: number, strategy: ConflictStrategy) => {
    setParsedData(prev => prev.map(row => {
      if (row.index === idx) {
        return { ...row, conflictStrategy: strategy };
      }
      return row;
    }));
  };

  // Execute actual database write operations with progress
  const handleExecuteImport = async () => {
    setStep('importing');
    setProgress(0);

    let succ = 0;
    let upd = 0;
    let skp = 0;
    let fail = 0;
    let incCount = 0;

    const total = parsedData.length;

    for (let i = 0; i < total; i++) {
      const row = parsedData[i];

      if (!row.isValid) {
        fail++;
        continue;
      }

      if (row.isIncomplete) {
        incCount++;
      }

      // Check existing material
      const existing = dbService.getMaterialByPartNumber(row.partNumber);

      if (existing) {
        const strategy = row.conflictStrategy;

        if (strategy === 'skip') {
          skp++;
          continue;
        }

        const updatedMaterial: Material = { ...existing };
        let historyNotes = `Updated via spreadsheet import "${file?.name || 'materials_import'}". Strategy: ${strategy}. `;

        // Keep core Excel metadata
        if (row.materialCode) updatedMaterial.materialCode = row.materialCode;
        if (row.engineeringComments) updatedMaterial.engineeringComments = row.engineeringComments;
        if (row.isIncomplete !== undefined) updatedMaterial.isIncomplete = row.isIncomplete;
        if (row.additionalFields) {
          updatedMaterial.additionalFields = {
            ...(existing.additionalFields || {}),
            ...row.additionalFields
          };
        }

        // Update fields based on chosen granular conflict strategy
        if (strategy === 'replace') {
          updatedMaterial.description = row.description;
          updatedMaterial.manufacturer = row.manufacturer;
          updatedMaterial.model = row.model;
          updatedMaterial.quantity = row.quantity;
          updatedMaterial.unit = row.unit;
          updatedMaterial.store = row.warehouse;
          updatedMaterial.rack = row.rack;
          updatedMaterial.shelf = row.shelf;
          updatedMaterial.minStockLevel = row.minStockLevel;
          updatedMaterial.engineeringNotes = row.notes;
          updatedMaterial.notes = row.notes;
          updatedMaterial.brand = row.brand;
          updatedMaterial.serialNumber = row.serialNumber;
          updatedMaterial.measuringRange = row.measuringRange;
          if (row.originalQuantity !== undefined) updatedMaterial.originalQuantity = row.originalQuantity;
          if (row.remainingQuantity !== undefined) updatedMaterial.remainingQuantity = row.remainingQuantity;
          if (row.sequence !== undefined) updatedMaterial.sequence = row.sequence;
          if (row.station) updatedMaterial.station = row.station;
          if (row.internalId) updatedMaterial.internalId = row.internalId;
          historyNotes += 'Full database fields replaced.';
        } else if (strategy === 'update_qty') {
          const oldQty = existing.quantity || 0;
          updatedMaterial.quantity = row.quantity;
          historyNotes += `Quantity updated from ${oldQty} to ${row.quantity} ${row.unit || 'pcs'}.`;
        } else if (strategy === 'update_loc') {
          updatedMaterial.store = row.warehouse;
          updatedMaterial.rack = row.rack;
          updatedMaterial.shelf = row.shelf;
          if (row.station) updatedMaterial.station = row.station;
          historyNotes += `Location coordinates updated to Store Room: ${row.warehouse}, Rack: ${row.rack}, Shelf: ${row.shelf}.`;
        } else if (strategy === 'update_mfr') {
          updatedMaterial.manufacturer = row.manufacturer;
          updatedMaterial.model = row.model;
          historyNotes += `Manufacturer identification updated to Mfg: ${row.manufacturer}, Model: ${row.model}.`;
        } else if (strategy === 'update_desc') {
          updatedMaterial.description = row.description;
          historyNotes += `Material description updated to: "${row.description}".`;
        } else if (strategy === 'merge_notes') {
          if (row.notes) {
            updatedMaterial.engineeringNotes = existing.engineeringNotes 
              ? `${existing.engineeringNotes}\n\n[Spreadsheet Merge ${new Date().toLocaleDateString()}]: ${row.notes}`
              : row.notes;
            updatedMaterial.notes = updatedMaterial.engineeringNotes;
          }
          if (row.sequence !== undefined) updatedMaterial.sequence = row.sequence;
          if (row.internalId) updatedMaterial.internalId = row.internalId;
          historyNotes += 'Merged engineering notes and preserved database attributes.';
        }

        // Add history record
        const historyEvent: MaterialHistoryEvent = {
          id: `hist-imp-${Date.now()}-${Math.random()}`,
          action: 'Record Imported',
          details: historyNotes,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        };
        
        updatedMaterial.history = [...(existing.history || []), historyEvent];
        updatedMaterial.updatedAt = new Date().toISOString();
        updatedMaterial.importedAt = new Date().toISOString();
        updatedMaterial.importedBy = currentUser.name;
        updatedMaterial.originalFilename = file?.name || 'materials_import.xlsx';

        // Keep a reference to the original spreadsheet inside document locker if requested
        if (file) {
          if (!updatedMaterial.documents) updatedMaterial.documents = {};
          updatedMaterial.documents.originalExcel = {
            name: `Import file: ${file.name}`,
            fileName: file.name,
            uploadedBy: currentUser.name,
            uploadedAt: new Date().toISOString(),
            fileSize: fileSizeStr
          };
        }

        const res = dbService.updateMaterial(updatedMaterial, currentUser);
        if (res.success) {
          upd++;
        } else {
          fail++;
        }
      } else {
        // Create new material
        const payload: Omit<Material, 'createdAt' | 'updatedAt'> = {
          id: `mat-${row.sequence || (i + 1)}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          partNumber: row.partNumber || '',
          description: row.description,
          manufacturer: row.manufacturer,
          model: row.model,
          quantity: row.quantity,
          unit: row.unit,
          store: row.warehouse,
          rack: row.rack,
          shelf: row.shelf,
          notes: row.notes,
          engineeringNotes: row.notes,
          minStockLevel: row.minStockLevel,
          sequence: row.sequence,
          station: row.station,
          internalId: row.internalId,
          materialCode: row.materialCode,
          engineeringComments: row.engineeringComments,
          isIncomplete: row.isIncomplete,
          isPartNumberAutoGenerated: row.isPartNumberAutoGenerated,
          additionalFields: row.additionalFields,
          brand: row.brand,
          serialNumber: row.serialNumber,
          measuringRange: row.measuringRange,
          originalQuantity: row.originalQuantity,
          remainingQuantity: row.remainingQuantity,
          serialNumbers: [],
          healthScore: 85,
          oemVerified: false,
          oemVerificationStatus: 'pending',
          oemCertificateId: '',
          oemVerifiedBy: '',
          oemVerificationDate: '',
          oemVerificationNotes: '',
          importedAt: new Date().toISOString(),
          importedBy: currentUser.name,
          originalFilename: file?.name || 'materials_import.xlsx',
          documents: file ? {
            originalExcel: {
              name: `Import file: ${file.name}`,
              fileName: file.name,
              uploadedBy: currentUser.name,
              uploadedAt: new Date().toISOString(),
              fileSize: fileSizeStr
            }
          } : {}
        };

        const res = dbService.addMaterial(payload, currentUser);
        if (res.success) {
          succ++;
        } else {
          fail++;
        }
      }

      // Update progress bar
      setProgress(Math.round(((i + 1) / total) * 100));
      // Artificial delay to make progress visible and prevent memory bottlenecks
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    setImportStats({
      total,
      successful: succ,
      updated: upd,
      skipped: skp,
      failed: fail,
      incomplete: incCount
    });
    setStep('summary');
    onImportSuccess();
  };

  // Filter preview list
  const filteredPreviewRows = parsedData.filter(row => {
    const partNumber = row.partNumber || '';
    const description = row.description || '';
    const manufacturer = row.manufacturer || '';
    const matchesSearch = 
      partNumber.toLowerCase().includes(previewSearch.toLowerCase()) ||
      description.toLowerCase().includes(previewSearch.toLowerCase()) ||
      manufacturer.toLowerCase().includes(previewSearch.toLowerCase());
    
    if (previewFilter === 'all') return matchesSearch;
    if (previewFilter === 'valid') return row.isValid && matchesSearch;
    if (previewFilter === 'invalid') return !row.isValid && matchesSearch;
    if (previewFilter === 'conflicts') return row.hasConflict && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/60 backdrop-blur-xs font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="bg-white rounded-3xl border border-industrial-200 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col text-left"
        id="excel-import-dialog"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-industrial-100 bg-industrial-50/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-industrial-800 tracking-tight heading-display flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-brand-600" />
              <span>استيراد المواد من اكسل / Excel Document Importer</span>
            </h3>
            <p className="text-xs text-industrial-500 mt-0.5">
              Securely map, validate and ingest large engineering data inventories into Firebase Firestore.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-industrial-400 hover:text-industrial-600 hover:bg-industrial-100/80 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Wizard Stages */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          
          {/* STEP 1: UPLOAD SCREEN */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
                  isDragging 
                    ? 'border-brand-500 bg-brand-50/40' 
                    : 'border-industrial-200 hover:border-brand-400 hover:bg-industrial-50/40 bg-white'
                }`}
                id="excel-upload-zone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="p-4 bg-brand-50 text-brand-600 rounded-full border border-brand-100 shadow-sm animate-pulse">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-industrial-800">
                    Drag and Drop your Spreadsheet here
                  </p>
                  <p className="text-xs text-industrial-500">
                    Supports Microsoft Excel (<strong className="font-mono text-brand-700">.xlsx/.xls</strong>) or Comma Separated (<strong className="font-mono text-brand-700">.csv</strong>)
                  </p>
                </div>
                <button 
                  type="button"
                  className="mt-2 bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs"
                >
                  Browse Files
                </button>
              </div>

              {/* Guidelines Card */}
              <div className="bg-industrial-50 border border-industrial-200 rounded-2xl p-5 text-xs space-y-3">
                <h4 className="font-bold text-industrial-800 flex items-center gap-1.5 font-mono uppercase text-[10px] tracking-wider">
                  <Info className="h-4 w-4 text-brand-500" /> Pre-Import Specifications & Integrity Guidelines:
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-industrial-600">
                  <li><strong>Case-Insensitive Uniqueness</strong>: Part Number is the primary registry key. Rows with identical part numbers will be merged or skipped.</li>
                  <li><strong>Core Required Columns</strong>: The system requires mapping columns for <strong>Part Number</strong>, <strong>Description</strong>, and <strong>Manufacturer</strong>.</li>
                  <li><strong>Intelligent Parsing</strong>: Numbers (Quantities, Min Levels) will be automatically extracted. If empty, standard safety levels are assigned.</li>
                  <li><strong>Database Direct Sync</strong>: All imported data is instantly synchronized to Firebase Cloud Firestore.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING SCREEN */}
          {step === 'mapping' && file && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl gap-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-brand-600" />
                  <div>
                    <span className="font-bold text-xs text-industrial-800 block">{file.name}</span>
                    <span className="text-[10px] text-industrial-500 font-mono block">Size: {fileSizeStr} | Detected Rows: {sheetRows.length}</span>
                  </div>
                </div>
                
                {/* Source Station / Multi-Station Selection Dropdown */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-industrial-200">
                  <span className="text-[10px] font-bold text-industrial-500 font-mono uppercase">Source Station:</span>
                  <select
                    value={defaultStation}
                    onChange={(e) => setDefaultStation(e.target.value)}
                    className="text-xs font-semibold text-industrial-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    <option value="Station A">Station A / المحطة أ</option>
                    <option value="Station B">Station B / المحطة ب</option>
                    <option value="Station C">Station C / المحطة ج</option>
                    <option value="ZFOD Warehouse">ZFOD Warehouse / مستودع المجمع</option>
                  </select>
                </div>

                <button 
                  onClick={() => {
                    setFile(null);
                    setStep('upload');
                  }}
                  className="text-xs text-red-600 hover:underline font-semibold cursor-pointer shrink-0"
                >
                  Choose Different File
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-industrial-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Settings className="h-4 w-4 text-brand-600" /> Map Sheet Columns to Database Fields
                </h4>
                <p className="text-xs text-industrial-500">
                  EMIS AI auto-matched columns based on cell header semantics. Review the mappings below and make manual adjustments as necessary.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expectedFields.map(field => {
                  const currentValue = columnMap[field.key] || '';
                  return (
                    <div 
                      key={field.key} 
                      className={`p-3.5 border rounded-xl flex items-center justify-between gap-4 text-xs transition-colors ${
                        field.required 
                          ? currentValue 
                            ? 'bg-emerald-50/30 border-emerald-200' 
                            : 'bg-red-50/30 border-red-200'
                          : 'bg-industrial-50/40 border-industrial-200/80'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-industrial-800 flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-500 font-mono font-normal">*</span>}
                        </span>
                        <span className="text-[10px] text-industrial-400 font-mono block">Database key: {field.key}</span>
                      </div>

                      <select
                        value={currentValue}
                        onChange={(e) => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border max-w-[180px] focus:outline-none ${
                          field.required && !currentValue
                            ? 'border-red-300 bg-white text-red-700 font-bold animate-pulse'
                            : 'border-industrial-250 bg-white text-industrial-700'
                        }`}
                      >
                        <option value="">-- Do Not Import --</option>
                        {sheetHeaders.map((h, idx) => (
                          <option key={`${h}-${idx}`} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Warning if required mappings are missing */}
              {expectedFields.some(f => f.required && !columnMap[f.key]) && (
                <div className="p-3.5 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>Please map all required fields marked with * (Part Number, Description, Manufacturer) to proceed.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PREVIEW AND CONFLICT RESOLUTION */}
          {step === 'preview' && (
            <div className="space-y-5">
              {/* Conflict configuration bar */}
              <div className="p-4 bg-industrial-900 border border-industrial-850 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-brand-400 uppercase">
                    Conflict Resolution Engine
                  </h4>
                  <p className="text-[11px] text-industrial-300">
                    How should EMIS handle Part Numbers that already exist in the central registry?
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-industrial-800 p-2 rounded-xl border border-industrial-700">
                  <span className="text-[10px] font-bold text-industrial-300 px-2 font-mono uppercase shrink-0">Global Strategy:</span>
                  <select
                    value={globalConflictStrategy}
                    onChange={(e) => handleSetGlobalStrategy(e.target.value as ConflictStrategy)}
                    className="text-[11px] font-bold bg-industrial-900 text-white border border-industrial-600 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="merge_notes">Merge Engineering Notes</option>
                    <option value="update_qty">Update Quantity Only</option>
                    <option value="update_loc">Update Location Only</option>
                    <option value="update_mfr">Update Manufacturer Only</option>
                    <option value="update_desc">Update Description Only</option>
                    <option value="replace">Replace Existing Record</option>
                    <option value="skip">Cancel / Skip Row</option>
                  </select>
                </div>
              </div>

              {/* Table search and filter control bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-industrial-50 p-1 rounded-xl border border-industrial-200">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${previewFilter === 'all' ? 'bg-white text-industrial-800 shadow-2xs' : 'text-industrial-500 hover:text-industrial-750'}`}
                  >
                    All Rows ({parsedData.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${previewFilter === 'valid' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-industrial-500 hover:text-industrial-750'}`}
                  >
                    Valid ({parsedData.filter(r => r.isValid).length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('conflicts')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${previewFilter === 'conflicts' ? 'bg-white text-amber-800 shadow-2xs' : 'text-industrial-500 hover:text-industrial-750'}`}
                  >
                    Conflicts ({parsedData.filter(r => r.hasConflict).length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('invalid')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${previewFilter === 'invalid' ? 'bg-white text-red-800 shadow-2xs' : 'text-industrial-500 hover:text-industrial-750'}`}
                  >
                    Missing/Errors ({parsedData.filter(r => !r.isValid).length})
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search preview rows..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="bg-industrial-50 border border-industrial-200 text-xs px-3 py-1.5 pl-8 rounded-xl focus:outline-none w-full sm:w-[220px]"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-industrial-400" />
                </div>
              </div>

              {/* Spreadsheet-like Table */}
              <div className="border border-industrial-200 rounded-2xl overflow-hidden max-h-[42vh] overflow-y-auto shadow-2xs text-xs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-industrial-50 border-b border-industrial-200 text-industrial-500 text-[10px] font-mono uppercase tracking-wider sticky top-0 z-10 select-none">
                      <th className="p-2.5 pl-4 w-[50px] text-center font-bold">#</th>
                      <th className="p-2.5 font-bold">Status / Errors</th>
                      <th className="p-2.5 font-bold">Part Number / SKU</th>
                      <th className="p-2.5 font-bold">Description</th>
                      <th className="p-2.5 font-bold">Manufacturer / Model</th>
                      <th className="p-2.5 font-bold text-right">In-Stock Qty</th>
                      <th className="p-2.5 font-bold">Warehouse Location</th>
                      <th className="p-2.5 font-bold text-center w-[170px]">Duplicate Strategy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100 font-mono text-[11px] text-industrial-700">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-industrial-450 italic font-sans">
                          No rows match the active preview filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((row) => (
                        <tr 
                          key={row.index}
                          className={`hover:bg-industrial-50/40 transition-colors ${
                            !row.isValid 
                              ? 'bg-red-50/20' 
                              : row.hasConflict 
                                ? 'bg-amber-50/15' 
                                : ''
                          }`}
                        >
                          <td className="p-2 text-center text-industrial-400 font-bold border-r border-industrial-100">{row.index}</td>
                          <td className="p-2 px-3">
                            {!row.isValid ? (
                              <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-100/80 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                                <AlertTriangle className="h-3.5 w-3.5" /> Errors
                              </span>
                            ) : row.hasConflict ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                                <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> Conflict
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                                <CheckCircle className="h-3.5 w-3.5" /> Ready
                              </span>
                            )}
                            
                            {/* Error / Warning Tooltips */}
                            {row.errors.map((err, errIdx) => (
                              <span key={`${err}-${errIdx}`} className="block text-[9px] text-red-600 font-sans mt-0.5 font-semibold">⚠ {err}</span>
                            ))}
                            {row.warnings.map((war, warIdx) => (
                              <span key={`${war}-${warIdx}`} className="block text-[9px] text-amber-600 font-sans mt-0.5">⚠ {war}</span>
                            ))}
                          </td>
                          <td className="p-2 font-bold text-industrial-900 select-all">
                            {row.isPartNumberAutoGenerated ? (
                              <div className="flex items-center gap-1.5" title="لم يتم إدخال رقم قطعة في ملف الإكسل (غير محدد)">
                                <span className="font-mono text-industrial-300 font-bold">—</span>
                                <span className="text-[10px] font-sans font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  بدون رقم قطعة (فارغ)
                                </span>
                              </div>
                            ) : (
                              row.partNumber || <span className="text-red-600 italic">EMPTY</span>
                            )}
                          </td>
                          <td className="p-2 max-w-[180px] truncate text-industrial-800 font-sans" title={row.description}>{row.description || <span className="text-red-600 italic">EMPTY</span>}</td>
                          <td className="p-2 font-sans">
                            <span className="font-bold text-industrial-800 block">{row.manufacturer || <span className="text-red-600 italic">EMPTY</span>}</span>
                            <span className="text-[10px] text-industrial-450 font-mono block">Series: {row.model}</span>
                          </td>
                          <td className="p-2 text-right text-industrial-950 font-bold">{row.quantity} <span className="text-[10px] text-industrial-450 font-normal font-sans">{row.unit}</span></td>
                          <td className="p-2 font-sans">
                            <span className="font-semibold text-industrial-800 block">{row.warehouse}</span>
                            <span className="text-[10px] text-industrial-500 font-mono block">Rack {row.rack} / Shelf {row.shelf}</span>
                          </td>
                          <td className="p-2 text-center border-l border-industrial-100">
                            {row.hasConflict ? (
                              <select
                                value={row.conflictStrategy}
                                onChange={(e) => handleSetRowStrategy(row.index, e.target.value as ConflictStrategy)}
                                className="bg-white border border-industrial-250 p-1 rounded font-sans font-semibold text-[10px] text-industrial-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              >
                                <option value="merge_notes">Merge Eng. Notes</option>
                                <option value="update_qty">Update Quantity</option>
                                <option value="update_loc">Update Location</option>
                                <option value="update_mfr">Update Manufacturer</option>
                                <option value="update_desc">Update Description</option>
                                <option value="replace">Replace Existing</option>
                                <option value="skip">Cancel / Skip</option>
                              </select>
                            ) : (
                              <span className="text-industrial-400 font-sans font-medium text-[10px]">New SKU Record</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: ACTIVE IMPORTING / PROGRESS SCREEN */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-20 w-20 border-3 border-industrial-100 border-t-brand-600"></div>
                <Database className="absolute h-7 w-7 text-brand-600 animate-bounce" />
              </div>

              <div className="text-center space-y-2 max-w-sm">
                <h4 className="text-sm font-bold text-industrial-800">
                  Ingesting spreadsheet inventory records...
                </h4>
                <p className="text-xs text-industrial-500">
                  Synchronizing records in real-time to persistent Local JSON and Firebase Cloud Firestore database clusters.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-industrial-100 h-2.5 rounded-full overflow-hidden border border-industrial-200">
                <div 
                  className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
                Progress: {progress}% Complete
              </span>
            </div>
          )}

          {/* STEP 5: DETAILED SUMMARY SCREEN */}
          {step === 'summary' && (
            <div className="space-y-6 text-center max-w-md mx-auto py-4">
              <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 shadow-sm">
                <ShieldCheck className="h-10 w-10 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-industrial-800 heading-display">
                  Spreadsheet Ingestion Complete / اكتمل الاستيراد بنجاح
                </h3>
                <p className="text-xs text-industrial-500">
                  Inventory ledger registry updated. Database fully persistent. Original file linked to documents.
                </p>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3.5 bg-industrial-50 p-5 rounded-2xl border border-industrial-200 text-left font-sans">
                <div className="bg-white p-3.5 rounded-xl border border-industrial-150 col-span-2 flex justify-between items-center">
                  <div>
                    <span className="block text-[9px] font-mono text-industrial-450 uppercase font-bold">Total Spreadsheet Rows</span>
                    <span className="text-lg font-black font-mono text-industrial-800 mt-1 block">{importStats.total} entries</span>
                  </div>
                  <div className="text-right text-[11px] font-mono text-industrial-500">
                    File: <span className="font-bold text-industrial-700">{file?.name}</span>
                  </div>
                </div>
                
                <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-xl text-emerald-950">
                  <span className="block text-[9px] font-mono text-emerald-600 uppercase font-extrabold">Imported Records</span>
                  <span className="text-lg font-black font-mono text-emerald-800 mt-1 block">{importStats.successful + importStats.updated} records</span>
                  <span className="text-[9px] text-emerald-600 block mt-0.5">({importStats.successful} new / {importStats.updated} duplicate resolved)</span>
                </div>

                <div className="bg-amber-50/40 border border-amber-100 p-3.5 rounded-xl text-amber-950">
                  <span className="block text-[9px] font-mono text-amber-600 uppercase font-extrabold">Incomplete Records</span>
                  <span className="text-lg font-black font-mono text-amber-800 mt-1 block">{importStats.incomplete} records</span>
                  <span className="text-[9px] text-amber-600 block mt-0.5">Missing mandatory info (flagged)</span>
                </div>

                <div className="bg-blue-50/40 border border-blue-100 p-3.5 rounded-xl text-blue-950">
                  <span className="block text-[9px] font-mono text-blue-600 uppercase font-extrabold">Duplicate Records</span>
                  <span className="text-lg font-black font-mono text-blue-800 mt-1 block">{importStats.updated} records</span>
                  <span className="text-[9px] text-blue-600 block mt-0.5">Merged or resolved successfully</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-industrial-150">
                  <span className="block text-[9px] font-mono text-industrial-450 uppercase font-bold">Ignored Empty Rows</span>
                  <span className="text-lg font-black font-mono text-industrial-800 mt-1 block">{ignoredEmptyRowsCount} rows</span>
                  <span className="text-[9px] text-industrial-400 block mt-0.5">Blank spreadsheet lines ignored</span>
                </div>

                {importStats.failed > 0 && (
                  <div className="col-span-2 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span>Import Engine bypassed {importStats.failed} invalid rows to prevent database corruption.</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Wizard Action Buttons Footer */}
        <div className="p-5 bg-industrial-50 border-t border-industrial-100 flex justify-between items-center shrink-0 text-xs">
          
          {/* Back Action */}
          <div>
            {step === 'mapping' && (
              <button
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 border border-industrial-250 bg-white hover:bg-industrial-100 rounded-xl text-industrial-600 font-bold transition-all cursor-pointer"
              >
                Back to Upload
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('mapping')}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 border border-industrial-250 bg-white hover:bg-industrial-100 rounded-xl text-industrial-600 font-bold transition-all cursor-pointer"
              >
                Back to Column Map
              </button>
            )}
          </div>

          {/* Forward Action */}
          <div>
            {step === 'upload' && (
              <button
                disabled={!file}
                onClick={() => setStep('mapping')}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-industrial-200 disabled:text-industrial-400 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>Continue to Mapping</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 'mapping' && (
              <button
                disabled={expectedFields.some(f => f.required && !columnMap[f.key])}
                onClick={handleGeneratePreview}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-industrial-200 disabled:text-industrial-400 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>Generate Preview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 'preview' && (
              <button
                disabled={parsedData.length === 0 || parsedData.every(r => !r.isValid && r.conflictStrategy === 'skip')}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-1.5 px-5.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-industrial-200 disabled:text-industrial-400 text-white font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
                id="execute-import-btn"
              >
                <Database className="h-4 w-4" />
                <span>Begin Database Ingestion ({parsedData.filter(r => r.isValid && r.conflictStrategy !== 'skip').length} rows)</span>
              </button>
            )}

            {step === 'summary' && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Finish / Close Portal</span>
              </button>
            )}
          </div>

        </div>

      </motion.div>
    </div>
  );
}
