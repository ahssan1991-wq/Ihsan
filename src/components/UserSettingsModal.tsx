/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Globe, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Building2, 
  Warehouse, 
  LogOut, 
  Check, 
  CheckCircle2, 
  Key, 
  Cpu, 
  Activity, 
  Settings,
  HardDrive,
  ExternalLink
} from 'lucide-react';
import { User, UserRole } from '../types';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { dbService } from '../services/dbService';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function UserSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onNavigateTab
}: UserSettingsModalProps) {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const languages = SUPPORTED_LANGUAGES;

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case UserRole.SUPERVISOR:
      case UserRole.ENGINEER:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case UserRole.INSPECTOR:
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case UserRole.WAREHOUSE:
      case UserRole.STOREKEEPER:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-industrial-500/20 text-industrial-400 border-industrial-500/40';
    }
  };

  const handleAdminNavigate = () => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('admin-governance');
    }
  };

  const handleDiagnosticsNavigate = () => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('ai-diagnostics');
    }
  };

  const handleSyncNavigate = () => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab('backup-sync');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        {/* Backdrop click to dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`relative w-full max-w-lg bg-industrial-900 border border-industrial-750 rounded-2xl shadow-2xl overflow-hidden z-10 text-white flex flex-col max-h-[90vh] ${
            isRTL ? 'rtl' : 'ltr'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-industrial-800 bg-industrial-850/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {t('profileSettings') || 'User Profile & Settings'}
                </h3>
                <p className="text-[11px] text-industrial-400 font-mono">
                  EMIS v3.0 • {isRTL ? 'إعدادات الحساب والنظام' : 'Account & System Preferences'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-industrial-400 hover:text-white rounded-lg hover:bg-industrial-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            {/* User Identity Card */}
            <div className="p-4 bg-industrial-850 border border-industrial-750 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-linear-to-b from-brand-600 to-brand-700 flex items-center justify-center text-white font-bold text-base shadow-md border border-brand-500/30 shrink-0">
                    {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{currentUser.name}</h4>
                    <p className="text-xs text-industrial-400 font-mono truncate">{currentUser.email || currentUser.id}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold shrink-0 ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>

              {/* Assignment Metadata */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-industrial-800 text-xs">
                <div className="p-2 rounded-lg bg-industrial-800/60 border border-industrial-750/60">
                  <div className="flex items-center gap-1.5 text-industrial-400 text-[10px] font-mono uppercase">
                    <Building2 className="h-3 w-3 text-brand-400" />
                    <span>{isRTL ? 'الموقع المعين' : 'Assigned Site'}</span>
                  </div>
                  <p className="font-semibold text-white mt-0.5 text-xs truncate">
                    {currentUser.site || 'NDGS Power Station'}
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-industrial-800/60 border border-industrial-750/60">
                  <div className="flex items-center gap-1.5 text-industrial-400 text-[10px] font-mono uppercase">
                    <Warehouse className="h-3 w-3 text-emerald-400" />
                    <span>{isRTL ? 'المستودع المعين' : 'Assigned Store'}</span>
                  </div>
                  <p className="font-semibold text-white mt-0.5 text-xs truncate">
                    {currentUser.warehouse || 'Electronics Lab (Lab A)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Centralized Language Section */}
            <div className="p-4 bg-industrial-850 border border-industrial-750 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-brand-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {isRTL ? 'لغة النظام والتطبيق' : 'System & Application Language'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold">
                  {isRTL ? 'مركزي (RTL)' : 'Central (LTR)'}
                </span>
              </div>
              <p className="text-xs text-industrial-400">
                {isRTL 
                  ? 'اختر لغة واجهة النظام الموحدة. يتم حفظ التفضيل ومزامنته تلقائياً مع جميع الشاشات والتقارير.' 
                  : 'Select the primary interface language. Your selection is automatically saved and synchronized across all views and reports.'}
              </p>

              {/* Language Selection Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {languages.map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <button
                      key={item.code}
                      onClick={() => setLanguage(item.code)}
                      className={`relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-md'
                          : 'bg-industrial-800 border-industrial-700 text-industrial-300 hover:text-white hover:bg-industrial-750 hover:border-industrial-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.flag}</span>
                        <div className="text-left">
                          <p className="text-xs font-bold leading-tight">{item.displayLabel}</p>
                          <p className="text-[10px] text-industrial-400">{item.label} ({item.dir})</p>
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-industrial-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Appearance Section */}
            <div className="p-4 bg-industrial-850 border border-industrial-750 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {isRTL ? 'مظهر النظام والتباين' : 'Theme & Visual Density'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-750 text-industrial-300 border border-industrial-700 font-bold">
                  {isDark ? 'Dark Theme' : 'Light Theme'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-industrial-800 border border-industrial-700 rounded-xl">
                <div className="flex items-center gap-2 text-xs">
                  {isDark ? (
                    <Moon className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-white font-medium">
                    {isDark ? (isRTL ? 'الوضع الليلي الصناعي' : 'Industrial Dark Mode') : (isRTL ? 'الوضع النهاري عالي الوضوح' : 'High-Contrast Light Mode')}
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1 bg-industrial-700 hover:bg-industrial-650 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer border border-industrial-600 shadow-xs"
                >
                  {isRTL ? 'تبديل المظهر' : 'Toggle Theme'}
                </button>
              </div>
            </div>

            {/* Quick System Links */}
            <div className="grid grid-cols-2 gap-2">
              {currentUser.role === UserRole.ADMIN && (
                <button
                  onClick={handleAdminNavigate}
                  className="col-span-2 flex items-center justify-between p-3 rounded-xl bg-linear-to-r from-rose-950/40 to-industrial-850 border border-rose-500/30 text-white hover:border-rose-500/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold">{isRTL ? 'مركز التحكم والحوكمة الإدارية' : 'Admin Control & Governance'}</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-rose-400" />
                </button>
              )}

              <button
                onClick={handleDiagnosticsNavigate}
                className="flex items-center justify-between p-2.5 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-industrial-300 hover:text-white transition-all cursor-pointer text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-brand-400" />
                  <span>{isRTL ? 'التشخيص والإعدادات' : 'AI & Diagnostics'}</span>
                </span>
              </button>

              <button
                onClick={handleSyncNavigate}
                className="flex items-center justify-between p-2.5 rounded-xl bg-industrial-850 hover:bg-industrial-800 border border-industrial-750 text-industrial-300 hover:text-white transition-all cursor-pointer text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{isRTL ? 'النسخ الاحتياطي والمزامنة' : 'Backup & Sync'}</span>
                </span>
              </button>
            </div>
          </div>

          {/* Footer / Disconnect Action */}
          <div className="p-4 border-t border-industrial-800 bg-industrial-850/80 flex items-center justify-between gap-3">
            <div className="text-[10px] text-industrial-400 font-mono">
              <span>{isRTL ? 'الجلسة نشطة' : 'Session Active'}</span> • {currentUser.id}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-industrial-300 hover:text-white hover:bg-industrial-800 rounded-xl transition-colors cursor-pointer"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500/50 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isRTL ? 'تسجيل الخروج' : 'Disconnect'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
