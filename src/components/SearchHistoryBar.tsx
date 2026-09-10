/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Sparkles, 
  Trash2, 
  X, 
  Search, 
  Flame, 
  Eye, 
  ArrowUpRight, 
  History, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  Package,
  Layers,
  Building2,
  Warehouse,
  FileText
} from 'lucide-react';
import { searchHistoryService, RecentSearchQuery, AccessedPartNumber } from '../services/searchHistoryService';
import { Material } from '../types';

interface SearchHistoryBarProps {
  onSelectQuery: (query: string, sourceScope?: string) => void;
  onInspectPartNumber?: (partNumber: string) => void;
  currentQuery: string;
  sourceScope: string;
  materialsList?: Material[];
}

export default function SearchHistoryBar({
  onSelectQuery,
  onInspectPartNumber,
  currentQuery,
  sourceScope,
  materialsList = []
}: SearchHistoryBarProps) {
  const [activeTab, setActiveTab] = useState<'queries' | 'frequent_parts'>('queries');
  const [historyQueries, setHistoryQueries] = useState<RecentSearchQuery[]>([]);
  const [frequentParts, setFrequentParts] = useState<AccessedPartNumber[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [confirmClearType, setConfirmClearType] = useState<'queries' | 'parts' | null>(null);

  // Load from local storage
  const loadData = () => {
    setHistoryQueries(searchHistoryService.getSearchHistory());
    setFrequentParts(searchHistoryService.getAccessedParts());
  };

  useEffect(() => {
    loadData();

    // Custom window event listener to keep views reactive across actions
    const handleStorageUpdate = () => loadData();
    window.addEventListener('emis:search-history-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('emis:search-history-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const handleDeleteQuery = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = searchHistoryService.deleteSearchQuery(id);
    setHistoryQueries(updated);
  };

  const handleClearAllQueries = () => {
    searchHistoryService.clearSearchHistory();
    setHistoryQueries([]);
    setConfirmClearType(null);
  };

  const handleDeletePart = (e: React.MouseEvent, partNumber: string) => {
    e.stopPropagation();
    const updated = searchHistoryService.deleteAccessedPart(partNumber);
    setFrequentParts(updated);
  };

  const handleClearAllParts = () => {
    searchHistoryService.clearAccessedParts();
    setFrequentParts([]);
    setConfirmClearType(null);
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن / Just now';
    if (diffMins < 60) return `${diffMins} دقيقة / ${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours} ساعة / ${diffHours}h ago`;
    if (diffDays === 1) return 'أمس / Yesterday';
    return `${diffDays} يوم / ${diffDays}d ago`;
  };

  const getSourceBadge = (scope?: string) => {
    switch (scope) {
      case 'STATION':
        return { label: '🟢 Station', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'EXTERNAL':
        return { label: '🔵 External', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
      case 'EQUIPMENT':
        return { label: '🟣 Equipment', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'MRF_WO':
        return { label: '🟠 MR & WO', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
      default:
        return { label: '🌐 All Sources', color: 'bg-industrial-100 text-industrial-800 dark:bg-industrial-800 dark:text-industrial-200' };
    }
  };

  // If both history and parts are completely empty, don't occupy unnecessary space
  if (historyQueries.length === 0 && frequentParts.length === 0) {
    return null;
  }

  const displayedQueries = isExpanded ? historyQueries : historyQueries.slice(0, 8);
  const displayedParts = isExpanded ? frequentParts : frequentParts.slice(0, 8);

  return (
    <div className="bg-industrial-50/80 dark:bg-industrial-900/80 border border-industrial-200 dark:border-industrial-800 rounded-2xl p-3.5 text-xs space-y-2.5 transition-all shadow-2xs">
      {/* Top Header: Tab toggles and Clear History actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-industrial-200/60 dark:border-industrial-800 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('queries')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'queries'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900 dark:hover:text-white hover:bg-industrial-200/60 dark:hover:bg-industrial-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>سجل البحث الأخير / Recent Searches</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'queries' ? 'bg-white/20 text-white' : 'bg-industrial-200 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400'
            }`}>
              {historyQueries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('frequent_parts')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'frequent_parts'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900 dark:hover:text-white hover:bg-industrial-200/60 dark:hover:bg-industrial-800'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            <span>قطع الغيار الأكثر استخداماً / Frequent Parts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'frequent_parts' ? 'bg-white/20 text-white' : 'bg-industrial-200 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400'
            }`}>
              {frequentParts.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Confirmation or Clear Button */}
          {confirmClearType === (activeTab === 'queries' ? 'queries' : 'parts') ? (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-lg animate-fadeIn">
              <span className="text-[10.5px] font-semibold text-rose-700 dark:text-rose-300">تأكيد مسح السجل؟</span>
              <button
                type="button"
                onClick={activeTab === 'queries' ? handleClearAllQueries : handleClearAllParts}
                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
              >
                نعم، مسح
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearType(null)}
                className="px-1.5 py-0.5 text-industrial-500 hover:text-industrial-700 text-[10px] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearType(activeTab === 'queries' ? 'queries' : 'parts')}
              className="text-[11px] text-industrial-500 dark:text-industrial-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              title="مسح السجل المخزن محلياً"
            >
              <Trash2 className="h-3 w-3" />
              <span>مسح السجل / Clear</span>
            </button>
          )}

          {/* Expand / Collapse Button */}
          {((activeTab === 'queries' && historyQueries.length > 8) || (activeTab === 'frequent_parts' && frequentParts.length > 8)) && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-0.5 px-2 py-1 cursor-pointer"
            >
              <span>{isExpanded ? 'عرض أقل' : 'عرض الكل'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Recent Search Queries */}
      {activeTab === 'queries' && (
        <div className="space-y-2">
          {historyQueries.length === 0 ? (
            <p className="text-[11px] text-industrial-400 py-1">لا يوجد استعلامات بحث سابقة مخزنة محلياً.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {displayedQueries.map((item) => {
                const isSelected = currentQuery.trim().toLowerCase() === item.query.toLowerCase();
                const scopeBadge = getSourceBadge(item.sourceScope);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-400 dark:border-brand-600 text-brand-900 dark:text-brand-200 ring-1 ring-brand-400/40 shadow-xs'
                        : 'bg-white dark:bg-industrial-850 border-industrial-200 dark:border-industrial-700/80 text-industrial-800 dark:text-industrial-200 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xs'
                    }`}
                    onClick={() => onSelectQuery(item.query, item.sourceScope)}
                    title={`انقر للبحث عن "${item.query}" (${formatRelativeTime(item.timestamp)})`}
                  >
                    <Search className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-industrial-400 group-hover:text-brand-500'}`} />
                    
                    <span className="font-semibold truncate max-w-xs">{item.query}</span>

                    {item.resultsCount !== undefined && (
                      <span className="text-[9.5px] font-mono font-bold bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 px-1.5 py-0.2 rounded">
                        {item.resultsCount}
                      </span>
                    )}

                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded-md ${scopeBadge.color} hidden sm:inline`}>
                      {scopeBadge.label.split(' ')[0]}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteQuery(e, item.id)}
                      className="opacity-60 hover:opacity-100 text-industrial-400 hover:text-rose-500 p-0.5 rounded transition-opacity cursor-pointer ml-1"
                      title="حذف هذا الاستعلام من السجل"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Frequently & Recently Accessed Part Numbers */}
      {activeTab === 'frequent_parts' && (
        <div className="space-y-2">
          {frequentParts.length === 0 ? (
            <p className="text-[11px] text-industrial-400 py-1">لا توجد قطع غيار مسجلة في سجل الوصول السريع بعد.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {displayedParts.map((part) => {
                const matchedMat = materialsList.find(
                  m => m.partNumber.toUpperCase() === part.partNumber.toUpperCase()
                );

                return (
                  <motion.div
                    key={part.partNumber}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-industrial-850 p-2.5 rounded-xl border border-industrial-200 dark:border-industrial-700/80 hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between group shadow-2xs cursor-pointer"
                    onClick={() => onSelectQuery(part.partNumber)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-xs text-industrial-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {part.partNumber}
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Flame className="h-2.5 w-2.5" />
                            <span>{part.accessCount}x</span>
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => handleDeletePart(e, part.partNumber)}
                            className="opacity-0 group-hover:opacity-100 text-industrial-400 hover:text-rose-500 p-0.5 rounded transition-opacity cursor-pointer"
                            title="إزالة من القائمة"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-industrial-500 dark:text-industrial-400 line-clamp-1">
                        {part.description || matchedMat?.description || 'Industrial Component'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-industrial-400 font-mono pt-1 border-t border-industrial-100 dark:border-industrial-800">
                        <span className="truncate">{part.manufacturer || matchedMat?.manufacturer || 'Standard'}</span>
                        <span>{formatRelativeTime(part.lastAccessed)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-industrial-100 dark:border-industrial-800 text-[10.5px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQuery(part.partNumber);
                        }}
                        className="text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="h-3 w-3" />
                        <span>بحث / Search</span>
                      </button>

                      {onInspectPartNumber && matchedMat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectPartNumber(part.partNumber);
                          }}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>معاينة / Inspect</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
