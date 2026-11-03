/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  ArrowRight, 
  CornerDownLeft, 
  Sparkles, 
  Clock, 
  Layers, 
  LayoutDashboard, 
  PlusCircle, 
  Zap, 
  Compass, 
  Warehouse, 
  Building2, 
  FileText, 
  ShieldCheck, 
  FileCheck2, 
  ShieldAlert, 
  FileSpreadsheet, 
  Cloud, 
  BarChart3, 
  Shield, 
  Trash2, 
  Database, 
  Activity, 
  Globe, 
  GitBranch, 
  BellRing,
  Barcode,
  ClipboardCheck,
  ShoppingCart,
  Hourglass,
  Wrench,
  Download,
  FolderKanban,
  Star
} from 'lucide-react';
import { UserRole, WarehouseFile } from '../types';
import { dbService } from '../services/dbService';
import { useLanguage } from '../contexts/LanguageContext';

export interface NavItemConfig {
  id: string;
  nameKey: string;
  fallbackName: string;
  arabicName: string;
  icon: any;
  groupId: string;
  groupTitleKey: string;
  fallbackGroupTitle: string;
  arabicGroupTitle: string;
  roles: UserRole[];
  badge?: string | null;
  keywords: string[];
}

export const ALL_NAV_ITEMS: NavItemConfig[] = [
  // ==========================================
  // GROUP 1: WORKSPACE (مساحة العمل)
  // ==========================================
  {
    id: 'dashboard',
    nameKey: 'dashboard',
    fallbackName: 'Command Center & Dashboard',
    arabicName: 'لوحة القيادة ومساحة العمل',
    icon: LayoutDashboard,
    groupId: 'group-workspace',
    groupTitleKey: 'groupWorkspace',
    fallbackGroupTitle: 'Workspace',
    arabicGroupTitle: 'مساحة العمل',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['home', 'overview', 'dashboard', 'workspace', 'رئيسية', 'لوحة', 'عمل', 'مؤشرات']
  },
  {
    id: 'search',
    nameKey: 'search',
    fallbackName: 'Universal Search & OCR',
    arabicName: 'البحث الشامل وقراءة اللوحات',
    icon: Search,
    groupId: 'group-workspace',
    groupTitleKey: 'groupWorkspace',
    fallbackGroupTitle: 'Workspace',
    arabicGroupTitle: 'مساحة العمل',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['search', 'find', 'lookup', 'ocr', 'nameplate', 'query', 'بحث', 'شامل', 'لوحة', 'استعلام']
  },
  {
    id: 'action-center',
    nameKey: 'actionCenter',
    fallbackName: 'Action Center & Direct Alerts',
    arabicName: 'مركز الإجراءات والتنبيهات',
    icon: BellRing,
    groupId: 'group-workspace',
    groupTitleKey: 'groupWorkspace',
    fallbackGroupTitle: 'Workspace',
    arabicGroupTitle: 'مساحة العمل',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['alerts', 'tasks', 'actions', 'approvals', 'مهام', 'تنبيهات', 'اجراءات', 'اعتماد']
  },
  {
    id: 'traceability',
    nameKey: 'traceability',
    fallbackName: 'Material Traceability & Lineage',
    arabicName: 'تتبع حركات وسلسلة الحيازة',
    icon: GitBranch,
    groupId: 'group-workspace',
    groupTitleKey: 'groupWorkspace',
    fallbackGroupTitle: 'Workspace',
    arabicGroupTitle: 'مساحة العمل',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['lifecycle', 'history', 'chain', 'lineage', 'movements', 'تتبع', 'سلسلة', 'مسار', 'حيازة', 'نشاط']
  },

  // ==========================================
  // GROUP 2: MATERIAL MANAGEMENT (إدارة المواد والمستودعات)
  // ==========================================
  {
    id: 'warehouse-files',
    nameKey: 'warehouseFiles',
    fallbackName: 'Warehouse Files Manager',
    arabicName: 'إدارة ملفات المخازن',
    icon: FolderKanban,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['files', 'excel', 'warehouses', 'stores', 'ملفات', 'مخازن', 'اكسل', 'مجموعات', 'ndgs']
  },
  {
    id: 'materials',
    nameKey: 'materials',
    fallbackName: 'Materials Ledger',
    arabicName: 'سجل المواد والمخزون',
    icon: Layers,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['inventory', 'parts', 'stock', 'ledger', 'catalog', 'مواد', 'مخزن', 'قطع', 'سجل']
  },
  {
    id: 'add-material',
    nameKey: 'addMaterial',
    fallbackName: 'Add Material',
    arabicName: 'إضافة مادة جديدة',
    icon: PlusCircle,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER],
    keywords: ['new', 'create', 'register', 'اضافة', 'جديد', 'تسجيل']
  },
  {
    id: 'excel-import',
    nameKey: 'excelImport',
    fallbackName: 'Excel Import & Data Ingestion',
    arabicName: 'استيراد وترحيل ملفات إكسل',
    icon: FileSpreadsheet,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE],
    keywords: ['xlsx', 'csv', 'bulk', 'ingest', 'اكسل', 'استيراد', 'رفع', 'بيانات']
  },
  {
    id: 'enterprise',
    nameKey: 'enterprise',
    fallbackName: 'Enterprise Operations & Vouchers',
    arabicName: 'أذونات الصرف والاستلام والتحويل',
    icon: Building2,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['warehouse', 'issuance', 'receiving', 'transfer', 'استلام', 'صرف', 'تحويل', 'مستودع']
  },
  {
    id: 'external-stock',
    nameKey: 'externalStock',
    fallbackName: 'External Stores & Partners',
    arabicName: 'المخازن الخارجية والشركاء',
    icon: Warehouse,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['external', 'third-party', 'store', 'خارجي', 'مستودعات', 'شريك']
  },
  {
    id: 'reorder-hub',
    nameKey: 'reorderHub',
    fallbackName: 'Reorder Automation & Requisitions',
    arabicName: 'حساب النواقص وإعادة الطلب',
    icon: ShoppingCart,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['reorder', 'pr', 'purchase', 'deficit', 'eoq', 'اعادة طلب', 'شراء', 'نواقص']
  },
  {
    id: 'shelf-life',
    nameKey: 'shelfLife',
    fallbackName: 'Shelf-Life & Dead Stock',
    arabicName: 'الصلاحية والمخزون الراكد',
    icon: Hourglass,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['aging', 'dead stock', 'shelf life', 'expiry', 'راكد', 'صلاحية', 'انتهاء', 'عمر المخزون']
  },
  {
    id: 'barcode-studio',
    nameKey: 'barcodeStudio',
    fallbackName: 'Barcode & Tag Label Studio',
    arabicName: 'استوديو ملصقات الباركود والرفوف',
    icon: Barcode,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['barcode', 'qr', 'label', 'shelf', 'طباعة', 'باركود', 'ملصقات', 'رف']
  },
  {
    id: 'cycle-count',
    nameKey: 'cycleCount',
    fallbackName: 'Cycle Count & Physical Audit',
    arabicName: 'الجرد الدوري والمطابقة الميدانية',
    icon: ClipboardCheck,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Material Management',
    arabicGroupTitle: 'إدارة المواد والمستودعات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['audit', 'count', 'cycle', 'reconciliation', 'جرد', 'تدقيق', 'تسوية', 'مطابقة']
  },

  // ==========================================
  // GROUP 3: ENGINEERING & INSPECTION (الهندسة والفحص الفني)
  // ==========================================
  {
    id: 'equipment',
    nameKey: 'equipment',
    fallbackName: 'Equipment & Loops Register',
    arabicName: 'سجل المعدات والحلقات الهندسية',
    icon: Warehouse,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['tag', 'machinery', 'plant', 'station', 'loops', 'معدات', 'موقع', 'تاج', 'محطة']
  },
  {
    id: 'decisions',
    nameKey: 'decisions',
    fallbackName: 'Engineering Decisions & Approvals',
    arabicName: 'القرارات الهندسية والاعتمادات',
    icon: FileCheck2,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['approval', 'review', 'sign-off', 'موافقة', 'قرار', 'اعتماد', 'هندسي']
  },
  {
    id: 'material-intelligence',
    nameKey: 'materialIntelligence',
    fallbackName: 'Multilingual Technical Specs & AI Match',
    arabicName: 'الترجمة الهندسية ومطابقة المواصفات',
    icon: Globe,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['arabic', 'translate', 'meaning', 'specs', 'ترجمة', 'عربي', 'معنى', 'مواصفات']
  },
  {
    id: 'ai-copilot',
    nameKey: 'aiCopilot',
    fallbackName: 'AI Engineering Assistant',
    arabicName: 'المساعد الهندسي الذكي',
    icon: Zap,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['assistant', 'gemini', 'chat', 'diagnostics', 'ذكاء', 'مساعد', 'جمناي', 'تشخيص']
  },
  {
    id: 'verification',
    nameKey: 'verification',
    fallbackName: 'Engineering Standards Verification',
    arabicName: 'التحقق الفني ومطابقة المعايير',
    icon: ShieldCheck,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['qa', 'qc', 'specs', 'standards', 'مطابقة', 'تحقق', 'هندسي', 'معايير']
  },
  {
    id: 'mrf-management',
    nameKey: 'mrfManagement',
    fallbackName: 'MR, PO, WO & QC Inspection',
    arabicName: 'أوامر العمل وفحص الاستلام MTR',
    icon: FileText,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['mrf', 'purchase', 'work order', 'inspection', 'شراء', 'فحص', 'اوامر', 'استلام']
  },
  {
    id: 'blacklist',
    nameKey: 'blacklist',
    fallbackName: 'Quarantine & Rejected Materials',
    arabicName: 'الحجر الفني والمواد المحظورة',
    icon: ShieldAlert,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['quarantine', 'rejected', 'banned', 'counterfeit', 'حجر', 'مرفوض', 'حظر', 'مقلد']
  },
  {
    id: 'documents',
    nameKey: 'documents',
    fallbackName: 'Technical Documents & Test Certificates',
    arabicName: 'أرشيف الوثائق وشهادات الفحص',
    icon: FileText,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['pdf', 'datasheet', 'coc', 'mtr', 'files', 'ملفات', 'وثائق', 'شهادات', 'فحص']
  },
  {
    id: 'preventive-maintenance',
    nameKey: 'preventiveMaintenance',
    fallbackName: 'Preventive Maintenance & PM Kits',
    arabicName: 'الصيانة الوقائية وحزم قطع الغيار',
    icon: Wrench,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['pm', 'maintenance', 'spare parts', 'schedule', 'kit', 'صيانة', 'وقائية', 'جدول', 'قطع غيار']
  },
  {
    id: 'data-quality',
    nameKey: 'dataQuality',
    fallbackName: 'Data Integrity & Quality Center',
    arabicName: 'مركز سلامة وجودة البيانات',
    icon: Shield,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['integrity', 'audit', 'validation', 'تدقيق', 'جودة', 'سلامة']
  },
  {
    id: 'intelligence',
    nameKey: 'intelligence',
    fallbackName: 'Market Intelligence & Forecasting',
    arabicName: 'استخبارات السوق والأسعار التنبؤية',
    icon: Compass,
    groupId: 'group-engineering',
    groupTitleKey: 'groupEngineering',
    fallbackGroupTitle: 'Engineering & Inspection',
    arabicGroupTitle: 'الهندسة والفحص الفني',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['analytics', 'market', 'pricing', 'trends', 'تحليلات', 'اسعار', 'سوق', 'تنبؤ']
  },

  // ==========================================
  // GROUP 4: REPORTS & SYSTEM (التقارير وإدارة المنظومة)
  // ==========================================
  {
    id: 'reports',
    nameKey: 'reports',
    fallbackName: 'Executive Reports & Analytics',
    arabicName: 'التقارير التحليلية والإحصاءات',
    icon: BarChart3,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['charts', 'metrics', 'kpi', 'analytics', 'تقارير', 'مؤشرات', 'بيانات']
  },
  {
    id: 'workflow-approvals',
    nameKey: 'workflowApprovals',
    fallbackName: 'Workflow Approvals & Sign-off',
    arabicName: 'سير الاعتمادات والتوقيعات الإلكترونية',
    icon: FileCheck2,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['approval', 'workflow', 'sign', 'electronic', 'موافقات', 'اعتماد', 'توقيع', 'دورة']
  },
  {
    id: 'backup-sync',
    nameKey: 'backupSync',
    fallbackName: 'Backup & Cloud Sync Hub',
    arabicName: 'النسخ الاحتياطي والمزامنة السحابية',
    icon: Database,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER],
    keywords: ['export', 'offline', 'firestore', 'cloud', 'نسخ', 'مزامنة', 'سحابي', 'قاعدة']
  },
  {
    id: 'admin-governance',
    nameKey: 'adminGovernance',
    fallbackName: 'User Management, Sites & Access',
    arabicName: 'إدارة المستخدمين والمواقع والصلاحيات',
    icon: ShieldCheck,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN],
    keywords: ['users', 'roles', 'sites', 'warehouses', 'مشرف', 'مستخدمين', 'مواقع', 'صلاحيات']
  },
  {
    id: 'recycle-bin',
    nameKey: 'recycleBin',
    fallbackName: 'Recycle Bin & Data Vault',
    arabicName: 'سلة المحذوفات واسترجاع البيانات',
    icon: Trash2,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR],
    keywords: ['trash', 'deleted', 'restore', 'سلة', 'محذوفات', 'استرجاع', 'أمان']
  },
  {
    id: 'governance',
    nameKey: 'governance',
    fallbackName: 'Governance & SOP Operations',
    arabicName: 'الحوكمة وإجراءات التشغيل القياسية',
    icon: ShieldCheck,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['policy', 'sop', 'rules', 'سياسات', 'حوكمة', 'اجراءات', 'معايير']
  },
  {
    id: 'google-drive',
    nameKey: 'googleDrive',
    fallbackName: 'Google Drive Cloud Storage',
    arabicName: 'خزينة جوجل درايف السحابية',
    icon: Cloud,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['cloud', 'storage', 'drive', 'سحابي', 'درايف', 'تخزين']
  },
  {
    id: 'ai-diagnostics',
    nameKey: 'aiDiagnostics',
    fallbackName: 'System Health & Diagnostics',
    arabicName: 'تشخيص النظام والخدمات السحابية',
    icon: Activity,
    groupId: 'group-system',
    groupTitleKey: 'groupSystem',
    fallbackGroupTitle: 'Reports & System',
    arabicGroupTitle: 'التقارير وإدارة المنظومة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['status', 'api', 'health', 'diagnostics', 'تشخيص', 'فحص', 'اعدادات', 'صحة']
  }
];

