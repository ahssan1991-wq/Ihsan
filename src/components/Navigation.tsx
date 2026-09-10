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
  SlidersHorizontal
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
}

export default function Navigation({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  onOpenWhatsNew,
  onSelectMaterial,
  recentTabs = []
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

  // Quick filter categories
  const categoryChips = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    { id: 'group-dashboard', label: language === 'ar' ? 'الرئيسية' : 'Core' },
    { id: 'group-materials', label: language === 'ar' ? 'المواد' : 'Materials' },
    { id: 'group-search', label: language === 'ar' ? 'البحث والذكاء' : 'Search & AI' },
    { id: 'group-ops', label: language === 'ar' ? 'العمليات' : 'Ops' },
    { id: 'group-admin', label: language === 'ar' ? 'الإدارة' : 'Admin' }
  ];

  return (
    <>
      {/* MOBILE TOP HEADER */}
      <header className="lg:hidden h-14 bg-industrial-900 border-b border-industrial-800 px-3 flex items-center justify-between sticky top-0 z-40 text-white select-none gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg">
            <Cpu className="h-4 w-4 text-brand-500" />
          </div>
          <div>
            <span className="font-bold tracking-tight heading-display text-xs">EMIS</span>
            <span className="text-[9px] text-brand-400 font-mono ml-1 px-1 py-0.2 rounded bg-brand-500/15 border border-brand-500/30 font-bold">v3.1</span>
          </div>
        </div>

        {/* Global Search on Mobile */}
        <div className="flex-1 max-w-xs mx-1">
          <GlobalHeaderSearch
            onSelectMaterial={onSelectMaterial}
            onNavigateToTab={handleTabClick}
          />
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Switcher Trigger (Mobile) */}
          <button
            type="button"
            onClick={() => setIsQuickSwitcherOpen(true)}
            className="p-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-colors cursor-pointer"
            title={language === 'ar' ? 'التنقل السريع بين القوائم' : 'Quick Navigation'}
          >
            <Command className="h-3.5 w-3.5" />
          </button>

          {/* Action Center Trigger */}
          <button
            onClick={() => handleTabClick('action-center')}
            className="relative p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-750 text-industrial-200 border border-industrial-700 transition-colors cursor-pointer"
            title="Action Center"
          >
            <BellRing className="h-3.5 w-3.5 text-amber-400" />
            {actionItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center border border-industrial-900 animate-pulse">
                {actionItemCount > 9 ? '9+' : actionItemCount}
              </span>
            )}
          </button>

          {/* Centralized User Settings Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-750 text-industrial-200 border border-industrial-700 transition-colors cursor-pointer"
            title="User Profile & Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* MOBILE FULL NAVIGATION DRAWER */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            {/* Drawer Content */}
            <motion.aside
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-4/5 max-w-sm bg-industrial-900 border-r border-industrial-800 h-full flex flex-col z-10 text-white shadow-2xl"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Drawer Top */}
              <div className="p-4 border-b border-industrial-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg">
                    <Cpu className="h-5 w-5 text-brand-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white">EMIS v3.1</h2>
                    <p className="text-[10px] text-industrial-400 font-mono">
                      {language === 'ar' ? 'نظام تصفح القوائم الهندسي' : 'Engineering Navigation Hub'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 cursor-pointer"
                    aria-label="Close Drawer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Quick Jump Search in Mobile Drawer */}
              <div className="px-3 pt-3 pb-1">
                <div className="relative flex items-center">
                  <Search className={`absolute ${isRTL ? 'right-2.5' : 'left-2.5'} h-3.5 w-3.5 text-industrial-400`} />
                  <input
                    type="text"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث في القوائم...' : 'Search menus...'}
                    className={`w-full py-1.5 ${isRTL ? 'pr-8 pl-8' : 'pl-8 pr-8'} bg-industrial-800/90 border border-industrial-700/80 rounded-xl text-xs text-white placeholder-industrial-400 focus:outline-hidden focus:border-brand-500 transition-all`}
                  />
                  {sidebarSearch && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearch('')}
                      className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} text-industrial-400 hover:text-white`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills (Mobile) */}
              <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {categoryChips.map(cat => {
                  const isSel = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-0.8 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        isSel 
                          ? 'bg-brand-600 text-white shadow-2xs' 
                          : 'bg-industrial-800 text-industrial-300 hover:bg-industrial-750 border border-industrial-700/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Grouped Navigation Links */}
              <div className="flex-1 px-3 space-y-3 overflow-y-auto py-2">
                {visibleGroups.map(group => {
                  const groupTitle = language === 'ar' ? group.ar : (t(group.titleKey as any) || group.fallback);
                  return (
                    <div key={group.id} className="space-y-1">
                      <span className="px-2 text-[10px] font-mono uppercase text-industrial-400 font-bold tracking-wider block">
                        {groupTitle}
                      </span>
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isSelected = activeTab === item.id;
                        const itemTitle = language === 'ar' ? item.arabicName : (t(item.nameKey as any) || item.fallbackName);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-brand-600 text-white font-bold shadow-xs' 
                                : 'text-industrial-300 hover:text-white hover:bg-industrial-800'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{itemTitle}</span>
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-3 border-t border-industrial-800 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-brand-400" />
                    <span>{language === 'ar' ? 'الملف الشخصي واللغة' : 'Profile & Language'}</span>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 text-industrial-400 ${isRTL ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{language === 'ar' ? 'إنهاء الجلسة' : 'Disconnect Session'}</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-industrial-900/95 backdrop-blur-md border-t border-industrial-800 px-2 z-40 flex items-center justify-around text-white">
        {mobileBottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isSelected ? 'text-brand-400 font-bold' : 'text-industrial-400 hover:text-industrial-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isSelected ? 'bg-brand-500/20' : ''}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-rose-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Switcher Button (Center/Right on Mobile) */}
        <button
          onClick={() => setIsQuickSwitcherOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-brand-400 hover:text-brand-300 transition-all cursor-pointer"
          title={language === 'ar' ? 'التنقل السريع' : 'Quick Switcher'}
        >
          <div className="p-1 rounded-lg bg-brand-500/20 border border-brand-500/30">
            <Command className="h-4.5 w-4.5 text-brand-400" />
          </div>
          <span className="text-[10px] tracking-tight">{language === 'ar' ? 'التنقل' : 'Jump'}</span>
        </button>

        {/* More Tab Trigger */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isMobileDrawerOpen ? 'text-brand-400' : 'text-industrial-400 hover:text-industrial-200'
          }`}
        >
          <div className="p-1 rounded-lg">
            <Menu className="h-4.5 w-4.5" />
          </div>
          <span className="text-[10px] tracking-tight">{language === 'ar' ? 'القوائم' : 'Menus'}</span>
        </button>
      </nav>

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
