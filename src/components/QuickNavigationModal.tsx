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
  Download
} from 'lucide-react';
import { UserRole } from '../types';
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
  // Command Center
  {
    id: 'dashboard',
    nameKey: 'dashboard',
    fallbackName: 'Command Center',
    arabicName: 'لوحة التحكم والقيادة',
    icon: LayoutDashboard,
    groupId: 'group-dashboard',
    groupTitleKey: 'groupCommandCenter',
    fallbackGroupTitle: 'Command Center',
    arabicGroupTitle: 'مركز القيادة والتحكم',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['home', 'overview', 'stats', 'رئيسية', 'لوحة', 'احصائيات']
  },
  {
    id: 'action-center',
    nameKey: 'actionCenter',
    fallbackName: 'Action Center',
    arabicName: 'مركز الإجراءات والتنبيهات',
    icon: BellRing,
    groupId: 'group-dashboard',
    groupTitleKey: 'groupCommandCenter',
    fallbackGroupTitle: 'Command Center',
    arabicGroupTitle: 'مركز القيادة والتحكم',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['alerts', 'tasks', 'actions', 'مهام', 'تنبيهات', 'اجراءات']
  },

  // Materials
  {
    id: 'materials',
    nameKey: 'materials',
    fallbackName: 'Materials Ledger',
    arabicName: 'سجل المواد والمخزون',
    icon: Layers,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Materials Management',
    arabicGroupTitle: 'إدارة المواد والمخزون',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['inventory', 'parts', 'stock', 'مواد', 'مخزن', 'قطع']
  },
  {
    id: 'add-material',
    nameKey: 'addMaterial',
    fallbackName: 'Add Material',
    arabicName: 'إضافة مادة جديدة',
    icon: PlusCircle,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Materials Management',
    arabicGroupTitle: 'إدارة المواد والمخزون',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER],
    keywords: ['new', 'create', 'register', 'اضافة', 'جديد', 'تسجيل']
  },
  {
    id: 'traceability',
    nameKey: 'traceability',
    fallbackName: 'Material Traceability',
    arabicName: 'تتبع مسار المواد',
    icon: GitBranch,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Materials Management',
    arabicGroupTitle: 'إدارة المواد والمخزون',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'New',
    keywords: ['lifecycle', 'history', 'chain', 'تتبع', 'سلسلة', 'مسار']
  },
  {
    id: 'material-intelligence',
    nameKey: 'materialIntelligence',
    fallbackName: 'Multilingual Intelligence',
    arabicName: 'الترجمة والذكاء الفني',
    icon: Globe,
    groupId: 'group-materials',
    groupTitleKey: 'groupMaterials',
    fallbackGroupTitle: 'Materials Management',
    arabicGroupTitle: 'إدارة المواد والمخزون',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'Port 9',
    keywords: ['arabic', 'translate', 'meaning', 'ترجمة', 'عربي', 'معنى']
  },

  // Search & AI
  {
    id: 'search',
    nameKey: 'search',
    fallbackName: 'Global Smart Search',
    arabicName: 'البحث الذكي الشامل',
    icon: Search,
    groupId: 'group-search',
    groupTitleKey: 'groupSearch',
    fallbackGroupTitle: 'Search & Intelligence',
    arabicGroupTitle: 'البحث والاستخبارات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['find', 'lookup', 'query', 'بحث', 'استعلام', 'تنقيب']
  },
  {
    id: 'ai-copilot',
    nameKey: 'aiCopilot',
    fallbackName: 'AI Co-Pilot',
    arabicName: 'المساعد الهندسي الذكي',
    icon: Zap,
    groupId: 'group-search',
    groupTitleKey: 'groupSearch',
    fallbackGroupTitle: 'Search & Intelligence',
    arabicGroupTitle: 'البحث والاستخبارات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'AI',
    keywords: ['assistant', 'gemini', 'chat', 'ذكاء', 'مساعد', 'جمناي']
  },
  {
    id: 'intelligence',
    nameKey: 'intelligence',
    fallbackName: 'Intelligence & Insights',
    arabicName: 'الاستخبارات والتحليلات',
    icon: Compass,
    groupId: 'group-search',
    groupTitleKey: 'groupSearch',
    fallbackGroupTitle: 'Search & Intelligence',
    arabicGroupTitle: 'البحث والاستخبارات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['analytics', 'market', 'pricing', 'تحليلات', 'اسعار', 'سوق']
  },
  {
    id: 'external-stock',
    nameKey: 'externalStock',
    fallbackName: 'External Stores Manager',
    arabicName: 'إدارة المخازن الخارجية',
    icon: Warehouse,
    groupId: 'group-search',
    groupTitleKey: 'groupSearch',
    fallbackGroupTitle: 'Search & Intelligence',
    arabicGroupTitle: 'البحث والاستخبارات',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['external', 'third-party', 'store', 'خارجي', 'مستودعات', 'شريك']
  },

  // Operations & Engineering
  {
    id: 'enterprise',
    nameKey: 'enterprise',
    fallbackName: 'Enterprise Operations',
    arabicName: 'العمليات المؤسسية والمخزنية',
    icon: Building2,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['warehouse', 'issuance', 'receiving', 'استلام', 'صرف', 'تحويل']
  },
  {
    id: 'mrf-management',
    nameKey: 'mrfManagement',
    fallbackName: 'MR, PO, WO & Inspection',
    arabicName: 'طلبات الشراء وفحص المواد',
    icon: FileText,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'QA',
    keywords: ['mrf', 'purchase', 'work order', 'شراء', 'فحص', 'اوامر']
  },
  {
    id: 'verification',
    nameKey: 'verification',
    fallbackName: 'Engineering Verification',
    arabicName: 'المطابقة والتحقق الهندسي',
    icon: ShieldCheck,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['qa', 'qc', 'specs', 'مطابقة', 'تحقق', 'هندسي']
  },
  {
    id: 'equipment',
    nameKey: 'equipment',
    fallbackName: 'Equipment Register',
    arabicName: 'سجل المعدات والآلات',
    icon: Warehouse,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['tag', 'machinery', 'plant', 'معدات', 'موقع', 'تاج']
  },
  {
    id: 'decisions',
    nameKey: 'decisions',
    fallbackName: 'Engineering Decisions',
    arabicName: 'القرارات الهندسية والموافقات',
    icon: FileCheck2,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['approval', 'review', 'sign-off', 'موافقة', 'قرار', 'اعتماد']
  },
  {
    id: 'blacklist',
    nameKey: 'blacklist',
    fallbackName: 'Blacklist & Quarantine',
    arabicName: 'الحجر الفني والقائمة المحظورة',
    icon: ShieldAlert,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['quarantine', 'rejected', 'banned', 'حجر', 'مرفوض', 'حظر']
  },
  {
    id: 'barcode-studio',
    nameKey: 'barcodeStudio',
    fallbackName: 'Barcode & Shelf Label Studio',
    arabicName: 'استوديو طباعة ملصقات الباركود والرفوف',
    icon: Barcode,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'DPI',
    keywords: ['barcode', 'qr', 'label', 'shelf', 'thermal', 'طباعة', 'باركود', 'ملصقات', 'رف']
  },
  {
    id: 'cycle-count',
    nameKey: 'cycleCount',
    fallbackName: 'Cycle Counting & Physical Inventory',
    arabicName: 'الجرد الدوري والتدقيق الميداني',
    icon: ClipboardCheck,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'Audit',
    keywords: ['audit', 'count', 'cycle', 'reconciliation', 'variance', 'جرد', 'تدقيق', 'تسوية', 'مطابقة']
  },
  {
    id: 'reorder-hub',
    nameKey: 'reorderHub',
    fallbackName: 'Automated Reorder & Requisitions',
    arabicName: 'مركز أتمتة إعادة الطلب والمشتريات',
    icon: ShoppingCart,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'PR',
    keywords: ['reorder', 'pr', 'purchase', 'deficit', 'eoq', 'اعادة طلب', 'شراء', 'نواقص']
  },
  {
    id: 'shelf-life',
    nameKey: 'shelfLife',
    fallbackName: 'Shelf-Life & Dead Stock',
    arabicName: 'إدارة الصلاحية والمخزون الراكد',
    icon: Hourglass,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'Aging',
    keywords: ['aging', 'dead stock', 'shelf life', 'expiry', 'o-ring', 'راكد', 'صلاحية', 'انتهاء', 'عمر المخزون']
  },
  {
    id: 'preventive-maintenance',
    nameKey: 'preventiveMaintenance',
    fallbackName: 'Preventive Maintenance & PM Kits',
    arabicName: 'الصيانة الوقائية وحزم قطع الغيار',
    icon: Wrench,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'PM',
    keywords: ['pm', 'maintenance', 'spare parts', 'schedule', 'kit', 'صيانة', 'وقائية', 'جدول', 'قطع غيار']
  },
  {
    id: 'workflow-approvals',
    nameKey: 'workflowApprovals',
    fallbackName: 'Workflow Approvals & Sign-off',
    arabicName: 'دورة الموافقات والاعتماد الرقمي',
    icon: FileCheck2,
    groupId: 'group-ops',
    groupTitleKey: 'groupOps',
    fallbackGroupTitle: 'Operations & Engineering',
    arabicGroupTitle: 'العمليات والهندسة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'Sign',
    keywords: ['approval', 'workflow', 'sign', 'electronic', 'موافقات', 'اعتماد', 'توقيع', 'دورة']
  },

  // Documents
  {
    id: 'documents',
    nameKey: 'documents',
    fallbackName: 'Document Center',
    arabicName: 'مركز الوثائق والمستندات',
    icon: FileText,
    groupId: 'group-docs',
    groupTitleKey: 'groupDocs',
    fallbackGroupTitle: 'Documents & Import',
    arabicGroupTitle: 'الوثائق والاستيراد',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['pdf', 'datasheet', 'files', 'ملفات', 'وثائق', 'شهادات']
  },
  {
    id: 'excel-import',
    nameKey: 'excelImport',
    fallbackName: 'Excel Import Center',
    arabicName: 'مركز استيراد ملفات إكسل',
    icon: FileSpreadsheet,
    groupId: 'group-docs',
    groupTitleKey: 'groupDocs',
    fallbackGroupTitle: 'Documents & Import',
    arabicGroupTitle: 'الوثائق والاستيراد',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE],
    badge: 'Smart',
    keywords: ['xlsx', 'csv', 'bulk', 'اكسل', 'استيراد', 'رفع']
  },
  {
    id: 'google-drive',
    nameKey: 'googleDrive',
    fallbackName: 'Google Drive Vault',
    arabicName: 'خزينة جوجل درايف السحابية',
    icon: Cloud,
    groupId: 'group-docs',
    groupTitleKey: 'groupDocs',
    fallbackGroupTitle: 'Documents & Import',
    arabicGroupTitle: 'الوثائق والاستيراد',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['cloud', 'storage', 'drive', 'سحابي', 'درايف', 'تخزين']
  },

  // Reports
  {
    id: 'reports',
    nameKey: 'reports',
    fallbackName: 'Reports & Analytics',
    arabicName: 'التقارير والإحصاءات',
    icon: BarChart3,
    groupId: 'group-reports',
    groupTitleKey: 'groupReports',
    fallbackGroupTitle: 'Reports & Quality',
    arabicGroupTitle: 'التقارير والجودة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['charts', 'metrics', 'kpi', 'تقارير', 'مؤشرات', 'بيانات']
  },
  {
    id: 'data-quality',
    nameKey: 'dataQuality',
    fallbackName: 'Data Quality Center',
    arabicName: 'مركز جودة وتدقيق البيانات',
    icon: Shield,
    groupId: 'group-reports',
    groupTitleKey: 'groupReports',
    fallbackGroupTitle: 'Reports & Quality',
    arabicGroupTitle: 'التقارير والجودة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'Port 14',
    keywords: ['integrity', 'audit', 'validation', 'تدقيق', 'جودة', 'سلامة']
  },

  // Admin
  {
    id: 'admin-governance',
    nameKey: 'adminGovernance',
    fallbackName: 'Admin Control & Sites',
    arabicName: 'إدارة المواقع والصلاحيات',
    icon: ShieldCheck,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN],
    badge: 'Admin',
    keywords: ['users', 'roles', 'sites', 'مشرف', 'مستخدمين', 'مواقع']
  },
  {
    id: 'recycle-bin',
    nameKey: 'recycleBin',
    fallbackName: 'Recycle Bin & Data Safety',
    arabicName: 'سلة المحذوفات وأمان البيانات',
    icon: Trash2,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR],
    badge: 'Restore',
    keywords: ['trash', 'deleted', 'restore', 'سلة', 'محذوفات', 'استرجاع']
  },
  {
    id: 'backup-sync',
    nameKey: 'backupSync',
    fallbackName: 'Backup & Cloud Sync',
    arabicName: 'النسخ الاحتياطي والمزامنة',
    icon: Database,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER],
    keywords: ['export', 'offline', 'firestore', 'نسخ', 'مزامنة', 'سحابي']
  },
  {
    id: 'governance',
    nameKey: 'governance',
    fallbackName: 'Governance & SOPs',
    arabicName: 'الحوكمة وإجراءات التشغيل',
    icon: ShieldCheck,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['policy', 'sop', 'rules', 'سياسات', 'حوكمة', 'اجراءات']
  },
  {
    id: 'ai-diagnostics',
    nameKey: 'aiDiagnostics',
    fallbackName: 'Diagnostics & Settings',
    arabicName: 'تشخيص النظام والإعدادات',
    icon: Activity,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    keywords: ['status', 'api', 'health', 'تشخيص', 'فحص', 'اعدادات']
  },
  {
    id: 'install-app',
    nameKey: 'installApp',
    fallbackName: 'Install App on Device',
    arabicName: 'تثبيت التطبيق على جهازي (PWA)',
    icon: Download,
    groupId: 'group-admin',
    groupTitleKey: 'groupAdmin',
    fallbackGroupTitle: 'Administration & Governance',
    arabicGroupTitle: 'الإدارة والحوكمة',
    roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER],
    badge: 'PWA',
    keywords: ['install', 'download', 'pwa', 'desktop', 'app', 'apk', 'offline', 'تثبيت', 'تحميل', 'تطبيق', 'جهاز', 'كمبيوتر', 'هاتف']
  }
];

