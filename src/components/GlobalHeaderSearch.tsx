/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Layers, 
  FileText, 
  Warehouse, 
  Cpu, 
  Sparkles, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { performGlobalSearch, GlobalSearchResults, GlobalSearchResultItem } from '../services/port14Service';
import { Material } from '../types';
import { EMISBadge, EMISStatus } from './design-system';

interface GlobalHeaderSearchProps {
  onSelectMaterial?: (material: Material) => void;
  onNavigateToTab: (tabId: string, initialSearch?: string) => void;
  className?: string;
}

export default function GlobalHeaderSearch({
  onSelectMaterial,
  onNavigateToTab,
  className = ''
}: GlobalHeaderSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      const searchRes = performGlobalSearch(query);
      setResults(searchRes);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    setIsOpen(false);
    if (item.type === 'EXACT_MATERIAL' || item.type === 'MATERIAL') {
      if (onSelectMaterial && item.rawItem) {
        onSelectMaterial(item.rawItem);
      } else {
        onNavigateToTab('materials', item.partNumber || item.title);
      }
    } else if (item.type === 'DOCUMENT') {
      onNavigateToTab('documents', item.title);
    } else if (item.type === 'EQUIPMENT') {
      onNavigateToTab('equipment', item.title);
    } else if (item.type === 'EXTERNAL') {
      onNavigateToTab('external-stock', item.title);
    }
  };

  const handleViewAllResults = () => {
    setIsOpen(false);
    onNavigateToTab('search', query);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input Field */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 h-4 w-4 text-industrial-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder="🔍 Search materials, PN, SN, MR, PO, WO, site, warehouse..."
          className="w-full pl-10 pr-20 py-2 bg-industrial-850 hover:bg-industrial-800 focus:bg-industrial-900 border border-industrial-700/80 focus:border-brand-500 rounded-xl text-xs md:text-sm text-white placeholder-industrial-400 focus:outline-hidden focus:ring-1 focus:ring-brand-500 transition-all shadow-inner"
          id="global-header-search-input"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
                setIsOpen(false);
              }}
              className="p-1 rounded-md text-industrial-400 hover:text-white hover:bg-industrial-750 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-400 border border-industrial-700/80">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Instant Categorized Results Dropdown */}
      <AnimatePresence>
        {isOpen && results && results.totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 w-full md:w-[540px] bg-industrial-900 border border-industrial-750 rounded-2xl shadow-2xl overflow-hidden z-50 text-white max-h-[75vh] flex flex-col"
            id="global-search-dropdown"
          >
            {/* Header */}
            <div className="px-4 py-2.5 bg-industrial-950/60 border-b border-industrial-800 flex items-center justify-between text-xs text-industrial-400">
              <span className="font-semibold text-industrial-200">
                Found {results.totalCount} authoritative matches for "{results.query}"
              </span>
              <button
                onClick={handleViewAllResults}
                className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Full Search View</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Scrollable Results */}
            <div className="p-2 overflow-y-auto space-y-3 flex-1 divide-y divide-industrial-800/60">
              {/* Exact Matches */}
              {results.exactMatches.length > 0 && (
                <div className="pt-2 first:pt-0">
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Exact Material Matches (Direct Passport)</span>
                  </div>
                  <div className="space-y-1">
                    {results.exactMatches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="p-2.5 rounded-xl bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-500/20 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                            <p className="text-[11px] text-industrial-300 truncate">{item.subtitle}</p>
                            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                              Stock: {item.quantity} {item.unit} • {item.location}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 pl-2">
                          <EMISBadge variant="success" size="xs">
                            Passport 2.0
                          </EMISBadge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              onNavigateToTab('materials', item.title);
                            }}
                            className="p-1 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-800/50 transition-colors"
                            title="الانتقال المباشر للمادة في السجل"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-industrial-500 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Materials */}
              {results.materials.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-brand-400 flex items-center gap-1.5 font-bold">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Materials Catalog ({results.materials.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.materials.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="p-2 rounded-xl hover:bg-industrial-800 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div className="truncate min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-industrial-400 truncate">{item.subtitle} • {item.location}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 pl-2">
                          <span className="text-[11px] font-mono text-industrial-300 font-medium">{item.badge}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              onNavigateToTab('materials', item.title);
                            }}
                            className="p-1 rounded-md text-industrial-400 hover:text-white hover:bg-industrial-700 transition-colors"
                            title="الانتقال المباشر للمادة في السجل"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-3.5 w-3.5 text-industrial-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {results.documents.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-bold">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Technical Documents ({results.documents.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.documents.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="p-2 rounded-xl hover:bg-industrial-800 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div className="truncate min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-industrial-400 truncate">{item.subtitle}</p>
                        </div>
                        <EMISBadge variant="info" size="xs">
                          {item.badge}
                        </EMISBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {results.equipment.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-bold">
                    <Warehouse className="h-3.5 w-3.5" />
                    <span>Equipment Register ({results.equipment.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.equipment.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className="p-2 rounded-xl hover:bg-industrial-800 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div className="truncate min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-industrial-400 truncate">{item.subtitle}</p>
                        </div>
                        <EMISBadge variant="warning" size="xs">
                          Tag
                        </EMISBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Engineering Recommendations */}
              {results.aiSuggestions.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Engineering Suggestion</span>
                  </div>
                  {results.aiSuggestions.map((sug, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-purple-200">{sug.title}</span>
                        <EMISStatus origin="AI_SUGGESTION" label="AI ADVISORY" />
                      </div>
                      <p className="text-[11px] text-industrial-300 leading-relaxed">{sug.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-industrial-950/80 border-t border-industrial-800 flex items-center justify-between text-xs">
              <span className="text-industrial-400">Press Esc to close</span>
              <button
                onClick={handleViewAllResults}
                className="text-brand-400 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Search</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
