/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  Cpu, 
  ShieldCheck,
  Zap, 
  Warehouse, 
  Database, 
  Cloud, 
  Activity, 
  FileCheck2, 
  ShieldAlert, 
  BarChart3, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Sparkles, 
  FileText, 
  FileSpreadsheet, 
  GitBranch, 
  Building2, 
  Compass, 
  Globe, 
  Bell, 
  Settings, 
  Trash2, 
  BellRing, 
  Shield, 
  Command, 
  FolderMinus, 
  FolderPlus,
  SlidersHorizontal,
  Download,
  Plus,
  Check
} from 'lucide-react';
import { User as UserType, UserRole, Material } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService } from '../services/dbService';
import { getActionCenterItems } from '../services/port14Service';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import NotificationCenter from './NotificationCenter';
import UserSettingsModal from './UserSettingsModal';
import GlobalHeaderSearch from './GlobalHeaderSearch';
import QuickNavigationModal, { ALL_NAV_ITEMS, NavItemConfig } from './QuickNavigationModal';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string, searchInitial?: string) => void;
  currentUser: UserType;
  onLogout: () => void;
  onOpenWhatsNew?: () => void;
  onSelectMaterial?: (material: Material) => void;
  recentTabs?: string[];
  onOpenInstallModal?: () => void;
  hideBottomNav?: boolean;
}

const getCategoryStyle = (groupId: string) => {
  switch (groupId) {
    case 'group-dashboard':
      return {
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        cardBg: 'bg-gradient-to-r from-sky-950/40 via-industrial-900 to-industrial-850 hover:from-sky-900/40 border-sky-500/30 hover:border-sky-400/70',
        iconBox: 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/25',
        activeGlow: 'ring-1.5 ring-sky-400 border-sky-400 bg-sky-900/45 shadow-lg shadow-sky-500/30',
        accentText: 'text-sky-300'
      };
    case 'group-materials':
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        cardBg: 'bg-gradient-to-r from-emerald-950/40 via-industrial-900 to-industrial-850 hover:from-emerald-900/40 border-emerald-500/30 hover:border-emerald-400/70',
        iconBox: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/25',
        activeGlow: 'ring-1.5 ring-emerald-400 border-emerald-400 bg-emerald-900/45 shadow-lg shadow-emerald-500/30',
        accentText: 'text-emerald-300'
      };
    case 'group-search':
      return {
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        cardBg: 'bg-gradient-to-r from-purple-950/40 via-industrial-900 to-industrial-850 hover:from-purple-900/40 border-purple-500/30 hover:border-purple-400/70',
        iconBox: 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm shadow-purple-500/25',
        activeGlow: 'ring-1.5 ring-purple-400 border-purple-400 bg-purple-900/45 shadow-lg shadow-purple-500/30',
        accentText: 'text-purple-300'
      };
    case 'group-ops':
      return {
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        cardBg: 'bg-gradient-to-r from-amber-950/40 via-industrial-900 to-industrial-850 hover:from-amber-900/40 border-amber-500/30 hover:border-amber-400/70',
        iconBox: 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/25',
        activeGlow: 'ring-1.5 ring-amber-400 border-amber-400 bg-amber-900/45 shadow-lg shadow-amber-500/30',
        accentText: 'text-amber-300'
      };
    case 'group-docs':
      return {
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        cardBg: 'bg-gradient-to-r from-blue-950/40 via-industrial-900 to-industrial-850 hover:from-blue-900/40 border-blue-500/30 hover:border-blue-400/70',
        iconBox: 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/25',
        activeGlow: 'ring-1.5 ring-blue-400 border-blue-400 bg-blue-900/45 shadow-lg shadow-blue-500/30',
        accentText: 'text-blue-300'
      };
    case 'group-reports':
      return {
        badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        cardBg: 'bg-gradient-to-r from-teal-950/40 via-industrial-900 to-industrial-850 hover:from-teal-900/40 border-teal-500/30 hover:border-teal-400/70',
        iconBox: 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-sm shadow-teal-500/25',
        activeGlow: 'ring-1.5 ring-teal-400 border-teal-400 bg-teal-900/45 shadow-lg shadow-teal-500/30',
        accentText: 'text-teal-300'
      };
    case 'group-admin':
    default:
      return {
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        cardBg: 'bg-gradient-to-r from-rose-950/40 via-industrial-900 to-industrial-850 hover:from-rose-900/40 border-rose-500/30 hover:border-rose-400/70',
        iconBox: 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/25',
        activeGlow: 'ring-1.5 ring-rose-400 border-rose-400 bg-rose-900/45 shadow-lg shadow-rose-500/30',
        accentText: 'text-rose-300'
      };
  }
};