interface QuickNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigateTab: (tabId: string) => void;
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

  // Available items for this user role
  const allowedItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  // Filter items by category & search query
  const filteredItems = allowedItems.filter(item => {
    // Category match
    if (activeCategory !== 'all' && item.groupId !== activeCategory) {
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
  });

  // Unique categories for pills
  const categories = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { id: 'group-dashboard', label: language === 'ar' ? 'الرئيسية' : 'Core' },
    { id: 'group-materials', label: language === 'ar' ? 'المواد' : 'Materials' },
    { id: 'group-search', label: language === 'ar' ? 'الذكاء والبحث' : 'Search & AI' },
    { id: 'group-ops', label: language === 'ar' ? 'العمليات' : 'Operations' },
    { id: 'group-docs', label: language === 'ar' ? 'الوثائق' : 'Documents' },
    { id: 'group-reports', label: language === 'ar' ? 'التقارير' : 'Reports' },
    { id: 'group-admin', label: language === 'ar' ? 'الإدارة' : 'Admin' },
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
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-industrial-400">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-industrial-300 opacity-60" />
                <p className="text-sm font-medium">
                  {language === 'ar' ? 'لم يتم العثور على قوائم مطابقة لبحثك' : 'No matching screens found'}
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

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-medium hidden sm:inline">
                        {language === 'ar' ? 'انتقال' : 'Open'}
                      </span>
                      <CornerDownLeft className="h-3.5 w-3.5 text-brand-500" />
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
