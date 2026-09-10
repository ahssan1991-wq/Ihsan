/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  Filter, 
  Layers, 
  Building2, 
  Warehouse, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Search,
  Sparkles,
  Clock,
  ChevronRight,
  Database,
  Edit3,
  FileText,
  Camera,
  Image as ImageIcon,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  Sliders,
  Eye,
  AlertCircle
} from 'lucide-react';
import { AppNotification, User, NotificationCategory, NotificationType, NotificationPriority, Material } from '../types';
import { dbService } from '../services/dbService';
import MaterialQuickEditModal from './MaterialQuickEditModal';
import MaterialDetailsModal from './MaterialDetailsModal';

interface NotificationCenterProps {
  currentUser: User;
  onNavigateTab?: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onInspectMaterial?: (material: Material) => void;
  onEditMaterial?: (material: Material, tab?: 'core' | 'docs' | 'photos' | 'specs') => void;
}

export default function NotificationCenter({ 
  currentUser, 
  onNavigateTab,
  isOpen, 
  onClose,
  onInspectMaterial,
  onEditMaterial
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state for Material Quick Edit and Details
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editingInitialTab, setEditingInitialTab] = useState<'core' | 'docs' | 'photos' | 'specs'>('core');
  const [inspectingMaterial, setInspectingMaterial] = useState<Material | null>(null);

  // Inline Quick Adjust state
  const [inlineEditingPartNumber, setInlineEditingPartNumber] = useState<string | null>(null);
  const [inlineQty, setInlineQty] = useState<number>(0);
  const [inlineDesc, setInlineDesc] = useState<string>('');
  const [inlineArabicDesc, setInlineArabicDesc] = useState<string>('');
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Pagination state (Port 11: Scalability limit)
  const [displayLimit, setDisplayLimit] = useState(15);

  const refreshData = () => {
    const list = dbService.getNotifications(currentUser);
    setNotifications(list);
    setMaterials(dbService.getMaterials());
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('emis:notifications-updated', handleUpdate);
    window.addEventListener('emis:notification-added', handleUpdate);
    window.addEventListener('emis:materials-updated', handleUpdate);
    return () => {
      window.removeEventListener('emis:notifications-updated', handleUpdate);
      window.removeEventListener('emis:notification-added', handleUpdate);
      window.removeEventListener('emis:materials-updated', handleUpdate);
    };
  }, [currentUser]);

  // Fast map lookup for materials by Part Number
  const materialsMap = useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materials) {
      if (m.partNumber) {
        map.set(m.partNumber.trim().toUpperCase(), m);
      }
    }
    return map;
  }, [materials]);

  // Find linked material for a notification
  const findRelatedMaterial = (notif: AppNotification): Material | undefined => {
    if (notif.materialId) {
      const found = materialsMap.get(notif.materialId.trim().toUpperCase());
      if (found) return found;
    }
    if (notif.linkType === 'material' && notif.linkId) {
      const found = materialsMap.get(notif.linkId.trim().toUpperCase());
      if (found) return found;
    }
    if (notif.category?.includes('MATERIAL') || notif.title?.includes('مادة') || notif.message?.includes('مادة')) {
      for (const m of materials) {
        if (m.partNumber) {
          const pn = m.partNumber.trim().toUpperCase();
          if (notif.title?.toUpperCase().includes(pn) || notif.message?.toUpperCase().includes(pn)) {
            return m;
          }
        }
      }
    }
    return undefined;
  };

  const getDocumentCount = (mat: Material): number => {
    let count = 0;
    if (mat.datasheet) count++;
    if (mat.coc) count++;
    if (mat.calibrationCertificate) count++;
    if (mat.manuals) count++;
    if (mat.documents) {
      count += Object.keys(mat.documents).length;
    }
    return count;
  };

  const getPhotoCount = (mat: Material): number => {
    let count = 0;
    if (mat.photo) count++;
    if (mat.nameplatePhoto) count++;
    if (mat.primaryIdentifierPhoto) count++;
    if (mat.photos) {
      count += (mat.photos.nameplate?.length || 0);
      count += (mat.photos.installation?.length || 0);
      count += (mat.photos.warehouse?.length || 0);
      count += (mat.photos.other?.length || 0);
    }
    return count;
  };

  const startInlineEdit = (mat: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    if (inlineEditingPartNumber === mat.partNumber) {
      setInlineEditingPartNumber(null);
      return;
    }
    setInlineEditingPartNumber(mat.partNumber);
    setInlineQty(mat.quantity || 0);
    setInlineDesc(mat.description || '');
    setInlineArabicDesc(mat.arabicDescription || '');
    setInlineSuccess(null);
    setInlineError(null);
  };

  const handleSaveInline = (mat: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Material = {
      ...mat,
      quantity: Number(inlineQty) || 0,
      description: inlineDesc.trim() || mat.description,
      arabicDescription: inlineArabicDesc.trim() || mat.arabicDescription,
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: `hist-inline-${Date.now()}`,
          action: 'Inline Notification Quick Edit',
          details: `Updated quantity to ${inlineQty} and description via Notification Center`,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        },
        ...(mat.history || [])
      ]
    };

    const res = dbService.updateMaterial(updated, currentUser);
    if (res.success) {
      setInlineSuccess(mat.partNumber);
      setInlineError(null);
      refreshData();
      setTimeout(() => {
        setInlineSuccess(null);
        setInlineEditingPartNumber(null);
      }, 1600);
    } else {
      setInlineError(res.error || 'فشل في حفظ التعديلات');
    }
  };

  const handleOpenQuickEdit = (mat: Material, tab: 'core' | 'docs' | 'photos' | 'specs', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onEditMaterial) {
      onEditMaterial(mat, tab);
    } else {
      setEditingInitialTab(tab);
      setEditingMaterial(mat);
    }
  };

  const handleOpenDetails = (mat: Material, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onInspectMaterial) {
      onInspectMaterial(mat);
    } else {
      setInspectingMaterial(mat);
    }
  };

  // Derived available sites
  const sites = useMemo(() => dbService.getSites(), []);

  // Filtered notifications (Port 11 Item 20: 8 standard categories)
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Category filter
      if (activeCategoryFilter !== 'ALL') {
        if (activeCategoryFilter === 'UNREAD' && n.read) return false;
        if (activeCategoryFilter === 'CRITICAL' && n.priority !== 'CRITICAL' && n.priority !== 'HIGH' && n.type !== 'ERROR') return false;
        if (activeCategoryFilter === 'MATERIALS' && !(n.category?.includes('MATERIAL') || n.linkType === 'materials')) return false;
        if (activeCategoryFilter === 'APPROVALS' && !(n.category?.includes('APPROVAL') || n.category?.includes('WORKFLOW') || n.linkType === 'approvals')) return false;
        if (activeCategoryFilter === 'STOCK' && !(n.category?.includes('STOCK') || n.category?.includes('INVENTORY') || n.category?.includes('TRANSFER') || n.linkType === 'stock-ledger' || n.linkType === 'transfers')) return false;
        if (activeCategoryFilter === 'SYSTEM' && !(n.category?.includes('SYSTEM') || n.category?.includes('SYNC') || n.category?.includes('DATABASE') || n.category?.includes('SITE') || n.linkType === 'site')) return false;
        if (activeCategoryFilter === 'SECURITY' && !(n.category?.includes('USER') || n.category?.includes('SECURITY') || n.category?.includes('AUTH') || n.category?.includes('PERMISSION'))) return false;
      }

      // Quick unread toggle
      if (showUnreadOnly && n.read) return false;

      // Site filter
      if (selectedSiteFilter !== 'ALL') {
        if (n.siteId !== selectedSiteFilter && n.site !== selectedSiteFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMsg = n.message?.toLowerCase().includes(q);
        const matchSite = n.site?.toLowerCase().includes(q);
        const matchMat = n.materialId?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchSite && !matchMat) return false;
      }

      return true;
    });
  }, [notifications, activeCategoryFilter, selectedSiteFilter, showUnreadOnly, searchQuery]);

  // Paginated items
  const displayedNotifications = useMemo(() => {
    return filteredNotifications.slice(0, displayLimit);
  }, [filteredNotifications, displayLimit]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    dbService.markNotificationAsRead(id);
    refreshData();
  };

  const handleMarkAllRead = () => {
    dbService.markAllNotificationsAsRead(currentUser);
    refreshData();
  };

  const handleClearAll = () => {
    if (confirm('Clear all notifications from your notification center?')) {
      dbService.clearNotifications();
      refreshData();
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      dbService.markNotificationAsRead(notif.id);
      refreshData();
    }
    const relatedMat = findRelatedMaterial(notif);
    if (relatedMat) {
      // Direct access to editing quantity, docs, or photos for this material
      handleOpenQuickEdit(relatedMat, 'core');
      return;
    }
    if (notif.linkType && onNavigateTab) {
      onNavigateTab(notif.linkType);
      onClose();
    }
  };

  const getCategoryIcon = (category?: NotificationCategory, type?: NotificationType) => {
    if (category?.includes('MATERIAL')) return <Layers className="w-4 h-4 text-brand-600" />;
    if (category?.includes('SITE')) return <Building2 className="w-4 h-4 text-emerald-600" />;
    if (category?.includes('WAREHOUSE')) return <Warehouse className="w-4 h-4 text-indigo-600" />;
    if (category?.includes('USER') || type === 'ERROR') return <ShieldAlert className="w-4 h-4 text-rose-600" />;
    if (type === 'SUCCESS') return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
    if (type === 'WARNING') return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <Info className="w-4 h-4 text-sky-600" />;
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return 'Recently';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200" id="notification-center-backdrop" onClick={onClose}>
      <motion.div 
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-industrial-900 h-full shadow-2xl flex flex-col border-l border-industrial-200 dark:border-industrial-800"
        id="notification-center-drawer"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-industrial-200 dark:border-industrial-800 flex items-center justify-between bg-industrial-50/70 dark:bg-industrial-950/40">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/20">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-industrial-900 shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                Notification Center
                <span className="text-xs px-2 py-0.5 rounded-full bg-industrial-200 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 font-semibold">
                  {notifications.length} Total
                </span>
              </h2>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Live transactional alerts & governance log
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="p-2 text-xs font-semibold text-industrial-600 dark:text-industrial-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors flex items-center gap-1"
                id="btn-mark-all-read"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-industrial-400 hover:text-industrial-700 dark:hover:text-industrial-200 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors"
              id="btn-close-notifs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3.5 border-b border-industrial-100 dark:border-industrial-800/80 space-y-2.5 bg-white dark:bg-industrial-900">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
            <input
              type="text"
              placeholder="Search notifications by title, SKU, or facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-lg text-industrial-900 dark:text-industrial-100 placeholder-industrial-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              id="notif-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-industrial-400 hover:text-industrial-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills: Port 11 Item 20 - 8 exact categories */}
          <div className="flex flex-col gap-2 pb-1 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: 'Unread' },
                { id: 'CRITICAL', label: 'Critical' },
                { id: 'MATERIALS', label: 'Materials' },
                { id: 'APPROVALS', label: 'Approvals' },
                { id: 'STOCK', label: 'Stock' },
                { id: 'SYSTEM', label: 'System' },
                { id: 'SECURITY', label: 'Security' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategoryFilter(tab.id);
                    setDisplayLimit(15);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    activeCategoryFilter === tab.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-200 dark:hover:bg-industrial-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 shrink-0">
              {/* Site selector filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-industrial-500 uppercase tracking-wider font-semibold">Scope:</span>
                <select
                  value={selectedSiteFilter}
                  onChange={(e) => {
                    setSelectedSiteFilter(e.target.value);
                    setDisplayLimit(15);
                  }}
                  className="text-[11px] bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-md px-2 py-1 text-industrial-700 dark:text-industrial-300 focus:outline-none"
                >
                  <option value="ALL">All Facilities</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Reset to View All */}
              {(activeCategoryFilter !== 'ALL' || selectedSiteFilter !== 'ALL' || searchQuery || showUnreadOnly) && (
                <button
                  onClick={() => {
                    setActiveCategoryFilter('ALL');
                    setSelectedSiteFilter('ALL');
                    setSearchQuery('');
                    setShowUnreadOnly(false);
                    setDisplayLimit(15);
                  }}
                  className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  View All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-industrial-100 dark:divide-industrial-800/60 p-2 sm:p-3 space-y-1">
          {displayedNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-industrial-400 dark:text-industrial-500">
              <div className="p-3 bg-industrial-100 dark:bg-industrial-800 rounded-2xl mb-3">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">
                No notifications found
              </p>
              <p className="text-xs text-industrial-400 mt-1 max-w-xs">
                {searchQuery || activeCategoryFilter !== 'ALL' || showUnreadOnly
                  ? 'Try changing or clearing your search and filter criteria.'
                  : 'All operational transactions and alerts are up to date.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3.5 rounded-xl transition-all cursor-pointer border ${
                  notif.read
                    ? 'bg-white dark:bg-industrial-900 border-transparent hover:bg-industrial-50 dark:hover:bg-industrial-850 opacity-80 hover:opacity-100'
                    : 'bg-brand-50/40 dark:bg-brand-950/20 border-brand-200/50 dark:border-brand-800/40 hover:bg-brand-50/70 dark:hover:bg-brand-950/30'
                }`}
                id={`notif-card-${notif.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Category icon */}
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    notif.type === 'ERROR' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' :
                    notif.type === 'WARNING' ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' :
                    notif.type === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
                    'bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300'
                  }`}>
                    {getCategoryIcon(notif.category, notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold truncate ${
                        notif.read ? 'text-industrial-800 dark:text-industrial-200' : 'text-industrial-950 dark:text-white'
                      }`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-industrial-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-industrial-600 dark:text-industrial-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {notif.site && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300">
                          <Building2 className="w-3 h-3" />
                          {notif.site}
                        </span>
                      )}
                      {notif.materialId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/40">
                          <Layers className="w-3 h-3" />
                          {notif.materialId}
                        </span>
                      )}
                      {notif.linkType && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                          View details <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Direct Material Quick Action & Management Block */}
                    {(() => {
                      const relatedMat = findRelatedMaterial(notif);
                      if (!relatedMat) return null;
                      return (
                        <div 
                          className="mt-3 pt-2.5 border-t border-industrial-200/60 dark:border-industrial-800/80 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Info bar */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-lg bg-industrial-100/80 dark:bg-industrial-800/60 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-brand-700 dark:text-brand-300">
                                {relatedMat.partNumber}
                              </span>
                              <span className="text-industrial-400">•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                الرصيد: {relatedMat.quantity} {relatedMat.unit || 'pcs'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-industrial-500">
                              <span className="flex items-center gap-1 font-medium">
                                <FileText className="w-3 h-3 text-indigo-500" />
                                {getDocumentCount(relatedMat)} مستند
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-medium">
                                <Camera className="w-3 h-3 text-emerald-500" />
                                {getPhotoCount(relatedMat)} صورة
                              </span>
                            </div>
                          </div>

                          {/* Inline Fast Edit Widget */}
                          {inlineEditingPartNumber === relatedMat.partNumber && (
                            <div className="p-3 bg-white dark:bg-industrial-950 rounded-xl border border-brand-300 dark:border-brand-800 shadow-sm space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1">
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>تعديل سريع مباشر للمادة</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditingPartNumber(null)}
                                  className="text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200 text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Quantity Stepper */}
                              <div>
                                <label className="block text-[10px] font-bold text-industrial-600 dark:text-industrial-400 mb-1">
                                  الكمية المتوفرة ({relatedMat.unit || 'pcs'}):
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInlineQty(prev => Math.max(0, prev - 1))}
                                    className="p-1.5 bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 rounded-lg text-industrial-700 dark:text-industrial-300"
                                    title="-1"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={inlineQty}
                                    onChange={(e) => setInlineQty(Math.max(0, Number(e.target.value) || 0))}
                                    className="w-24 text-center px-2 py-1 bg-industrial-50 dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs font-bold font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setInlineQty(prev => prev + 1)}
                                    className="p-1.5 bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 rounded-lg text-industrial-700 dark:text-industrial-300"
                                    title="+1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="flex items-center gap-1 mr-1">
                                    {[+5, +10, +50].map(add => (
                                      <button
                                        key={add}
                                        type="button"
                                        onClick={() => setInlineQty(prev => prev + add)}
                                        className="px-1.5 py-1 text-[10px] font-mono bg-industrial-100 dark:bg-industrial-800 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/60 rounded-md transition-colors"
                                      >
                                        +{add}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Description Field */}
                              <div>
                                <label className="block text-[10px] font-bold text-industrial-600 dark:text-industrial-400 mb-1">
                                  الوصف الفني للمادة (Description):
                                </label>
                                <input
                                  type="text"
                                  value={inlineDesc}
                                  onChange={(e) => setInlineDesc(e.target.value)}
                                  placeholder="الوصف الفني..."
                                  className="w-full px-2.5 py-1.5 bg-industrial-50 dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs"
                                />
                              </div>

                              {/* Save & Feedback */}
                              <div className="flex items-center justify-between pt-1">
                                {inlineSuccess === relatedMat.partNumber ? (
                                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>تم حفظ التعديل بنجاح!</span>
                                  </span>
                                ) : inlineError ? (
                                  <span className="text-[10px] text-rose-500 font-medium">
                                    {inlineError}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-industrial-400">
                                    يحفظ التعديل فورياً في قاعدة البيانات
                                  </span>
                                )}

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => handleSaveInline(relatedMat, e)}
                                    className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>حفظ فوري</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {/* 1. تعديل الكمية والوصف */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenQuickEdit(relatedMat, 'core', e)}
                              className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border border-brand-200/70 dark:border-brand-800/70 hover:shadow-xs cursor-pointer"
                              title="تعديل الكمية والوصف ومعلومات الصانع"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                              <span>تعديل الكمية والوصف</span>
                            </button>

                            {/* 2. شهادات ومستندات */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenQuickEdit(relatedMat, 'docs', e)}
                              className="px-2.5 py-1.5 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border border-industrial-200 dark:border-industrial-700 hover:shadow-xs cursor-pointer"
                              title="إرفاق شهادات المطابقة والمعايرة والـ Datasheet"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>شهادات ومستندات</span>
                            </button>

                            {/* 3. صور المادة والكاميرا */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenQuickEdit(relatedMat, 'photos', e)}
                              className="px-2.5 py-1.5 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 border border-industrial-200 dark:border-industrial-700 hover:shadow-xs cursor-pointer"
                              title="التقاط أو رفع صور المادة ولوحة البيانات المعدنية"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>صور المادة</span>
                            </button>

                            {/* 4. تعديل سريع مضمن toggle */}
                            <button
                              type="button"
                              onClick={(e) => startInlineEdit(relatedMat, e)}
                              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 border cursor-pointer ${
                                inlineEditingPartNumber === relatedMat.partNumber
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : 'bg-industrial-50 dark:bg-industrial-850 hover:bg-industrial-100 text-industrial-600 dark:text-industrial-400 border-industrial-200 dark:border-industrial-800'
                              }`}
                              title="تعديل سريع مضمن للكمية والوصف هنا مباشرة"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>تعديل سريع</span>
                            </button>

                            {/* 5. بطاقة التفاصيل الكاملة */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenDetails(relatedMat, e)}
                              className="p-1.5 text-industrial-400 hover:text-industrial-700 dark:hover:text-industrial-200 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors ml-auto cursor-pointer"
                              title="عرض بطاقة المادة الكاملة وسجل المطابقة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1">
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        title="Mark as read"
                        className="p-1.5 text-industrial-400 hover:text-brand-600 hover:bg-white dark:hover:bg-industrial-800 rounded-md transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread dot indicator */}
                {!notif.read && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-brand-500 rounded-full" />
                )}
              </div>
            ))
          )}

          {/* Load More Pagination */}
          {filteredNotifications.length > displayedNotifications.length && (
            <div className="pt-2 pb-1 text-center">
              <button
                onClick={() => setDisplayLimit(prev => prev + 15)}
                className="w-full py-2 px-3 bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                id="btn-load-more-notifications"
              >
                <span>Load More Notifications</span>
                <span className="text-[10px] opacity-70">({displayedNotifications.length} of {filteredNotifications.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-industrial-200 dark:border-industrial-800 bg-industrial-50/60 dark:bg-industrial-950/40 flex items-center justify-between text-xs text-industrial-500">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px]">Real EMIS Ledger Sync Active</span>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              id="btn-clear-all-notifs"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </motion.div>

      {/* Material Quick Edit Modal */}
      {editingMaterial && (
        <MaterialQuickEditModal
          isOpen={!!editingMaterial}
          onClose={() => setEditingMaterial(null)}
          material={editingMaterial}
          currentUser={currentUser}
          initialTab={editingInitialTab}
          onMaterialUpdated={(updated) => {
            refreshData();
            setEditingMaterial(null);
          }}
        />
      )}

      {/* Material Full Details Modal */}
      {inspectingMaterial && (
        <MaterialDetailsModal
          isOpen={!!inspectingMaterial}
          onClose={() => setInspectingMaterial(null)}
          material={inspectingMaterial}
          currentUser={currentUser}
          onEditMaterial={(mat) => {
            setInspectingMaterial(null);
            handleOpenQuickEdit(mat, 'core');
          }}
        />
      )}
    </div>
  );
}
