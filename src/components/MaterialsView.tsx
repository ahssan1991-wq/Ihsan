/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Trash2, 
  Edit, 
  Printer,
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ChevronsUpDown,
  Filter,
  FileSpreadsheet,
  Layers,
  MapPin,
  Clock,
  Eye,
  ExternalLink,
  Copy,
  Download,
  Wrench,
  FileText,
  Image as ImageIcon,
  History,
  RefreshCw,
  Cpu,
  Zap,
  Sparkles,
  Upload,
  Check,
  PlusCircle,
  ArrowRight,
  Lock,
  Activity,
  Info,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Send,
  Camera,
  Tag,
  ChevronDown
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import NameplateScanner from './NameplateScanner';
import MaterialContextualChat from './MaterialContextualChat';
import { Material, User, UserRole, Equipment, MaterialHistoryEvent, MaterialDocument, isTemporaryPartNumber, formatPartNumberDisplay } from '../types';
import { dbService } from '../services/dbService';
import { getBaseApiUrl, apiChatWithAi, apiAutoCompleteMaterial } from '../services/apiClient';
import ExcelImportModal from './ExcelImportModal';
import * as XLSX from 'xlsx';
import * as googleDrive from '../services/googleDriveService';
import { 
  executePrint, 
  openPrintPreview, 
  generateAssetTagHtml, 
  generateVoucherPrintHtml, 
  openDocumentInNewTab,
  downloadDocument
} from '../utils/printManager';

interface MaterialsViewProps {
  materials?: Material[];
  equipment?: Equipment[];
  currentUser: User;
  onUpdateMaterial: (material: Material, oldPartNumber?: string) => void;
  onDeleteMaterial: (partNumber: string) => void;
  initialSearchQuery?: string;
  onNavigateToTab: (tabId: string, query?: string, prefillData?: Record<string, string | null>) => void;
  onImportSuccess?: () => void;
}

type SortField = 'sequence' | 'partNumber' | 'quantity' | 'manufacturer' | 'store';
type SortOrder = 'asc' | 'desc';