const getToolDescription = (id: string, isAr: boolean) => {
  const descriptions: Record<string, { ar: string; en: string }> = {
    dashboard: {
      ar: 'المؤشرات الحية وحالة المخزون والعمليات اللحظية',
      en: 'Real-time KPIs, inventory overview & operations stats'
    },
    'action-center': {
      ar: 'تنبيهات المهام الحرجة والموافقات والطلبات المعلقة',
      en: 'Direct operational alerts, tasks & critical approvals'
    },
    materials: {
      ar: 'السجل الهندسي الشامل لجميع المواد وقطع الغيار',
      en: 'Master engineering materials ledger & inventory catalog'
    },
    'add-material': {
      ar: 'إضافة وتسجيل صنف جديد مع الباركود والمطابقة الفنية',
      en: 'Quick part onboarding with barcode scan & specs matching'
    },
    traceability: {
      ar: 'تتبع حركة القطع والدفعات وسلسلة الحيازة الزمنية',
      en: 'Lifecycle tracking, batch history & audit lineage'
    },
    'material-intelligence': {
      ar: 'الترجمة الهندسية الذكية واستخراج المواصفات الفنية',
      en: 'Multilingual technical translation & spec extraction'
    },
    search: {
      ar: 'محرك بحث متقدم بالمعايير الفنية والباركود',
      en: 'High-precision multi-parameter technical search'
    },
    'ai-copilot': {
      ar: 'مساعد ذكي للتحليل الفني واستشارات المواد المعقدة',
      en: 'AI engineering assistant for diagnostics & queries'
    },
    intelligence: {
      ar: 'تحليلات السوق والأسعار والمؤشرات التنبؤية للقطع',
      en: 'Market pricing trends, forecasting & supply insights'
    },
    'external-stock': {
      ar: 'إدارة وتتبع أرصدة المخازن الخارجية والشركاء الميدانيين',
      en: 'Track partner & contractor external warehouse stocks'
    },
    enterprise: {
      ar: 'أذونات الصرف والاستلام والتحويلات المخزنية المعتمدة',
      en: 'Issuance vouchers, goods receipt & transfer orders'
    },
    'mrf-management': {
      ar: 'طلبات المواد والشراء وفحص الاستلام الميداني',
      en: 'Material requisitions, PO receiving & QC inspection'
    },
    verification: {
      ar: 'المطابقة والتحقق الفني لشهادات الجودة والمواصفات',
      en: 'Engineering verification against strict technical standards'
    },
    equipment: {
      ar: 'سجل المعدات والمحطات وربط قطع الغيار التابعة لها',
      en: 'Plant equipment register & tagged spare part mapping'
    },
    decisions: {
      ar: 'سجل القرارات الهندسية والموافقات الرسمية المعتمدة',
      en: 'Official engineering decisions & formal sign-offs'
    },
    blacklist: {
      ar: 'إدارة الحجر الفني والمواد المحظورة والمرفوضة',
      en: 'Technical quarantine & rejected material tracking'
    },
    'barcode-studio': {
      ar: 'تصميم وطباعة ملصقات الباركود والرفوف الحرارية',
      en: 'Industrial thermal barcode & shelf label designer'
    },
    'cycle-count': {
      ar: 'الجرد الدوري الميداني ومطابقة الفروقات تلقائياً',
      en: 'Physical stocktaking, variance reconciliation & audit'
    },
    'reorder-hub': {
      ar: 'أتمتة حساب نواقص المخزون وتوليد طلبات الشراء',
      en: 'Deficit calculation & automated purchase requisitions'
    },
    'shelf-life': {
      ar: 'مراقبة الصلاحية والمخزون الراكد والبطيء الحركة',
      en: 'Expiry monitoring & slow-moving dead stock management'
    },
    'preventive-maintenance': {
      ar: 'جدولة الصيانة الوقائية وأطقم قطع الغيار المطلوبة',
      en: 'PM schedules & maintenance spare part kits'
    },
    'workflow-approvals': {
      ar: 'سير الموافقات والاعتمادات والتوقيعات الإلكترونية',
      en: 'Multi-stage digital sign-off and approval chains'
    },
    documents: {
      ar: 'أرشيف الوثائق وشهادات الفحص وكتالوجات المصنعين',
      en: 'Digital repository for test certificates & vendor sheets'
    },
    'excel-import': {
      ar: 'استيراد جماعي ذكي لجداول المواد من ملفات إكسل',
      en: 'Smart bulk ingestion for Excel spreadsheets & CSVs'
    },
    'google-drive': {
      ar: 'المزامنة السحابية للوثائق والتقارير مع Google Drive',
      en: 'Secure cloud syncing of engineering docs with Drive'
    },
    reports: {
      ar: 'تقارير الأداء ومخططات حركة المخزون والتحليلات',
      en: 'Executive reporting, charts & inventory analytics'
    },
    'certificate-builder': {
      ar: 'إنشاء شهادات الفحص الهندسي والمطابقة الفنية',
      en: 'Generate & print official engineering certificates'
    },
    'non-conformance': {
      ar: 'تقارير عدم المطابقة الفنية (NCR) وتتبع الإجراءات التصحيحية',
      en: 'Non-conformance reporting (NCR) & corrective actions'
    },
    'kpi-dashboard': {
      ar: 'مؤشرات الأداء الاستراتيجية ودقة المخزون ومعدل الدوران',
      en: 'Strategic KPIs, inventory accuracy & turnover rates'
    },
    'material-passport': {
      ar: 'جواز السفر الرقمي للمادة وسجل الفحص الكامل',
      en: 'Digital material passport & tamper-proof trace history'
    },
    admin: {
      ar: 'إدارة المستخدمين والمواقع والمستودعات والصلاحيات',
      en: 'System configuration, user roles, facilities & security'
    },
    'backup-sync': {
      ar: 'النسخ الاحتياطي والمزامنة السحابية وإدارة البيانات',
      en: 'Cloud backup, offline sync & disaster recovery'
    },
    'recycle-bin': {
      ar: 'استرجاع المواد والسجلات المحذوفة بأمان تام',
      en: 'Data safety vault & instant record restoration'
    }
  };

  const item = descriptions[id];
  if (!item) return '';
  return isAr ? item.ar : item.en;
};

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  onOpenWhatsNew,
  onSelectMaterial,
  recentTabs = [],
  onOpenInstallModal,
  hideBottomNav = false
}: NavigationProps) {
  const { language, t, isRTL } = useLanguage();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionItemCount, setActionItemCount] = useState(0);
  
  // Navigation Search & Filtering
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Accordion state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const expandAllGroups = () => setCollapsedGroups({});
  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    uniqueGroups.forEach(g => { allCollapsed[g.id] = true; });
    setCollapsedGroups(allCollapsed);
  };

  const updateCounts = () => {
    const notifs = dbService.getNotifications(currentUser);
    const unread = notifs.filter(n => !n.read).length;
    setUnreadCount(unread);

    const actions = getActionCenterItems(currentUser);
    setActionItemCount(actions.length);
  };

  useEffect(() => {
    updateCounts();
    const handleUpdate = () => updateCounts();
    window.addEventListener('emis:notifications-updated', handleUpdate);
    window.addEventListener('emis:notification-added', handleUpdate);
    window.addEventListener('emis:sync-status-changed', handleUpdate);
    window.addEventListener('emis:material-added', handleUpdate);
    return () => {
      window.removeEventListener('emis:notifications-updated', handleUpdate);
      window.removeEventListener('emis:notification-added', handleUpdate);
      window.removeEventListener('emis:sync-status-changed', handleUpdate);
      window.removeEventListener('emis:material-added', handleUpdate);
    };
  }, [currentUser]);

  // Group definitions
  const uniqueGroups = useMemo(() => [
    { id: 'group-dashboard', titleKey: 'groupCommandCenter', fallback: 'Command Center', ar: 'مركز القيادة والتحكم' },
    { id: 'group-materials', titleKey: 'groupMaterials', fallback: 'Materials Management', ar: 'إدارة المواد والمخزون' },
    { id: 'group-search', titleKey: 'groupSearch', fallback: 'Search & Intelligence', ar: 'البحث والاستخبارات الذكية' },
    { id: 'group-ops', titleKey: 'groupOps', fallback: 'Operations & Engineering', ar: 'العمليات والهندسة' },
    { id: 'group-docs', titleKey: 'groupDocs', fallback: 'Documents & Import', ar: 'الوثائق والاستيراد' },
    { id: 'group-reports', titleKey: 'groupReports', fallback: 'Reports & Quality', ar: 'التقارير والجودة' },
    { id: 'group-admin', titleKey: 'groupAdmin', fallback: 'Administration & Governance', ar: 'الإدارة والحوكمة' }
  ], []);

  // Filtered navigation items based on user role, category filter, and sidebar search
  const visibleGroups = useMemo(() => {
    const s = sidebarSearch.toLowerCase().trim();

    return uniqueGroups.map(group => {
      // Category filter
      if (selectedCategory !== 'all' && group.id !== selectedCategory) {
        return null;
      }

      const items = ALL_NAV_ITEMS.filter(item => {
        if (item.groupId !== group.id) return false;
        if (!item.roles.includes(currentUser.role)) return false;

        if (!s) return true;

        const nameDisplay = (language === 'ar' ? item.arabicName : (t(item.nameKey as any) || item.fallbackName)).toLowerCase();
        const enName = item.fallbackName.toLowerCase();
        const arName = item.arabicName.toLowerCase();
        const keywords = item.keywords.some(k => k.toLowerCase().includes(s));

        return nameDisplay.includes(s) || enName.includes(s) || arName.includes(s) || keywords || item.id.includes(s);
      });

      if (items.length === 0) return null;

      return {
        ...group,
        items
      };
    }).filter(Boolean) as { id: string; titleKey: string; fallback: string; ar: string; items: NavItemConfig[] }[];
  }, [uniqueGroups, selectedCategory, sidebarSearch, currentUser.role, language, t]);

  const handleTabClick = (tabId: string, initialSearch?: string) => {
    setActiveTab(tabId, initialSearch);
    setIsMobileDrawerOpen(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case UserRole.SUPERVISOR:
      case UserRole.ENGINEER:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case UserRole.WAREHOUSE:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case UserRole.READONLY:
      case UserRole.VIEWER:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-industrial-500/10 text-industrial-400 border-industrial-500/20';
    }
  };

  // Mobile Bottom Navigation Primary Tabs
  const mobileBottomTabs = [
    { id: 'dashboard', label: language === 'ar' ? 'الرئيسية' : 'Command', icon: LayoutDashboard },
    { id: 'action-center', label: language === 'ar' ? 'الإجراءات' : 'Actions', icon: BellRing, count: actionItemCount },
    { id: 'materials', label: language === 'ar' ? 'المخزون' : 'Materials', icon: Layers },
    { id: 'search', label: language === 'ar' ? 'البحث' : 'Search', icon: Search },
  ];

  // Quick filter categories with icons
  const categoryChips = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All', icon: Sparkles },
    { id: 'group-dashboard', label: language === 'ar' ? 'الرئيسية' : 'Core', icon: LayoutDashboard },
    { id: 'group-materials', label: language === 'ar' ? 'المواد والمخزون' : 'Materials', icon: Layers },
    { id: 'group-search', label: language === 'ar' ? 'البحث والذكاء' : 'Search & AI', icon: Search },
    { id: 'group-ops', label: language === 'ar' ? 'العمليات الفنية' : 'Ops', icon: Activity },
    { id: 'group-docs', label: language === 'ar' ? 'الوثائق' : 'Docs', icon: FileText },
    { id: 'group-reports', label: language === 'ar' ? 'الجودة والتقارير' : 'Quality', icon: ShieldCheck },
    { id: 'group-admin', label: language === 'ar' ? 'الإدارة والحوكمة' : 'Admin', icon: Shield }
  ];

  return (
    <>
      {/* MOBILE TOP HEADER WITH SAFE AREA CLEARANCE (NOTCH & STATUS BAR) */}
      <header className="lg:hidden bg-industrial-900/98 backdrop-blur-md border-b border-industrial-800 px-3.5 sticky top-0 z-40 text-white select-none mobile-safe-top-header transition-all duration-150">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg">
              <Cpu className="h-4.5 w-4.5 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight heading-display text-sm">EMIS</span>
                <span className="text-[9px] text-brand-400 font-mono px-1.5 py-0.2 rounded bg-brand-500/15 border border-brand-500/30 font-bold">v3.1</span>
              </div>
              <p className="text-[10px] text-industrial-400 font-mono">
                {language === 'ar' ? 'نظام إدارة المواد الذكي' : 'Material Intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Network / Offline & Sync Status */}
            <NetworkStatusIndicator
              idPrefix="mobile-top-header-nav"
              onNavigateToSync={() => handleTabClick('backup-sync')}
            />

            {/* Centralized User Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-industrial-800 hover:bg-industrial-750 active:bg-industrial-700 text-industrial-200 border border-industrial-700 transition-colors cursor-pointer"
              title={language === 'ar' ? 'الإعدادات والملف الشخصي' : 'User Profile & Settings'}
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE FULL INTERACTIVE HUB BOTTOM SHEET */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full max-h-[88vh] bg-industrial-900 border-t border-industrial-700/80 rounded-t-3xl flex flex-col z-10 text-white shadow-2xl overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Drag Handle Bar */}
              <div className="pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-industrial-600/80 hover:bg-industrial-500 transition-colors" />
              </div>

              {/* Sheet Header */}
              <div className="px-4 py-2 border-b border-industrial-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gradient-to-br from-brand-500/20 to-teal-500/20 border border-brand-500/30 rounded-xl">
                    <Cpu className="h-5 w-5 text-brand-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-bold text-sm text-white">
                        {language === 'ar' ? 'مركز التحكم والتنقل' : 'Interactive Navigation Hub'}
                      </h2>
                      <span className="text-[9px] text-brand-400 font-mono px-1.5 py-0.2 rounded bg-brand-500/15 border border-brand-500/30 font-bold">EMIS</span>
                    </div>
                    <p className="text-[10px] text-industrial-400">
                      {language === 'ar' ? 'وصول تفاعلي سريع لكافة الأنظمة والأدوات الهندسية' : 'Tactile shortcuts to all engineering modules'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-industrial-400 hover:text-white hover:bg-industrial-800 active:scale-95 transition-all cursor-pointer"
                  aria-label="Close Hub"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Fast Interactive Action Tiles (4 primary shortcuts) */}
              <div className="px-3 pt-3 pb-2 grid grid-cols-4 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabClick('add-material')}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-400/60 active:scale-95 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mb-1 group-hover:scale-110 transition-transform">
                    <PlusCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-200 text-center leading-tight">
                    {language === 'ar' ? 'إضافة مادة' : 'New Part'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('search')}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-brand-500/15 to-brand-950/20 border border-brand-500/30 hover:border-brand-400/60 active:scale-95 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 mb-1 group-hover:scale-110 transition-transform">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-brand-200 text-center leading-tight">
                    {language === 'ar' ? 'البحث الذكي' : 'AI Search'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('action-center')}
                  className="relative flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-950/20 border border-amber-500/30 hover:border-amber-400/60 active:scale-95 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mb-1 group-hover:scale-110 transition-transform">
                    <BellRing className="h-4 w-4" />
                  </div>
                  {actionItemCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-4 h-4 bg-rose-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center">
                      {actionItemCount}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-amber-200 text-center leading-tight">
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('materials')}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-cyan-500/15 to-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400/60 active:scale-95 transition-all cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 mb-1 group-hover:scale-110 transition-transform">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-200 text-center leading-tight">
                    {language === 'ar' ? 'المستودع' : 'Stock'}
                  </span>
                </button>
              </div>

              {/* Search Bar with Live Filter Count */}
              <div className="px-3 py-1 shrink-0">
                <div className="relative flex items-center">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-industrial-400`} />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث في كافة الأقسام والأنظمة...' : 'Filter modules & features...'}
                    className={`w-full py-2 ${isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'} bg-industrial-800/80 border border-industrial-700/80 rounded-xl text-xs text-white placeholder-industrial-400 focus:outline-hidden focus:border-brand-500 transition-all`}
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} p-1 rounded-md text-industrial-400 hover:text-white cursor-pointer`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tactile Category Filter Tabs */}
              <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {categoryChips.map(cat => {
                  const Icon = cat.icon;
                  const isSel = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                        isSel 
                          ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/30 border border-brand-400/40 ring-1 ring-brand-400/30' 
                          : 'bg-industrial-800/90 text-industrial-300 hover:bg-industrial-750 hover:text-white border border-industrial-700/60'
                      }`}
                    >
                      {Icon && <Icon className={`h-3.5 w-3.5 ${isSel ? 'text-white' : 'text-brand-400'}`} />}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Interactive Cards Grid - Distinctive, Clear & Comfortable */}
              <div className="flex-1 px-3 py-2 overflow-y-auto space-y-4 pb-6">
                {visibleGroups.map(group => {
                  const groupTitle = language === 'ar' ? group.ar : (t(group.titleKey as any) || group.fallback);
                  const style = getCategoryStyle(group.id);

                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${style.iconBox}`} />
                          <span className="text-[11px] font-bold text-industrial-200 uppercase tracking-wider">
                            {groupTitle}
                          </span>
                        </div>
                        <span className="text-[10px] text-industrial-400 font-mono px-2 py-0.5 rounded-full bg-industrial-800/80 border border-industrial-700/50">
                          {group.items.length} {language === 'ar' ? 'أداة' : 'tools'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const isSelected = activeTab === item.id;
                          const itemTitle = language === 'ar' ? item.arabicName : (t(item.nameKey as any) || item.fallbackName);
                          const secondaryTitle = language === 'ar' ? item.fallbackName : item.arabicName;
                          const desc = getToolDescription(item.id, language === 'ar');

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTabClick(item.id)}
                              className={`group relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                                isSelected 
                                  ? style.activeGlow
                                  : `${style.cardBg} text-industrial-200`
                              }`}
                            >
                              {/* Prominent Themed Icon Box */}
                              <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                                isSelected ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : style.iconBox
                              }`}>
                                <Icon className="h-5 w-5" />
                              </div>

                              {/* Content with Zero Truncation & High Clarity */}
                              <div className="min-w-0 flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs sm:text-sm font-bold leading-snug ${isSelected ? 'text-white font-extrabold' : 'text-industrial-100 group-hover:text-white'}`}>
                                    {itemTitle}
                                  </span>
                                  {secondaryTitle && (
                                    <span className="text-[10px] text-industrial-400 font-medium">
                                      ({secondaryTitle})
                                    </span>
                                  )}
                                  {item.badge && (
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${style.badgeBg}`}>
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {desc && (
                                  <p className="text-[11px] text-industrial-400 group-hover:text-industrial-300 leading-normal mt-0.5 line-clamp-1">
                                    {desc}
                                  </p>
                                )}
                              </div>

                              {/* Interactive Navigation Arrow */}
                              <div className="shrink-0 p-1 text-industrial-500 group-hover:text-industrial-200 transition-colors">
                                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Profile & Actions Sheet Footer */}
              <div className="p-3 border-t border-industrial-800 bg-industrial-950/80 shrink-0 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="flex-1 flex items-center gap-2 px-3 py-2 bg-industrial-850 hover:bg-industrial-800 active:scale-98 border border-industrial-750 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer truncate"
                >
                  <div className="h-6 w-6 rounded-lg bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="text-left truncate">
                    <p className="font-semibold text-xs truncate leading-tight">{currentUser.name}</p>
                    <span className="text-[9px] text-industrial-400 font-mono uppercase">{currentUser.role}</span>
                  </div>
                  <Settings className={`h-4 w-4 text-brand-400 shrink-0 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2.5 bg-red-950/20 hover:bg-red-950/40 active:scale-95 border border-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer shrink-0"
                  title={language === 'ar' ? 'إنهاء الجلسة' : 'Disconnect'}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR WITH SAFE GESTURE AREA (5 BALANCED HIGH-PRECISION TABS) */}
      {!hideBottomNav && (
        <nav 
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 bg-industrial-900/98 backdrop-blur-xl border-t border-industrial-800/90 shadow-[0_-4px_25px_rgba(0,0,0,0.45)] px-3 z-40 text-white select-none pb-[max(env(safe-area-inset-bottom),10px)] pt-1.5 transition-all"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-around max-w-md mx-auto relative min-h-[52px]">
            {/* Tab 1: Command / Dashboard */}
            <button
              type="button"
              onClick={() => handleTabClick('dashboard')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-90 cursor-pointer min-h-[50px] ${
                activeTab === 'dashboard'
                  ? 'text-brand-400 font-bold'
                  : 'text-industrial-400 hover:text-industrial-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : ''}`}>
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {language === 'ar' ? 'الرئيسية' : 'Command'}
              </span>
              {activeTab === 'dashboard' && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-0.5 shadow-xs" />
              )}
            </button>

            {/* Tab 2: Action Center / Alerts */}
            <button
              type="button"
              onClick={() => handleTabClick('action-center')}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-90 cursor-pointer min-h-[50px] ${
                activeTab === 'action-center'
                  ? 'text-brand-400 font-bold'
                  : 'text-industrial-400 hover:text-industrial-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'action-center' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : ''}`}>
                <BellRing className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {language === 'ar' ? 'الإجراءات' : 'Actions'}
              </span>
              {actionItemCount > 0 && (
                <span className="absolute top-0.5 right-2 min-w-4 h-4 px-1 bg-rose-500 text-white font-bold text-[8.5px] rounded-full flex items-center justify-center border border-industrial-900 animate-pulse">
                  {actionItemCount > 9 ? '9+' : actionItemCount}
                </span>
              )}
              {activeTab === 'action-center' && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-0.5 shadow-xs" />
              )}
            </button>

            {/* Tab 3: Ergonomic Center Thumb Quick Action (Add Material) */}
            <div className="flex flex-col items-center justify-center -mt-5 px-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleTabClick('add-material')}
                className={`p-3 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-teal-400 text-white shadow-lg shadow-brand-500/35 border-2 border-industrial-900 active:scale-90 hover:scale-105 transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === 'add-material' ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-industrial-900' : ''
                }`}
                title={language === 'ar' ? 'إضافة مادة جديدة' : 'Add New Material'}
                aria-label="Add Material"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
              <span className="text-[9.5px] font-bold text-industrial-300 tracking-tight mt-1 whitespace-nowrap">
                {language === 'ar' ? 'إضافة' : 'Add'}
              </span>
            </div>

            {/* Tab 4: Universal Search */}
            <button
              type="button"
              onClick={() => handleTabClick('search')}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-90 cursor-pointer min-h-[50px] ${
                activeTab === 'search'
                  ? 'text-brand-400 font-bold'
                  : 'text-industrial-400 hover:text-industrial-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'search' ? 'bg-brand-500/20 text-brand-300 shadow-sm' : ''}`}>
                <Search className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {language === 'ar' ? 'البحث' : 'Search'}
              </span>
              {activeTab === 'search' && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-0.5 shadow-xs" />
              )}
            </button>

            {/* Tab 5: Interactive Hub & All Modules (Opens Full Categorized Drawer) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-90 cursor-pointer min-h-[50px] ${
                isMobileDrawerOpen
                  ? 'text-brand-400 font-bold'
                  : 'text-industrial-400 hover:text-industrial-200'
              }`}
              title={language === 'ar' ? 'مركز التحكم والتنقل' : 'Interactive Hub'}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isMobileDrawerOpen ? 'bg-brand-500/20 text-brand-300 shadow-sm' : 'hover:bg-industrial-800/60'}`}>
                <Compass className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {language === 'ar' ? 'المركز' : 'Hub'}
              </span>
              {isMobileDrawerOpen && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-0.5 shadow-xs" />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside 
        className="hidden lg:flex flex-col w-64 bg-industrial-900 border-r border-industrial-800 h-screen sticky top-0 shrink-0 text-white select-none transition-all duration-200"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Top Brand Header */}
        <div className="p-3.5 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-600/15 border border-brand-500/30 rounded-xl shadow-inner">
              <Cpu className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold tracking-tight text-base heading-display text-white">EMIS</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  v3.1
                </span>
              </div>
              <p className="text-[10px] text-industrial-400 font-mono tracking-wider">
                {language === 'ar' ? 'نظام إدارة المواد' : 'MATERIAL INTELLIGENCE'}
              </p>
            </div>
          </div>
          <NetworkStatusIndicator
            idPrefix="desktop-sidebar-nav"
            onNavigateToSync={() => setActiveTab('backup-sync')}
          />
        </div>

        {/* Quick Command Launcher (Ctrl+K) */}
        <div className="px-3 pt-3 pb-2 space-y-2 border-b border-industrial-800/80">
          <button
            type="button"
            onClick={() => setIsQuickSwitcherOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 hover:border-brand-500/40 text-industrial-300 hover:text-white text-xs font-medium transition-all group cursor-pointer shadow-2xs"
            title="Press Ctrl+K to jump anywhere"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-brand-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">{language === 'ar' ? 'التنقل السريع بين القوائم...' : 'Jump to any screen...'}</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-industrial-800 group-hover:bg-brand-600/30 text-industrial-400 group-hover:text-brand-300 border border-industrial-700 transition-colors">
              Ctrl+K
            </kbd>
          </button>

          {/* Action Center & Notification Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabClick('action-center')}
              className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'action-center'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-industrial-850 hover:bg-industrial-800 border-industrial-750 text-industrial-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-amber-400" />
                <span className="truncate">{language === 'ar' ? 'الإجراءات' : 'Action Center'}</span>
              </div>
              {actionItemCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                  {actionItemCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotifCenterOpen(true)}
              className="relative p-2 rounded-xl bg-industrial-850 hover:bg-industrial-800 text-industrial-300 hover:text-white border border-industrial-750 transition-colors cursor-pointer shrink-0"
              title="Notification Center"
              id="desktop-bell-btn"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center border border-industrial-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Category Filter Chips in Desktop Sidebar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
            {categoryChips.map(cat => {
              const isSel = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.8 text-[10px] font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    isSel 
                      ? 'bg-brand-600 text-white font-bold shadow-2xs' 
                      : 'bg-industrial-800/80 text-industrial-400 hover:text-industrial-200 hover:bg-industrial-750'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Quick Menu Filter Input */}
          <div className="relative flex items-center pt-0.5">
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder={language === 'ar' ? 'تصفية القوائم الحالية...' : 'Filter navigation list...'}
              className={`w-full py-1.2 ${isRTL ? 'pr-7 pl-7' : 'pl-7 pr-7'} bg-industrial-950/60 border border-industrial-800 rounded-lg text-[11px] text-white placeholder-industrial-400 focus:outline-hidden focus:border-brand-500/50 transition-all`}
            />
            <Search className={`absolute ${isRTL ? 'right-2' : 'left-2'} h-3 w-3 text-industrial-400`} />
            {sidebarSearch && (
              <button
                type="button"
                onClick={() => setSidebarSearch('')}
                className={`absolute ${isRTL ? 'left-2' : 'right-2'} text-industrial-400 hover:text-white`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped Sidebar Navigation Items */}
        <div className="flex-1 px-2.5 space-y-3 overflow-y-auto py-2.5">
          {visibleGroups.map(group => {
            const isCollapsed = collapsedGroups[group.id];
            const groupTitle = language === 'ar' ? group.ar : (t(group.titleKey as any) || group.fallback);

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-industrial-400 hover:text-industrial-200 cursor-pointer font-bold select-none rounded-lg hover:bg-industrial-850/60 transition-colors"
                >
                  <span>{groupTitle}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-industrial-600' : ''}`} />
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isSelected = activeTab === item.id;
                      const itemTitle = language === 'ar' ? item.arabicName : (t(item.nameKey as any) || item.fallbackName);

                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.8 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-600 text-white shadow-xs font-bold' 
                              : 'text-industrial-300 hover:text-white hover:bg-industrial-850'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-industrial-400'}`} />
                            <span className="truncate">{itemTitle}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold shrink-0 ${
                              isSelected 
                                ? 'bg-white/20 text-white' 
                                : item.id === 'action-center'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {visibleGroups.length === 0 && (
            <div className="py-6 text-center text-industrial-400 text-xs">
              <p>{language === 'ar' ? 'لا توجد قوائم مطابقة لبحثك' : 'No menus match your filter'}</p>
              <button
                type="button"
                onClick={() => { setSidebarSearch(''); setSelectedCategory('all'); }}
                className="mt-2 text-brand-400 hover:underline text-[11px] cursor-pointer"
              >
                {language === 'ar' ? 'إعادة ضبط التصفية' : 'Reset filters'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Actions & User Profile */}
        <div className="p-3 border-t border-industrial-800 space-y-2">
          {onOpenWhatsNew && (
            <button
              onClick={onOpenWhatsNew}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-brand-950/20 hover:bg-brand-950/40 border border-brand-500/30 text-brand-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                <span>{language === 'ar' ? 'ما الجديد في النظام' : "What's New in v3.1"}</span>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 text-brand-400 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* User Settings & Language Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="h-6 w-6 rounded-lg bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="text-left truncate">
                <p className="font-semibold text-xs truncate leading-tight">{currentUser.name}</p>
                <span className="text-[9px] text-industrial-400 font-mono uppercase">{currentUser.role}</span>
              </div>
            </div>
            <Settings className="h-3.5 w-3.5 text-industrial-400 shrink-0" />
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-950/10 hover:bg-red-950/30 border border-red-500/10 text-red-400 text-xs font-medium rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{language === 'ar' ? 'إنهاء الجلسة' : 'Disconnect Session'}</span>
          </button>
        </div>
      </aside>

      {/* Centralized User Profile & Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigateTab={handleTabClick}
      />

      {/* Global Real-Time Notification Center Drawer */}
      <NotificationCenter
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
        currentUser={currentUser}
        onNavigateTab={handleTabClick}
      />

      {/* Quick Navigation / Command Palette Modal (Ctrl+K) */}
      <QuickNavigationModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        activeTab={activeTab}
        onNavigateTab={handleTabClick}
        userRole={currentUser.role}
        recentTabs={recentTabs}
      />
    </>
  );
}