interface QuickNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigateTab: (tabId: string, query?: string) => void;
  userRole: UserRole;
  recentTabs?: string[];
}

export default function QuickNavigationModal({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  userRole,
  recentTabs = []
}: QuickNavigationModalProps) {
  const { language, t, isRTL } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('emis_quick_nav_favorites');
      return saved ? JSON.parse(saved) : ['dashboard', 'materials', 'search', 'warehouse-files'];
    } catch {
      return ['dashboard', 'materials', 'search', 'warehouse-files'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('emis_quick_nav_favorites', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save favorites', err);
      }
      return next;
    });
  };

  // Available items for this user role
  const allowedItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  // Warehouse files for direct file jumping
  const [warehouseFiles, setWarehouseFiles] = useState<WarehouseFile[]>(() => dbService.getWarehouseFiles());
  useEffect(() => {
    setWarehouseFiles(dbService.getWarehouseFiles());
  }, [isOpen]);

  // Filter items by category & search query
  const filteredItems = allowedItems.filter(item => {
    // Category match
    if (activeCategory === 'favorites') {
      if (!favorites.includes(item.id)) return false;
    } else if (activeCategory !== 'all' && item.groupId !== activeCategory) {
      return false;
    }

    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    const nameLocalized = (t(item.nameKey as any) || item.fallbackName).toLowerCase();
    const groupLocalized = (t(item.groupTitleKey as any) || item.fallbackGroupTitle).toLowerCase();
    const enName = item.fallbackName.toLowerCase();
    const arName = item.arabicName.toLowerCase();
    const keywordsMatch = item.keywords.some(k => k.toLowerCase().includes(q));

    return (
      nameLocalized.includes(q) ||
      groupLocalized.includes(q) ||
      enName.includes(q) ||
      arName.includes(q) ||
      keywordsMatch ||
      item.id.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    // In 'all' or when no search query, put favorites at the top
    if (!query.trim() && activeCategory === 'all') {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
    }
    return 0;
  });

  // Matching warehouse files when query is entered
  const matchingFiles = query.trim() ? warehouseFiles.filter(f => {
    const q = query.toLowerCase().trim();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.warehouseName && f.warehouseName.toLowerCase().includes(q)) ||
      (f.warehouseCode && f.warehouseCode.toLowerCase().includes(q))
    );
  }) : [];

  // Core Categories
  const categories = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { id: 'favorites', label: language === 'ar' ? `المفضلة (${favorites.length})` : `Favorites (${favorites.length})` },
    { id: 'group-workspace', label: language === 'ar' ? 'مساحة العمل' : 'Workspace' },
    { id: 'group-materials', label: language === 'ar' ? 'إدارة المواد' : 'Materials' },
    { id: 'group-engineering', label: language === 'ar' ? 'الهندسة والفحص' : 'Engineering' },
    { id: 'group-system', label: language === 'ar' ? 'التقارير والنظام' : 'System' },
  ];

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected index valid
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (tabId: string) => {
    onNavigateTab(tabId);
    onClose();
  };

  // Scroll selected element into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-industrial-950/70 backdrop-blur-sm select-none"
        onClick={onClose}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-industrial-900 rounded-2xl shadow-2xl border border-industrial-200 dark:border-industrial-750 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header & Search Bar */}
          <div className="p-3 sm:p-4 border-b border-industrial-100 dark:border-industrial-800 bg-industrial-50/70 dark:bg-industrial-850/50">
            <div className="relative flex items-center">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-industrial-400`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === 'ar' ? 'ابحث في أي قائمة أو وظيفة (مثال: مخزون، فحص، استيراد)...' : 'Jump to any screen or module (e.g. materials, inspect, import)...'}
                className={`w-full py-2.5 ${isRTL ? 'pr-10 pl-20' : 'pl-10 pr-20'} bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-750 rounded-xl text-sm text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all`}
              />
              <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} flex items-center gap-1.5`}>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-industrial-150 dark:bg-industrial-800 text-industrial-500 dark:text-industrial-400 border border-industrial-200 dark:border-industrial-700">
                  ESC
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200 rounded-lg hover:bg-industrial-100 dark:hover:bg-industrial-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => {
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100 dark:hover:bg-industrial-750 border border-industrial-200/80 dark:border-industrial-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div 
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-industrial-100/60 dark:divide-industrial-800/60"
          >
            {/* Matching Warehouse Files (if searching) */}
            {matchingFiles.length > 0 && (
              <div className="pb-2 mb-2 space-y-1 border-b border-indigo-100 dark:border-indigo-900/40">
                <div className="px-2 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>{language === 'ar' ? 'ملفات المخازن المطابقة للبحث' : 'Matching Warehouse Files'}</span>
                </div>
                {matchingFiles.map(file => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab('materials', file.name);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/50 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 transition-colors text-left cursor-pointer border border-indigo-200/50 dark:border-indigo-800/40"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-100 truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-bold">
                            {file.materialCount || 0} مواد
                          </span>
                        </div>
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
                          {file.warehouseName || file.warehouseCode} · انقر لفتح مواد هذا الملف مباشرة
                        </div>
                      </div>
                    </div>
                    <CornerDownLeft className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && matchingFiles.length === 0 ? (
              <div className="py-12 text-center text-industrial-400">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-industrial-300 opacity-60" />
                <p className="text-sm font-medium">
                  {language === 'ar' ? 'لم يتم العثور على قوائم أو ملفات مطابقة لبحثك' : 'No matching screens or warehouse files found'}
                </p>
                <p className="text-xs text-industrial-400 mt-1">
                  {language === 'ar' ? 'جرب البحث بكلمات أخرى أو اختر "الكل"' : 'Try searching by a different term or select "All"'}
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                const isCurrentlyActive = activeTab === item.id;
                const isFav = favorites.includes(item.id);
                const nameDisplay = language === 'ar' ? item.arabicName : (t(item.nameKey as any) || item.fallbackName);
                const subName = language === 'ar' ? item.fallbackName : item.arabicName;
                const groupDisplay = language === 'ar' ? item.arabicGroupTitle : (t(item.groupTitleKey as any) || item.fallbackGroupTitle);

                return (
                  <button
                    key={item.id}
                    data-index={idx}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-colors text-left cursor-pointer group ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-100 ring-1 ring-brand-500/20'
                        : 'hover:bg-industrial-50 dark:hover:bg-industrial-850 text-industrial-700 dark:text-industrial-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isCurrentlyActive
                          ? 'bg-brand-600 text-white'
                          : isSelected
                          ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                          : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-500 dark:text-industrial-400'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold truncate leading-tight">
                            {nameDisplay}
                          </span>
                          {isCurrentlyActive && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-600 dark:text-brand-300 font-bold border border-brand-500/30">
                              {language === 'ar' ? 'القائمة الحالية' : 'Active'}
                            </span>
                          )}
                          {item.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-industrial-150 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-industrial-400 dark:text-industrial-400 mt-0.5">
                          <span className="truncate">{subName}</span>
                          <span className="text-industrial-300 dark:text-industrial-600">•</span>
                          <span className="font-mono text-[10px] text-industrial-400 dark:text-industrial-400">
                            {groupDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, item.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isFav
                            ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-industrial-300 dark:text-industrial-600 hover:text-amber-500 hover:bg-industrial-100 dark:hover:bg-industrial-800'
                        }`}
                        title={isFav ? 'إزالة من المفضلة' : 'تثبيت في المفضلة'}
                      >
                        <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`} />
                      </button>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <span className="text-xs text-brand-600 dark:text-brand-400 font-medium hidden sm:inline">
                          {language === 'ar' ? 'انتقال' : 'Open'}
                        </span>
                        <CornerDownLeft className="h-3.5 w-3.5 text-brand-500" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="px-4 py-2.5 bg-industrial-50 dark:bg-industrial-850 border-t border-industrial-150 dark:border-industrial-800 flex items-center justify-between text-[11px] text-industrial-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono text-[10px]">↓</kbd>
                <span>{language === 'ar' ? 'للتنقل' : 'Navigate'}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono text-[10px]">↵</kbd>
                <span>{language === 'ar' ? 'للاختيار' : 'Select'}</span>
              </span>
            </div>
            <span className="font-mono text-[10px]">
              {filteredItems.length} {language === 'ar' ? 'قائمة متاحة' : 'screens'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