export default function MaterialsView({ 
  materials: rawMaterials = [], 
  equipment = [],
  currentUser, 
  onUpdateMaterial, 
  onDeleteMaterial, 
  initialSearchQuery = '',
  onNavigateToTab,
  onImportSuccess = () => {}
}: MaterialsViewProps) {
  const materials = Array.isArray(rawMaterials) && rawMaterials.length > 0 ? rawMaterials : (dbService.getMaterials() || []);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery === 'lowstock' ? '' : initialSearchQuery);
  const [filterStore, setFilterStore] = useState('All');
  const [filterStockStatus, setFilterStockStatus] = useState(initialSearchQuery === 'lowstock' ? 'Low' : 'All');
  const [filterPartNumberStatus, setFilterPartNumberStatus] = useState<'All' | 'WithPN' | 'WithoutPN'>('All');
  
  const [sortField, setSortField] = useState<SortField>('sequence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState(0);

  // Core details editing state
  const [isEditingCoreDetails, setIsEditingCoreDetails] = useState(false);
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editMaterialCode, setEditMaterialCode] = useState('');
  const [editEngineeringComments, setEditEngineeringComments] = useState('');
  const [editWarehouse, setEditWarehouse] = useState('');
  const [editRack, setEditRack] = useState('');
  const [editShelf, setEditShelf] = useState('');
  const [editMinStock, setEditMinStock] = useState(10);
  const [isAutoEnrichingCore, setIsAutoEnrichingCore] = useState(false);

  // Advanced Engineering Tabs States
  const [activeModalTab, setActiveModalTab] = useState<'specs' | 'compatibility' | 'documents' | 'timeline' | 'ask-ai' | 'serials' | 'compare-datasheets' | 'compare-coc' | 'knowledge-assistant' | 'alternative-parts'>('specs');
  
  // Activated AI features states
  const [datasheetCompareResult, setDatasheetCompareResult] = useState<any>(null);
  const [datasheetCompareLoading, setDatasheetCompareLoading] = useState(false);
  const [cocCompareResult, setCocCompareResult] = useState<any>(null);
  const [cocCompareLoading, setCocCompareLoading] = useState(false);
  const [knowledgeResult, setKnowledgeResult] = useState<any>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [altPartsResult, setAltPartsResult] = useState<any>(null);
  const [altPartsLoading, setAltPartsLoading] = useState(false);

  // File Base64 caches for uploads
  const [datasheetFile1, setDatasheetFile1] = useState<{name: string, base64: string, type: string} | null>(null);
  const [datasheetFile2, setDatasheetFile2] = useState<{name: string, base64: string, type: string} | null>(null);
  const [cocFile1, setCocFile1] = useState<{name: string, base64: string, type: string} | null>(null);
  const [cocFile2, setCocFile2] = useState<{name: string, base64: string, type: string} | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotesValue, setEditedNotesValue] = useState('');
  const [isEditingAlternatives, setIsEditingAlternatives] = useState(false);
  const [editedAltPrimary, setEditedAltPrimary] = useState('');
  const [editedAltSecondary, setEditedAltSecondary] = useState('');
  const [editedAltNotes, setEditedAltNotes] = useState('');
  const [editedAltReason, setEditedAltReason] = useState('');
  const [selectedEquipmentToLink, setSelectedEquipmentToLink] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>('datasheet');
  const [uploadDocName, setUploadDocName] = useState('');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [addPhotoCategory, setAddPhotoCategory] = useState<'nameplate' | 'installation' | 'warehouse'>('nameplate');
  const [addPhotoUrl, setAddPhotoUrl] = useState('');
  
  // Interactive Print Label States
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false);
  const [printLabelMaterial, setPrintLabelMaterial] = useState<Material | null>(null);
  const [printIncludeMfg, setPrintIncludeMfg] = useState(true);
  const [printIncludeLocation, setPrintIncludeLocation] = useState(true);
  const [printIncludeSpecs, setPrintIncludeSpecs] = useState(true);
  const [printLabelSize, setPrintLabelSize] = useState<'standard' | 'small' | 'large'>('standard');
  const [isMobileExportOpen, setIsMobileExportOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  
  // Serial Numbers Management States
  const [isAddingSerial, setIsAddingSerial] = useState(false);
  const [newSerialNum, setNewSerialNum] = useState('');
  const [newSerialStatus, setNewSerialStatus] = useState<'Available' | 'Installed' | 'Reserved' | 'Damaged'>('Available');
  const [newSerialEqLocation, setNewSerialEqLocation] = useState('');
  const [newSerialInstallDate, setNewSerialInstallDate] = useState('');
  const [newSerialMaintNotes, setNewSerialMaintNotes] = useState('');

  // Maintenance & Calibration logging states
  const [selectedSNForEvent, setSelectedSNForEvent] = useState<string | null>(null);
  const [isLoggingEvent, setIsLoggingEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<'maintenance' | 'calibration' | 'inspection'>('maintenance');
  const [newEventDetails, setNewEventDetails] = useState('');
  
  // OEM Verification Editing State
  const [isEditingOem, setIsEditingOem] = useState(false);
  const [oemStatus, setOemStatus] = useState<'verified' | 'authorized' | 'alternative' | 'pending'>('pending');
  const [oemCertId, setOemCertId] = useState('');
  const [oemNotes, setOemNotes] = useState('');

  // Material Voucher States (MIV / MRV)
  const [showVoucherModal, setShowVoucherModal] = useState<'issue' | 'return' | null>(null);
  const [voucherWoRef, setVoucherWoRef] = useState('');
  const [voucherMrfRef, setVoucherMrfRef] = useState('');
  const [voucherStation, setVoucherStation] = useState('');
  const [voucherRecipient, setVoucherRecipient] = useState('');
  const [voucherQty, setVoucherQty] = useState(1);
  const [voucherNotes, setVoucherNotes] = useState('');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [voucherId, setVoucherId] = useState('');

  const handleOpenVoucherModal = (type: 'issue' | 'return') => {
    if (!selectedMaterial) return;
    setVoucherQty(1);
    setVoucherWoRef('');
    setVoucherMrfRef('');
    setVoucherStation(selectedMaterial.station || 'ZFOD Station 1');
    setVoucherRecipient('');
    setVoucherNotes('');
    setVoucherDate(new Date().toISOString().split('T')[0]);
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = type === 'issue' ? 'MIV' : 'MRV';
    setVoucherId(`ZFOD-${code}-${new Date().getFullYear()}-${randomNum}`);
    setShowVoucherModal(type);
  };

  const handleConfirmVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !showVoucherModal) return;

    if (voucherQty <= 0) {
      triggerLocalToast('error', 'Quantity must be greater than 0.');
      return;
    }

    if (showVoucherModal === 'issue' && voucherQty > selectedMaterial.quantity) {
      triggerLocalToast('error', `Cannot issue more than current stock (${selectedMaterial.quantity} ${selectedMaterial.unit}).`);
      return;
    }

    const actionDesc = showVoucherModal === 'issue' ? 'Issued' : 'Returned';
    const newQty = showVoucherModal === 'issue' 
      ? Math.max(0, selectedMaterial.quantity - voucherQty)
      : selectedMaterial.quantity + voucherQty;

    const detailsText = `${actionDesc} ${voucherQty} ${selectedMaterial.unit} via Voucher ${voucherId}. Recipient: ${voucherRecipient || 'N/A'}. WO: ${voucherWoRef || 'N/A'}. MRF: ${voucherMrfRef || 'N/A'}.`;

    const updatedHistory = [
      ...(selectedMaterial.history || []),
      {
        id: `evt-voucher-${Date.now()}`,
        details: detailsText,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      }
    ];

    const updated: Material = {
      ...selectedMaterial,
      quantity: newQty,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    setSelectedMaterial(updated);

    const voucherHtml = generateVoucherPrintHtml({
      voucherId,
      type: showVoucherModal,
      material: updated,
      quantity: voucherQty,
      recipient: voucherRecipient,
      department: voucherStation,
      woRef: voucherWoRef,
      mrfRef: voucherMrfRef,
      notes: voucherNotes,
      userName: currentUser.name,
      date: new Date().toLocaleString('ar-EG'),
    });

    executePrint(`سند_${showVoucherModal === 'issue' ? 'صرف' : 'إرجاع'}_${voucherId}`, voucherHtml, `${voucherId}.html`);

    triggerLocalToast('success', `Voucher ${voucherId} confirmed and prepared for printing.`);
    setShowVoucherModal(null);
  };

  // Google Drive state variables
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);
  const [driveFiles, setDriveFiles] = useState<googleDrive.DriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveMode, setDriveMode] = useState<'simulate' | 'upload' | 'link'>('simulate');
  const [selectedDriveFileId, setSelectedDriveFileId] = useState('');
  const [realFileToUpload, setRealFileToUpload] = useState<File | null>(null);

  // Check auth state on mount or when opening document uploader
  useEffect(() => {
    const unsubscribe = googleDrive.initAuth(
      (user, token) => {
        setIsDriveAuthenticated(true);
        if (isUploadingDoc) {
          setIsDriveLoading(true);
          googleDrive.getOrCreateVaultFolder()
            .then(folderId => {
              const q = `'${folderId}' in parents and trashed = false`;
              return googleDrive.listDriveFiles(q);
            })
            .then(res => {
              setDriveFiles(res.files);
            })
            .catch(err => console.error('Failed to pre-fetch files:', err))
            .finally(() => setIsDriveLoading(false));
        }
      },
      () => {
        setIsDriveAuthenticated(false);
      }
    );
    return () => unsubscribe();
  }, [isUploadingDoc]);
  
  // Local notification banner
  const [localToast, setLocalToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const triggerLocalToast = (type: 'success' | 'error', message: string) => {
    setLocalToast({ type, message });
    setTimeout(() => setLocalToast(null), 4000);
  };

  const handlePrintReport = (title: string, htmlContent: string) => {
    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @media print {
              @page { margin: 12mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; color: #1e293b; line-height: 1.5; background: #fff; }
            .bg-gray-100 { background-color: #f1f5f9; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-green-50 { background-color: #f0fdf4; }
            .bg-yellow-50 { background-color: #fefce8; }
            .bg-slate-900 { background-color: #0f172a; }
            .text-white { color: #ffffff; }
            .p-4 { padding: 1rem; }
            .p-5 { padding: 1.25rem; }
            .p-6 { padding: 1.5rem; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-3 { margin-top: 0.75rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .text-gray-800 { color: #1e293b; }
            .text-gray-700 { color: #334155; }
            .text-gray-600 { color: #475569; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-900 { color: #1e3a8a; }
            .text-blue-850 { color: #1e40af; }
            .text-green-900 { color: #14532d; }
            .text-yellow-900 { color: #713f12; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .border { border: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .w-full { width: 100%; }
            .border-collapse { border-collapse: collapse; }
            .font-mono { font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; }
            .whitespace-pre-wrap { whitespace: pre-wrap; }
            .italic { font-style: italic; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; }
            th { background-color: #f1f5f9; font-weight: bold; }
          </style>
        </head>
        <body>
          <div style="max-width: 850px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 20px;">
              <div>
                <h1 style="font-size: 22px; font-weight: 900; margin: 0; color: #0f172a;">EMIS TECHNICAL INTELLIGENCE</h1>
                <p style="font-size: 10px; font-family: monospace; text-transform: uppercase; margin: 2px 0 0 0; color: #64748b;">Automated Engineering Report — Powered by Gemini AI</p>
              </div>
              <div style="text-align: right; font-size: 11px; font-family: monospace; color: #64748b;">
                <div>DATE: ${new Date().toLocaleDateString()}</div>
                <div>SYSTEM: EMIS v0.2-Active</div>
              </div>
            </div>
            ${htmlContent}
            <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-family: monospace; color: #94a3b8;">
              CONFIDENTIAL & PROPRIETARY — INTENDED SOLELY FOR REGISTERED FIELD ENGINEERS
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { try { window.print(); } catch(e){} }, 400);
            };
          </script>
        </body>
      </html>
    `;
    executePrint(title, reportHtml, `${title}.html`);
  };

  const getExportData = () => {
    // Define comprehensive headers for inspection, physical matching, and warehouse audit
    const headers = [
      'Material Sequence / التسلسل المادي',
      'Part Number / رقم القطعة',
      'Tag Number / رقم بطاقة المعدة (التاغ)',
      'Installation Location / موقع التثبيت والتركيب الفعلي',
      'Work Order (WO #) / رقم أمر العمل',
      'MRF Number / رقم طلب صرف وتوريد المواد',
      'Material Code / كود المادة',
      'Description / الوصف الفني والتفصيلي',
      'Manufacturer / الشركة المصنعة',
      'Model & Type / الموديل والنوع والطراز',
      'In-Stock Quantity / الكمية المتاحة',
      'Unit / الوحدة',
      'Minimum Threshold level / الحد الأدنى للأمان',
      'Storage Facility / المستودع والمرفق',
      'Rack Designation / الرف',
      'Shelf Coordinates / الخانة والدرج',
      'Station Code / رمز المحطة',
      'OEM Verified / حالة التحقق من الأصالة',
      'OEM Status / حالة التوثيق',
      'OEM Certificate ID / رقم شهادة المنشأ',
      'Serial Number / الرقم التسلسلي',
      'Electrical / Voltage Rating / الجهد والكهرباء',
      'Signal Output / إشارة الخرج والبروتوكول',
      'Measuring / Operating Range / النطاق والمدى',
      'IP Rating / درجة الحماية',
      'Hazardous Certifications / شهادات الأمان والمناطق الخطرة',
      'Compatible Equipment / المعدات المتوافقة المرتبطة',
      'Alternative Primary / البديل الهندسي الرئيسي',
      'Alternative Secondary / البديل الثانوي',
      'Alternative Notes / ملاحظات التوافق والبدائل',
      'Internal ID / المعرف الداخلي',
      'Engineering Comments & Inspection Notes / ملاحظات الفحص والمطابقة الهندسية'
    ];

    // Strictly sort materials in ascending order by sequence (from smallest to largest: 1, 2, 3, ...)
    const sortedMaterials = [...materials].sort((a, b) => {
      const seqA = (a.sequence !== undefined && a.sequence !== null && !isNaN(Number(a.sequence))) ? Number(a.sequence) : Infinity;
      const seqB = (b.sequence !== undefined && b.sequence !== null && !isNaN(Number(b.sequence))) ? Number(b.sequence) : Infinity;
      
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      // Secondary sort: alphanumeric part number
      return (a.partNumber || '').localeCompare(b.partNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    // Map each material row preserving ascending order and comprehensive inspection details
    const rows = sortedMaterials.map((m, idx) => {
      const displaySeq = (m.sequence !== undefined && m.sequence !== null) ? m.sequence.toString() : (idx + 1).toString();
      const compatibleEqStr = Array.isArray(m.compatibleEquipment) ? m.compatibleEquipment.join(', ') : (m.compatibleEquipment || '');
      const oemStatusStr = m.oemVerified ? 'موثق / Verified' : (m.oemVerificationStatus || 'Pending');

      return [
        displaySeq,
        (isTemporaryPartNumber(m.partNumber) || m.isPartNumberAutoGenerated) ? '' : (m.partNumber || ''),
        m.tagNumber || '',
        m.installationLocation || m.tagLocation || '',
        m.workOrder || m.woNumber || '',
        m.mrfReference || m.mrfNumber || m.mrf || m.mrReference || '',
        m.materialCode || '',
        m.description || '',
        m.manufacturer || '',
        m.model || '',
        m.quantity?.toString() || '0',
        m.unit || 'EA',
        m.minStockLevel?.toString() || '10',
        m.store || '',
        m.rack || '',
        m.shelf || '',
        m.station || 'ZFOD Warehouse',
        m.oemVerified ? 'Yes / نعم' : 'No / لا',
        oemStatusStr,
        m.oemCertificateId || '',
        m.serialNumber || '',
        m.electricalRating || '',
        m.outputProtocol || '',
        m.measuringRange || '',
        m.ipRating || '',
        m.hazardousClassification || m.exClassification || '',
        compatibleEqStr,
        m.alternatives?.primary || '',
        m.alternatives?.secondary || '',
        m.alternatives?.notes || '',
        m.internalId || '',
        m.engineeringNotes || m.notes || m.engineeringComments || ''
      ];
    });

    return { headers, rows, sortedMaterials };
  };

  const handleExportCSV = () => {
    if (materials.length === 0) {
      triggerLocalToast('error', 'No material records available to export.');
      return;
    }

    const { headers, rows } = getExportData();

    // Build the CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Create a blob with UTF-8 BOM to prevent Excel encoding corruptions
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EMIS_Engineering_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerLocalToast('success', 'المستودع الرقمي: تم تصدير التقرير بصيغة CSV بنجاح / Materials Ledger successfully exported as CSV report.');
  };

  const handleExportXLSX = () => {
    if (materials.length === 0) {
      triggerLocalToast('error', 'No material records available to export.');
      return;
    }

    const { headers, rows } = getExportData();

    // Create a worksheet
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Create a workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ZFOD EMIS Inventory');

    // Generate buffer and download
    const rawBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    const buffer = new ArrayBuffer(rawBinary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < rawBinary.length; i++) {
      view[i] = rawBinary.charCodeAt(i) & 0xFF;
    }

    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EMIS_Engineering_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerLocalToast('success', 'المستودع الرقمي: تم تصدير ملف Excel بنجاح / Engineering Materials Ledger successfully exported as Excel (.xlsx).');
  };

  const handleExportPDF = () => {
    if (materials.length === 0) {
      triggerLocalToast('error', 'No material records available to export.');
      return;
    }

    // Strictly sort materials in ascending order by sequence (from smallest to largest: 1, 2, 3, ...)
    const sortedForPdf = [...filteredMaterials].sort((a, b) => {
      const seqA = (a.sequence !== undefined && a.sequence !== null && !isNaN(Number(a.sequence))) ? Number(a.sequence) : Infinity;
      const seqB = (b.sequence !== undefined && b.sequence !== null && !isNaN(Number(b.sequence))) ? Number(b.sequence) : Infinity;
      
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      return (a.partNumber || '').localeCompare(b.partNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    const rowsHtml = sortedForPdf.map((m, idx) => {
      const displaySeq = (m.sequence !== undefined && m.sequence !== null) ? m.sequence : (idx + 1);
      const locStr = `${m.store || 'Main Store'} (R:${m.rack || '-'} / S:${m.shelf || '-'})`;
      const techSpecs = [
        m.electricalRating ? `⚡ ${m.electricalRating}` : null,
        m.outputProtocol ? `📡 ${m.outputProtocol}` : null,
        m.measuringRange ? `📏 ${m.measuringRange}` : null,
        m.ipRating ? `🛡️ ${m.ipRating}` : null
      ].filter(Boolean).join(' | ');

      const oemBadge = m.oemVerified 
        ? '<span style="color: #047857; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0; font-size: 9px;">✓ OEM موثق</span>'
        : '<span style="color: #6b7280; font-size: 9px;">قيد التدقيق</span>';

      return `
        <tr style="border-b: 1px solid #e5e7eb; page-break-inside: avoid;">
          <td style="padding: 8px 6px; font-family: monospace; font-weight: bold; color: #b45309; font-size: 11px; text-align: center;">
            #${displaySeq}
          </td>
          <td style="padding: 8px 6px; font-family: monospace; font-weight: bold; font-size: 11px; color: #0f172a;">
            ${(isTemporaryPartNumber(m.partNumber) || m.isPartNumberAutoGenerated) ? '<span style="color: #94a3b8; font-style: italic; font-weight: normal;">— (بدون رقم قطعة)</span>' : m.partNumber}
            ${m.materialCode ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">Code: ${m.materialCode}</div>` : ''}
          </td>
          <td style="padding: 8px 6px; font-size: 10.5px; line-height: 1.3;">
            <div style="font-weight: 600; color: #1e293b;">${m.description}</div>
            ${techSpecs ? `<div style="font-size: 9px; color: #475569; margin-top: 2px; font-family: monospace;">${techSpecs}</div>` : ''}
          </td>
          <td style="padding: 8px 6px; font-size: 10.5px; color: #334155;">
            <div style="font-weight: 600;">${m.manufacturer}</div>
            <div style="font-size: 9.5px; color: #64748b; font-family: monospace;">${m.model || '-'}</div>
            <div style="margin-top: 3px;">${oemBadge}</div>
          </td>
          <td style="padding: 8px 6px; font-family: monospace; font-weight: bold; text-align: center; font-size: 11px; color: #0f172a;">
            <div>${m.quantity} ${m.unit || 'EA'}</div>
            <div style="font-size: 8.5px; color: #94a3b8; font-weight: normal;">Min: ${m.minStockLevel || 10}</div>
          </td>
          <td style="padding: 8px 6px; font-size: 10px; color: #334155;">
            <div style="font-weight: 500;">${locStr}</div>
            ${m.station ? `<div style="font-size: 8.5px; color: #64748b;">${m.station}</div>` : ''}
          </td>
          <td style="padding: 8px 6px; text-align: center; border-left: 1px dashed #cbd5e1;">
            <div style="width: 14px; height: 14px; border: 1.5px solid #64748b; border-radius: 3px; margin: 0 auto;"></div>
            <div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">مطابق</div>
          </td>
        </tr>
      `;
    }).join('');

    const pdfHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تقرير فحص ومطابقة المواد الهندسية - ZFOD EMIS Ledger</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm 10mm;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif; 
              padding: 15px; 
              color: #0f172a; 
              background: #fff;
              direction: rtl;
            }
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2.5px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .title-area h1 {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #0f172a;
              letter-spacing: -0.2px;
            }
            .title-area p {
              font-size: 11px;
              color: #475569;
              margin: 0;
            }
            .meta-info {
              text-align: left;
              direction: ltr;
              font-size: 10px;
              font-family: monospace;
              color: #334155;
              line-height: 1.4;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 10.5px; 
              text-align: right;
            }
            th { 
              background-color: #f1f5f9; 
              color: #1e293b; 
              font-size: 9.5px; 
              font-weight: 700; 
              padding: 9px 6px; 
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #94a3b8; 
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer-notes {
              margin-top: 20px;
              border-top: 1px solid #cbd5e1;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 9.5px;
              color: #64748b;
            }
            .signature-box {
              width: 180px;
              border-top: 1px solid #475569;
              text-align: center;
              padding-top: 4px;
              font-weight: bold;
              margin-top: 25px;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div class="title-area">
              <h1>📋 كشف وسجل فحص ومطابقة المواد الهندسية (EMIS Inspection & Matching Ledger)</h1>
              <p>ZFOD Instrument & Electrical Engineering Store — مرتب تسلسلياً من الأصغر إلى الأكبر للفحص والمطابقة الميدانية</p>
            </div>
            <div class="meta-info">
              <strong>Generated:</strong> ${new Date().toLocaleString()}<br/>
              <strong>Total Sorted Items:</strong> ${sortedForPdf.length} Records<br/>
              <strong>Order:</strong> Ascending Sequence (1 → N)
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 55px; text-align: center;">التسلسل<br/>Seq #</th>
                <th style="width: 130px;">رقم القطعة والكود<br/>Part Number / Code</th>
                <th>الوصف والمواصفات الفنية<br/>Description & Technical Specs</th>
                <th style="width: 140px;">الشركة والموديل والتوثيق<br/>Manufacturer / Model</th>
                <th style="width: 80px; text-align: center;">الكمية المتوفرة<br/>Stock Qty</th>
                <th style="width: 130px;">المستودع والموقع<br/>Storage Coordinates</th>
                <th style="width: 60px; text-align: center;">المطابقة<br/>Verified</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-notes">
            <div>
              <strong>ملاحظات لجنة الفحص والاستلام:</strong> تم إعداد وتصدير هذا التقرير المنظم وفقاً للمواصفات الهندسية الشاملة لسهولة المطابقة الميدانية.
            </div>
            <div style="display: flex; gap: 40px;">
              <div class="signature-box">توقيع مهندس الفحص والمطابقة</div>
              <div class="signature-box">اعتماد أمين المستودع</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { try { window.print(); } catch(e){} }, 400);
            };
          </script>
        </body>
      </html>
    `;

    executePrint('كشف_فحص_ومطابقة_المواد_الهندسية', pdfHtml, `ZFOD_EMIS_Ledger_${new Date().toISOString().slice(0, 10)}.html`);
    triggerLocalToast('success', 'تم تجهيز كشف الفحص والمطابقة للطباعة بنجاح.');
  };

  const [confirmDeletePart, setConfirmDeletePart] = useState<string | null>(null);

  // Material Authenticity Verification Wizard State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(1);
  const [verifyPartNumber, setVerifyPartNumber] = useState('');
  const [verifySerialNumber, setVerifySerialNumber] = useState('');
  const [verifyModel, setVerifyModel] = useState('');
  const [verifyManufacturer, setVerifyManufacturer] = useState('Honeywell');
  const [verifySupplier, setVerifySupplier] = useState('');
  const [verifyNameplateImage, setVerifyNameplateImage] = useState<string | null>(null);
  
  // Evaluation Results
  const [verifyInternalMatch, setVerifyInternalMatch] = useState<Material | null>(null);
  const [verifyExternalResult, setVerifyExternalResult] = useState<{ verified: boolean; matchDetails?: any; reason?: string } | null>(null);
  const [verifyConfidenceScore, setVerifyConfidenceScore] = useState(0);
  const [verifyMatchedBlacklist, setVerifyMatchedBlacklist] = useState<any[]>([]);
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);

  // Blacklist Management State
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [isShowingBlacklistManager, setIsShowingBlacklistManager] = useState(false);
  const [isShowingImportModal, setIsShowingImportModal] = useState(false);
  const [isShowingConfirmClearAll, setIsShowingConfirmClearAll] = useState(false);
  const [blPartNumber, setBlPartNumber] = useState('');
  const [blSerialNumber, setBlSerialNumber] = useState('');
  const [blSupplierName, setBlSupplierName] = useState('');
  const [blReason, setBlReason] = useState('counterfeit');
  
  // Load blacklist on mount
  useEffect(() => {
    setBlacklist(dbService.getBlacklist());
  }, []);

  const [isCopied, setIsCopied] = useState(false);

  // AI Engineering Assistant Chat States
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sync Chat History whenever selected material or ask-ai tab opens
  useEffect(() => {
    if (selectedMaterial && activeModalTab === 'ask-ai') {
      setChatMessages(dbService.getChatHistory(selectedMaterial.partNumber));
    }
  }, [selectedMaterial, activeModalTab]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || !selectedMaterial || isChatLoading) return;

    const userMessageText = messageText.trim();

    const newMsg = {
      role: 'user' as const,
      text: userMessageText,
      timestamp: new Date().toISOString()
    };

    // We need to base the updatedHistory on current state immediately
    let currentHistory: any[] = [];
    setChatMessages((prev) => {
      currentHistory = [...prev, newMsg];
      dbService.saveChatHistory(selectedMaterial.partNumber, currentHistory);
      return currentHistory;
    });

    setIsChatLoading(true);

    try {
      const systemInstruction = `You are a highly professional, precise, and specialized "Instrumentation Engineer Assistant" (مساعد هندسي متخصص في أجهزة القياس والتحكم الصناعي).
You are assisting an engineer working on the EMIS system.

Here is the context of the Material the engineer is currently inspecting:
- Part Number: ${selectedMaterial.partNumber}
- Description: ${selectedMaterial.description}
- Manufacturer: ${selectedMaterial.manufacturer}
- Model: ${selectedMaterial.model}
- Quantity in Stock: ${selectedMaterial.quantity} ${selectedMaterial.unit}
- Store Location: Store ${selectedMaterial.store}, Rack ${selectedMaterial.rack}, Shelf ${selectedMaterial.shelf}
- Notes: ${selectedMaterial.notes || 'None'}
- Compatible Equipment Tags: ${(selectedMaterial.compatibleEquipment || []).join(', ') || 'None'}
- OEM Verification Status: ${selectedMaterial.oemVerificationStatus || 'Pending'}
- Engineering Notes: ${selectedMaterial.engineeringNotes || 'None'}
${selectedMaterial.oemVerificationNotes ? `- OEM Verification Audit Notes: ${selectedMaterial.oemVerificationNotes}` : ''}

Your guidelines:
1. Always answer in the language the user is speaking (Arabic or English).
2. Be technically precise, clear, and professional.
3. If asked about compatibility, authenticity, or technical specs, and you are not 100% sure based on the provided material context or known standards, you MUST clearly warn the engineer that this is an AI estimate/assessment and not an official confirmation, and strongly recommend reviewing the official datasheet, contacting the OEM (Original Equipment Manufacturer), or checking warehouse physical files.
4. Keep the tone helpful, technical, and objective. Avoid overly dramatic or promotional language.`;

      // Chat with AI Assistant
      const resData = await apiChatWithAi(
        userMessageText,
        currentHistory.slice(0, -1),
        systemInstruction,
        selectedMaterial ? [selectedMaterial] : []
      );
      
      const assistantMsg = {
        role: 'model' as const,
        text: resData.text,
        timestamp: new Date().toISOString()
      };

      setChatMessages((prev) => {
        const finalHistory = [...prev, assistantMsg];
        dbService.saveChatHistory(selectedMaterial.partNumber, finalHistory);
        return finalHistory;
      });
    } catch (err: any) {
      console.error(err);
      triggerLocalToast('error', 'فشل إرسال الرسالة للمساعد الذكي، الرجاء التأكد من الاتصال.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputValue.trim()) return;
    const text = chatInputValue;
    setChatInputValue('');
    await sendMessage(text);
  };

  const handleClearChatHistory = () => {
    if (selectedMaterial) {
      dbService.clearChatHistory(selectedMaterial.partNumber);
      setChatMessages([]);
      triggerLocalToast('success', 'تم مسح سجل المحادثة لهذه المادة بنجاح.');
    }
  };

  // AI Scanner callback for existing material details modal
  const handleScanSuccessForExisting = (data: any) => {
    if (!selectedMaterial) return;

    let updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-ai-scan-${Date.now()}`,
      action: 'Material Scanned via AI',
      details: `Updated details using AI Nameplate Scanner. Manufacturer: ${data.manufacturer || 'N/A'}, Model: ${data.model || 'N/A'}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    let specsText = '';
    if (data.serialNumber) specsText += `Serial Number: ${data.serialNumber}\n`;
    if (data.voltage) specsText += `Voltage: ${data.voltage}\n`;
    if (data.current) specsText += `Current: ${data.current}\n`;
    if (data.output) specsText += `Output: ${data.output}\n`;
    if (data.year) specsText += `Manufacture Year: ${data.year}\n`;
    if (data.revision) specsText += `Revision Code: ${data.revision}\n`;

    let finalNotes = selectedMaterial.notes || '';
    if (specsText) {
      finalNotes = finalNotes ? `${finalNotes}\n\n-- AI Nameplate Scan --\n${specsText}` : `-- AI Nameplate Scan --\n${specsText}`;
    }

    const updated: Material = {
      ...selectedMaterial,
      manufacturer: data.manufacturer || selectedMaterial.manufacturer,
      brand: data.brand || selectedMaterial.brand || data.manufacturer || selectedMaterial.manufacturer,
      model: data.model || selectedMaterial.model,
      serialNumber: data.serialNumber || selectedMaterial.serialNumber,
      measuringRange: data.input || data.measuringRange || selectedMaterial.measuringRange,
      notes: finalNotes,
      engineeringNotes: selectedMaterial.engineeringNotes || finalNotes,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    onUpdateMaterial(updated);
    setSelectedMaterial(updated);
    triggerLocalToast('success', 'تم تحديث بيانات المادة من لوحة معلوماتها بنجاح / Material details successfully updated via nameplate scan.');
  };

  const handleCopyLink = (partNumber: string) => {
    const partLink = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(partNumber)}`;
    navigator.clipboard.writeText(partLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadQR = (partNumber: string) => {
    const canvas = document.getElementById(`qr-code-${partNumber}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR_LABEL_${partNumber}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleOpenPrintLabelModal = (material: Material) => {
    setPrintLabelMaterial(material);
    setShowPrintLabelModal(true);
  };

  const handleTriggerPrint = () => {
    if (!printLabelMaterial) return;

    // Extract QR Canvas data URL if rendered in DOM
    const canvas = document.querySelector('#printable-label-area canvas') as HTMLCanvasElement;
    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : undefined;

    const tagHtml = generateAssetTagHtml(printLabelMaterial, {
      size: printLabelSize,
      includeMfg: printIncludeMfg,
      includeLocation: printIncludeLocation,
      includeSpecs: printIncludeSpecs,
      qrDataUrl
    });

    executePrint(`ملصق_${printLabelMaterial.partNumber}`, tagHtml, `Asset_Tag_${printLabelMaterial.partNumber}.html`);
  };

  // Sync state if initialSearchQuery changes (e.g. from dashboard clicks or deep link)
  useEffect(() => {
    if (initialSearchQuery === 'lowstock') {
      setFilterStockStatus('Low');
      setSearchQuery('');
    } else {
      setSearchQuery(initialSearchQuery);
      setFilterStockStatus('All');
      if (initialSearchQuery) {
        const queryLower = initialSearchQuery.toLowerCase().trim();
        const cleanQuery = queryLower.replace(/^[#\s]*(?:seq|sequence)[\s#:]*/i, '');
        const found = materials.find(m => 
          (m.partNumber && m.partNumber.toLowerCase() === queryLower) ||
          (m.model && m.model.toLowerCase() === queryLower) ||
          (m.sequence !== undefined && (String(m.sequence) === cleanQuery || `#${m.sequence}` === queryLower)) ||
          (dbService.normalizeToken(m.partNumber) && dbService.normalizeToken(m.partNumber) === dbService.normalizeToken(queryLower)) ||
          (m.model && dbService.normalizeToken(m.model) === dbService.normalizeToken(queryLower))
        );
        if (found) {
          setSelectedMaterial(found);
          setEditQtyValue(found.quantity);
        }
      }
    }
  }, [initialSearchQuery, materials]);

  // Synchronize modal state if materials collection changes
  useEffect(() => {
    if (selectedMaterial) {
      const fresh = materials.find(m => 
        (m.id && selectedMaterial.id && m.id === selectedMaterial.id) ||
        (m.sequence !== undefined && selectedMaterial.sequence !== undefined && m.sequence === selectedMaterial.sequence) ||
        (m.partNumber && selectedMaterial.partNumber && m.partNumber.toUpperCase() === selectedMaterial.partNumber.toUpperCase())
      );
      if (fresh) {
        setSelectedMaterial(fresh);
      }
    }
  }, [materials]);

  // Sync edit values whenever selectedMaterial changes
  useEffect(() => {
    if (selectedMaterial) {
      setEditedNotesValue(selectedMaterial.engineeringNotes || '');
      setEditedAltPrimary(selectedMaterial.alternatives?.primary || '');
      setEditedAltSecondary(selectedMaterial.alternatives?.secondary || '');
      setEditedAltNotes(selectedMaterial.alternatives?.notes || '');
      setEditedAltReason(selectedMaterial.alternatives?.reason || '');
      setIsEditingNotes(false);
      setIsEditingAlternatives(false);
      
      // Initialize OEM edit state
      setOemStatus(selectedMaterial.oemVerificationStatus || 'pending');
      setOemCertId(selectedMaterial.oemCertificateId || '');
      setOemNotes(selectedMaterial.oemVerificationNotes || '');
      setIsEditingOem(false);

      // Initialize core edit state
      const isTemp = isTemporaryPartNumber(selectedMaterial.partNumber) || selectedMaterial.isPartNumberAutoGenerated;
      setEditPartNumber(isTemp ? '' : (selectedMaterial.partNumber || ''));
      setEditDescription(selectedMaterial.description || '');
      setEditManufacturer(selectedMaterial.manufacturer || '');
      setEditModel(selectedMaterial.model || '');
      setEditMaterialCode(selectedMaterial.materialCode || '');
      setEditEngineeringComments(selectedMaterial.engineeringComments || '');
      setEditWarehouse(selectedMaterial.store || '');
      setEditRack(selectedMaterial.rack || '');
      setEditShelf(selectedMaterial.shelf || '');
      setEditMinStock(selectedMaterial.minStockLevel || 10);
      setIsEditingCoreDetails(false);
    }
  }, [selectedMaterial]);

  const handleClearAllMaterials = () => {
    dbService.clearAllMaterials(currentUser);
    onImportSuccess();
    setIsShowingConfirmClearAll(false);
    triggerLocalToast('success', 'تم مسح جميع المواد بنجاح / All materials cleared successfully.');
  };

  // Extract unique stores for dropdown
  const uniqueStores = ['All', ...Array.from(new Set(materials.map(m => m.store).filter((s): s is string => !!s && s !== 'All')))];

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Quantity quick adjustment handlers
  const handleAdjustQuantity = (material: Material, amount: number) => {
    const newQty = Math.max(0, material.quantity + amount);
    const updated: Material = {
      ...material,
      quantity: newQty
    };
    onUpdateMaterial(updated);
    if (selectedMaterial && selectedMaterial.partNumber === material.partNumber) {
      setSelectedMaterial(updated);
    }
  };

  const handleSaveQuantityManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    const updated: Material = {
      ...selectedMaterial,
      quantity: Math.max(0, editQtyValue)
    };
    onUpdateMaterial(updated);
    setSelectedMaterial(updated);
    setIsEditingQuantity(false);
  };

  const handleSaveCoreDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    let finalPartNumber = editPartNumber.trim();
    if (!finalPartNumber) {
      finalPartNumber = '';
    }

    if (!editDescription.trim()) {
      triggerLocalToast('error', 'Description is required.');
      return;
    }
    if (!editManufacturer.trim()) {
      triggerLocalToast('error', 'Manufacturer is required.');
      return;
    }
    if (!editModel.trim()) {
      triggerLocalToast('error', 'Model designation is required.');
      return;
    }

    const isTempAssigned = isTemporaryPartNumber(finalPartNumber);
    if (finalPartNumber && finalPartNumber.toUpperCase() !== (selectedMaterial.partNumber || '').toUpperCase()) {
      const exists = materials.some(
        m => m.partNumber && m.partNumber.trim().toUpperCase() === finalPartNumber.toUpperCase() && 
             ((m.id && selectedMaterial.id && m.id !== selectedMaterial.id) || m.partNumber !== selectedMaterial.partNumber)
      );
      if (exists) {
        triggerLocalToast('error', `Part Number "${finalPartNumber}" is already in use by another material.`);
        return;
      }
    }

    const isNowComplete = !isTempAssigned && 
                          editDescription.trim() && 
                          editManufacturer.trim() && 
                          editModel.trim() && 
                          editModel.trim().toUpperCase() !== 'N/A';

    const updated: Material = {
      ...selectedMaterial,
      partNumber: finalPartNumber,
      isPartNumberAutoGenerated: isTempAssigned,
      description: editDescription.trim(),
      manufacturer: editManufacturer.trim(),
      model: editModel.trim(),
      materialCode: editMaterialCode.trim() || undefined,
      engineeringComments: editEngineeringComments.trim() || undefined,
      store: editWarehouse.trim(),
      rack: editRack.trim() || 'N/A',
      shelf: editShelf.trim() || 'N/A',
      minStockLevel: Math.max(0, editMinStock),
      isIncomplete: !isNowComplete,
      updatedAt: new Date().toISOString()
    };

    onUpdateMaterial(updated, selectedMaterial.partNumber);
    setSelectedMaterial(updated);
    setIsEditingCoreDetails(false);
    triggerLocalToast('success', isTempAssigned ? 'تم حفظ التعديلات بنجاح (الصنف بدون رقم قطعة).' : 'تم تحديث المادة وتعيين رقم القطعة بنجاح.');
  };

  const handleAutoEnrichCoreDetails = async () => {
    if (!editPartNumber.trim() && !editModel.trim() && !editDescription.trim() && !editManufacturer.trim()) {
      triggerLocalToast('error', 'يرجى كتابة رقم القطعة أو الطراز أو اسم المصنع أولاً ليقوم الذكاء الاصطناعي بالتعرف عليه.');
      return;
    }

    setIsAutoEnrichingCore(true);
    try {
      const enriched = await apiAutoCompleteMaterial({
        partNumber: editPartNumber.trim(),
        manufacturer: editManufacturer.trim(),
        model: editModel.trim(),
        description: editDescription.trim(),
        scannedText: editEngineeringComments
      });

      if (enriched.description) setEditDescription(enriched.description);
      if (enriched.manufacturer) setEditManufacturer(enriched.manufacturer);
      if (enriched.model && (!editModel || editModel === 'N/A')) setEditModel(enriched.model);
      if (enriched.minStockLevel && enriched.minStockLevel > 0) setEditMinStock(enriched.minStockLevel);
      if (enriched.suggestedStore && (!editWarehouse || editWarehouse === 'General Inventory')) setEditWarehouse(enriched.suggestedStore);

      const specBlock = `\n--- ⚡ المواصفات الفنية المعتمدة (Gemini Engineering Specs) ---\n` +
        `• الوصف الفني: ${enriched.technicalSummary || 'N/A'}\n` +
        `• الجهد التشغيلي: ${enriched.voltage || 'N/A'}\n` +
        `• التيار: ${enriched.current || 'N/A'}\n` +
        `• القدرة: ${enriched.power || 'N/A'}\n` +
        `• إشارة الإخراج: ${enriched.signalOutput || 'N/A'}\n` +
        `• النطاق التشغيلي: ${enriched.operatingRange || 'N/A'}\n` +
        `• درجة الحماية: ${enriched.ipRating || 'N/A'}\n` +
        `• شهادات المناطق الخطرة: ${enriched.hazardousCertification || 'N/A'}\n` +
        `• تعليمات الأمان بالمستودع: ${enriched.safetyNotes || 'N/A'}\n`;

      setEditEngineeringComments(prev => prev ? `${prev}\n${specBlock}` : specBlock.trim());
      triggerLocalToast('success', `✨ تم استخراج وإكمال المواصفات الفنية بالذكاء الاصطناعي (${enriched.manufacturer} ${enriched.model || ''})`);
    } catch (err) {
      console.error("Auto enrich error:", err);
      triggerLocalToast('error', 'تعذر إكمال البيانات عبر الذكاء الاصطناعي حالياً.');
    } finally {
      setIsAutoEnrichingCore(false);
    }
  };

  // Advanced Engineering Handler Functions
  const handleSaveEngineeringNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    const updated: Material = {
      ...selectedMaterial,
      engineeringNotes: editedNotesValue
    };
    onUpdateMaterial(updated);
    setIsEditingNotes(false);
    triggerLocalToast('success', 'Engineering notes updated successfully');
  };

  const handleSaveOemVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const isVerified = oemStatus === 'verified' || oemStatus === 'authorized';

    const updated: Material = {
      ...selectedMaterial,
      oemVerified: isVerified,
      oemVerificationStatus: oemStatus,
      oemCertificateId: oemCertId,
      oemVerifiedBy: isVerified ? currentUser.name : '',
      oemVerificationDate: isVerified ? new Date().toISOString() : '',
      oemVerificationNotes: oemNotes
    };

    onUpdateMaterial(updated);
    setSelectedMaterial(updated);
    setIsEditingOem(false);
    triggerLocalToast('success', 'OEM supply verification status updated successfully');
  };

  const handleSaveAlternatives = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    
    const updatedAlts = {
      primary: editedAltPrimary,
      secondary: editedAltSecondary,
      notes: editedAltNotes,
      reason: editedAltReason
    };

    const updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-alt-${Date.now()}`,
      action: 'Material Modified',
      details: `Compatibility alternatives updated. Primary: ${editedAltPrimary || 'None'}, Secondary: ${editedAltSecondary || 'None'}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updated: Material = {
      ...selectedMaterial,
      alternatives: updatedAlts,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    setIsEditingAlternatives(false);
    triggerLocalToast('success', 'Compatibility alternatives updated');
  };

  const handleLinkEquipment = () => {
    if (!selectedMaterial || !selectedEquipmentToLink) return;
    
    const tag = selectedEquipmentToLink;
    const currentLinked = selectedMaterial.compatibleEquipment || [];
    if (currentLinked.includes(tag)) {
      triggerLocalToast('error', 'Equipment already linked');
      return;
    }

    const updatedLinked = [...currentLinked, tag];
    const updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-link-${Date.now()}`,
      action: 'Equipment Linked',
      details: `Associated with machinery tag ${tag}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updated: Material = {
      ...selectedMaterial,
      compatibleEquipment: updatedLinked,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    setSelectedEquipmentToLink('');
    triggerLocalToast('success', `Equipment ${tag} linked successfully`);
  };

  const handleUnlinkEquipment = (tag: string) => {
    if (!selectedMaterial) return;
    
    const currentLinked = selectedMaterial.compatibleEquipment || [];
    const updatedLinked = currentLinked.filter(t => t !== tag);
    
    const updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-unlink-${Date.now()}`,
      action: 'Equipment Linked',
      details: `Removed association with machinery tag ${tag}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updated: Material = {
      ...selectedMaterial,
      compatibleEquipment: updatedLinked,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    triggerLocalToast('success', `Equipment ${tag} unlinked`);
  };

  const handleSimulateUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const key = uploadDocType;
    let freshDoc: MaterialDocument;

    try {
      if (isDriveAuthenticated && driveMode === 'upload' && realFileToUpload) {
        setIsDriveLoading(true);
        const folderId = await googleDrive.getOrCreateVaultFolder();
        const uploadedFile = await googleDrive.uploadFileToDrive(realFileToUpload, realFileToUpload.name, folderId);
        
        freshDoc = {
          name: uploadedFile.name,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size ? `${(parseInt(uploadedFile.size) / (1024 * 1024)).toFixed(1)} MB` : '1.0 MB',
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          googleDriveFileId: uploadedFile.id,
          googleDriveWebViewLink: uploadedFile.webViewLink
        };
      } else if (isDriveAuthenticated && driveMode === 'link' && selectedDriveFileId) {
        const selectedFileObj = driveFiles.find(f => f.id === selectedDriveFileId);
        if (!selectedFileObj) {
          triggerLocalToast('error', 'Selected Drive file was not found');
          return;
        }
        
        freshDoc = {
          name: selectedFileObj.name,
          fileName: selectedFileObj.name,
          fileSize: selectedFileObj.size ? `${(parseInt(selectedFileObj.size) / (1024 * 1024)).toFixed(1)} MB` : '1.0 MB',
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          googleDriveFileId: selectedFileObj.id,
          googleDriveWebViewLink: selectedFileObj.webViewLink
        };
      } else {
        // Fallback: Simulation
        const name = uploadDocName.trim() || `${key}_spec_sheet.pdf`;
        const size = `${(Math.random() * 5 + 1).toFixed(1)} MB`;

        freshDoc = {
          name,
          fileName: name,
          fileSize: size,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString()
        };
      }

      const updatedDocs = {
        ...(selectedMaterial.documents || {}),
        [key]: freshDoc
      };

      const updatedHistory = [...(selectedMaterial.history || [])];
      updatedHistory.push({
        id: `hist-doc-${Date.now()}`,
        action: 'Documents Uploaded',
        details: `Linked file: ${freshDoc.name} (${key.toUpperCase()})${freshDoc.googleDriveFileId ? ' from Google Drive' : ''}`,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      });

      const updated: Material = {
        ...selectedMaterial,
        documents: updatedDocs,
        history: updatedHistory
      };

      onUpdateMaterial(updated);
      setIsUploadingDoc(false);
      setUploadDocName('');
      setRealFileToUpload(null);
      setSelectedDriveFileId('');
      triggerLocalToast('success', `${key.toUpperCase()} linked successfully`);
    } catch (err: any) {
      console.error('Document handling error:', err);
      triggerLocalToast('error', `Failed to link document: ${err.message}`);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSimulateAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    const cat = addPhotoCategory;
    const url = addPhotoUrl.trim() || `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60`;

    const currentPhotos = selectedMaterial.photos || { nameplate: [], installation: [], warehouse: [], other: [] };
    const categoryPhotos = currentPhotos[cat] || [];
    
    const updatedPhotos = {
      ...currentPhotos,
      [cat]: [...categoryPhotos, url]
    };

    const updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-photo-${Date.now()}`,
      action: 'Material Modified',
      details: `Added new photo in ${cat} category`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updated: Material = {
      ...selectedMaterial,
      photos: updatedPhotos,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    setIsAddingPhoto(false);
    setAddPhotoUrl('');
    triggerLocalToast('success', `Photo registered to ${cat}`);
  };

  // --- MATERIAL AUTHENTICITY VERIFICATION WORKFLOW HANDLERS ---
  const handleStartVerification = (material: Material) => {
    setVerifyPartNumber(material.partNumber);
    setVerifyModel(material.model);
    
    const allowedManufacturers = ['Honeywell', 'Emerson', 'Yokogawa', 'Siemens', 'ABB', 'MTL', 'Rosemount', 'Dräger'];
    if (allowedManufacturers.includes(material.manufacturer)) {
      setVerifyManufacturer(material.manufacturer);
    } else {
      setVerifyManufacturer('Other');
    }
    
    setVerifySerialNumber('');
    setVerifySupplier('');
    
    // Check if there is an existing nameplate image
    const nameplateList = material.photos?.nameplate || [];
    setVerifyNameplateImage(nameplateList[0] || null);
    
    // Reset wizard states
    setVerifyStep(1);
    setVerifyInternalMatch(null);
    setVerifyExternalResult(null);
    setVerifyConfidenceScore(0);
    setVerifyMatchedBlacklist([]);
    setIsVerifying(true);
  };

  const mockManufacturerVerification = (mfr: string, partNum: string, serialNum: string) => {
    const cleanSerial = serialNum.trim().toUpperCase();
    const cleanPart = partNum.trim().toUpperCase();
    
    // Success if serial length is even and not empty
    const isSuccess = !cleanSerial.includes('FAIL') && (cleanSerial.length > 0 && cleanSerial.length % 2 === 0);
    
    if (isSuccess) {
      return {
        verified: true,
        matchDetails: {
          manufactureDate: new Date(Date.now() - 3600000 * 24 * 365 * 1.5).toISOString().split('T')[0], // 1.5 years ago
          warrantyStatus: 'Active',
          warrantyUntil: new Date(Date.now() + 3600000 * 24 * 365).toISOString().split('T')[0], // 1 year from now
          productionPlant: mfr === 'Honeywell' ? 'Phoenix, Arizona, USA' : mfr === 'Siemens' ? 'Karlsruhe, Germany' : mfr === 'Emerson' ? 'Singapore Plant' : 'Global Premium Facility',
          regulatoryCompliance: 'CE, ATEX Zone 1, SIL-2 Safety Rated, IECEx compliant'
        }
      };
    } else {
      return {
        verified: false,
        reason: `Serial Number "${serialNum}" not registered in the official manufacturer's database. Please check physical engraving, or contact authorized regional ${mfr} distributor.`
      };
    }
  };

  const handleProceedToStep2Internal = () => {
    const normalizedPart = verifyPartNumber.trim().toUpperCase();
    const normalizedSerial = verifySerialNumber.trim().toUpperCase();
    const normalizedSupplier = verifySupplier.trim().toUpperCase();

    // 1. Check existing DB for part match
    const match = materials.find(m => m.partNumber.trim().toUpperCase() === normalizedPart);
    setVerifyInternalMatch(match || null);

    // 2. Check Blacklist Matches
    const blMatches = blacklist.filter(item => {
      const matchPart = item.partNumber && normalizedPart && item.partNumber.trim().toUpperCase() === normalizedPart;
      const matchSerial = item.serialNumber && normalizedSerial && item.serialNumber.trim().toUpperCase() === normalizedSerial;
      const matchSupplier = item.supplierName && normalizedSupplier && item.supplierName.trim().toUpperCase() === normalizedSupplier;
      return matchPart || matchSerial || matchSupplier;
    });
    setVerifyMatchedBlacklist(blMatches);

    // Move to Step 2
    setVerifyStep(2);
  };

  const handleProceedToStep3External = () => {
    setIsScanningSimulated(true);
    setVerifyStep(3);
    
    setTimeout(() => {
      const extRes = mockManufacturerVerification(verifyManufacturer, verifyPartNumber, verifySerialNumber);
      setVerifyExternalResult(extRes);
      setIsScanningSimulated(false);
      
      // Calculate confidence score on the fly!
      let score = 0;
      
      // Calculate DB match (40%)
      const normalizedPart = verifyPartNumber.trim().toUpperCase();
      const match = materials.some(m => m.partNumber.trim().toUpperCase() === normalizedPart);
      if (match) score += 40;
      
      // Calculate External (40%)
      if (extRes.verified) score += 40;
      
      // Calculate Completeness (20%)
      if (verifyNameplateImage) score += 5;
      if (verifySerialNumber.trim()) score += 5;
      if (verifyModel.trim()) score += 5;
      if (verifySupplier.trim()) score += 5;
      
      setVerifyConfidenceScore(score);
    }, 1500);
  };

  // Image Upload handler for nameplate
  const handleNameplateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerifyNameplateImage(reader.result as string);
        triggerLocalToast('success', 'Nameplate photo uploaded successfully for verification');
      };
      reader.readAsDataURL(file);
    }
  };

  // Blacklist Management Actions
  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blPartNumber.trim() && !blSerialNumber.trim() && !blSupplierName.trim()) {
      triggerLocalToast('error', 'Please fill in at least one identifying field (Part #, Serial #, or Supplier Name)');
      return;
    }

    const payload = {
      partNumber: blPartNumber.trim(),
      serialNumber: blSerialNumber.trim(),
      supplierName: blSupplierName.trim(),
      reason: blReason as 'counterfeit' | 'non-compliant' | 'failed-verification',
      reporterName: currentUser.name,
    };

    const result = dbService.addBlacklistItem(payload, currentUser);
    if (result.success) {
      setBlacklist(dbService.getBlacklist());
      setBlPartNumber('');
      setBlSerialNumber('');
      setBlSupplierName('');
      setBlReason('counterfeit');
      triggerLocalToast('success', 'Item successfully added to the Blacklist database');
    } else {
      triggerLocalToast('error', result.error || 'Failed to add item to blacklist');
    }
  };

  const handleDeleteBlacklist = (id: string) => {
    const result = dbService.deleteBlacklistItem(id, currentUser);
    if (result.success) {
      setBlacklist(dbService.getBlacklist());
      triggerLocalToast('success', 'Item successfully removed from the Blacklist');
    } else {
      triggerLocalToast('error', 'Failed to remove item');
    }
  };

  const handleSaveVerificationToMaterial = () => {
    if (!selectedMaterial) return;

    const isVerified = verifyExternalResult?.verified || false;
    const certId = isVerified ? `COC-${verifyManufacturer.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-6).toUpperCase()}` : '';

    const summaryNotes = `[نظام التحقق الذاتي EMIS Authenticity workflow completed]
- نتيجة فحص الشركة الأم: ${isVerified ? 'تم تأكيد الأصالة بنجاح' : 'لم يتم العثور على الرقم التسلسلي في قاعدة بيانات المصنع'}
- درجة موثوقية المادة: ${verifyConfidenceScore}%
- الرقم التسلسلي المفحوص: ${verifySerialNumber || 'غير متوفر'}
- المورد: ${verifySupplier || 'غير متوفر'}
- تاريخ الفحص: ${new Date().toLocaleString()}
- المدقق: ${currentUser.name} (${currentUser.role})`;

    const updatedHistory = [...(selectedMaterial.history || [])];
    updatedHistory.push({
      id: `hist-verify-${Date.now()}`,
      action: 'OEM Verification Update',
      details: `Completed Authenticity workflow. Score: ${verifyConfidenceScore}%, Verified: ${isVerified}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updated: Material = {
      ...selectedMaterial,
      oemVerified: isVerified,
      oemVerificationStatus: isVerified ? 'verified' : 'alternative',
      oemCertificateId: certId,
      oemVerifiedBy: currentUser.name,
      oemVerificationDate: new Date().toISOString(),
      oemVerificationNotes: summaryNotes,
      history: updatedHistory
    };

    onUpdateMaterial(updated);
    setSelectedMaterial(updated);
    setIsVerifying(false);
    triggerLocalToast('success', 'تم حفظ نتائج التوثيق وتحديث سجل المادة بنجاح / Material authenticity record updated successfully.');
  };

  // Filter & Sort Logic
  const filteredMaterials = materials
    .filter(m => {
      const isTemp = isTemporaryPartNumber(m.partNumber) || m.isPartNumberAutoGenerated;
      const qLower = searchQuery.toLowerCase().trim();

      const matchPartNumber = !isTemp && (m.partNumber || '').toLowerCase().includes(qLower);
      const matchUnassignedSearch = isTemp && (
        qLower.includes('غير محدد') ||
        qLower.includes('unassigned') ||
        qLower.includes('بدون') ||
        qLower.includes('temp')
      );

      const matchQuery = !qLower ||
        matchPartNumber ||
        matchUnassignedSearch ||
        (m.description || '').toLowerCase().includes(qLower) ||
        (m.manufacturer || '').toLowerCase().includes(qLower) ||
        (m.model || '').toLowerCase().includes(qLower) ||
        (m.materialCode || '').toLowerCase().includes(qLower) ||
        (m.tagNumber || '').toLowerCase().includes(qLower) ||
        (m.installationLocation || '').toLowerCase().includes(qLower) ||
        (m.tagLocation || '').toLowerCase().includes(qLower) ||
        (m.workOrder || '').toLowerCase().includes(qLower) ||
        (m.woNumber || '').toLowerCase().includes(qLower) ||
        (m.mrfReference || '').toLowerCase().includes(qLower) ||
        (m.mrfNumber || '').toLowerCase().includes(qLower) ||
        (m.mrf || '').toLowerCase().includes(qLower) ||
        (m.mrReference || '').toLowerCase().includes(qLower) ||
        (m.sequence !== undefined && m.sequence.toString().includes(qLower));

      const matchStore = filterStore === 'All' || m.store === filterStore;
      
      const isLow = m.quantity <= m.minStockLevel;
      const matchStock = 
        filterStockStatus === 'All' ||
        (filterStockStatus === 'Low' && isLow) ||
        (filterStockStatus === 'Sufficient' && !isLow);

      const matchPNStatus = 
        filterPartNumberStatus === 'All' ||
        (filterPartNumberStatus === 'WithPN' && !isTemp) ||
        (filterPartNumberStatus === 'WithoutPN' && isTemp);

      return matchQuery && matchStore && matchStock && matchPNStatus;
    })
    .sort((a, b) => {
      if (sortField === 'partNumber') {
        const pnA = (isTemporaryPartNumber(a.partNumber) || a.isPartNumberAutoGenerated) ? '' : (a.partNumber || '');
        const pnB = (isTemporaryPartNumber(b.partNumber) || b.isPartNumberAutoGenerated) ? '' : (b.partNumber || '');
        if (!pnA && pnB) return 1;
        if (pnA && !pnB) return -1;
        return sortOrder === 'asc' ? pnA.localeCompare(pnB) : pnB.localeCompare(pnA);
      }
      if (sortField === 'sequence') {
        const seqA = (a.sequence !== undefined && a.sequence !== null && !isNaN(Number(a.sequence))) ? Number(a.sequence) : Infinity;
        const seqB = (b.sequence !== undefined && b.sequence !== null && !isNaN(Number(b.sequence))) ? Number(b.sequence) : Infinity;
        return sortOrder === 'asc' ? seqA - seqB : seqB - seqA;
      }

      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toUpperCase();
        valB = valB.toUpperCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const getStockLabel = (material: Material) => {
    if (material.isIncomplete) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 text-[10px] font-bold font-sans px-2.5 py-0.5 rounded-full border border-amber-500/30">
          <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" /> Incomplete Data
        </span>
      );
    }
    const isLow = material.quantity <= material.minStockLevel;
    if (material.quantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border border-red-200">
          <AlertTriangle className="h-3 w-3" /> Depleted
        </span>
      );
    }
    if (isLow) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle className="h-3 w-3" /> Adequate
      </span>
    );
  };

  const isWritable = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ENGINEER;

  return (
    <div className="space-y-5" id="materials-ledger">
      {/* Search and Filters Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display">Material Ledger</h2>
            <p className="text-xs text-industrial-500 mt-1">Authorized engineering material registry directory.</p>
          </div>
          
          {/* Desktop Toolbar (visible on md screens and up) */}
          <div className="hidden md:flex gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand-600" />
              <span>تصدير CSV / CSV Export</span>
            </button>
            <button
              onClick={handleExportXLSX}
              className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-brand-600" />
              <span>تصدير Excel / Excel Export</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="h-4 w-4 text-white" />
              <span>تصدير PDF / PDF Export</span>
            </button>
            {isWritable && (
              <button
                onClick={() => setIsShowingImportModal(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                id="import-excel-btn"
              >
                <Upload className="h-4 w-4 text-emerald-600" />
                <span>استيراد اكسل / Import Materials</span>
              </button>
            )}
            <button
              onClick={() => setIsShowingBlacklistManager(true)}
              className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <ShieldAlert className="h-4 w-4 text-red-600 animate-pulse" />
              <span>القائمة السوداء للموردين / Supplier Blacklist</span>
            </button>
            {isWritable && (
              <button
                onClick={() => setIsShowingConfirmClearAll(true)}
                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                <span>مسح الكل / Clear All Materials</span>
              </button>
            )}
            <NameplateScanner
              materialsList={materials}
              buttonClassName="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              renderTrigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                  id="btn-scan-ledger-top"
                >
                  <Camera className="h-4 w-4" />
                  <span>مسح باركود / لوحة المادة</span>
                </button>
              )}
              onEditMaterial={(mat) => {
                setSelectedMaterial(mat);
                setIsEditingCoreDetails(true);
              }}
              onRegisterNewEntry={(data) => {
                onNavigateToTab('add-material', '', data);
              }}
            />
            {isWritable && (
              <button
                onClick={() => onNavigateToTab('add-material')}
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Material SKU</span>
              </button>
            )}
          </div>

          {/* Mobile Sleek Action Bar (clean 2-row layout prevents pushing table off screen) */}
          <div className="flex md:hidden flex-col gap-2 w-full">
            <div className="flex items-center gap-2 w-full">
              {isWritable && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('add-material')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Add SKU / إضافة مادة</span>
                </button>
              )}
              <NameplateScanner
                materialsList={materials}
                renderTrigger={(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
                    id="btn-scan-ledger-top-mobile"
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span>مسح باركود / Scan</span>
                  </button>
                )}
                onEditMaterial={(mat) => {
                  setSelectedMaterial(mat);
                  setIsEditingCoreDetails(true);
                }}
                onRegisterNewEntry={(data) => {
                  onNavigateToTab('add-material', '', data);
                }}
              />
            </div>

            <div className="flex items-center gap-2 w-full">
              {/* Export Dropdown */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileExportOpen(!isMobileExportOpen);
                    setIsMobileToolsOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-between gap-1.5 bg-industrial-100 hover:bg-industrial-200 text-industrial-800 font-medium text-xs py-2 px-3 rounded-xl border border-industrial-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" />
                    <span>تصدير / Export</span>
                  </span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isMobileExportOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileExportOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-industrial-200 rounded-xl shadow-xl z-30 p-1 space-y-1">
                    <button
                      onClick={() => { handleExportCSV(); setIsMobileExportOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-industrial-700 hover:bg-industrial-50 rounded-lg text-left"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" />
                      <span>تصدير CSV / CSV Export</span>
                    </button>
                    <button
                      onClick={() => { handleExportXLSX(); setIsMobileExportOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-industrial-700 hover:bg-industrial-50 rounded-lg text-left"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" />
                      <span>تصدير Excel / Excel Export</span>
                    </button>
                    <button
                      onClick={() => { handleExportPDF(); setIsMobileExportOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-industrial-700 hover:bg-industrial-50 rounded-lg text-left"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-800" />
                      <span>تصدير PDF / PDF Export</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tools Dropdown */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileToolsOpen(!isMobileToolsOpen);
                    setIsMobileExportOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-between gap-1.5 bg-industrial-100 hover:bg-industrial-200 text-industrial-800 font-medium text-xs py-2 px-3 rounded-xl border border-industrial-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-industrial-600" />
                    <span>أدوات / Tools</span>
                  </span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isMobileToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileToolsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-industrial-200 rounded-xl shadow-xl z-30 p-1 space-y-1">
                    {isWritable && (
                      <button
                        onClick={() => { setIsShowingImportModal(true); setIsMobileToolsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg text-left"
                      >
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        <span>استيراد اكسل / Import</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setIsShowingBlacklistManager(true); setIsMobileToolsOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg text-left"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                      <span>القائمة السوداء / Blacklist</span>
                    </button>
                    {isWritable && (
                      <button
                        onClick={() => { setIsShowingConfirmClearAll(true); setIsMobileToolsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg text-left"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        <span>مسح الكل / Clear All</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Main Search Input */}
          <div className="sm:col-span-2 lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Part, Desc, Maker, Model..."
              className="w-full bg-industrial-50 border border-industrial-200 text-industrial-800 text-xs px-3.5 py-2.5 pl-9 rounded-xl placeholder-industrial-400 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              id="ledger-search-input"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-industrial-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-industrial-400 hover:text-industrial-700 p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Store Location Filter */}
          <div className="relative">
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="w-full bg-industrial-50 border border-industrial-200 text-industrial-700 text-xs px-3.5 py-2.5 pr-8 rounded-xl appearance-none focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              id="ledger-filter-store"
            >
              {uniqueStores.map(store => (
                <option key={store} value={store}>{store === 'All' ? 'All Locations' : store}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-industrial-400">
              <MapPin className="h-4 w-4" />
            </div>
          </div>

          {/* Stock Level Filter */}
          <div className="relative">
            <select
              value={filterStockStatus}
              onChange={(e) => setFilterStockStatus(e.target.value)}
              className="w-full bg-industrial-50 border border-industrial-200 text-industrial-700 text-xs px-3.5 py-2.5 pr-8 rounded-xl appearance-none focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              id="ledger-filter-status"
            >
              <option value="All">All Stock Levels</option>
              <option value="Low">Low Stock Warnings</option>
              <option value="Sufficient">Adequate Stock</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-industrial-400">
              <Filter className="h-4 w-4" />
            </div>
          </div>

          {/* Part Number Status Filter */}
          <div className="relative">
            <select
              value={filterPartNumberStatus}
              onChange={(e) => setFilterPartNumberStatus(e.target.value as 'All' | 'WithPN' | 'WithoutPN')}
              className="w-full bg-industrial-50 border border-industrial-200 text-industrial-700 text-xs px-3.5 py-2.5 pr-8 rounded-xl appearance-none focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              id="ledger-filter-pn-status"
            >
              <option value="All">جميع أرقام القطع / All P/N</option>
              <option value="WithPN">بأرقام قطع محددة / With P/N</option>
              <option value="WithoutPN">بدون رقم قطعة (فارغ) / Without P/N</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-industrial-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* LEDGER CONTENT AREA */}
      <div className="bg-white rounded-2xl border border-industrial-200 shadow-sm overflow-hidden">
        {filteredMaterials.length === 0 ? (
          <div className="text-center p-12 space-y-3">
            <div className="inline-flex p-4 bg-industrial-100 rounded-full text-industrial-400">
              <Layers className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-industrial-800">No Materials Found</p>
            <p className="text-xs text-industrial-500 max-w-sm mx-auto">
              No matching records conform to your filters. Try clearing your query or adjusting the filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStore('All');
                setFilterStockStatus('All');
              }}
              className="text-xs bg-industrial-100 hover:bg-industrial-200 text-industrial-700 font-medium px-3.5 py-2 rounded-xl transition-colors cursor-pointer mt-2"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="materials-table">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200 text-industrial-500 text-[11px] font-mono uppercase tracking-wider select-none">
                    <th 
                      onClick={() => handleSort('sequence')}
                      className="p-4 font-semibold cursor-pointer hover:bg-industrial-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Seq # / التسلسل <ChevronsUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('partNumber')}
                      className="p-4 font-semibold cursor-pointer hover:bg-industrial-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Part Number <ChevronsUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th className="p-4 font-semibold">Description</th>
                    <th 
                      onClick={() => handleSort('manufacturer')}
                      className="p-4 font-semibold cursor-pointer hover:bg-industrial-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Manufacturer / Model <ChevronsUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('quantity')}
                      className="p-4 font-semibold cursor-pointer hover:bg-industrial-100/60 transition-colors text-right"
                    >
                      <div className="flex items-center gap-1 justify-end">
                        Quantity <ChevronsUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th 
                      onClick={() => handleSort('store')}
                      className="p-4 font-semibold cursor-pointer hover:bg-industrial-100/60 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Storage Location <ChevronsUpDown className="h-3.5 w-3.5" />
                      </div>
                    </th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 text-xs text-industrial-700">
                  {filteredMaterials.map((material, idx) => (
                    <tr 
                      key={`${material.partNumber}-${idx}`}
                      className={`transition-colors group ${
                        material.isIncomplete
                          ? 'bg-amber-50/40 hover:bg-amber-100/40 border-l-2 border-l-amber-500'
                          : 'hover:bg-industrial-50/50'
                      }`}
                    >
                      {/* Material Sequence Number */}
                      <td className="p-4 font-mono font-bold text-brand-700 whitespace-nowrap">
                        {material.sequence !== undefined ? `#${material.sequence}` : <span className="text-industrial-300 font-normal italic">-</span>}
                      </td>

                      {/* Part Number */}
                      <td className="p-4 whitespace-nowrap">
                        {isTemporaryPartNumber(material.partNumber) || material.isPartNumberAutoGenerated ? (
                          <div 
                            className="inline-flex items-center gap-1.5 cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaterial(material);
                              setIsEditingCoreDetails(true);
                            }}
                            title="لم يتم تحديد رقم قطعة في الملف الأصلي (انقر هنا لإدخال رقم قطعة)"
                          >
                            <span className="font-mono font-bold text-industrial-400">—</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded group-hover:bg-amber-100 group-hover:border-amber-300 transition-colors">
                              بدون رقم قطعة
                              <Edit className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono font-semibold text-industrial-900 select-all">
                            {material.partNumber}
                          </span>
                        )}
                      </td>

                      {/* Description & Engineering Tags */}
                      <td className="p-4 max-w-sm" title={material.description}>
                        <div className="font-medium text-industrial-900 line-clamp-2 leading-snug">
                          {material.description}
                        </div>
                        {(material.tagNumber || material.installationLocation || material.tagLocation || material.workOrder || material.woNumber || material.mrfReference || material.mrfNumber || material.mrf) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {material.tagNumber && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200/90 px-1.5 py-0.5 rounded shadow-2xs" title="Equipment Tag #">
                                <Tag className="h-2.5 w-2.5 shrink-0" />
                                <span>{material.tagNumber}</span>
                              </span>
                            )}
                            {(material.installationLocation || material.tagLocation) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded shadow-2xs" title="موقع التثبيت الميداني الفعلي (مثل مكان تثبيت السلينويد)">
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-indigo-500" />
                                <span className="max-w-[130px] truncate">{material.installationLocation || material.tagLocation}</span>
                              </span>
                            )}
                            {(material.workOrder || material.woNumber) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded" title="رقم أمر العمل Work Order #">
                                <span>WO: {material.workOrder || material.woNumber}</span>
                              </span>
                            )}
                            {(material.mrfReference || material.mrfNumber || material.mrf) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-blue-800 bg-blue-50 border border-blue-200/90 px-1.5 py-0.5 rounded" title="رقم طلب صرف المواد MRF #">
                                <span>MRF: {material.mrfReference || material.mrfNumber || material.mrf}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Manufacturer / Model */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-semibold text-industrial-800 block">{material.manufacturer}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-industrial-450">{material.model}</span>
                          {material.oemVerificationStatus === 'verified' && (
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1 rounded uppercase tracking-wide">OEM Verified</span>
                          )}
                          {material.oemVerificationStatus === 'authorized' && (
                            <span className="text-[8px] bg-sky-50 text-sky-700 border border-sky-200 font-bold px-1 rounded uppercase tracking-wide">Distributor</span>
                          )}
                          {material.oemVerificationStatus === 'alternative' && (
                            <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1 rounded uppercase tracking-wide">3rd Party</span>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-4 text-right font-mono font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          {isWritable && (
                            <button
                              onClick={() => handleAdjustQuantity(material, -1)}
                              className="p-1 rounded-md bg-industrial-100 hover:bg-industrial-200 text-industrial-600 transition-colors cursor-pointer"
                              title="Decrease Quantity by 1"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span className="text-sm font-bold text-industrial-900 w-10 text-center">
                            {material.quantity}
                          </span>
                          {isWritable && (
                            <button
                              onClick={() => handleAdjustQuantity(material, 1)}
                              className="p-1 rounded-md bg-industrial-100 hover:bg-industrial-200 text-industrial-600 transition-colors cursor-pointer"
                              title="Increase Quantity by 1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span className="text-[10px] text-industrial-400 font-mono self-center w-8 text-left">{material.unit}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {getStockLabel(material)}
                      </td>

                      {/* Storage Location & Station */}
                      <td className="p-4 text-industrial-600 whitespace-nowrap">
                        {material.station && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded mb-1 block w-fit">
                            <MapPin className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                            <span>{material.station}</span>
                          </span>
                        )}
                        <span className="font-semibold block text-industrial-800">{material.store}</span>
                        <span className="text-[10px] font-mono text-industrial-500">Rack {material.rack} · Shelf {material.shelf}</span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedMaterial(material);
                              setEditQtyValue(material.quantity);
                            }}
                            className="p-1.5 rounded-lg bg-industrial-100 hover:bg-industrial-250 text-industrial-600 hover:text-industrial-900 transition-all cursor-pointer"
                            title="Inspect Material Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {currentUser.role === UserRole.ADMIN && (() => {
                            const matKey = material.id || material.partNumber || (material.sequence ? String(material.sequence) : '');
                            return (
                              <>
                                {confirmDeletePart === matKey ? (
                                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5">
                                    <button
                                      onClick={() => {
                                        onDeleteMaterial(matKey);
                                        setConfirmDeletePart(null);
                                      }}
                                      className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-medium px-2 py-1 rounded cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeletePart(null)}
                                      className="text-industrial-400 hover:text-industrial-700 p-1 cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeletePart(matKey)}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all cursor-pointer"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total matched count bar */}
            <div className="bg-industrial-50/60 p-3 px-4 border-t border-industrial-150 flex justify-between items-center text-[11px] text-industrial-500 font-mono">
              <span>Showing {filteredMaterials.length} of {materials.length} Material SKUs</span>
              <span>Primary Key: Part Number</span>
            </div>
          </>
        )}
      </div>
      {/* MATERIAL INSPECT / DETAILED VIEW MODAL */}
      <AnimatePresence>
        {selectedMaterial && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-5xl bg-white border border-industrial-300 rounded-2xl shadow-2xl text-industrial-800 relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header block with part number and logo */}
              <div className="bg-industrial-900 p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-600/30 text-brand-300 border-brand-500/20 text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-wider">
                      Material Specification File
                    </span>
                    <span className="bg-industrial-750 text-industrial-300 text-[9px] font-mono uppercase px-2 py-0.5 rounded font-semibold">
                      EMIS v1.0
                    </span>
                  </div>
                  <h3 className="font-mono font-black text-xl text-white mt-1.5 tracking-tight flex items-center gap-2">
                    <Layers className="h-5 w-5 text-brand-500" /> 
                    {(isTemporaryPartNumber(selectedMaterial.partNumber) || selectedMaterial.isPartNumberAutoGenerated) ? (
                      <span className="flex items-center gap-2">
                        <span className="text-industrial-400 font-normal italic font-sans text-base">بدون رقم قطعة</span>
                        <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-sans font-medium">
                          صنف غير محدد برقم قطعة
                        </span>
                      </span>
                    ) : (
                      selectedMaterial.partNumber
                    )}
                  </h3>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-industrial-800/80 p-1 rounded-xl border border-industrial-750 self-stretch md:self-auto overflow-x-auto gap-0.5 md:mr-10">
                  <button
                    onClick={() => setActiveModalTab('specs')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'specs'
                        ? 'bg-brand-600 text-white'
                        : 'text-industrial-400 hover:text-white'
                    }`}
                  >
                    <Info className="h-3.5 w-3.5" /> Specs & AI
                  </button>
                  <button
                    onClick={() => setActiveModalTab('compatibility')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'compatibility'
                        ? 'bg-brand-600 text-white'
                        : 'text-industrial-400 hover:text-white'
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" /> Compatibility
                  </button>
                  <button
                    onClick={() => setActiveModalTab('documents')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'documents'
                        ? 'bg-brand-600 text-white'
                        : 'text-industrial-400 hover:text-white'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Files & Photos
                  </button>
                  <button
                    onClick={() => setActiveModalTab('serials')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'serials'
                        ? 'bg-brand-600 text-white'
                        : 'text-industrial-400 hover:text-white'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" /> Serial Numbers ({selectedMaterial.serialNumbers?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveModalTab('timeline')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'timeline'
                        ? 'bg-brand-600 text-white'
                        : 'text-industrial-400 hover:text-white'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" /> Audit Timeline
                  </button>
                  <button
                    onClick={() => setActiveModalTab('ask-ai')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer whitespace-nowrap ${
                      activeModalTab === 'ask-ai'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-industrial-400 hover:text-white hover:bg-industrial-800'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> 🤖 اسأل عن هذه المادة / Ask about this Material
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setSelectedMaterial(null);
                    setIsEditingQuantity(false);
                  }}
                  className="absolute right-4 top-4 text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Feedback toast / notification panel inside modal */}
              <AnimatePresence>
                {localToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 text-xs font-semibold flex items-center justify-between border-b shrink-0 ${
                      localToast.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-red-50 text-red-800 border-red-250'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {localToast.message}
                    </span>
                    <button onClick={() => setLocalToast(null)} className="text-industrial-400 hover:text-industrial-700 cursor-pointer">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Modal Content Scroll Frame */}
              <div className="p-6 overflow-y-auto flex-1">
                
                {/* TAB 1: SPECIFICATIONS & AI PLACEHOLDERS */}
                {activeModalTab === 'specs' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left & Middle specs layout */}
                    <div className="md:col-span-2 space-y-5">
                      {isWritable && (
                        <div className="bg-brand-50/30 border border-brand-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1">
                              <Sparkles className="h-4 w-4 text-brand-600 animate-pulse shrink-0" /> تحديث البيانات عبر مسح اللوحة (Scan Nameplate)
                            </h4>
                            <p className="text-[10.5px] text-industrial-500 mt-0.5">
                              قم بمسح لوحة معلومات المادة لتصحيح أو إكمال الحقول الفنية كالجهد والسرعة والشركة المصنعة تلقائياً.
                            </p>
                          </div>
                          <NameplateScanner onScanSuccess={handleScanSuccessForExisting} />
                        </div>
                      )}

                      {selectedMaterial.isIncomplete && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-800 leading-relaxed space-y-1">
                            <p className="font-bold">⚠️ سجل بيانات غير مكتمل / Incomplete Engineering Record</p>
                            <p>تم استيراد هذه المادة بنجاح عبر Smart Import Mode ولكنها تفتقر لبعض الحقول الأساسية (مثل رقم القطعة أو الوصف أو المصنع أو الموديل). يرجى إكمال الحقول الناقصة.</p>
                            {!isEditingCoreDetails && isWritable && (
                              <button
                                type="button"
                                onClick={() => setIsEditingCoreDetails(true)}
                                className="mt-2 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <Edit className="h-3 w-3" /> إكمال البيانات الآن / Complete Data Now
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {isEditingCoreDetails ? (
                        <form onSubmit={handleSaveCoreDetails} className="space-y-4 bg-industrial-50/60 p-5 rounded-2xl border border-industrial-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-industrial-200 pb-2.5">
                            <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <Edit className="h-4 w-4 text-brand-600" />
                              <span>تعديل المواصفات الهندسية / Edit Engineering Specifications</span>
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAutoEnrichCoreDetails}
                                disabled={isAutoEnrichingCore}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                title="إكمال المواصفات والوصف الفني تلقائياً بواسطة الذكاء الاصطناعي"
                              >
                                {isAutoEnrichingCore ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>جاري الإكمال...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    <span>إكمال وتوليد المواصفات بالذكاء الاصطناعي (AI Enrich)</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingCoreDetails(false)}
                                className="text-industrial-450 hover:text-industrial-700 text-xs font-bold font-sans"
                              >
                                إلغاء / Cancel
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">
                                Part Number / رقم القطعة <span className="text-industrial-400 font-normal font-sans">(اختياري / Optional)</span>
                              </label>
                              <input
                                type="text"
                                value={editPartNumber}
                                onChange={(e) => setEditPartNumber(e.target.value)}
                                placeholder="اتركه فارغاً إذا لم يتوفر رقم قطعة"
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                              />
                              <p className="text-[9px] text-industrial-450 mt-1">
                                يمكنك تركه فارغاً إذا لم يتوفر رقم قطعة أصلي في الكتالوج.
                              </p>
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Material Code / رمز المادة</label>
                              <input
                                type="text"
                                value={editMaterialCode}
                                onChange={(e) => setEditMaterialCode(e.target.value)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                placeholder="e.g. MAT-8841"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Description / الوصف الفني <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Manufacturer / الشركة المصنعة <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={editManufacturer}
                                onChange={(e) => setEditManufacturer(e.target.value)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Model Designation / الطراز الفني <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={editModel}
                                onChange={(e) => setEditModel(e.target.value)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Warehouse Facility / المستودع</label>
                              <input
                                type="text"
                                value={editWarehouse}
                                onChange={(e) => setEditWarehouse(e.target.value)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Rack / الرف</label>
                                <input
                                  type="text"
                                  value={editRack}
                                  onChange={(e) => setEditRack(e.target.value)}
                                  className="w-full bg-white border border-industrial-200 text-xs px-2.5 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Shelf / الخانة</label>
                                <input
                                  type="text"
                                  value={editShelf}
                                  onChange={(e) => setEditShelf(e.target.value)}
                                  className="w-full bg-white border border-industrial-200 text-xs px-2.5 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Min Safety Threshold / الحد الأدنى للأمان</label>
                              <input
                                type="number"
                                min="0"
                                value={editMinStock}
                                onChange={(e) => setEditMinStock(parseInt(e.target.value) || 0)}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Engineering Comments / تعليقات هندسية</label>
                              <textarea
                                value={editEngineeringComments}
                                onChange={(e) => setEditEngineeringComments(e.target.value)}
                                rows={2}
                                className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:ring-1.5 focus:ring-brand-500 focus:outline-none"
                                placeholder="Add specific technical guidelines or remarks..."
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-industrial-200 pt-3">
                            <button
                              type="button"
                              onClick={() => setIsEditingCoreDetails(false)}
                              className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                            >
                              إلغاء / Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer shadow-sm"
                            >
                              حفظ التعديلات / Save Specifications
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex justify-between items-center border-b border-industrial-100 pb-2 mb-4">
                            <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono">البيانات الفنية / Technical Specifications</h4>
                            {isWritable && (
                              <button
                                type="button"
                                onClick={() => setIsEditingCoreDetails(true)}
                                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" /> تعديل البيانات / Edit Specs
                              </button>
                            )}
                          </div>

                          <div className="bg-brand-50/20 p-4 rounded-xl border border-brand-200 grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <span className="block text-[9px] font-mono text-brand-700 uppercase font-extrabold tracking-wider">Sequence Number</span>
                              <span className="text-sm font-mono font-extrabold text-brand-800">
                                {selectedMaterial.sequence !== undefined ? `#${selectedMaterial.sequence}` : <span className="text-industrial-400 italic font-normal">None</span>}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-industrial-450 uppercase font-bold">Part ID / Number</span>
                              {(isTemporaryPartNumber(selectedMaterial.partNumber) || selectedMaterial.isPartNumberAutoGenerated) ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-industrial-400 font-mono font-bold">—</span>
                                  <span className="text-[10px] font-sans font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded">
                                    بدون رقم قطعة
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-mono font-bold text-industrial-800 break-all">{selectedMaterial.partNumber}</span>
                              )}
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-industrial-450 uppercase font-bold">Material Code</span>
                              <span className="text-xs font-mono font-bold text-industrial-800">
                                {selectedMaterial.materialCode || <span className="text-industrial-400 italic font-normal">N/A</span>}
                              </span>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Description</h4>
                            <p className="text-xs text-industrial-800 font-medium mt-1 leading-relaxed">
                              {selectedMaterial.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-industrial-100 pt-3.5">
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Manufacturer / Brand</h4>
                              <p className="text-xs font-semibold text-industrial-800 mt-0.5">
                                {selectedMaterial.manufacturer} {selectedMaterial.brand && selectedMaterial.brand !== selectedMaterial.manufacturer && `· Brand: ${selectedMaterial.brand}`}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Model / Serial Number</h4>
                              <p className="text-xs font-semibold text-industrial-800 mt-0.5">
                                {selectedMaterial.model} {selectedMaterial.serialNumber && `· S/N: ${selectedMaterial.serialNumber}`}
                              </p>
                            </div>
                          </div>

                          {selectedMaterial.measuringRange && (
                            <div className="grid grid-cols-1 gap-4 border-t border-industrial-100 pt-3.5">
                              <div>
                                <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Measuring Range / مجال القياس</h4>
                                <p className="text-xs font-bold text-brand-700 mt-0.5">{selectedMaterial.measuringRange}</p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 border-t border-industrial-100 pt-3.5">
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Original / Remaining Stock</h4>
                              <p className="text-xs font-semibold font-mono text-industrial-800 mt-0.5">
                                {selectedMaterial.originalQuantity !== undefined ? `${selectedMaterial.originalQuantity} ${selectedMaterial.unit} (Orig) / ` : ''}
                                <span className="text-emerald-600 font-bold">{selectedMaterial.quantity} {selectedMaterial.unit} (In-Stock)</span>
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Location Coordinates & Station</h4>
                              <p className="text-xs font-semibold text-industrial-800 mt-0.5">
                                {selectedMaterial.station && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded mr-1">
                                    <MapPin className="h-2.5 w-2.5 text-emerald-600" />
                                    {selectedMaterial.station}
                                  </span>
                                )}
                                {selectedMaterial.store} · Rack {selectedMaterial.rack} / Shelf {selectedMaterial.shelf}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-industrial-100 pt-3.5">
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Minimum Safety Level</h4>
                              <p className="text-xs font-semibold font-mono text-industrial-800 mt-0.5">
                                {selectedMaterial.minStockLevel} {selectedMaterial.unit}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Inventory Status</h4>
                              <div className="mt-0.5">{getStockLabel(selectedMaterial)}</div>
                            </div>
                          </div>

                          {selectedMaterial.engineeringComments && (
                            <div className="bg-brand-50/20 p-3 rounded-xl border border-brand-100 space-y-1">
                              <h4 className="text-[9px] font-mono text-brand-700 uppercase font-bold">تعليقات هندسية مستوردة / Imported Engineering Comments</h4>
                              <p className="text-xs text-brand-950 font-sans leading-relaxed">{selectedMaterial.engineeringComments}</p>
                            </div>
                          )}

                          {selectedMaterial.additionalFields && Object.keys(selectedMaterial.additionalFields).length > 0 && (
                            <div className="bg-industrial-50/50 p-4 rounded-xl border border-industrial-150/80 space-y-2.5">
                              <h4 className="text-[9px] font-mono text-industrial-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 text-industrial-400" />
                                <span>حقول إضافية مستوردة / Unmapped Spreadsheet Attributes</span>
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-sans">
                                {Object.entries(selectedMaterial.additionalFields).map(([key, val]) => (
                                  <div key={key} className="bg-white p-2 rounded-lg border border-industrial-100 shadow-3xs">
                                    <span className="block text-[8px] font-mono text-industrial-450 uppercase truncate" title={key}>{key}</span>
                                    <span className="text-[11px] font-medium text-industrial-800 break-all">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Stock Level Quick Overrider */}
                      {isWritable && (
                        <div className="border-t border-industrial-150 pt-4">
                          {isEditingQuantity ? (
                            <form onSubmit={handleSaveQuantityManual} className="flex items-end gap-3 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                              <div className="flex-1">
                                <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold mb-1">Set Inventory Stock Quantity</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editQtyValue}
                                  onChange={(e) => setEditQtyValue(parseInt(e.target.value) || 0)}
                                  className="w-full bg-white border border-brand-200 text-industrial-800 text-xs px-3 py-1.5 rounded-lg font-mono focus:outline-none"
                                  required
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingQuantity(false)}
                                  className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="font-sans">
                                <p className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Current Stock Level</p>
                                <p className="text-lg font-extrabold text-industrial-900 font-mono mt-0.5">
                                  {selectedMaterial.quantity} <span className="text-xs font-normal text-industrial-500">{selectedMaterial.unit}</span>
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditQtyValue(selectedMaterial.quantity);
                                  setIsEditingQuantity(true);
                                }}
                                className="bg-industrial-100 hover:bg-industrial-200 border border-industrial-200 text-industrial-700 font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <Edit className="h-4 w-4" />
                                <span>Adjust Stock</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes Block */}
                      <div className="bg-industrial-50 p-4 rounded-xl border border-industrial-200">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Personnel Warehouse Remarks</h4>
                        </div>
                        <p className="text-xs text-industrial-700 italic leading-normal">
                          {selectedMaterial.notes || "No engineering remarks registered for this SKU."}
                        </p>
                      </div>

                      {/* SUPPLEMENTAL ENGINEERING NOTES SECTION */}
                      <div className="bg-brand-50/20 p-4 rounded-xl border border-brand-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-mono text-brand-700 uppercase tracking-widest font-bold flex items-center gap-1">
                            <Lock className="h-3 w-3 text-brand-600" /> Supplemental Engineering Notes
                          </h4>
                          {isWritable && !isEditingNotes && (
                            <button
                              onClick={() => {
                                setEditedNotesValue(selectedMaterial.engineeringNotes || '');
                                setIsEditingNotes(true);
                              }}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-700 underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit className="h-3 w-3" /> Edit Notes
                            </button>
                          )}
                        </div>

                        {isEditingNotes ? (
                          <form onSubmit={handleSaveEngineeringNotes} className="space-y-2.5">
                            <textarea
                              value={editedNotesValue}
                              onChange={(e) => setEditedNotesValue(e.target.value)}
                              rows={3}
                              placeholder="Type specialized installation, safety precautions, maintenance intervals, or compliance remarks..."
                              className="w-full bg-white border border-brand-200 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingNotes(false)}
                                className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer shadow-2xs"
                              >
                                Save Notes
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="text-xs text-industrial-700 leading-relaxed font-sans bg-white/70 p-3 rounded-lg border border-brand-50/50">
                            {selectedMaterial.engineeringNotes ? (
                              <span className="whitespace-pre-line">{selectedMaterial.engineeringNotes}</span>
                            ) : (
                              <span className="italic text-industrial-450">No special engineering logs listed. (Authorized Engineers/Admins can edit)</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* OEM SUPPLY VERIFICATION SECTION */}
                      <div className="bg-emerald-50/25 p-4 rounded-xl border border-emerald-100/70 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-mono text-emerald-800 uppercase tracking-widest font-bold flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> 
                            <span>التحقق من الشركة الأم / OEM Supply Verification</span>
                          </h4>
                          {isWritable && !isEditingOem && (
                            <button
                              onClick={() => {
                                setOemStatus(selectedMaterial.oemVerificationStatus || 'pending');
                                setOemCertId(selectedMaterial.oemCertificateId || '');
                                setOemNotes(selectedMaterial.oemVerificationNotes || '');
                                setIsEditingOem(true);
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit className="h-3 w-3" /> تحديث الحالة
                            </button>
                          )}
                        </div>

                        {isEditingOem ? (
                          <form onSubmit={handleSaveOemVerification} className="space-y-3 bg-white p-3.5 rounded-lg border border-emerald-150/80">
                            <div>
                              <label className="block text-[9px] font-mono text-emerald-800 uppercase font-bold mb-1">حالة التوريد / Supply Status</label>
                              <select
                                value={oemStatus}
                                onChange={(e) => setOemStatus(e.target.value as any)}
                                className="w-full bg-emerald-50/40 border border-emerald-200 text-xs px-2.5 py-2 rounded-lg text-industrial-800 focus:outline-none"
                              >
                                <option value="verified">مؤكد من الشركة الأم (OEM Verified)</option>
                                <option value="authorized">موزع معتمد للشركة الأم (Authorized Distributor)</option>
                                <option value="alternative">مورد بديل / جهة تجارية (Alternative Supplier)</option>
                                <option value="pending">قيد التحقق الفني (Pending Audit)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-emerald-800 uppercase font-bold mb-1">رقم شهادة المطابقة والمنشأ / CoC Certificate ID</label>
                              <input
                                type="text"
                                value={oemCertId}
                                onChange={(e) => setOemCertId(e.target.value)}
                                placeholder="e.g. CERT-OEM-2026-8841"
                                className="w-full bg-emerald-50/40 border border-emerald-200 text-xs px-2.5 py-1.5 rounded-lg text-industrial-800 focus:outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-mono text-emerald-800 uppercase font-bold mb-1">ملاحظات التدقيق الفني / Verification Remarks</label>
                              <textarea
                                value={oemNotes}
                                onChange={(e) => setOemNotes(e.target.value)}
                                rows={2}
                                placeholder="أدخل تفاصيل تدقيق المنشأ أو مطابقة أرقام التصنيع..."
                                className="w-full bg-emerald-50/40 border border-emerald-200 text-xs px-2.5 py-1.5 rounded-lg text-industrial-800 focus:outline-none"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingOem(false)}
                                className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                إلغاء
                              </button>
                              <button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer shadow-2xs"
                              >
                                حفظ البيانات
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Badges for status */}
                            <div className="flex items-center gap-2">
                              {selectedMaterial.oemVerificationStatus === 'verified' && (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                  مؤكد من الشركة الأم - OEM Verified
                                </span>
                              )}
                              {selectedMaterial.oemVerificationStatus === 'authorized' && (
                                <span className="inline-flex items-center gap-1 bg-sky-100 border border-sky-300 text-sky-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <Info className="h-3 w-3 text-sky-600 shrink-0" />
                                  موزع معتمد - Authorized Distributor
                                </span>
                              )}
                              {selectedMaterial.oemVerificationStatus === 'alternative' && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                  مورد بديل / طرف ثالث - Third-Party
                                </span>
                              )}
                              {(selectedMaterial.oemVerificationStatus === 'pending' || !selectedMaterial.oemVerificationStatus) && (
                                <span className="inline-flex items-center gap-1 bg-industrial-100 border border-industrial-300 text-industrial-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <Clock className="h-3 w-3 text-industrial-500 shrink-0" />
                                  قيد التحقق الفني - Pending Verification
                                </span>
                              )}
                            </div>

                            {/* Details Table */}
                            <div className="grid grid-cols-2 gap-3 text-xs bg-white/70 p-3 rounded-lg border border-emerald-100/50">
                              <div>
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">شهادة المطابقة (CoC ID)</span>
                                <span className="font-semibold text-industrial-850 font-mono">
                                  {selectedMaterial.oemCertificateId || <span className="text-industrial-400 italic">غير مدخلة / Not Provided</span>}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">المدقق الفني / Audited By</span>
                                <span className="font-semibold text-industrial-850 flex items-center gap-1">
                                  <UserIcon className="h-3 w-3 text-industrial-400 shrink-0" />
                                  {selectedMaterial.oemVerifiedBy || <span className="text-industrial-400 italic">بانتظار التدقيق</span>}
                                </span>
                              </div>
                              {selectedMaterial.oemVerificationDate && (
                                <div className="col-span-2 border-t border-industrial-100 pt-1.5">
                                  <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">تاريخ التوثيق / Audit Timestamp</span>
                                  <span className="font-medium text-industrial-700 font-mono">
                                    {new Date(selectedMaterial.oemVerificationDate).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {selectedMaterial.oemVerificationNotes && (
                                <div className="col-span-2 border-t border-industrial-100 pt-1.5">
                                  <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">ملاحظات التحقق / Verification Notes</span>
                                  <p className="text-industrial-700 text-[11px] leading-relaxed mt-0.5 whitespace-pre-line font-sans">
                                    {selectedMaterial.oemVerificationNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Audit dates */}
                      <div className="text-[10px] text-industrial-400 font-mono flex justify-between pt-1 border-t border-industrial-100 pt-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Initial Entry: {new Date(selectedMaterial.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Last Ledger Update: {new Date(selectedMaterial.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Dynamic QR Asset Tag Label & AI Placeholder Suite */}
                    <div className="md:col-span-1 space-y-4 border-t md:border-t-0 md:border-l border-industrial-200 pt-5 md:pt-0 md:pl-5 flex flex-col justify-between">
                      {/* Material Authenticity Verification Widget */}
                      <div className="bg-gradient-to-br from-slate-900 to-industrial-950 text-white p-4 rounded-xl border border-slate-800 shadow-sm space-y-3 relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-brand-500/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 animate-pulse" />
                          <div>
                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Security Suite</span>
                            <h4 className="text-xs font-bold text-white tracking-tight">التحقق من أصالة المادة / Authenticity</h4>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                          قم بإجراء فحص ومطابقة للمادة للتأكد من أنها أصلية من الشركة الأم وليست مقلدة أو من مورد مدرج في القائمة السوداء.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartVerification(selectedMaterial)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow-emerald-900/40"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>التحقق من الأصالة / Verify Authenticity</span>
                        </button>
                      </div>

                      {/* Physical Asset label */}
                      <div className="bg-white p-4 rounded-xl border border-industrial-250 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-brand-600"></div>
                        <span className="text-[9px] font-mono font-bold text-industrial-400 uppercase tracking-widest mb-1.5 mt-1 block">
                          Physical Asset Tag
                        </span>
                        
                        <div className="bg-white p-2 rounded-lg border border-industrial-200 inline-block mb-3 shadow-2xs">
                          <QRCodeCanvas
                            id={`qr-code-${selectedMaterial.partNumber}`}
                            value={`${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(selectedMaterial.partNumber)}`}
                            size={120}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        
                        <div className="w-full space-y-1">
                          <p className="font-mono font-extrabold text-xs text-industrial-900 truncate tracking-tight">
                            {(isTemporaryPartNumber(selectedMaterial.partNumber) || selectedMaterial.isPartNumberAutoGenerated) ? (
                              <span className="text-industrial-500 font-sans italic font-normal">
                                {selectedMaterial.sequence !== undefined ? `الصنف #${selectedMaterial.sequence}` : 'بدون رقم قطعة'}
                              </span>
                            ) : (
                              selectedMaterial.partNumber
                            )}
                          </p>
                          <p className="text-[10px] text-industrial-500 font-medium truncate">
                            {selectedMaterial.manufacturer} · {selectedMaterial.model}
                          </p>
                          <div className="text-[9px] font-mono text-industrial-600 bg-industrial-100/70 py-1 px-1.5 rounded inline-block mt-1 font-semibold border border-industrial-200">
                            Rack {selectedMaterial.rack} / Shelf {selectedMaterial.shelf}
                          </div>
                        </div>

                        {/* Action buttons for QR/Label */}
                        <div className="space-y-1.5 w-full mt-4">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(selectedMaterial.partNumber)}
                            className="w-full bg-white hover:bg-industrial-50 text-industrial-750 font-semibold text-[10px] py-2 px-3 rounded-xl border border-industrial-250 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Link Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-industrial-500" />
                                <span>Copy Scan URL</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDownloadQR(selectedMaterial.partNumber)}
                            className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[10px] py-2 px-3 rounded-xl border border-brand-200 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPrintLabelModal(selectedMaterial)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 px-3 rounded-xl border border-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-950/20"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Print Label / طباعة الملصق</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenVoucherModal('issue')}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] py-2 px-3 rounded-xl border border-amber-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <FileSpreadsheet className="h-3 w-3" />
                            <span>Issue Material Voucher (MIV)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenVoucherModal('return')}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-2 px-3 rounded-xl border border-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <FileSpreadsheet className="h-3 w-3" />
                            <span>Return Material Voucher (MRV)</span>
                          </button>
                        </div>
                      </div>

                      {/* AI HOVER/TEASER BUTTONS - "COMING SOON" */}
                      <div className="bg-industrial-50 p-4 rounded-xl border border-industrial-200 space-y-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-industrial-700 uppercase font-mono tracking-wider">
                          <Cpu className="h-3.5 w-3.5 text-brand-600" />
                          <span>AI Intelligence Suite</span>
                        </div>
                        <p className="text-[10px] text-industrial-400">
                          Automated OCR analysis, compliance verification and smarter recommendations coming in version v0.2.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {/* 1. Scan Nameplate (Active) */}
                          <NameplateScanner 
                            onScanSuccess={handleScanSuccessForExisting}
                            renderTrigger={(open) => (
                              <button
                                type="button"
                                onClick={open}
                                className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center gap-1 group cursor-pointer"
                              >
                                <ImageIcon className="h-3 w-3 text-brand-600 group-hover:text-brand-500 shrink-0" />
                                <span className="truncate">Scan Nameplate</span>
                              </button>
                            )}
                          />

                          {/* 2. AI Engineering Assistant (Active) */}
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('ask-ai')}
                            className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center gap-1 group cursor-pointer"
                          >
                            <Cpu className="h-3 w-3 text-brand-600 group-hover:text-brand-500 shrink-0" />
                            <span className="truncate">AI Engineering Assistant</span>
                          </button>

                          {/* 3. Compare Datasheets (Active) */}
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('compare-datasheets')}
                            className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <span className="flex items-center gap-1 truncate">
                              <FileText className="h-3.5 w-3.5 text-brand-600 group-hover:text-brand-500 shrink-0" />
                              <span className="truncate font-bold">Compare Datasheets</span>
                            </span>
                            <span className="text-[7px] bg-emerald-100 text-emerald-800 scale-90 rounded px-1 shrink-0 font-bold font-mono">
                              ACTIVE
                            </span>
                          </button>

                          {/* 4. Compare COC (Active) */}
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('compare-coc')}
                            className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <span className="flex items-center gap-1 truncate">
                              <CheckCircle className="h-3.5 w-3.5 text-brand-600 group-hover:text-brand-500 shrink-0" />
                              <span className="truncate font-bold">Compare COC</span>
                            </span>
                            <span className="text-[7px] bg-emerald-100 text-emerald-800 scale-90 rounded px-1 shrink-0 font-bold font-mono">
                              ACTIVE
                            </span>
                          </button>

                          {/* 5. Engineering Verification / Assistant (Active) */}
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('knowledge-assistant')}
                            className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <span className="flex items-center gap-1 truncate">
                              <Zap className="h-3.5 w-3.5 text-brand-600 group-hover:text-brand-500 shrink-0" />
                              <span className="truncate font-bold">Knowledge Assistant</span>
                            </span>
                            <span className="text-[7px] bg-emerald-100 text-emerald-800 scale-90 rounded px-1 shrink-0 font-bold font-mono">
                              ACTIVE
                            </span>
                          </button>

                          {/* 6. Alternative Recommendation (Active) */}
                          <button
                            type="button"
                            onClick={() => setActiveModalTab('alternative-parts')}
                            className="bg-white/80 hover:bg-brand-50 border border-industrial-200 hover:border-brand-200 hover:text-brand-700 text-industrial-800 text-[10px] font-bold py-1.5 px-2 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <span className="flex items-center gap-1 truncate">
                              <Sparkles className="h-3.5 w-3.5 text-brand-600 group-hover:text-brand-500 shrink-0" />
                              <span className="truncate font-bold">Alternative Recommendation</span>
                            </span>
                            <span className="text-[7px] bg-emerald-100 text-emerald-800 scale-90 rounded px-1 shrink-0 font-bold font-mono">
                              ACTIVE
                            </span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 2: COMPATIBILITY & ALTERNATIVES */}
                {activeModalTab === 'compatibility' && (
                  <div className="space-y-6">
                    
                    {/* Block A: Machinery compatibility linking */}
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-industrial-100">
                        <div>
                          <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Wrench className="h-4 w-4 text-brand-600" /> Compatible Machinery Registry
                          </h4>
                          <p className="text-[11px] text-industrial-450 mt-0.5">
                            Associate this spare part with physical plant machinery. Changes reflect instantly on the Equipment dashboard.
                          </p>
                        </div>
                        <span className="text-[10px] bg-industrial-150 text-industrial-700 font-mono font-bold px-2 py-0.5 rounded">
                          {(selectedMaterial.compatibleEquipment || []).length} Linked Assets
                        </span>
                      </div>

                      {/* Linking dropdown bar */}
                      {isWritable && (
                        <div className="flex items-center gap-2 bg-industrial-50 p-3 rounded-lg border border-industrial-200">
                          <div className="flex-1">
                            <select
                              value={selectedEquipmentToLink}
                              onChange={(e) => setSelectedEquipmentToLink(e.target.value)}
                              className="w-full bg-white border border-industrial-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                            >
                              <option value="">-- Select plant equipment to link --</option>
                              {equipment
                                .filter(eq => !(selectedMaterial.compatibleEquipment || []).some(tag => tag.toUpperCase() === eq.tagNumber.toUpperCase()))
                                .map((eq, idx) => (
                                  <option key={`${eq.tagNumber}-${idx}`} value={eq.tagNumber}>
                                    {eq.tagNumber} - {eq.name} ({eq.plant})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleLinkEquipment}
                            disabled={!selectedEquipmentToLink}
                            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Link Equipment
                          </button>
                        </div>
                      )}

                      {/* Display linked items */}
                      {(!selectedMaterial.compatibleEquipment || selectedMaterial.compatibleEquipment.length === 0) ? (
                        <div className="text-center py-6 bg-industrial-50/50 rounded-lg border border-dashed border-industrial-200 text-industrial-400">
                          <p className="text-xs font-bold">No Compatible Equipment Registered</p>
                          <p className="text-[10px] mt-0.5">Link a pump, motor, or transmitter using the selector above.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedMaterial.compatibleEquipment.map((tag, idx) => {
                            const matchEq = equipment.find(e => e.tagNumber.toUpperCase() === tag.toUpperCase());
                            return (
                              <div key={`${tag}-${idx}`} className="p-3 bg-industrial-50 border border-industrial-200 rounded-xl flex justify-between items-center group">
                                <div className="space-y-0.5 pr-3">
                                  <span className="font-mono font-bold text-[11px] text-brand-700 uppercase">{tag}</span>
                                  <p className="font-bold text-xs text-industrial-900 line-clamp-1">
                                    {matchEq ? matchEq.name : 'Unknown Associated Machinery'}
                                  </p>
                                  <p className="text-[9px] text-industrial-400">
                                    Plant: {matchEq ? matchEq.plant : 'N/A'} · Status: {matchEq ? matchEq.status.toUpperCase() : 'N/A'}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      setSelectedMaterial(null);
                                      onNavigateToTab('equipment', tag);
                                    }}
                                    className="p-1 rounded bg-white border border-industrial-200 text-industrial-600 hover:text-brand-600 transition-colors text-[9px] font-bold"
                                    title="Go inspect machine card"
                                  >
                                    Go Inspect
                                  </button>
                                  {isWritable && (
                                    <button
                                      onClick={() => handleUnlinkEquipment(tag)}
                                      className="p-1 rounded bg-white hover:bg-red-50 border border-industrial-200 text-industrial-400 hover:text-red-600 transition-all cursor-pointer"
                                      title="Unlink equipment"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Block B: Alternative Materials Section */}
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-industrial-100">
                        <div>
                          <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-brand-600" /> Compatible Alternative Materials
                          </h4>
                          <p className="text-[11px] text-industrial-450 mt-0.5">
                            Identify primary and secondary warehouse alternatives to use if this SKU is depleted.
                          </p>
                        </div>
                        {isWritable && !isEditingAlternatives && (
                          <button
                            onClick={() => {
                              setEditedAltPrimary(selectedMaterial.alternatives?.primary || '');
                              setEditedAltSecondary(selectedMaterial.alternatives?.secondary || '');
                              setEditedAltNotes(selectedMaterial.alternatives?.notes || '');
                              setEditedAltReason(selectedMaterial.alternatives?.reason || '');
                              setIsEditingAlternatives(true);
                            }}
                            className="text-[10px] font-bold text-brand-600 hover:text-brand-750 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit Alternatives
                          </button>
                        )}
                      </div>

                      {isEditingAlternatives ? (
                        <form onSubmit={handleSaveAlternatives} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Primary Alternative */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                                Primary Alternative (Part #)
                              </label>
                              <select
                                value={editedAltPrimary}
                                onChange={(e) => setEditedAltPrimary(e.target.value)}
                                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-2.5 py-1.5 rounded-lg"
                              >
                                <option value="">-- Select primary alternative --</option>
                                {materials
                                  .filter(m => m.partNumber.toUpperCase() !== selectedMaterial.partNumber.toUpperCase())
                                  .map((m, idx) => (
                                    <option key={`${m.partNumber}-${idx}`} value={m.partNumber}>{m.partNumber} - {m.description.slice(0, 40)}...</option>
                                  ))}
                              </select>
                            </div>

                            {/* Secondary Alternative */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                                Secondary Alternative (Part #)
                              </label>
                              <select
                                value={editedAltSecondary}
                                onChange={(e) => setEditedAltSecondary(e.target.value)}
                                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-2.5 py-1.5 rounded-lg"
                              >
                                <option value="">-- Select secondary alternative --</option>
                                {materials
                                  .filter(m => m.partNumber.toUpperCase() !== selectedMaterial.partNumber.toUpperCase())
                                  .map((m, idx) => (
                                    <option key={`${m.partNumber}-${idx}`} value={m.partNumber}>{m.partNumber} - {m.description.slice(0, 40)}...</option>
                                  ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Reason for compatibility */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                                Compatibility Reason
                              </label>
                              <textarea
                                value={editedAltReason}
                                onChange={(e) => setEditedAltReason(e.target.value)}
                                rows={2}
                                placeholder="Why are these parts chemically, physically, or electrical interchangeable?"
                                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                              />
                            </div>

                            {/* Engineering Notes */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                                Engineering Safety Notes (Alternatives)
                              </label>
                              <textarea
                                value={editedAltNotes}
                                onChange={(e) => setEditedAltNotes(e.target.value)}
                                rows={2}
                                placeholder="Are there voltage limits or adapter brackets required?"
                                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsEditingAlternatives(false)}
                              className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Save Alternatives
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Primary display */}
                            <div className="p-3.5 bg-industrial-50 rounded-xl border border-industrial-200 flex items-center justify-between">
                              <div>
                                <span className="block text-[8px] font-mono text-industrial-400 uppercase font-bold">Primary Alternative SKU</span>
                                <span className="text-xs font-mono font-extrabold text-industrial-800 mt-1 block">
                                  {selectedMaterial.alternatives?.primary ? (
                                    <button 
                                      type="button"
                                      onClick={() => onNavigateToTab('materials', selectedMaterial.alternatives?.primary)}
                                      className="text-brand-600 hover:underline text-left cursor-pointer"
                                    >
                                      {selectedMaterial.alternatives.primary}
                                    </button>
                                  ) : (
                                    <span className="text-industrial-400 italic font-normal">None Selected</span>
                                  )}
                                </span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-industrial-300" />
                            </div>

                            {/* Secondary display */}
                            <div className="p-3.5 bg-industrial-50 rounded-xl border border-industrial-200 flex items-center justify-between">
                              <div>
                                <span className="block text-[8px] font-mono text-industrial-400 uppercase font-bold">Secondary Alternative SKU</span>
                                <span className="text-xs font-mono font-extrabold text-industrial-800 mt-1 block">
                                  {selectedMaterial.alternatives?.secondary ? (
                                    <button 
                                      type="button"
                                      onClick={() => onNavigateToTab('materials', selectedMaterial.alternatives?.secondary)}
                                      className="text-brand-600 hover:underline text-left cursor-pointer"
                                    >
                                      {selectedMaterial.alternatives.secondary}
                                    </button>
                                  ) : (
                                    <span className="text-industrial-400 italic font-normal">None Selected</span>
                                  )}
                                </span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-industrial-300" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <h5 className="font-bold text-industrial-700 uppercase font-mono text-[9px] tracking-wider mb-1">Compatibility Reason</h5>
                              <p className="p-3 bg-industrial-50/50 rounded-lg text-industrial-600 border border-industrial-150 min-h-[40px] italic">
                                {selectedMaterial.alternatives?.reason || 'No engineering comparison details registered yet.'}
                              </p>
                            </div>
                            <div>
                              <h5 className="font-bold text-industrial-700 uppercase font-mono text-[9px] tracking-wider mb-1">Compatibility Engineering Notes</h5>
                              <p className="p-3 bg-industrial-50/50 rounded-lg text-industrial-600 border border-industrial-150 min-h-[40px] italic">
                                {selectedMaterial.alternatives?.notes || 'No special comparison precautions registered.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                )}

                {/* TAB: SERIAL NUMBERS */}
                {activeModalTab === 'serials' && (
                  <div className="space-y-6">
                    {/* Add Serial Number Form */}
                    {isAddingSerial ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newSerialNum.trim()) return;
                          
                          const currentSerials = selectedMaterial.serialNumbers || [];
                          if (currentSerials.some(sn => sn.serialNumber.trim().toUpperCase() === newSerialNum.trim().toUpperCase())) {
                            triggerLocalToast('error', 'A serial number with this identifier already exists under this Part Number.');
                            return;
                          }

                          const newSNObj = {
                            serialNumber: newSerialNum.trim(),
                            status: newSerialStatus,
                            equipmentLocation: newSerialEqLocation.trim() || undefined,
                            installationDate: newSerialInstallDate || undefined,
                            photos: [],
                            maintenanceHistory: newSerialMaintNotes.trim() ? [{
                              id: `sn-maint-${Date.now()}`,
                              type: 'system' as const,
                              details: newSerialMaintNotes.trim(),
                              performedBy: currentUser.name,
                              date: new Date().toISOString().split('T')[0]
                            }] : [],
                            calibrationHistory: []
                          };

                          const updatedMaterial = {
                            ...selectedMaterial,
                            serialNumbers: [...currentSerials, newSNObj],
                            history: [
                              ...(selectedMaterial.history || []),
                              {
                                id: `hist-sn-add-${Date.now()}`,
                                action: 'Serial Number Registered',
                                details: `Registered new serial number ${newSerialNum.trim()} with status ${newSerialStatus}.`,
                                userName: currentUser.name,
                                userRole: currentUser.role,
                                timestamp: new Date().toISOString()
                              }
                            ],
                            updatedAt: new Date().toISOString()
                          };

                          const result = dbService.updateMaterial(updatedMaterial, currentUser);
                          if (result.success) {
                            setSelectedMaterial(updatedMaterial);
                            onUpdateMaterial(updatedMaterial);
                            setIsAddingSerial(false);
                            setNewSerialNum('');
                            setNewSerialEqLocation('');
                            setNewSerialInstallDate('');
                            setNewSerialMaintNotes('');
                            triggerLocalToast('success', `Serial number ${newSerialNum.trim()} registered successfully.`);
                          } else {
                            triggerLocalToast('error', result.error || 'Failed to register serial number.');
                          }
                        }}
                        className="bg-brand-50/40 border border-brand-100 p-5 rounded-xl space-y-4 text-left font-sans"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-brand-100">
                          <h4 className="text-xs font-bold text-brand-900 uppercase font-mono">
                            Register New Serial Number Unit / تسجيل رقم تسلسلي جديد
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsAddingSerial(false)}
                            className="text-[10px] font-bold text-industrial-500 hover:text-industrial-800 cursor-pointer"
                          >
                            Back to Registry
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-industrial-700 mb-1">
                              Serial Number ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newSerialNum}
                              onChange={(e) => setNewSerialNum(e.target.value)}
                              placeholder="e.g. SN-A26025691"
                              className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 text-industrial-800"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-industrial-700 mb-1">
                              Initial Status
                            </label>
                            <select
                              value={newSerialStatus}
                              onChange={(e) => setNewSerialStatus(e.target.value as any)}
                              className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                              <option value="Available">Available / جاهز للاستخدام</option>
                              <option value="Installed">Installed / مثبت بالموقع</option>
                              <option value="Reserved">Reserved / محجوز</option>
                              <option value="Damaged">Damaged / تالف أو معيب</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-industrial-700 mb-1">
                              Machinery Tag (If Installed)
                            </label>
                            <input
                              type="text"
                              value={newSerialEqLocation}
                              onChange={(e) => setNewSerialEqLocation(e.target.value)}
                              placeholder="e.g. EQ-PMP-101"
                              className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 text-industrial-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-industrial-700 mb-1">
                              Installation Date
                            </label>
                            <input
                              type="date"
                              value={newSerialInstallDate}
                              onChange={(e) => setNewSerialInstallDate(e.target.value)}
                              className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-semibold text-industrial-700 mb-1">
                              Initial Calibration or Handling Notes
                            </label>
                            <input
                              type="text"
                              value={newSerialMaintNotes}
                              onChange={(e) => setNewSerialMaintNotes(e.target.value)}
                              placeholder="e.g. Factory tested, calibration certificate attached. Accuracy within 0.1% FS."
                              className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-brand-100/50">
                          <button
                            type="button"
                            onClick={() => setIsAddingSerial(false)}
                            className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-xs px-4 py-1.5 rounded-lg cursor-pointer hover:bg-industrial-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            Commit Unit to Ledger
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4 text-left font-sans">
                        <div className="flex justify-between items-center pb-2 border-b border-industrial-100">
                          <div>
                            <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <Activity className="h-4 w-4 text-brand-600" /> Serialized Inventory Ledger
                            </h4>
                            <p className="text-[11px] text-industrial-450 mt-0.5">
                              Manage and track specific individual physical serial numbers belonging to this Part Number SKU.
                            </p>
                          </div>
                          {isWritable && (
                            <button
                              type="button"
                              onClick={() => setIsAddingSerial(true)}
                              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Register Serial Unit</span>
                            </button>
                          )}
                        </div>

                        {/* List of Serials */}
                        {(!selectedMaterial.serialNumbers || selectedMaterial.serialNumbers.length === 0) ? (
                          <div className="text-center py-8 bg-industrial-50/50 rounded-lg border border-dashed border-industrial-200 text-industrial-400">
                            <p className="text-xs font-bold">No Individual Serial Numbers Registered</p>
                            <p className="text-[10px] mt-0.5">This item is currently tracked purely as bulk quantity. Click 'Register Serial Unit' to start serial tracking.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedMaterial.serialNumbers.map((sn, idx) => (
                              <div key={`${sn.serialNumber}-${idx}`} className="border border-industrial-200 rounded-xl overflow-hidden shadow-2xs">
                                {/* Unit Header */}
                                <div className="bg-industrial-50 p-3 px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-industrial-200">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-brand-800 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">
                                      {sn.serialNumber}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      sn.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      sn.status === 'Installed' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                      sn.status === 'Reserved' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                      'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                      {sn.status}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs">
                                    {sn.equipmentLocation && (
                                      <span className="text-industrial-600 font-mono">
                                        Location: <strong className="text-industrial-800">{sn.equipmentLocation}</strong>
                                      </span>
                                    )}
                                    {sn.installationDate && (
                                      <span className="text-industrial-500 font-mono">
                                        Installed: {sn.installationDate}
                                      </span>
                                    )}

                                    {isWritable && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedSNForEvent(sn.serialNumber);
                                          setNewEventType('maintenance');
                                          setNewEventDetails('');
                                          setIsLoggingEvent(true);
                                        }}
                                        className="text-brand-600 hover:underline font-bold text-[10px] cursor-pointer"
                                      >
                                        Log Maintenance / Calibration
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Event logging overlay inside card */}
                                {isLoggingEvent && selectedSNForEvent === sn.serialNumber && (
                                  <div className="p-4 bg-amber-50/50 border-b border-amber-200/80 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h5 className="text-[10px] font-mono font-black text-amber-900 uppercase">
                                        Log Quality/Maintenance Event for SN: {sn.serialNumber}
                                      </h5>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsLoggingEvent(false);
                                          setSelectedSNForEvent(null);
                                        }}
                                        className="text-[10px] text-industrial-500 hover:text-industrial-800 cursor-pointer"
                                      >
                                        Dismiss
                                      </button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                      <div className="sm:w-1/4 text-left">
                                        <label className="block text-[9px] font-bold text-industrial-755 mb-1">EVENT TYPE</label>
                                        <select
                                          value={newEventType}
                                          onChange={(e) => setNewEventType(e.target.value as any)}
                                          className="w-full bg-white border border-industrial-250 text-xs p-1.5 rounded-lg text-industrial-800 focus:outline-none"
                                        >
                                          <option value="maintenance">Maintenance Log</option>
                                          <option value="calibration">Calibration Check</option>
                                          <option value="inspection">Inspection Audit</option>
                                        </select>
                                      </div>
                                      <div className="flex-1 text-left">
                                        <label className="block text-[9px] font-bold text-industrial-755 mb-1">EVENT DETAILS & CERTIFICATE RECORD</label>
                                        <input
                                          type="text"
                                          value={newEventDetails}
                                          onChange={(e) => setNewEventDetails(e.target.value)}
                                          placeholder="e.g. Verified zero offset. Recalibrated to 4.00mA on transmitter calibration rig. Error <0.1% FS."
                                          className="w-full bg-white border border-industrial-250 text-xs p-1.5 rounded-lg text-industrial-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!newEventDetails.trim()) return;
                                            
                                            const updatedSerials = (selectedMaterial.serialNumbers || []).map(curSN => {
                                              if (curSN.serialNumber === sn.serialNumber) {
                                                const eventList = curSN.maintenanceHistory || [];
                                                return {
                                                  ...curSN,
                                                  maintenanceHistory: [
                                                    ...eventList,
                                                    {
                                                      id: `sn-event-${Date.now()}`,
                                                      type: newEventType,
                                                      details: newEventDetails.trim(),
                                                      performedBy: currentUser.name,
                                                      date: new Date().toISOString().split('T')[0]
                                                    }
                                                  ]
                                                };
                                              }
                                              return curSN;
                                            });

                                            const updatedMaterial = {
                                              ...selectedMaterial,
                                              serialNumbers: updatedSerials,
                                              history: [
                                                ...(selectedMaterial.history || []),
                                                {
                                                  id: `hist-sn-evt-${Date.now()}`,
                                                  action: `${newEventType.toUpperCase()} Logged`,
                                                  details: `Logged ${newEventType} event on Serial Number ${sn.serialNumber}: ${newEventDetails.trim()}`,
                                                  userName: currentUser.name,
                                                  userRole: currentUser.role,
                                                  timestamp: new Date().toISOString()
                                                }
                                              ],
                                              updatedAt: new Date().toISOString()
                                            };

                                            const result = dbService.updateMaterial(updatedMaterial, currentUser);
                                            if (result.success) {
                                              setSelectedMaterial(updatedMaterial);
                                              onUpdateMaterial(updatedMaterial);
                                              setIsLoggingEvent(false);
                                              setSelectedSNForEvent(null);
                                              triggerLocalToast('success', 'Logged serial unit maintenance event successfully.');
                                            } else {
                                              triggerLocalToast('error', result.error || 'Failed to record event.');
                                            }
                                          }}
                                          className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] py-1.5 px-4 rounded-lg cursor-pointer h-8 transition-colors"
                                        >
                                          Save Event
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Events History List */}
                                <div className="p-4 bg-white space-y-2 text-xs">
                                  <span className="text-[10px] font-mono text-industrial-400 font-bold uppercase block tracking-wider text-left">
                                    Maintenance & Quality Verification Log
                                  </span>
                                  {(!sn.maintenanceHistory || sn.maintenanceHistory.length === 0) ? (
                                    <p className="text-industrial-400 italic text-[11px] font-sans text-left">No maintenance checks or calibration cycles logged yet.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-[11px]">
                                      {sn.maintenanceHistory.map((evt, idx) => (
                                        <div key={`${evt.id}-${idx}`} className="p-2 rounded-lg bg-industrial-50/75 border border-industrial-150 flex justify-between gap-4 text-left">
                                          <div className="space-y-0.5">
                                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                              evt.type === 'calibration' ? 'bg-amber-100 text-amber-800' :
                                              evt.type === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                                              'bg-industrial-200 text-industrial-700'
                                            }`}>
                                              {evt.type}
                                            </span>
                                            <p className="text-industrial-800 font-sans leading-normal">{evt.details}</p>
                                          </div>
                                          <div className="text-right text-[10px] text-industrial-400 shrink-0">
                                            <span className="block font-bold">{evt.performedBy}</span>
                                            <span className="block">{evt.date}</span>
                                          </div>
                                        </div>
                                      ))}
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
                )}

                {/* TAB 3: DOCUMENTS & PHOTO LIBRARY */}
                {activeModalTab === 'documents' && (
                  <div className="space-y-6">
                    
                    {/* Part A: Technical Document slots */}
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-industrial-100">
                        <div>
                          <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-brand-600" /> Engineering Documents Locker
                          </h4>
                          <p className="text-[11px] text-industrial-450 mt-0.5">
                            Register and permanently link crucial specifications sheets, installation manuals and inspection reports.
                          </p>
                        </div>
                        {isWritable && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadDocName('');
                              setUploadDocType('datasheet');
                              setIsUploadingDoc(true);
                              setDriveMode(isDriveAuthenticated ? 'upload' : 'simulate');
                            }}
                            className="bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" /> Link File
                          </button>
                        )}
                      </div>

                      {/* Upload / Link popup */}
                      {isUploadingDoc && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          onSubmit={handleSimulateUploadDoc}
                          className="bg-brand-50/30 border border-brand-100 p-4 rounded-xl space-y-3 text-left"
                        >
                          {/* Google Drive Auth Indicator and Tabs */}
                          {isDriveAuthenticated && (
                            <div className="flex border-b border-brand-100 pb-1 gap-2">
                              <button
                                type="button"
                                onClick={() => setDriveMode('upload')}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                                  driveMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-industrial-500 hover:bg-industrial-100'
                                }`}
                              >
                                Upload to Google Drive
                              </button>
                              <button
                                type="button"
                                onClick={() => setDriveMode('link')}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                                  driveMode === 'link' ? 'bg-indigo-600 text-white' : 'text-industrial-500 hover:bg-industrial-100'
                                }`}
                              >
                                Choose from Google Drive Vault
                              </button>
                              <button
                                type="button"
                                onClick={() => setDriveMode('simulate')}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                                  driveMode === 'simulate' ? 'bg-brand-600 text-white' : 'text-industrial-500 hover:bg-industrial-100'
                                }`}
                              >
                                Simulate File
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Type Selector */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Document Type</label>
                              <select
                                value={uploadDocType}
                                onChange={(e) => setUploadDocType(e.target.value)}
                                className="w-full bg-white border border-brand-200 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                              >
                                <option value="datasheet">Manufacturer Datasheet</option>
                                <option value="coc">Certificate Of Conformity (COC)</option>
                                <option value="materialRequest">Material Request</option>
                                <option value="evaluationRequest">Evaluation Request</option>
                                <option value="inspectionReport">Inspection Report</option>
                                <option value="technicalDrawing">Technical Drawing</option>
                                <option value="operationManual">Operation Manual</option>
                                <option value="maintenanceManual">Maintenance Manual</option>
                              </select>
                            </div>

                            {/* Dynamically rendered input based on Drive Mode */}
                            {driveMode === 'upload' ? (
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Upload Local File to Drive</label>
                                <input
                                  type="file"
                                  required
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setRealFileToUpload(e.target.files[0]);
                                      setUploadDocName(e.target.files[0].name);
                                    }
                                  }}
                                  className="w-full bg-white border border-brand-200 text-xs px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                                />
                              </div>
                            ) : driveMode === 'link' ? (
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Select File from Drive Vault</label>
                                {isDriveLoading ? (
                                  <div className="text-xs font-mono text-industrial-450 pt-2 flex items-center gap-1.5">
                                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" /> Fetching Vault...
                                  </div>
                                ) : driveFiles.length === 0 ? (
                                  <div className="text-xs text-rose-600 pt-2">No files found in Vault folder.</div>
                                ) : (
                                  <select
                                    required
                                    value={selectedDriveFileId}
                                    onChange={(e) => setSelectedDriveFileId(e.target.value)}
                                    className="w-full bg-white border border-brand-200 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                                  >
                                    <option value="">-- Select Drive File --</option>
                                    {driveFiles.map((file, idx) => (
                                      <option key={`${file.id}-${idx}`} value={file.id}>
                                        {file.name} ({file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB` : 'N/A'})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Simulated File Name</label>
                                <input
                                  type="text"
                                  required
                                  value={uploadDocName}
                                  onChange={(e) => setUploadDocName(e.target.value)}
                                  placeholder="e.g. datasheet_STM32_v1.2.pdf"
                                  className="w-full bg-white border border-brand-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsUploadingDoc(false);
                                setRealFileToUpload(null);
                                setSelectedDriveFileId('');
                              }}
                              className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isDriveLoading || (driveMode === 'upload' && !realFileToUpload) || (driveMode === 'link' && !selectedDriveFileId)}
                              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] px-4 py-1.5 rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              {isDriveLoading ? (
                                <span className="flex items-center gap-1.5">
                                  <RefreshCw className="h-3 w-3 animate-spin" /> Uploading/Linking...
                                </span>
                              ) : driveMode === 'upload' ? (
                                'Upload & Link via Drive'
                              ) : driveMode === 'link' ? (
                                'Link Selected Drive File'
                              ) : (
                                'Simulate Upload & Link'
                              )}
                            </button>
                          </div>
                        </motion.form>
                      )}

                      {/* Document Categories Matrix Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
                        {[
                          { key: 'datasheet', name: 'Manufacturer Datasheet' },
                          { key: 'coc', name: 'Certificate Of Conformity (COC)' },
                          { key: 'originalExcel', name: 'Source Import Spreadsheet' },
                          { key: 'materialRequest', name: 'Material Request' },
                          { key: 'evaluationRequest', name: 'Evaluation Request' },
                          { key: 'inspectionReport', name: 'Inspection Report' },
                          { key: 'technicalDrawing', name: 'Technical Drawing' },
                          { key: 'operationManual', name: 'Operation Manual' },
                          { key: 'maintenanceManual', name: 'Maintenance Manual' }
                        ].map((docSlot) => {
                          const linkedFile = (selectedMaterial.documents || {})[docSlot.key as keyof NonNullable<Material['documents']>];
                          return (
                            <div 
                              key={docSlot.key}
                              className={`p-3 rounded-xl border flex flex-col justify-between text-xs min-h-[120px] transition-all ${
                                linkedFile 
                                  ? 'bg-white border-emerald-200 shadow-3xs' 
                                  : 'bg-industrial-50/50 border-industrial-200 border-dashed'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <FileText className={`h-4.5 w-4.5 ${linkedFile ? 'text-emerald-600' : 'text-industrial-350'}`} />
                                  {linkedFile ? (
                                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-mono font-bold uppercase px-1 rounded">
                                      LINKED
                                    </span>
                                  ) : (
                                    <span className="bg-industrial-100 text-industrial-400 text-[8px] font-mono font-bold uppercase px-1 rounded">
                                      VACANT
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-industrial-800 text-[11px] mt-2 line-clamp-1 leading-tight" title={docSlot.name}>
                                  {docSlot.name}
                                </p>
                              </div>

                              <div className="mt-2.5 pt-1.5 border-t border-industrial-100 text-[9px] font-mono text-industrial-450">
                                {linkedFile ? (
                                  <div className="space-y-1">
                                    <span className="block text-industrial-700 font-semibold truncate" title={linkedFile.name}>
                                      {linkedFile.name}
                                    </span>
                                    <span className="block">
                                      Size: {linkedFile.fileSize || 'N/A'} · {new Date(linkedFile.uploadedAt).toLocaleDateString()}
                                    </span>
                                    {linkedFile.googleDriveWebViewLink ? (
                                      <a
                                        href={linkedFile.googleDriveWebViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold mt-1 text-[8.5px] uppercase font-sans cursor-pointer hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" /> View in Drive
                                      </a>
                                    ) : (
                                      <span className="text-industrial-400 italic text-[8.5px] block mt-1">Simulated Attachment</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="italic block text-industrial-400">File not linked</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>

                    {/* Part B: Category Photo Library */}
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-industrial-100">
                        <div>
                          <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <ImageIcon className="h-4 w-4 text-brand-600" /> Physical Photo Library
                          </h4>
                          <p className="text-[11px] text-industrial-450 mt-0.5">
                            Upload and organize field installation, barcode scans, warehouse shelf bins and nameplate markings.
                          </p>
                        </div>
                        {isWritable && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddPhotoUrl('');
                              setAddPhotoCategory('nameplate');
                              setIsAddingPhoto(true);
                            }}
                            className="bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Photo
                          </button>
                        )}
                      </div>

                      {/* Add Photo Form */}
                      {isAddingPhoto && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          onSubmit={handleSimulateAddPhoto}
                          className="bg-brand-50/30 border border-brand-100 p-4 rounded-xl space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            {/* Category Selector */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Category</label>
                              <select
                                value={addPhotoCategory}
                                onChange={(e) => setAddPhotoCategory(e.target.value as any)}
                                className="w-full bg-white border border-brand-200 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
                              >
                                <option value="nameplate">Nameplate / Tagging Photos</option>
                                <option value="installation">Installation / Field Photos</option>
                                <option value="warehouse">Warehouse Storage Photos</option>
                              </select>
                            </div>

                            {/* Photo Url */}
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono text-brand-700 uppercase font-bold">Photo URL</label>
                              <input
                                type="url"
                                value={addPhotoUrl}
                                onChange={(e) => setAddPhotoUrl(e.target.value)}
                                placeholder="Paste an unsplash url or leave empty for a mockup..."
                                className="w-full bg-white border border-brand-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsAddingPhoto(false)}
                              className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] px-4 py-1.5 rounded-lg cursor-pointer"
                            >
                              Add Photo
                            </button>
                          </div>
                        </motion.form>
                      )}

                      {/* Display categorized photo lists */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Nameplates */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-mono text-industrial-500 uppercase font-bold pb-1 border-b border-industrial-100 flex items-center gap-1.5">
                            Nameplate Photos ({(selectedMaterial.photos?.nameplate || []).length})
                          </h5>
                          {(!selectedMaterial.photos?.nameplate || selectedMaterial.photos.nameplate.length === 0) ? (
                            <p className="text-[10px] text-industrial-400 italic">No nameplate photos uploaded.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {selectedMaterial.photos.nameplate.map((ph, idx) => (
                                <div key={idx} className="aspect-square bg-industrial-900 border border-industrial-200 rounded-lg overflow-hidden group relative">
                                  <img src={ph} alt="nameplate" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  <a href={ph} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] uppercase tracking-wider font-bold transition-opacity">
                                    Expand
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Installation */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-mono text-industrial-550 uppercase font-bold pb-1 border-b border-industrial-100 flex items-center gap-1.5">
                            Installation Field Photos ({(selectedMaterial.photos?.installation || []).length})
                          </h5>
                          {(!selectedMaterial.photos?.installation || selectedMaterial.photos.installation.length === 0) ? (
                            <p className="text-[10px] text-industrial-400 italic">No field installation photos.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {selectedMaterial.photos.installation.map((ph, idx) => (
                                <div key={idx} className="aspect-square bg-industrial-900 border border-industrial-200 rounded-lg overflow-hidden group relative">
                                  <img src={ph} alt="installation" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  <a href={ph} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] uppercase tracking-wider font-bold transition-opacity">
                                    Expand
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Warehouse storage */}
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-mono text-industrial-550 uppercase font-bold pb-1 border-b border-industrial-100 flex items-center gap-1.5">
                            Warehouse Shelf Photos ({(selectedMaterial.photos?.warehouse || []).length})
                          </h5>
                          {(!selectedMaterial.photos?.warehouse || selectedMaterial.photos.warehouse.length === 0) ? (
                            <p className="text-[10px] text-industrial-400 italic">No warehouse shelf photos.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                              {selectedMaterial.photos.warehouse.map((ph, idx) => (
                                <div key={idx} className="aspect-square bg-industrial-900 border border-industrial-200 rounded-lg overflow-hidden group relative">
                                  <img src={ph} alt="warehouse" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  <a href={ph} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] uppercase tracking-wider font-bold transition-opacity">
                                    Expand
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )}

                {/* TAB 4: AUDIT TIMELINE */}
                {activeModalTab === 'timeline' && (
                  <div className="bg-white p-6 rounded-xl border border-industrial-200 space-y-4">
                    <div className="pb-3 border-b border-industrial-100">
                      <h4 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <History className="h-4 w-4 text-brand-600" /> Complete Chronological Audit Trail
                      </h4>
                      <p className="text-[11px] text-industrial-450 mt-0.5">
                        Verifiable timeline tracking item updates, quantity changes, links, and documents uploads. All timestamps are UTC-linked.
                      </p>
                    </div>

                    {(!selectedMaterial.history || selectedMaterial.history.length === 0) ? (
                      <p className="text-xs text-industrial-400 italic py-6 text-center">No audit trail records registered.</p>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-industrial-100">
                        {selectedMaterial.history.slice().reverse().map((evt, idx) => {
                          // select icon based on action
                          let icon = <CheckCircle className="h-3 w-3 text-white" />;
                          let bg = 'bg-brand-600';
                          if (evt.action.includes('Created')) {
                            icon = <Check className="h-3 w-3 text-white" />;
                            bg = 'bg-emerald-600';
                          } else if (evt.action.includes('Quantity')) {
                            icon = <Activity className="h-3 w-3 text-white" />;
                            bg = 'bg-amber-500';
                          } else if (evt.action.includes('Notes')) {
                            icon = <FileText className="h-3 w-3 text-white" />;
                            bg = 'bg-indigo-600';
                          } else if (evt.action.includes('Document')) {
                            icon = <Upload className="h-3 w-3 text-white" />;
                            bg = 'bg-purple-600';
                          } else if (evt.action.includes('Equipment')) {
                            icon = <Wrench className="h-3 w-3 text-white" />;
                            bg = 'bg-teal-600';
                          }

                          return (
                            <div key={`${evt.id}-${idx}`} className="relative text-xs">
                              {/* Timeline indicator node */}
                              <div className={`absolute -left-[21.5px] top-1 h-5.5 w-5.5 rounded-full border border-white flex items-center justify-center shadow-2xs ${bg}`}>
                                {icon}
                              </div>

                              <div className="space-y-1.5 bg-industrial-50 p-3 rounded-lg border border-industrial-150">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                  <span className="font-extrabold text-industrial-850 font-mono">
                                    {evt.action}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-industrial-400">
                                    <span>{new Date(evt.timestamp).toLocaleDateString()}</span>
                                    <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                                <p className="text-industrial-600 font-medium leading-relaxed">
                                  {evt.details}
                                </p>
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-[10px] font-mono text-industrial-500 font-semibold flex items-center gap-0.5">
                                    <UserIcon className="h-3 w-3 text-industrial-400" /> Operator: {evt.userName}
                                  </span>
                                  <span className="text-[8px] bg-industrial-200 text-industrial-700 font-mono font-bold px-1.5 py-0.5 rounded-sm uppercase scale-90">
                                    {evt.userRole}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: AI ENGINEERING CHAT ASSISTANT */}
                {activeModalTab === 'ask-ai' && selectedMaterial && (
                  <MaterialContextualChat
                    key={selectedMaterial.id || (selectedMaterial.sequence !== undefined ? `seq-${selectedMaterial.sequence}` : '') || selectedMaterial.partNumber || 'ai-chat'}
                    material={selectedMaterial}
                    currentUser={currentUser}
                    triggerToast={triggerLocalToast}
                  />
                )}

                {/* TAB: COMPARE DATASHEETS */}
                {activeModalTab === 'compare-datasheets' && selectedMaterial && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center border-b border-industrial-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <FileText className="h-4.5 w-4.5 text-brand-600" /> Multi-Parameter Datasheet Analyzer
                          </h4>
                          <p className="text-[11px] text-industrial-500 mt-0.5">
                            Compare mechanical, electrical, and physical specifications of two components using Gemini AI.
                          </p>
                        </div>
                        {datasheetCompareResult && (
                          <button
                            onClick={() => {
                              setDatasheetCompareResult(null);
                              setDatasheetFile1(null);
                              setDatasheetFile2(null);
                            }}
                            className="text-xs font-bold text-brand-600 hover:text-brand-500 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" /> Reset Comparison
                          </button>
                        )}
                      </div>

                      {!datasheetCompareResult ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* File 1 */}
                            <div className="border-2 border-dashed border-industrial-200 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-industrial-50 hover:bg-industrial-100/50 transition-all relative">
                              <Upload className="h-8 w-8 text-industrial-400" />
                              <div>
                                <p className="text-xs font-bold text-industrial-700">Primary Datasheet / Document 1</p>
                                <p className="text-[10px] text-industrial-400 mt-1">Upload PDF or Image (up to 15MB)</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setDatasheetFile1({ name: file.name, base64: reader.result as string, type: file.type });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                accept=".pdf,image/*"
                              />
                              {datasheetFile1 && (
                                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold max-w-full">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{datasheetFile1.name}</span>
                                </div>
                              )}
                            </div>

                            {/* File 2 */}
                            <div className="border-2 border-dashed border-industrial-200 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-industrial-50 hover:bg-industrial-100/50 transition-all relative">
                              <Upload className="h-8 w-8 text-industrial-400" />
                              <div>
                                <p className="text-xs font-bold text-industrial-700">Alternative Datasheet / Document 2</p>
                                <p className="text-[10px] text-industrial-400 mt-1">Upload PDF or Image (up to 15MB)</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setDatasheetFile2({ name: file.name, base64: reader.result as string, type: file.type });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                accept=".pdf,image/*"
                              />
                              {datasheetFile2 && (
                                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold max-w-full">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{datasheetFile2.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={async () => {
                                if (!datasheetFile1 || !datasheetFile2) {
                                  triggerLocalToast('error', 'Please upload both datasheets for comparison.');
                                  return;
                                }
                                setDatasheetCompareLoading(true);
                                try {
                                  const res = await fetch(`${getBaseApiUrl()}/api/gemini/compare-datasheets`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      file1Name: datasheetFile1.name,
                                      file1Base64: datasheetFile1.base64,
                                      file1Type: datasheetFile1.type,
                                      file2Name: datasheetFile2.name,
                                      file2Base64: datasheetFile2.base64,
                                      file2Type: datasheetFile2.type
                                    })
                                  });
                                  if (!res.ok) throw new Error(await res.text());
                                  const data = await res.json();
                                  setDatasheetCompareResult(data);
                                  
                                  // Save report inside history
                                  const newEvent: MaterialHistoryEvent = {
                                    id: `evt-${Date.now()}`,
                                    action: 'AI Datasheet Comparison',
                                    details: `Compared "${datasheetFile1.name}" & "${datasheetFile2.name}". Compatibility Score: ${data.compatibilityPercentage}%. Verdict: ${data.summary}`,
                                    userName: currentUser.name,
                                    userRole: currentUser.role,
                                    timestamp: new Date().toISOString()
                                  };
                                  onUpdateMaterial({
                                    ...selectedMaterial,
                                    history: [newEvent, ...(selectedMaterial.history || [])]
                                  });
                                  triggerLocalToast('success', 'Comparison successful! Report saved in material history.');
                                } catch (err: any) {
                                  console.error(err);
                                  triggerLocalToast('error', 'Failed to run datasheet comparison.');
                                } finally {
                                  setDatasheetCompareLoading(false);
                                }
                              }}
                              disabled={datasheetCompareLoading || !datasheetFile1 || !datasheetFile2}
                              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                            >
                              {datasheetCompareLoading ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  <span>Analyzing Specifications...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3.5 w-3.5" />
                                  <span>Execute AI Multi-Parameter Comparison</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5" id="datasheet-report-view">
                          {/* Header Metric */}
                          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-950 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center md:text-left">
                              <span className="text-[10px] font-mono uppercase bg-slate-800 text-brand-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                                Comparison Result
                              </span>
                              <h5 className="font-bold text-sm tracking-tight text-white mt-1.5">
                                Technical compatibility between {datasheetFile1?.name} & {datasheetFile2?.name}
                              </h5>
                              <p className="text-xs text-slate-400 font-medium max-w-xl">
                                {datasheetCompareResult.summary}
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1.5 shrink-0 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Compatibility Rating</span>
                              <div className="flex items-baseline gap-0.5">
                                <span className={`text-4xl font-extrabold font-mono ${
                                  datasheetCompareResult.compatibilityPercentage >= 90 ? 'text-emerald-400' :
                                  datasheetCompareResult.compatibilityPercentage >= 70 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                  {datasheetCompareResult.compatibilityPercentage}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Diffs Parameters List */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                            {[
                              { label: 'Electrical Specifications', desc: datasheetCompareResult.electricalDiffs },
                              { label: 'Mechanical Dimensions', desc: datasheetCompareResult.mechanicalDiffs },
                              { label: 'Environmental Ratings', desc: datasheetCompareResult.environmentalDiffs },
                              { label: 'Certifications & Norms', desc: datasheetCompareResult.certificationsDiffs },
                              { label: 'Pin Configurations / Terminals', desc: datasheetCompareResult.pinoutDiffs },
                              { label: 'Input/Output Signals', desc: datasheetCompareResult.ioDiffs },
                              { label: 'Power Requirements', desc: datasheetCompareResult.powerDiffs }
                            ].map((p, idx) => (
                              <div key={idx} className="border border-industrial-150 p-4 rounded-xl bg-white space-y-1.5 shadow-2xs">
                                <h6 className="font-bold text-industrial-800 font-mono tracking-wide uppercase text-[10px] text-brand-600 flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                  {p.label}
                                </h6>
                                <p className="text-industrial-600 leading-relaxed whitespace-pre-wrap pl-3 border-l border-industrial-100">
                                  {p.desc}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Overall Verdict */}
                          <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl space-y-1.5">
                            <h6 className="text-[10px] font-black font-mono tracking-widest text-brand-700 uppercase flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4" /> Final Engineering Verdict
                            </h6>
                            <p className="text-xs text-brand-800 leading-relaxed font-medium">
                              {datasheetCompareResult.overallVerdict}
                            </p>
                          </div>

                          {/* Export Report Action */}
                          <div className="flex justify-end pt-2 border-t border-industrial-100 gap-3">
                            <button
                              onClick={() => {
                                const reportHtml = `
                                  <div class="space-y-6">
                                    <div class="bg-gray-100 p-6 rounded-lg mb-6">
                                      <h2 class="text-lg font-bold text-gray-800">1. Summary of Comparison</h2>
                                      <p class="text-sm text-gray-600 mt-2">${datasheetCompareResult.summary}</p>
                                      <div class="mt-4 bg-white p-4 rounded border text-center">
                                        <span class="text-xs font-mono uppercase text-gray-400">Compatibility Score</span>
                                        <div class="text-3xl font-extrabold text-blue-600 font-mono mt-1">${datasheetCompareResult.compatibilityPercentage}%</div>
                                      </div>
                                    </div>
                                    
                                    <div class="space-y-4">
                                      <h2 class="text-lg font-bold text-gray-800 border-b pb-2">2. Parameter Breakdown</h2>
                                      <div class="grid grid-cols-1 gap-4">
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Electrical Specs</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.electricalDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Mechanical Dimensions</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.mechanicalDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Environmental Ratings</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.environmentalDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Certifications</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.certificationsDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Pin Configuration</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.pinoutDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Input/Output Signals</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.ioDiffs}</p>
                                        </div>
                                        <div class="p-4 border rounded">
                                          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">Power Requirements</h3>
                                          <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">${datasheetCompareResult.powerDiffs}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div class="bg-blue-50 p-6 rounded-lg mt-6 border border-blue-100">
                                      <h2 class="text-lg font-bold text-blue-900">3. Engineering Verdict</h2>
                                      <p class="text-sm text-blue-850 mt-2 whitespace-pre-wrap">${datasheetCompareResult.overallVerdict}</p>
                                    </div>
                                  </div>
                                `;
                                handlePrintReport('Datasheet_Compatibility_Report', reportHtml);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Download className="h-4 w-4" /> Download PDF Report
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: COMPARE COC */}
                {activeModalTab === 'compare-coc' && selectedMaterial && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center border-b border-industrial-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <CheckCircle className="h-4.5 w-4.5 text-brand-600" /> Certificate of Conformity (COC) Matcher
                          </h4>
                          <p className="text-[11px] text-industrial-500 mt-0.5">
                            Verify and compare key data across Certificates of Conformity to prevent discrepancies.
                          </p>
                        </div>
                        {cocCompareResult && (
                          <button
                            onClick={() => {
                              setCocCompareResult(null);
                              setCocFile1(null);
                              setCocFile2(null);
                            }}
                            className="text-xs font-bold text-brand-600 hover:text-brand-500 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" /> Reset Matcher
                          </button>
                        )}
                      </div>

                      {!cocCompareResult ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* File 1 */}
                            <div className="border-2 border-dashed border-industrial-200 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-industrial-50 hover:bg-industrial-100/50 transition-all relative">
                              <Upload className="h-8 w-8 text-industrial-400" />
                              <div>
                                <p className="text-xs font-bold text-industrial-700">First Certificate of Conformity</p>
                                <p className="text-[10px] text-industrial-400 mt-1">Upload PDF or Image (up to 15MB)</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setCocFile1({ name: file.name, base64: reader.result as string, type: file.type });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                accept=".pdf,image/*"
                              />
                              {cocFile1 && (
                                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold max-w-full">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{cocFile1.name}</span>
                                </div>
                              )}
                            </div>

                            {/* File 2 */}
                            <div className="border-2 border-dashed border-industrial-200 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-industrial-50 hover:bg-industrial-100/50 transition-all relative">
                              <Upload className="h-8 w-8 text-industrial-400" />
                              <div>
                                <p className="text-xs font-bold text-industrial-700">Comparison / Reference Certificate</p>
                                <p className="text-[10px] text-industrial-400 mt-1">Upload PDF or Image (up to 15MB)</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setCocFile2({ name: file.name, base64: reader.result as string, type: file.type });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                accept=".pdf,image/*"
                              />
                              {cocFile2 && (
                                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold max-w-full">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{cocFile2.name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={async () => {
                                if (!cocFile1 || !cocFile2) {
                                  triggerLocalToast('error', 'Please upload both Certificates of Conformity.');
                                  return;
                                }
                                setCocCompareLoading(true);
                                try {
                                  const res = await fetch(`${getBaseApiUrl()}/api/gemini/compare-coc`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      file1Name: cocFile1.name,
                                      file1Base64: cocFile1.base64,
                                      file1Type: cocFile1.type,
                                      file2Name: cocFile2.name,
                                      file2Base64: cocFile2.base64,
                                      file2Type: cocFile2.type
                                    })
                                  });
                                  if (!res.ok) throw new Error(await res.text());
                                  const data = await res.json();
                                  setCocCompareResult(data);

                                  // Append to material history
                                  const newEvent: MaterialHistoryEvent = {
                                    id: `evt-${Date.now()}`,
                                    action: 'AI COC Verification',
                                    details: `Compared COCs "${cocFile1.name}" & "${cocFile2.name}". Verdict: ${data.complianceVerdict}. Status: ${data.isCompliant ? 'Compliant' : 'Discrepancy detected'}.`,
                                    userName: currentUser.name,
                                    userRole: currentUser.role,
                                    timestamp: new Date().toISOString()
                                  };
                                  onUpdateMaterial({
                                    ...selectedMaterial,
                                    history: [newEvent, ...(selectedMaterial.history || [])]
                                  });
                                  triggerLocalToast('success', 'Certificates compared successfully! Report saved in history.');
                                } catch (err: any) {
                                  console.error(err);
                                  triggerLocalToast('error', 'Failed to run Certificate comparison.');
                                } finally {
                                  setCocCompareLoading(false);
                                }
                              }}
                              disabled={cocCompareLoading || !cocFile1 || !cocFile2}
                              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                            >
                              {cocCompareLoading ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  <span>Verifying Certification Alignments...</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span>Execute Compliance & Verification Check</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Status Badge header */}
                          <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                            cocCompareResult.isCompliant 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                              : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}>
                            <div className="space-y-1 text-center md:text-left">
                              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                                cocCompareResult.isCompliant 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                Compliance Status
                              </span>
                              <h5 className="font-bold text-sm tracking-tight mt-1.5">
                                {cocCompareResult.isCompliant ? 'Verification Passed - Fully Compliant' : 'Discrepancies / Warnings Detected'}
                              </h5>
                              <p className="text-xs opacity-80 leading-relaxed font-medium max-w-xl">
                                {cocCompareResult.complianceVerdict}
                              </p>
                            </div>
                            
                            <div className="shrink-0 flex items-center gap-1.5">
                              {cocCompareResult.isCompliant ? (
                                <ShieldCheck className="h-12 w-12 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="h-12 w-12 text-amber-600 animate-pulse" />
                              )}
                            </div>
                          </div>

                          {/* Parameters matching side-by-side table */}
                          <div className="border border-industrial-150 rounded-xl overflow-hidden bg-white text-xs font-sans shadow-2xs">
                            <div className="bg-industrial-50 border-b border-industrial-150 p-3 grid grid-cols-12 gap-3 font-mono font-black text-[10px] text-industrial-500 uppercase tracking-wider">
                              <span className="col-span-3">SPECIFIED Parameter</span>
                              <span className="col-span-4">Certificate 1 Data</span>
                              <span className="col-span-4">Certificate 2 Data</span>
                              <span className="col-span-1 text-center">Status</span>
                            </div>
                            
                            <div className="divide-y divide-industrial-100">
                              {[
                                { name: 'Manufacturer', v1: cocCompareResult.manufacturer1, v2: cocCompareResult.manufacturer2, match: cocCompareResult.manufacturerMatch },
                                { name: 'Part / Model Number', v1: cocCompareResult.partNumber1, v2: cocCompareResult.partNumber2, match: cocCompareResult.partNumberMatch },
                                { name: 'Serial / Batch Number', v1: cocCompareResult.serialNumber1, v2: cocCompareResult.serialNumber2, match: cocCompareResult.serialNumberMatch },
                                { name: 'Standards / Certs', v1: cocCompareResult.standards1, v2: cocCompareResult.standards2, match: cocCompareResult.standardsMatch },
                                { name: 'Dates & Expirations', v1: cocCompareResult.dates1, v2: cocCompareResult.dates2, match: cocCompareResult.datesMatch }
                              ].map((p, idx) => (
                                <div key={idx} className="p-3 grid grid-cols-12 gap-3 items-center hover:bg-industrial-50/40">
                                  <span className="col-span-3 font-semibold text-industrial-700">{p.name}</span>
                                  <span className="col-span-4 text-industrial-600 font-mono text-[11px] truncate" title={p.v1}>{p.v1 || 'N/A'}</span>
                                  <span className="col-span-4 text-industrial-600 font-mono text-[11px] truncate" title={p.v2}>{p.v2 || 'N/A'}</span>
                                  <span className="col-span-1 flex justify-center">
                                    {p.match ? (
                                      <Check className="h-4 w-4 text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-full p-0.5" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600 font-bold bg-red-50 border border-red-100 rounded-full p-0.5" />
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Detections Warnings Callouts */}
                          {(cocCompareResult.missingInformation || cocCompareResult.mismatches) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="border border-industrial-150 p-4 rounded-xl bg-white space-y-1">
                                <h6 className="font-bold text-[10px] text-industrial-500 font-mono tracking-wide uppercase flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  Missing Critical Info
                                </h6>
                                <p className="text-xs text-industrial-600 leading-relaxed whitespace-pre-wrap pl-3">
                                  {cocCompareResult.missingInformation || 'None detected'}
                                </p>
                              </div>

                              <div className="border border-industrial-150 p-4 rounded-xl bg-white space-y-1">
                                <h6 className="font-bold text-[10px] text-industrial-500 font-mono tracking-wide uppercase flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                  Mismatched Details
                                </h6>
                                <p className="text-xs text-industrial-600 leading-relaxed whitespace-pre-wrap pl-3">
                                  {cocCompareResult.mismatches || 'None detected'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Download PDF Action */}
                          <div className="flex justify-end pt-2 border-t border-industrial-100">
                            <button
                              onClick={() => {
                                const reportHtml = `
                                  <div class="space-y-6">
                                    <div class="p-6 rounded-lg mb-6 ${cocCompareResult.isCompliant ? 'bg-green-50 border border-green-200 text-green-900' : 'bg-yellow-50 border border-yellow-200 text-yellow-900'}">
                                      <h2 class="text-lg font-bold">Compliance Status: ${cocCompareResult.isCompliant ? 'PASSED' : 'DISCREPANCY FOUND'}</h2>
                                      <p class="text-sm mt-2 font-medium">${cocCompareResult.complianceVerdict}</p>
                                    </div>
                                    
                                    <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Extracted Parameters Comparison</h2>
                                    <table class="w-full text-left text-sm border-collapse border mt-3">
                                      <thead>
                                        <tr class="bg-gray-100">
                                          <th class="border p-2">Parameter</th>
                                          <th class="border p-2">Certificate 1</th>
                                          <th class="border p-2">Certificate 2</th>
                                          <th class="border p-2 text-center">Match</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td class="border p-2 font-bold">Manufacturer</td>
                                          <td class="border p-2">${cocCompareResult.manufacturer1 || 'N/A'}</td>
                                          <td class="border p-2">${cocCompareResult.manufacturer2 || 'N/A'}</td>
                                          <td class="border p-2 text-center">${cocCompareResult.manufacturerMatch ? 'YES' : 'NO'}</td>
                                        </tr>
                                        <tr>
                                          <td class="border p-2 font-bold">Part/Model Number</td>
                                          <td class="border p-2">${cocCompareResult.partNumber1 || 'N/A'}</td>
                                          <td class="border p-2">${cocCompareResult.partNumber2 || 'N/A'}</td>
                                          <td class="border p-2 text-center">${cocCompareResult.partNumberMatch ? 'YES' : 'NO'}</td>
                                        </tr>
                                        <tr>
                                          <td class="border p-2 font-bold">Serial/Batch</td>
                                          <td class="border p-2">${cocCompareResult.serialNumber1 || 'N/A'}</td>
                                          <td class="border p-2">${cocCompareResult.serialNumber2 || 'N/A'}</td>
                                          <td class="border p-2 text-center">${cocCompareResult.serialNumberMatch ? 'YES' : 'NO'}</td>
                                        </tr>
                                        <tr>
                                          <td class="border p-2 font-bold">Standards</td>
                                          <td class="border p-2">${cocCompareResult.standards1 || 'N/A'}</td>
                                          <td class="border p-2">${cocCompareResult.standards2 || 'N/A'}</td>
                                          <td class="border p-2 text-center">${cocCompareResult.standardsMatch ? 'YES' : 'NO'}</td>
                                        </tr>
                                        <tr>
                                          <td class="border p-2 font-bold">Dates (Issue/Expiry)</td>
                                          <td class="border p-2">${cocCompareResult.dates1 || 'N/A'}</td>
                                          <td class="border p-2">${cocCompareResult.dates2 || 'N/A'}</td>
                                          <td class="border p-2 text-center">${cocCompareResult.datesMatch ? 'YES' : 'NO'}</td>
                                        </tr>
                                      </tbody>
                                    </table>

                                    <div class="grid grid-cols-2 gap-4 mt-6">
                                      <div class="border p-4 rounded bg-gray-50">
                                        <h3 class="text-xs uppercase font-mono text-gray-400">Missing Information</h3>
                                        <p class="text-sm mt-1 text-gray-700">${cocCompareResult.missingInformation || 'None detected'}</p>
                                      </div>
                                      <div class="border p-4 rounded bg-gray-50">
                                        <h3 class="text-xs uppercase font-mono text-gray-400">Discrepancies</h3>
                                        <p class="text-sm mt-1 text-gray-700">${cocCompareResult.mismatches || 'None detected'}</p>
                                      </div>
                                    </div>
                                  </div>
                                `;
                                handlePrintReport('COC_Matching_Report', reportHtml);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Download className="h-4 w-4" /> Download PDF Report
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: KNOWLEDGE ASSISTANT */}
                {activeModalTab === 'knowledge-assistant' && selectedMaterial && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center border-b border-industrial-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Zap className="h-4.5 w-4.5 text-brand-600 animate-pulse" /> AI Engineering Knowledge Assistant
                          </h4>
                          <p className="text-[11px] text-industrial-500 mt-0.5">
                            Generate physical operating principles, typical field applications, routine maintenance, and troubleshooting guides for this item.
                          </p>
                        </div>
                      </div>

                      {!knowledgeResult ? (
                        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                          <Cpu className="h-12 w-12 text-brand-500 animate-bounce" />
                          <div className="max-w-md space-y-1.5">
                            <p className="text-xs font-bold text-industrial-800">Generate Full Operational Guidance File</p>
                            <p className="text-[11px] text-industrial-500 leading-normal">
                              Our models will query deep instrumentation documentation for Model {selectedMaterial.model} by {selectedMaterial.manufacturer} to prepare field diagnostics, mounting warnings, and safety precautions.
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              setKnowledgeLoading(true);
                              try {
                                const res = await fetch(`${getBaseApiUrl()}/api/gemini/knowledge-assistant`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ material: selectedMaterial })
                                });
                                if (!res.ok) throw new Error(await res.text());
                                const data = await res.json();
                                setKnowledgeResult(data);

                                // Add to history log
                                const newEvent: MaterialHistoryEvent = {
                                  id: `evt-${Date.now()}`,
                                  action: 'AI Knowledge Guide',
                                  details: `Generated extensive operational, calibration and field safety engineering guides for ${selectedMaterial.manufacturer} ${selectedMaterial.model}.`,
                                  userName: currentUser.name,
                                  userRole: currentUser.role,
                                  timestamp: new Date().toISOString()
                                };
                                onUpdateMaterial({
                                  ...selectedMaterial,
                                  history: [newEvent, ...(selectedMaterial.history || [])]
                                });
                                triggerLocalToast('success', 'Operational guide generated and stored in timeline.');
                              } catch (err: any) {
                                console.error(err);
                                triggerLocalToast('error', 'Failed to generate guide.');
                              } finally {
                                setKnowledgeLoading(false);
                              }
                            }}
                            disabled={knowledgeLoading}
                            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                          >
                            {knowledgeLoading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Searching Engineering Databases...</span>
                              </>
                            ) : (
                              <>
                                <Cpu className="h-3.5 w-3.5" />
                                <span>Compile AI Technical Guide</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4" id="knowledge-guide-view">
                          <div className="bg-industrial-850 text-white p-5 rounded-xl border border-industrial-900 space-y-1">
                            <span className="text-[10px] font-mono uppercase bg-brand-600/20 text-brand-400 font-bold px-2 py-0.5 rounded border border-brand-500/30">
                              Technical Guide Complete
                            </span>
                            <h5 className="font-bold text-sm tracking-tight mt-1.5">
                              Instrumentation Operational Reference: {selectedMaterial.manufacturer} {selectedMaterial.model}
                            </h5>
                            <p className="text-[11px] text-industrial-400">
                              Verified diagnostic protocols, calibration intervals and field mounting constraints.
                            </p>
                          </div>

                          <div className="space-y-3 font-sans text-xs">
                            {[
                              { title: '1. Physical Operating Principle', content: knowledgeResult.explanation, theme: 'border-l-brand-500' },
                              { title: '2. Typical Process Applications', content: knowledgeResult.applications, theme: 'border-l-indigo-500' },
                              { title: '3. Common Field Failure Modes', content: knowledgeResult.failures, theme: 'border-l-red-500 font-medium' },
                              { title: '4. Diagnostic Troubleshooting Steps', content: knowledgeResult.troubleshooting, theme: 'border-l-amber-500 bg-amber-50/10' },
                              { title: '5. Installation & Mounting Notes', content: knowledgeResult.installation, theme: 'border-l-emerald-500' },
                              { title: '6. Preventive Maintenance & Calibration', content: knowledgeResult.maintenance, theme: 'border-l-purple-500' },
                              { title: '7. Vital Health & Safety Warnings', content: knowledgeResult.safety, theme: 'border-l-rose-600 bg-rose-50/10 text-rose-950 font-bold' }
                            ].map((section, idx) => (
                              <div key={idx} className={`border border-industrial-150 border-l-4 p-4 rounded-xl bg-white space-y-1.5 shadow-2xs ${section.theme}`}>
                                <h6 className="font-extrabold text-industrial-800 text-[11px] uppercase font-mono tracking-wider">
                                  {section.title}
                                </h6>
                                <p className="text-industrial-600 leading-relaxed whitespace-pre-wrap pl-1">
                                  {section.content}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-2 border-t border-industrial-100">
                            <button
                              onClick={() => {
                                const reportHtml = `
                                  <div class="space-y-6">
                                    <div class="p-6 bg-slate-900 text-white rounded-lg mb-6">
                                      <h2 class="text-xl font-bold">AI Technical Field Guide</h2>
                                      <p class="text-sm mt-2 opacity-80">Reference Documentation for ${selectedMaterial.manufacturer} ${selectedMaterial.model} (${selectedMaterial.partNumber})</p>
                                    </div>
                                    
                                    <div class="space-y-6">
                                      <div class="p-4 border rounded">
                                        <h3 class="text-sm font-bold text-slate-800 uppercase font-mono border-b pb-1">1. Physical Operating Principle</h3>
                                        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${knowledgeResult.explanation}</p>
                                      </div>
                                      <div class="p-4 border rounded">
                                        <h3 class="text-sm font-bold text-slate-800 uppercase font-mono border-b pb-1">2. Typical Process Applications</h3>
                                        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${knowledgeResult.applications}</p>
                                      </div>
                                      <div class="p-4 border rounded">
                                        <h3 class="text-sm font-bold text-slate-800 uppercase font-mono border-b pb-1">3. Common Field Failure Modes</h3>
                                        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${knowledgeResult.failures}</p>
                                      </div>
                                      <div class="p-4 border rounded bg-amber-50 border-amber-200">
                                        <h3 class="text-sm font-bold text-amber-900 uppercase font-mono border-b pb-1">4. Diagnostic Troubleshooting Steps</h3>
                                        <p class="text-sm text-amber-950 mt-2 whitespace-pre-wrap">${knowledgeResult.troubleshooting}</p>
                                      </div>
                                      <div class="p-4 border rounded">
                                        <h3 class="text-sm font-bold text-slate-800 uppercase font-mono border-b pb-1">5. Installation & Mounting Notes</h3>
                                        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${knowledgeResult.installation}</p>
                                      </div>
                                      <div class="p-4 border rounded">
                                        <h3 class="text-sm font-bold text-slate-800 uppercase font-mono border-b pb-1">6. Preventive Maintenance & Calibration</h3>
                                        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${knowledgeResult.maintenance}</p>
                                      </div>
                                      <div class="p-4 border rounded bg-red-50 border-red-200 text-red-950">
                                        <h3 class="text-sm font-bold uppercase font-mono border-b pb-1 text-red-900">7. Vital Health & Safety Warnings</h3>
                                        <p class="text-sm mt-2 whitespace-pre-wrap">${knowledgeResult.safety}</p>
                                      </div>
                                    </div>
                                  </div>
                                `;
                                handlePrintReport('AI_Engineering_Knowledge_Guide', reportHtml);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Download className="h-4 w-4" /> Download PDF Report
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: ALTERNATIVE PARTS */}
                {activeModalTab === 'alternative-parts' && selectedMaterial && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-industrial-200 space-y-4">
                      <div className="flex justify-between items-center border-b border-industrial-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Sparkles className="h-4.5 w-4.5 text-brand-600" /> Alternative Spare Parts Finder
                          </h4>
                          <p className="text-[11px] text-industrial-500 mt-0.5">
                            Discover exact functional equivalent parts from competing OEMs, with modification notes & pros/cons.
                          </p>
                        </div>
                      </div>

                      {!altPartsResult ? (
                        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                          <Sparkles className="h-12 w-12 text-brand-500 animate-spin" />
                          <div className="max-w-md space-y-1.5">
                            <p className="text-xs font-bold text-industrial-800">Locate Equivalent Parts Across Industrial Repos</p>
                            <p className="text-[11px] text-industrial-500 leading-normal">
                              Queries standard industrial indices for part replacements compatible with Model {selectedMaterial.model} (by {selectedMaterial.manufacturer}).
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              setAltPartsLoading(true);
                              try {
                                const res = await fetch(`${getBaseApiUrl()}/api/gemini/alternative-parts`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ material: selectedMaterial })
                                });
                                if (!res.ok) throw new Error(await res.text());
                                const data = await res.json();
                                setAltPartsResult(data);

                                // Add to timeline log
                                const newEvent: MaterialHistoryEvent = {
                                  id: `evt-${Date.now()}`,
                                  action: 'AI Alternatives Audit',
                                  details: `Mapped functional replacements. Suggested: ${data.alternatives.map((a: any) => `${a.manufacturer} ${a.equivalentPartNumber}`).join(', ')}.`,
                                  userName: currentUser.name,
                                  userRole: currentUser.role,
                                  timestamp: new Date().toISOString()
                                };
                                onUpdateMaterial({
                                  ...selectedMaterial,
                                  history: [newEvent, ...(selectedMaterial.history || [])]
                                });
                                triggerLocalToast('success', 'Alternative parts mapped and saved in history timeline.');
                              } catch (err: any) {
                                console.error(err);
                                triggerLocalToast('error', 'Failed to map alternatives.');
                              } finally {
                                setAltPartsLoading(false);
                              }
                            }}
                            disabled={altPartsLoading}
                            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                          >
                            {altPartsLoading ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Searching OEM Registries...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Locate Compatible Spare Alternatives</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5" id="alternatives-report-view">
                          <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-950 space-y-1">
                            <span className="text-[10px] font-mono uppercase bg-slate-800 text-brand-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                              Replacement Mapping Active
                            </span>
                            <h5 className="font-bold text-sm tracking-tight mt-1.5">
                              Available Equivalents for SKU: {selectedMaterial.partNumber}
                            </h5>
                            <p className="text-xs text-slate-400 font-medium">
                              {altPartsResult.engineeringSummary}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {altPartsResult.alternatives?.map((alt: any, idx: number) => (
                              <div key={idx} className="border border-industrial-150 p-5 rounded-xl bg-white space-y-4 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] font-mono font-bold uppercase text-industrial-400 block tracking-wider">OEM Manufacturer</span>
                                      <h6 className="font-black text-industrial-800 text-xs mt-0.5">{alt.manufacturer}</h6>
                                      <p className="font-mono text-[11px] text-brand-600 font-bold mt-1 bg-brand-50/50 border border-brand-100 px-2 py-0.5 rounded inline-block">
                                        Model: {alt.equivalentPartNumber}
                                      </p>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end">
                                      <span className="text-[8px] font-mono text-industrial-400 uppercase">Match Score</span>
                                      <span className={`text-lg font-mono font-black ${
                                        alt.compatibilityScore >= 90 ? 'text-emerald-600' :
                                        alt.compatibilityScore >= 70 ? 'text-amber-600' : 'text-red-600'
                                      }`}>{alt.compatibilityScore}%</span>
                                    </div>
                                  </div>

                                  <div className="border-t border-industrial-100 pt-3 space-y-2 text-xs">
                                    <div>
                                      <span className="font-bold text-[9px] font-mono text-industrial-400 uppercase block">Required Field Modifications</span>
                                      <p className="text-industrial-600 leading-relaxed mt-0.5 bg-industrial-50 p-2 rounded border border-industrial-100 font-medium font-mono text-[10px]">{alt.requiredModifications}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                                      <div className="space-y-1">
                                        <span className="font-bold text-[9px] font-mono text-emerald-600 uppercase block">Advantages</span>
                                        <p className="text-emerald-800 leading-relaxed pl-1">{alt.advantages}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="font-bold text-[9px] font-mono text-red-500 uppercase block">Disadvantages</span>
                                        <p className="text-red-800 leading-relaxed pl-1">{alt.disadvantages}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end pt-2 border-t border-industrial-100">
                            <button
                              onClick={() => {
                                const reportHtml = `
                                  <div class="space-y-6">
                                    <div class="p-6 bg-slate-900 text-white rounded-lg mb-6">
                                      <h2 class="text-xl font-bold">Equivalent Spare Parts & Compatibility Audit</h2>
                                      <p class="text-sm mt-1 opacity-80">Reference mapping for original Model: ${selectedMaterial.manufacturer} ${selectedMaterial.model}</p>
                                      <p class="text-xs mt-3 italic text-gray-300">${altPartsResult.engineeringSummary}</p>
                                    </div>
                                    
                                    <div class="space-y-6">
                                      <h2 class="text-lg font-bold text-gray-800 border-b pb-2">Identified Alternatives</h2>
                                      ${altPartsResult.alternatives?.map((alt: any) => `
                                        <div class="p-5 border rounded-lg bg-gray-50 mb-4">
                                          <div class="flex justify-between items-start border-b pb-2 mb-3">
                                            <div>
                                              <span class="text-xs font-mono text-gray-400 uppercase">Manufacturer</span>
                                              <h3 class="text-base font-bold text-gray-800">${alt.manufacturer}</h3>
                                              <p class="text-sm font-mono text-blue-600 mt-1">Model/Part Number: ${alt.equivalentPartNumber}</p>
                                            </div>
                                            <div class="text-right">
                                              <span class="text-xs font-mono text-gray-400">Compatibility Match</span>
                                              <div class="text-lg font-bold text-blue-600 font-mono mt-0.5">${alt.compatibilityScore}%</div>
                                            </div>
                                          </div>
                                          
                                          <div class="space-y-3">
                                            <div>
                                              <span class="text-xs font-bold text-gray-400 uppercase font-mono block">Required Modifications</span>
                                              <p class="text-sm mt-1 bg-white p-2 border font-mono text-xs rounded">${alt.requiredModifications}</p>
                                            </div>
                                            <div class="grid grid-cols-2 gap-4">
                                              <div>
                                                <span class="text-xs font-bold text-green-600 uppercase font-mono block">Advantages</span>
                                                <p class="text-sm mt-1 text-green-800">${alt.advantages}</p>
                                              </div>
                                              <div>
                                                <span class="text-xs font-bold text-red-600 uppercase font-mono block">Disadvantages</span>
                                                <p class="text-sm mt-1 text-red-800">${alt.disadvantages}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      `).join('')}
                                    </div>
                                  </div>
                                `;
                                handlePrintReport('Alternatives_Compatibility_Report', reportHtml);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Download className="h-4 w-4" /> Download PDF Report
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom control bar */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMaterial(null);
                    setIsEditingQuantity(false);
                  }}
                  className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Dismiss Spec File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- MATERIAL AUTHENTICITY VERIFICATION MODAL ---------------- */}
      <AnimatePresence>
        {isVerifying && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-white border border-industrial-300 rounded-2xl shadow-2xl text-industrial-800 relative overflow-hidden flex flex-col max-h-[92vh] text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-industrial-900 px-6 py-4 border-b border-industrial-800 shrink-0 text-white">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5.5 w-5.5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white leading-tight">
                      مستشار التحقق من الأصالة / Material Authenticity Verification
                    </h3>
                    <p className="text-[10px] text-industrial-300 font-mono">EMIS Security Auditing Suite v1.0</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVerifying(false)}
                  className="text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Stepper progress bar */}
              <div className="bg-industrial-50 px-6 py-3 border-b border-industrial-150 shrink-0 flex justify-between items-center text-[10px] font-mono text-industrial-450 gap-2 overflow-x-auto">
                {[
                  { nr: 1, name: '1. البيانات / Data' },
                  { nr: 2, name: '2. مقارنة EMIS / Local DB' },
                  { nr: 3, name: '3. التوثيق / OEM Match' },
                  { nr: 4, name: '4. تقرير السلامة / Report' },
                  { nr: 5, name: '5. النتيجة / Verdict' }
                ].map(st => {
                  const active = verifyStep === st.nr;
                  const passed = verifyStep > st.nr;
                  return (
                    <div key={st.nr} className="flex items-center gap-1">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                        active ? 'bg-brand-600 text-white shadow-xs' : passed ? 'bg-emerald-600 text-white' : 'bg-industrial-200 text-industrial-500'
                      }`}>
                        {st.nr}
                      </span>
                      <span className={`font-semibold ${active ? 'text-brand-600' : passed ? 'text-emerald-700' : 'text-industrial-500'}`}>
                        {st.name}
                      </span>
                      {st.nr < 5 && <ArrowRight className="h-3 w-3 text-industrial-300 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Blacklist Warning Card (Shown in ALL steps if match detected) */}
              {verifyMatchedBlacklist.length > 0 && (
                <div className="bg-red-50 border-b border-red-200 p-4 shrink-0 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1 text-left">
                    <h5 className="text-xs font-black text-red-800 font-sans">
                      ⚠️ تحذير أمني: تم رصد هذا المورد أو الرقم في القائمة السوداء!
                    </h5>
                    <p className="text-[11px] text-red-700 font-medium">
                      Warning: This Part Number, Serial, or Supplier has previously been reported as counterfeit, defective, or failed technical verification.
                    </p>
                    <div className="bg-white/80 p-2 rounded-lg border border-red-200 text-[10px] text-red-800 space-y-1 font-mono mt-1.5 w-full">
                      {verifyMatchedBlacklist.map((blItem, idx) => (
                        <div key={idx} className="flex flex-wrap justify-between gap-2 border-b border-red-100 pb-1 last:border-0 last:pb-0">
                          <span><strong>Part:</strong> {blItem.partNumber || 'Any'} | <strong>Serial:</strong> {blItem.serialNumber || 'Any'}</span>
                          <span><strong>Supplier:</strong> {blItem.supplierName || 'Any'}</span>
                          <span className="bg-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{blItem.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal scrollable workspace */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                
                {/* ---------------- STEP 1: DATA ENTRY ---------------- */}
                {verifyStep === 1 && (
                  <div className="space-y-4 text-left">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                      <Info className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="text-xs text-emerald-800 leading-relaxed">
                        <strong>نظام المطابقة المزدوج:</strong> يرجى تعبئة الرقم التسلسلي ورفع صورة لوحة المادة لمقارنتها مع قاعدة بيانات EMIS وتوثيق الشركة المصنعة.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Fields */}
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Part Number</label>
                          <input
                            type="text"
                            value={verifyPartNumber}
                            onChange={(e) => setVerifyPartNumber(e.target.value)}
                            className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                            placeholder="Enter Part Number"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Model Number</label>
                          <input
                            type="text"
                            value={verifyModel}
                            onChange={(e) => setVerifyModel(e.target.value)}
                            className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                            placeholder="Enter Model"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Manufacturer</label>
                          <select
                            value={verifyManufacturer}
                            onChange={(e) => setVerifyManufacturer(e.target.value)}
                            className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                          >
                            {['Honeywell', 'Emerson', 'Yokogawa', 'Siemens', 'ABB', 'MTL', 'Rosemount', 'Dräger', 'Other'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">
                            Serial Number <span className="text-red-500 font-bold">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={verifySerialNumber}
                            onChange={(e) => setVerifySerialNumber(e.target.value)}
                            className="w-full bg-industrial-50 border border-brand-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 font-mono font-bold"
                            placeholder="e.g. SN-94182-A (Required)"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Supplier Name</label>
                          <input
                            type="text"
                            value={verifySupplier}
                            onChange={(e) => setVerifySupplier(e.target.value)}
                            className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                            placeholder="e.g. Al-Furat Trade, Honeywell Gulf"
                          />
                        </div>
                      </div>

                      {/* Right: Nameplate Image and selector */}
                      <div className="space-y-3">
                        <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold">صورة لوحة البيانات / Nameplate Marking Image</label>
                        
                        <div className="border-2 border-dashed border-industrial-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-industrial-50 min-h-[220px] relative overflow-hidden group">
                          {verifyNameplateImage ? (
                            <>
                              <img src={verifyNameplateImage} alt="Nameplate marking" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="bg-white text-industrial-800 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-industrial-100">
                                  تغيير الصورة / Change
                                  <input type="file" accept="image/*" onChange={handleNameplateImageChange} className="hidden" />
                                </label>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2.5">
                              <Upload className="h-8 w-8 text-industrial-400 mx-auto animate-bounce" />
                              <div>
                                <p className="text-xs font-bold text-industrial-700">اضغط لرفع صورة لوحة البيانات</p>
                                <p className="text-[10px] text-industrial-450 mt-1">PNG, JPG up to 5MB (Drag & drop simulated)</p>
                              </div>
                              <label className="inline-flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg cursor-pointer transition-all">
                                <Upload className="h-3 w-3" />
                                <span>اختر ملف / Select Photo</span>
                                <input type="file" accept="image/*" onChange={handleNameplateImageChange} className="hidden" />
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-industrial-400 italic">
                          💡 نصيحة: يفضل التقاط صورة واضحة ومقروءة للأرقام والحروف المحفورة.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- STEP 2: INTERNAL EMIS MATCH ---------------- */}
                {verifyStep === 2 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono">
                      نتائج المطابقة مع قاعدة السجلات الموحدة (EMIS Database Lookup)
                    </h4>

                    {verifyInternalMatch ? (
                      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex justify-between items-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            تم العثور على مطابقة مسبقة للمادة / Local DB Match Found
                          </span>
                          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-100/60 font-bold px-2 py-0.5 rounded-full">
                            ID: {verifyInternalMatch.partNumber}
                          </span>
                        </div>

                        <div className="p-4 space-y-4 text-xs">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <span className="block text-[9px] font-mono text-industrial-400 uppercase tracking-widest font-bold">اسم القطعة / Description</span>
                              <span className="font-semibold text-industrial-800 mt-0.5 block">{verifyInternalMatch.description}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-industrial-400 uppercase tracking-widest font-bold">المصنع / Manufacturer</span>
                              <span className="font-semibold text-industrial-800 mt-0.5 block">{verifyInternalMatch.manufacturer}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono text-industrial-400 uppercase tracking-widest font-bold">الموديل / Model</span>
                              <span className="font-semibold text-industrial-800 mt-0.5 block">{verifyInternalMatch.model}</span>
                            </div>
                          </div>

                          <div className="border-t border-industrial-100 pt-3">
                            <span className="block text-[9px] font-mono text-industrial-400 uppercase tracking-widest font-bold mb-1.5">
                              مواقع الاستخدام والمعدات المرتبطة / Site & Machinery Usage History
                            </span>
                            {verifyInternalMatch.compatibleEquipment && verifyInternalMatch.compatibleEquipment.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 text-left">
                                {verifyInternalMatch.compatibleEquipment.map((eqTag, idx) => (
                                  <span key={`${eqTag}-${idx}`} className="inline-flex items-center gap-1 bg-industrial-100 border border-industrial-200 text-industrial-700 px-2.5 py-1 rounded font-mono text-[10px] font-bold">
                                    <Wrench className="h-3 w-3 text-industrial-500" />
                                    {eqTag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-industrial-450 italic">هذه المادة غير مسجلة حالياً على أي معدة نشطة في الموقع.</p>
                            )}
                          </div>

                          <div className="border-t border-industrial-100 pt-3">
                            <span className="block text-[9px] font-mono text-industrial-400 uppercase tracking-widest font-bold mb-1">
                              ملاحظات الصيانة والمهندسين المعتمدة / Engineer Technical Remarks
                            </span>
                            <div className="bg-industrial-50 p-3 rounded-lg border border-industrial-150 text-[11px] text-industrial-700 whitespace-pre-line font-sans leading-relaxed text-left">
                              {verifyInternalMatch.engineeringNotes || "لا توجد أي ملاحظات هندسية مدونة مسبقاً لهذه المادة."}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-2.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                          <h5 className="text-xs font-bold text-amber-800">
                            مادة غير مسجلة مسبقاً / New Material SKU
                          </h5>
                        </div>
                        <p className="text-xs text-amber-700 leading-relaxed font-sans">
                          لم يتم العثور على أي مادة تحمل الرقم <strong>{verifyPartNumber}</strong> في السجل المحلي الموحد لشركة EMIS. قد يعني هذا أن المادة جديدة كلياً في نظام المستودعات ولم يسبق تسجيلها أو تركيبها.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- STEP 3: EXTERNAL OEM CHECK ---------------- */}
                {verifyStep === 3 && (
                  <div className="space-y-4 text-center py-4">
                    {isScanningSimulated ? (
                      <div className="space-y-4 max-w-md mx-auto py-6">
                        <div className="relative w-24 h-24 mx-auto">
                          {/* Outer scanning loader */}
                          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
                          <div className="absolute inset-2 rounded-full border-4 border-dashed border-emerald-500/30 animate-pulse flex items-center justify-center">
                            <Cpu className="h-8 w-8 text-emerald-600" />
                          </div>
                        </div>
                        <div className="space-y-1.5 text-center">
                          <p className="text-xs font-bold text-industrial-800 animate-pulse">
                            جاري الاتصال بالنظام السحابي للمصنع للتحقق من الرقم التسلسلي...
                          </p>
                          <p className="text-[10px] text-industrial-400 font-mono">
                            Querying global registry for {verifyManufacturer} [SN: {verifySerialNumber}]
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono">
                          نتائج استعلام سجل المصنع (Global OEM Registry Result)
                        </h4>

                        {verifyExternalResult?.verified ? (
                          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 space-y-4 text-left">
                            <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                              <CheckCircle className="h-5.5 w-5.5 text-emerald-600 shrink-0" />
                              <div>
                                <h5 className="text-xs font-black text-emerald-800">
                                  تم التوثيق والمطابقة! المنتج مسجل بشكل معتمد في الشركة المصنعة
                                </h5>
                                <p className="text-[10px] text-emerald-600 font-mono">Verified Match from Official Registry</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">تاريخ التصنيع / Mfg Date</span>
                                <span className="font-semibold text-industrial-850 font-mono">{verifyExternalResult.matchDetails.manufactureDate}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">حالة الضمان / Warranty</span>
                                <span className="font-semibold text-industrial-850 font-mono text-emerald-700">{verifyExternalResult.matchDetails.warrantyStatus} (Until {verifyExternalResult.matchDetails.warrantyUntil})</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">مكان التصنيع / Origin</span>
                                <span className="font-semibold text-industrial-850">{verifyExternalResult.matchDetails.productionPlant}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="block text-[9px] font-mono text-industrial-400 font-bold uppercase">الشهادات والاعتمادات / Compliance</span>
                                <span className="font-semibold text-industrial-850 text-[11px] leading-tight block">{verifyExternalResult.matchDetails.regulatoryCompliance}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3 text-left">
                            <div className="flex items-center gap-2 text-red-800">
                              <ShieldAlert className="h-5.5 w-5.5 text-red-600 shrink-0" />
                              <h5 className="text-xs font-black">
                                فشل التحقق: الرقم التسلسلي غير مسجل في الشركة المصنعة!
                              </h5>
                            </div>
                            <p className="text-xs text-red-700 leading-relaxed font-sans">
                              {verifyExternalResult?.reason}
                            </p>
                          </div>
                        )}

                        {/* Simulated disclaimer box */}
                        <div className="bg-amber-50 border border-amber-150 p-3 rounded-lg text-[11px] text-amber-800 font-medium font-sans flex items-center gap-2 text-left">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                          <span>
                            ⚠️ <strong>Simulated Verification:</strong> Real manufacturer API integration pending.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- STEP 4: NON-VERIFICATION REPORT ---------------- */}
                {verifyStep === 4 && (
                  <div className="space-y-4 text-left">
                    <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono">
                      التقرير الفني وتوصيات السلامة للمواد (Integrity & Safety Warnings)
                    </h4>

                    {(verifyInternalMatch === null || verifyExternalResult?.verified === false) ? (
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-black text-red-800">⚠️ لم يتم الع العثور على هذا الرقم في قاعدة بيانات الشركة المصنعة</h5>
                            <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed font-sans">
                              Serial not found in simulated global manufacturer database. This could indicate a counterfeit spare part or unauthorized third-party vendor sourcing.
                            </p>
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-black text-amber-800">⚠️ يحتاج إلى مراجعة المورد وتدقيق أوراق الشحنة</h5>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed font-sans">
                              Requires supplier verification and invoice audit. Check the commercial origin and confirm with procurement logs if there is an approved Purchase Order.
                            </p>
                          </div>
                        </div>

                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                          <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs font-black text-sky-800">⚠️ يُنصح بطلب خطاب أصالة أو التواصل مع المكتب الإقليمي للشركة المصنعة</h5>
                            <p className="text-[11px] text-sky-700 mt-0.5 leading-relaxed font-sans">
                              Recommend requesting an official Letter of Authenticity (LoA) or directly contacting the authorized regional manufacturer distributor before releasing this part for field installation.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                        <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
                        <h5 className="text-xs font-bold text-emerald-800 text-center">
                          جميع مؤشرات السلامة والمطابقة سليمة!
                        </h5>
                        <p className="text-xs text-emerald-700 max-w-lg mx-auto font-sans leading-relaxed text-center">
                          ✔️ تم تمرير جميع فحوصات المطابقة والتوثيق بنجاح! لا توجد إنذارات حرجة للمادة. يمكن تركيب هذه المادة بشكل طبيعي في محطات النفط والسيطرة.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- STEP 5: CONFIDENCE SCORE & VERDICT ---------------- */}
                {verifyStep === 5 && (
                  <div className="space-y-4 text-center">
                    <h4 className="text-xs font-bold text-industrial-800 uppercase tracking-wider font-mono text-left">
                      النتيجة الإجمالية ومؤشر الثقة (Integrity Evaluation Summary)
                    </h4>

                    <div className="bg-industrial-900 text-white rounded-xl p-5 max-w-md mx-auto space-y-4 border border-industrial-800 shadow-sm">
                      <div className="space-y-1 text-center">
                        <span className="text-[10px] font-mono text-industrial-400 uppercase tracking-widest font-bold">Confidence Integrity Score</span>
                        
                        <div className="py-2.5">
                          <span className={`text-4xl font-extrabold font-mono ${
                            verifyConfidenceScore >= 85 ? 'text-emerald-400' : verifyConfidenceScore >= 50 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {verifyConfidenceScore}%
                          </span>
                        </div>

                        <div className="inline-block px-3 py-1 rounded-full text-xs font-black font-sans uppercase">
                          {verifyConfidenceScore >= 85 ? (
                            <span className="text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              🟢 بيانات متطابقة / Fully Verified
                            </span>
                          ) : verifyConfidenceScore >= 50 ? (
                            <span className="text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/20">
                              🟡 بعض البيانات غير مؤكدة / Partially Verified
                            </span>
                          ) : (
                            <span className="text-red-400 bg-red-950/80 px-2.5 py-1 rounded-full border border-red-500/20">
                              🔴 توجد مؤشرات تستدعي المراجعة / High Risk Alert
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Calculation parameters */}
                      <div className="bg-black/45 p-3 rounded-lg border border-industrial-850 text-[10px] font-mono text-left space-y-1.5 text-industrial-350">
                        <span className="block text-industrial-450 uppercase font-black tracking-wider text-[8px] mb-1">Score parameters logic:</span>
                        <div className="flex justify-between">
                          <span>1. EMIS Database Matching (Max 40%):</span>
                          <span className={verifyInternalMatch ? 'text-emerald-400 font-bold' : 'text-industrial-500'}>
                            {verifyInternalMatch ? '+40%' : '0% (New SKU)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Global OEM Registry Match (Max 40%):</span>
                          <span className={verifyExternalResult?.verified ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {verifyExternalResult?.verified ? '+40%' : '0% (Failed)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>3. Nameplate Photo Upload Completeness (+5%):</span>
                          <span className={verifyNameplateImage ? 'text-emerald-400 font-bold' : 'text-industrial-500'}>
                            {verifyNameplateImage ? '+5%' : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>4. Serial Number Supplied (+5%):</span>
                          <span className={verifySerialNumber.trim() ? 'text-emerald-400 font-bold' : 'text-industrial-500'}>
                            {verifySerialNumber.trim() ? '+5%' : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>5. Model & Manufacturer Supplied (+5%):</span>
                          <span className={verifyModel.trim() ? 'text-emerald-400 font-bold' : 'text-industrial-500'}>
                            {verifyModel.trim() ? '+5%' : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>6. Supplier Name Specified (+5%):</span>
                          <span className={verifySupplier.trim() ? 'text-emerald-400 font-bold' : 'text-industrial-500'}>
                            {verifySupplier.trim() ? '+5%' : '0%'}
                          </span>
                        </div>
                      </div>

                      {/* Disclaimer text */}
                      <p className="text-[10px] text-industrial-400 italic font-sans leading-relaxed text-center">
                        ⚠️ درجة الموثوقية هذه هي أداة مساعدة للمهندس وليست حكماً فاصلاً نهائياً. يرجى دائماً الرجوع لسياسات السلامة والجودة والاتفاقيات التجارية للشركة.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Nav Bar */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-between shrink-0">
                <div>
                  {verifyStep > 1 && (
                    <button
                      type="button"
                      disabled={isScanningSimulated}
                      onClick={() => setVerifyStep(prev => prev - 1)}
                      className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      السابق / Back
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVerifying(false)}
                    className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء / Cancel
                  </button>

                  {verifyStep === 1 && (
                    <button
                      type="button"
                      disabled={!verifySerialNumber.trim()}
                      onClick={handleProceedToStep2Internal}
                      className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      مقارنة البيانات / Next (Internal Match)
                    </button>
                  )}

                  {verifyStep === 2 && (
                    <button
                      type="button"
                      onClick={handleProceedToStep3External}
                      className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      فحص الشركة الأم / Next (OEM Lookup)
                    </button>
                  )}

                  {verifyStep === 3 && (
                    <button
                      type="button"
                      disabled={isScanningSimulated}
                      onClick={() => setVerifyStep(4)}
                      className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      استخراج التقرير / Next (Report)
                    </button>
                  )}

                  {verifyStep === 4 && (
                    <button
                      type="button"
                      onClick={() => setVerifyStep(5)}
                      className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      درجة الموثوقية / Next (Confidence)
                    </button>
                  )}

                  {verifyStep === 5 && (
                    <button
                      type="button"
                      onClick={handleSaveVerificationToMaterial}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      اعتماد وحفظ النتيجة / Approve & Save Record
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- SUPPLIER & MATERIAL BLACKLIST DATABASE MANAGER ---------------- */}
      <AnimatePresence>
        {isShowingBlacklistManager && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-white border border-industrial-300 rounded-2xl shadow-2xl text-industrial-800 relative overflow-hidden flex flex-col max-h-[92vh] text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-red-900 px-6 py-4 border-b border-red-850 shrink-0 text-white">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5.5 w-5.5 text-red-300 shrink-0 animate-pulse" />
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white leading-tight">
                      إدارة القائمة السوداء للموردين والمواد / Supplier & Material Blacklist Database
                    </h3>
                    <p className="text-[10px] text-red-200 font-mono">EMIS Regulatory & Sourcing Quality Control</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShowingBlacklistManager(false)}
                  className="text-red-300 hover:text-white p-1 rounded-lg hover:bg-red-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Workspace split: Left Add Form, Right Blacklist Table */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                
                {/* Left side: Add form */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 text-[11px] text-red-800 leading-relaxed font-sans text-left">
                    <strong>إدارة أمن المستودعات:</strong> قم بإدراج الموردين أو الأرقام التسلسلية المشبوهة أو المواد التي فشلت في الفحوصات الفنية لمنع شراءها أو تركيبها مستقبلاً.
                  </div>

                  <form onSubmit={handleAddBlacklist} className="space-y-3.5 bg-industrial-50 p-4 rounded-xl border border-industrial-200 text-xs text-left">
                    <span className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-extrabold pb-1.5 border-b border-industrial-200">
                      إضافة عنصر جديد / Add Blacklist Entry
                    </span>

                    <div>
                      <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Part Number</label>
                      <input
                        type="text"
                        value={blPartNumber}
                        onChange={(e) => setBlPartNumber(e.target.value)}
                        className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-red-500"
                        placeholder="e.g. HON-XM-920"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Serial Number</label>
                      <input
                        type="text"
                        value={blSerialNumber}
                        onChange={(e) => setBlSerialNumber(e.target.value)}
                        className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-red-500 font-mono"
                        placeholder="e.g. SN-842-X"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Supplier Name</label>
                      <input
                        type="text"
                        value={blSupplierName}
                        onChange={(e) => setBlSupplierName(e.target.value)}
                        className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-red-500"
                        placeholder="e.g. FakeSourcing Ltd"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-bold mb-1">Reason for Sourcing Ban</label>
                      <select
                        value={blReason}
                        onChange={(e) => setBlReason(e.target.value)}
                        className="w-full bg-white border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none"
                      >
                        <option value="counterfeit">مقلد أو مغشوش / Counterfeit or Fake</option>
                        <option value="non-compliant">غير مطابق للمواصفات / Non-compliant Spec</option>
                        <option value="failed-verification">فشل التحقق الفني / Failed OEM Audit</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer text-center"
                    >
                      إضافة إلى القائمة السوداء / Add Entry
                    </button>
                  </form>
                </div>

                {/* Right side: Blacklist Table list */}
                <div className="lg:col-span-2 space-y-3 flex flex-col h-full min-h-[300px]">
                  <span className="block text-[10px] font-mono text-industrial-500 uppercase tracking-wider font-extrabold text-left">
                    المواد والموردين المحظورين حالياً / Current Blocked Registry ({blacklist.length})
                  </span>

                  {blacklist.length === 0 ? (
                    <div className="flex-1 border border-dashed border-industrial-200 rounded-xl flex items-center justify-center p-6 text-center text-industrial-400 italic">
                      No blacklisted items registered. Sourcing safety records are completely clean.
                    </div>
                  ) : (
                    <div className="flex-1 border border-industrial-200 rounded-xl overflow-hidden bg-white overflow-y-auto">
                      <table className="w-full text-xs text-left text-industrial-700">
                        <thead className="bg-industrial-100 text-[10px] font-mono text-industrial-500 uppercase tracking-wider sticky top-0 text-left">
                          <tr>
                            <th className="px-4 py-3">Part / Serial</th>
                            <th className="px-4 py-3">Supplier Name</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3">Reporter</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-industrial-150">
                          {blacklist.map((item, idx) => (
                            <tr key={`${item.id}-${idx}`} className="hover:bg-red-50/20 transition-all text-left">
                              <td className="px-4 py-3">
                                <div className="font-mono font-bold text-industrial-900">{item.partNumber || <span className="text-industrial-400 italic">Any</span>}</div>
                                {item.serialNumber && <div className="text-[10px] font-mono text-industrial-450 mt-0.5">SN: {item.serialNumber}</div>}
                              </td>
                              <td className="px-4 py-3 font-medium text-industrial-800">
                                {item.supplierName || <span className="text-industrial-400 italic">Any</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  item.reason === 'counterfeit' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-850'
                                }`}>
                                  {item.reason}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[10px] text-industrial-500">
                                <div className="font-medium text-industrial-700">{item.reporterName}</div>
                                <div className="font-mono text-[9px] text-industrial-400 mt-0.5">{new Date(item.reportingDate).toLocaleDateString()}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlacklist(item.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Remove from blacklist"
                                >
                                  <Trash2 className="h-4 w-4" />
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

              {/* Bottom Nav */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsShowingBlacklistManager(false)}
                  className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  إغلاق قاعدة البيانات / Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPrintLabelModal && printLabelMaterial && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-industrial-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-brand-405" />
                  <div>
                    <h3 className="text-sm font-bold">ملصق الهوية الفنية للمواد / Material Physical ID Tag</h3>
                    <p className="text-[10px] text-slate-400">Configure and print barcode labels for physical engineering bins.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintLabelModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Configuration Options */}
                <div className="bg-industrial-50 p-4 rounded-2xl border border-industrial-200 space-y-4">
                  <h4 className="text-[11px] font-mono text-industrial-500 uppercase tracking-wider font-extrabold">Label Settings / خيارات التصميم</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono text-industrial-450 uppercase font-bold">Label Dimensions / المقاس</span>
                      <div className="flex gap-1.5">
                        {(['small', 'standard', 'large'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setPrintLabelSize(sz)}
                            className={`flex-1 text-[10.5px] font-bold py-1.5 px-2 rounded-lg border text-center capitalize transition-all cursor-pointer ${
                              printLabelSize === sz
                                ? 'bg-slate-900 border-slate-950 text-white shadow-xs'
                                : 'bg-white border-industrial-250 text-industrial-600 hover:bg-industrial-50'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono text-industrial-450 uppercase font-bold">Visibility Options</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintIncludeMfg(!printIncludeMfg)}
                          className={`text-[9.5px] font-bold py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                            printIncludeMfg ? 'bg-emerald-50 border-emerald-300 text-emerald-850' : 'bg-white border-industrial-250 text-industrial-450'
                          }`}
                        >
                          Mfg/Model
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintIncludeLocation(!printIncludeLocation)}
                          className={`text-[9.5px] font-bold py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                            printIncludeLocation ? 'bg-emerald-50 border-emerald-300 text-emerald-850' : 'bg-white border-industrial-250 text-industrial-450'
                          }`}
                        >
                          Location
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintIncludeSpecs(!printIncludeSpecs)}
                          className={`text-[9.5px] font-bold py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                            printIncludeSpecs ? 'bg-emerald-50 border-emerald-300 text-emerald-850' : 'bg-white border-industrial-250 text-industrial-450'
                          }`}
                        >
                          Description
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Preview Container */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono text-industrial-500 uppercase tracking-wider font-extrabold">Print Preview (Direct alignment)</h4>
                  
                  {/* Outer label tag matching exactly with printing specifications */}
                  <div className="flex justify-center p-6 bg-slate-100 rounded-2xl border border-slate-200">
                    <div 
                      id="printable-label-area"
                      className={`bg-white text-black p-5 border-2 border-black rounded shadow-md flex items-stretch gap-4 text-left font-sans ${
                        printLabelSize === 'small' ? 'w-[75mm] h-[45mm]' : printLabelSize === 'large' ? 'w-[105mm] h-[75mm]' : 'w-[90mm] h-[60mm]'
                      }`}
                    >
                      {/* QR side */}
                      <div className="flex flex-col justify-center items-center shrink-0 border-r border-dashed border-gray-300 pr-4">
                        <QRCodeCanvas
                          value={`${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(printLabelMaterial.partNumber)}`}
                          size={printLabelSize === 'small' ? 70 : printLabelSize === 'large' ? 140 : 100}
                          level="H"
                          includeMargin={false}
                        />
                        <span className="text-[8px] font-mono text-gray-400 mt-1 uppercase font-bold">SCAN FOR SPECS</span>
                      </div>

                      {/* Info Side */}
                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[8px] font-mono text-gray-500 uppercase font-extrabold tracking-wider">ENGINEERING ASSET TAG</span>
                            {printLabelMaterial.materialCode && (
                              <span className="text-[8px] bg-black text-white px-1 py-0.2 rounded font-mono font-bold">{printLabelMaterial.materialCode}</span>
                            )}
                          </div>
                          
                          <h2 className="font-mono font-extrabold text-xs text-black truncate tracking-tight mt-1">
                            {printLabelMaterial.partNumber}
                          </h2>

                          {printIncludeSpecs && (
                            <p className="text-[10px] text-gray-800 font-medium leading-tight line-clamp-2 mt-1">
                              {printLabelMaterial.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 mt-1">
                          {printIncludeMfg && (
                            <p className="text-[9px] text-gray-600 font-semibold truncate">
                              Mfg: {printLabelMaterial.manufacturer} · {printLabelMaterial.model}
                            </p>
                          )}
                          
                          {printIncludeLocation && (
                            <div className="text-[8.5px] font-mono text-black font-extrabold bg-gray-100 py-0.5 px-1.5 rounded border border-gray-300 inline-block">
                              Loc: WH {printLabelMaterial.store.split(' ')[0]} · R: {printLabelMaterial.rack} / S: {printLabelMaterial.shelf}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Nav / Actions */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrintLabelModal(false)}
                  className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!printLabelMaterial) return;
                    const canvas = document.querySelector('#printable-label-area canvas') as HTMLCanvasElement;
                    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : undefined;
                    const tagHtml = generateAssetTagHtml(printLabelMaterial, {
                      size: printLabelSize,
                      includeMfg: printIncludeMfg,
                      includeLocation: printIncludeLocation,
                      includeSpecs: printIncludeSpecs,
                      qrDataUrl
                    });
                    downloadDocument(tagHtml, `Asset_Tag_${printLabelMaterial.partNumber}.html`);
                  }}
                  className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title="تنزيل ملف الملصق للطباعة اليدوية أو في أجهزة Zebra/Brother"
                >
                  <Download className="h-3.5 w-3.5 text-industrial-500" />
                  <span>تنزيل الملصق</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!printLabelMaterial) return;
                    const canvas = document.querySelector('#printable-label-area canvas') as HTMLCanvasElement;
                    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : undefined;
                    const tagHtml = generateAssetTagHtml(printLabelMaterial, {
                      size: printLabelSize,
                      includeMfg: printIncludeMfg,
                      includeLocation: printIncludeLocation,
                      includeSpecs: printIncludeSpecs,
                      qrDataUrl
                    });
                    openDocumentInNewTab(tagHtml, `Asset_Tag_${printLabelMaterial.partNumber}`);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  title="فتح الملصق في نافذة متصفح مستقلة للطباعة الفورية"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                  <span>فتح بنافذة جديدة</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-slate-900/10"
                >
                  <Printer className="h-4 w-4" />
                  <span>تأكيد الطباعة / Print Tag</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isShowingImportModal && (
          <ExcelImportModal
            materials={materials}
            currentUser={currentUser}
            onClose={() => setIsShowingImportModal(false)}
            onImportSuccess={() => {
              setIsShowingImportModal(false);
              onImportSuccess();
            }}
          />
        )}

        {isShowingConfirmClearAll && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-red-200 shadow-2xl w-full max-w-md overflow-hidden p-6 text-center space-y-4"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-industrial-900">هل أنت متأكد من مسح جميع المواد؟</h3>
                <h3 className="text-sm font-medium text-industrial-700">Clear All Materials Confirmation</h3>
                <p className="text-xs text-industrial-500 mt-2">
                  هذا الإجراء سيقوم بحذف جميع السجلات مادة المستودع نهائياً ولا يمكن التراجع عنه.
                </p>
                <p className="text-xs text-industrial-500">
                  This action will delete all material ledger records permanently. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsShowingConfirmClearAll(false)}
                  className="flex-1 px-4 py-2 bg-industrial-100 hover:bg-industrial-200 text-industrial-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  إلغاء / Cancel
                </button>
                <button
                  onClick={handleClearAllMaterials}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  مسح الكل / Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showVoucherModal && selectedMaterial && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-industrial-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              {/* Conditional Style for printing */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-voucher-area, #printable-voucher-area * {
                    visibility: visible !important;
                  }
                  #printable-voucher-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}} />

              {/* Header */}
              <div className={`text-white p-5 flex items-center justify-between shrink-0 ${showVoucherModal === 'issue' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <div>
                    <h3 className="text-sm font-bold">
                      {showVoucherModal === 'issue' ? 'سند صرف مواد - Material Issue Voucher (MIV)' : 'سند إرجاع مواد - Material Return Voucher (MRV)'}
                    </h3>
                    <p className="text-[10px] text-white/80">Generate official materials store transaction registry document.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(null)}
                  className="text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-industrial-50/50">
                <form id="voucher-form" onSubmit={handleConfirmVoucher} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column: Form Fields */}
                  <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-industrial-800 uppercase pb-2 border-b border-industrial-100 font-mono tracking-wider">Voucher Details / بيانات السند</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Voucher ID / الرقم التسلسلي للسند</label>
                      <input
                        type="text"
                        value={voucherId}
                        disabled
                        className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono text-industrial-600 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Work Order Reference (WO #) / رقم أمر العمل *</label>
                      <input
                        type="text"
                        value={voucherWoRef}
                        onChange={(e) => setVoucherWoRef(e.target.value)}
                        placeholder="e.g. WO-2026-0418"
                        required
                        className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Material Request Form (MRF #) / طلب المواد *</label>
                      <input
                        type="text"
                        value={voucherMrfRef}
                        onChange={(e) => setVoucherMrfRef(e.target.value)}
                        placeholder="e.g. MRF-8541"
                        required
                        className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Destination Unit / Station / الوحدة المستهدفة</label>
                      <input
                        type="text"
                        value={voucherStation}
                        onChange={(e) => setVoucherStation(e.target.value)}
                        placeholder="e.g. Oil Telemetry Manifold"
                        className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Quantity / الكمية *</label>
                        <input
                          type="number"
                          min="1"
                          max={showVoucherModal === 'issue' ? selectedMaterial.quantity : undefined}
                          value={voucherQty}
                          onChange={(e) => setVoucherQty(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                          className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg font-mono text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Date / التاريخ</label>
                        <input
                          type="date"
                          value={voucherDate}
                          onChange={(e) => setVoucherDate(e.target.value)}
                          className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg font-mono text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Recipient / Operator / مستلم العهدة *</label>
                      <input
                        type="text"
                        value={voucherRecipient}
                        onChange={(e) => setVoucherRecipient(e.target.value)}
                        placeholder="e.g. Hassan Ahmed (Technician)"
                        required
                        className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-industrial-600 uppercase font-bold">Remarks / ملاحظات السند</label>
                      <textarea
                        value={voucherNotes}
                        onChange={(e) => setVoucherNotes(e.target.value)}
                        placeholder="Enter condition notes or specific calibration requirements..."
                        rows={2}
                        className="w-full bg-white border border-industrial-250 text-xs px-3 py-2 rounded-lg text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {/* Right Column: Printable Live Template Preview */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-industrial-500 uppercase tracking-wider font-mono">Official Document Layout / المعاينة الرسمية للسند</h4>
                    
                    {/* The Printable Container */}
                    <div 
                      id="printable-voucher-area"
                      className="bg-white text-black p-6 border-2 border-black shadow-lg rounded-2xl font-sans space-y-5"
                    >
                      {/* Logo and Title */}
                      <div className="flex justify-between items-start border-b-2 border-black pb-3">
                        <div className="space-y-1">
                          <h2 className="font-extrabold text-sm tracking-tight uppercase">ZFOD Instrument Store</h2>
                          <p className="text-[9px] text-gray-500 uppercase font-bold font-mono">ZFOD ENGINEERING DEPT</p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <h2 className="font-mono font-extrabold text-gray-900 text-[11px]">{voucherId}</h2>
                          <p className="text-[9px] font-bold text-gray-600 font-mono">Date: {voucherDate}</p>
                        </div>
                      </div>

                      {/* Doc Title */}
                      <div className="text-center bg-gray-100 py-2 border border-gray-300 rounded-lg">
                        <h3 className="font-extrabold uppercase text-xs tracking-widest text-black">
                          {showVoucherModal === 'issue' ? 'Material Issue Voucher (MIV)' : 'Material Return Voucher (MRV)'}
                        </h3>
                        <p className="text-[9px] font-bold text-gray-700 font-mono">
                          {showVoucherModal === 'issue' ? 'سند صرف مواد مستودع الأجهزة' : 'سند إرجاع مواد مستودع الأجهزة'}
                        </p>
                      </div>

                      {/* Transaction Meta */}
                      <div className="grid grid-cols-2 gap-3 bg-gray-50/70 p-3 rounded-lg border border-gray-200 text-[9px] font-mono">
                        <div>
                          <span className="text-gray-450 uppercase block font-bold">Work Order (WO) Ref:</span>
                          <span className="font-bold text-black">{voucherWoRef || '(Unspecified)'}</span>
                        </div>
                        <div>
                          <span className="text-gray-450 uppercase block font-bold">Request Form (MRF #):</span>
                          <span className="font-bold text-black">{voucherMrfRef || '(Unspecified)'}</span>
                        </div>
                        <div>
                          <span className="text-gray-450 uppercase block font-bold">Station / Destination Unit:</span>
                          <span className="font-bold text-black truncate block">{voucherStation || '(Default)'}</span>
                        </div>
                        <div>
                          <span className="text-gray-450 uppercase block font-bold">Authorized Engineer:</span>
                          <span className="font-bold text-black">{currentUser.name}</span>
                        </div>
                      </div>

                      {/* Primary reference check */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-mono text-gray-450 uppercase font-bold block">Transacted Material Information</span>
                        <div className="border border-black rounded-lg overflow-hidden">
                          <table className="w-full text-left border-collapse text-[9px]">
                            <thead className="bg-gray-100 border-b border-black text-black uppercase font-bold font-mono">
                              <tr>
                                <th className="p-2 border-r border-black">Sequence #</th>
                                <th className="p-2 border-r border-black">Part Number / ID</th>
                                <th className="p-2 border-r border-black">Description</th>
                                <th className="p-2 text-right">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-300">
                                <td className="p-2 border-r border-black font-mono font-bold text-brand-800 bg-amber-50/25 text-xs">
                                  {selectedMaterial.sequence !== undefined ? `#${selectedMaterial.sequence}` : 'None'}
                                </td>
                                <td className="p-2 border-r border-black font-mono font-bold truncate max-w-28 text-xs">{selectedMaterial.partNumber}</td>
                                <td className="p-2 border-r border-black truncate max-w-44 text-xs">{selectedMaterial.description}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-black text-xs">{voucherQty} {selectedMaterial.unit}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Remarks and Recipient */}
                      <div className="grid grid-cols-2 gap-4 text-[9px] border-t border-gray-200 pt-3">
                        <div className="space-y-1">
                          <span className="text-gray-450 uppercase font-bold block">Custodian / Recipient:</span>
                          <span className="font-bold text-black block bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs">{voucherRecipient || '(Unspecified)'}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-450 uppercase font-bold block">Voucher Remarks:</span>
                          <p className="text-[8.5px] text-gray-700 italic leading-relaxed">{voucherNotes || 'No conditional notes.'}</p>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-3 gap-3 pt-5 border-t border-dashed border-gray-300 text-[8px] font-mono text-center">
                        <div className="space-y-6">
                          <span className="text-gray-500 uppercase font-bold block">1. Received By (Recipient)</span>
                          <div className="border-b border-gray-400 w-full mx-auto h-2"></div>
                          <span className="text-gray-450 block">Sign / Date</span>
                        </div>
                        <div className="space-y-6">
                          <span className="text-gray-500 uppercase font-bold block">2. Warehouse In-Charge</span>
                          <div className="border-b border-gray-400 w-full mx-auto h-2"></div>
                          <span className="text-gray-450 block">Sign / Date</span>
                        </div>
                        <div className="space-y-6">
                          <span className="text-gray-500 uppercase font-bold block">3. Authorized Engineer</span>
                          <div className="border-b border-gray-400 w-full mx-auto h-2"></div>
                          <span className="text-gray-450 block font-bold text-gray-800">{currentUser.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Bottom Nav / Actions */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(null)}
                  className="bg-white border border-industrial-250 hover:bg-industrial-100 text-industrial-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="submit"
                  form="voucher-form"
                  className={`text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                    showVoucherModal === 'issue' 
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/10' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/10'
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  <span>تأكيد وطباعة السند / Confirm & Print Voucher</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
