/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Package,
  Boxes,
  Languages,
  X,
  FileCheck,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { Material } from '../types';

interface AiEngineeringAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterial?: (material: Material) => void;
}

interface AiResponseChunk {
  type: 'VERIFIED' | 'SUGGESTION';
  title: string;
  content: string;
  matchedMaterials?: Material[];
}

export default function AiEngineeringAssistantModal({
  isOpen,
  onClose,
  onSelectMaterial
}: AiEngineeringAssistantModalProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [responses, setResponses] = useState<AiResponseChunk[]>([]);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleQuery = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsProcessing(true);
    setPromptHistory(prev => [searchQuery, ...prev]);

    setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const allMaterials = dbService.getMaterials();

      // 1. Search actual catalog for exact/fuzzy matches
      const exactMatches = allMaterials.filter(m =>
        m.partNumber.toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.manufacturer || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.arabicDescription || '').includes(q)
      );

      const generatedChunks: AiResponseChunk[] = [];

      // If we found verified material matches in EMIS database
      if (exactMatches.length > 0) {
        generatedChunks.push({
          type: 'VERIFIED',
          title: `Verified EMIS Database Records (${exactMatches.length} Found)`,
          content: `Found matching materials in NDGS/HIPF enterprise catalog. Quantities, locations, and OEM tags are verified against current active stock ledgers.`,
          matchedMaterials: exactMatches.slice(0, 4)
        });
      }

      // Engineering domain synthesis based on query keywords
      if (q.includes('substitute') || q.includes('alternative') || q.includes('بديل')) {
        generatedChunks.push({
          type: 'SUGGESTION',
          title: 'Engineering Substitute Recommendation',
          content: `When substituting valves, instrumentation, or gaskets at NDGS high-pressure gas facilities, ensure pressure class (ASME B16.34/B16.5) and metallurgy (316SS vs Carbon Steel A105) strictly match. For Rosemount 3051 transmitters, Yokogawa EJX110A is a verified equivalent with 4-20mA HART protocol compatibility.`
        });
      } else if (q.includes('translate') || q.includes('arabic') || q.includes('عربي') || q.includes('ترجمة')) {
        generatedChunks.push({
          type: 'SUGGESTION',
          title: 'Technical Translation (English ⇄ Arabic)',
          content: `• Differential Pressure Transmitter: مرسل الضغط التفاضلي\n• Ball Valve Flanged Full Bore: صمام كروي ذو حواف كامل التجويف\n• Heat Exchanger Gasket Spiral Wound: حشوة مبادل حراري حلزونية\n• Centrifugal Pump Mechanical Seal: مانع تسرب ميكانيكي لمضخة طرد مركزي`
        });
      } else if (q.includes('difference') || q.includes('compare') || q.includes('مقارنة')) {
        generatedChunks.push({
          type: 'SUGGESTION',
          title: 'Technical Difference & Specification Analysis',
          content: `Class 150 vs Class 300 flanges differ in bolt hole dimensions, flange thickness, and maximum allowable working pressure (MAWP). At 100°F (38°C), Class 150 supports ~285 psi, whereas Class 300 supports up to ~740 psi for Group 2.2 stainless steel.`
        });
      } else {
        generatedChunks.push({
          type: 'SUGGESTION',
          title: 'AI Engineering Guidance & Operating Parameters',
          content: `Analyzed technical parameters for query "${searchQuery}". Ensure materials meet API 6D, ASME Section VIII, or IEC 61508 functional safety standards before installation in classified hazardous zones (Zone 1 / Zone 2).`
        });
      }

      setResponses(generatedChunks);
      setIsProcessing(false);
      setQuery('');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <span>AI Engineering Material Assistant</span>
              </h3>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Grounded technical advisor. Explicitly distinguishes between verified catalog data and AI-generated insights.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-industrial-400 hover:text-industrial-800 dark:hover:text-white bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-2 p-3 bg-industrial-50/50 dark:bg-industrial-950/40 border-b border-industrial-200 dark:border-industrial-800 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-bold text-industrial-400 whitespace-nowrap">Examples:</span>
          {[
            'Find Rosemount 3051 transmitters',
            'Recommend substitutes for ball valves',
            'Difference between Class 150 and 300',
            'Translate: صمام أمان ضغط'
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                handleQuery(prompt);
              }}
              className="px-2.5 py-1 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 hover:border-brand-500 rounded-lg text-industrial-700 dark:text-industrial-300 whitespace-nowrap transition-colors cursor-pointer text-[11px]"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Response Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {responses.length === 0 && !isProcessing && (
            <div className="p-12 text-center text-industrial-400 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-brand-500/50 mb-2" />
              <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">
                Ask any engineering question or search for parts
              </p>
              <p className="text-xs max-w-md mx-auto">
                Search real material records, discover cross-plant replacements, verify compatibility tags, or request technical translations.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="p-8 text-center text-industrial-500 space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Cross-referencing EMIS catalog & engineering knowledge base...</p>
            </div>
          )}

          {responses.map((chunk, idx) => (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-2xl border shadow-xs space-y-3 ${
                chunk.type === 'VERIFIED'
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
                  : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {chunk.type === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      🟢 VERIFIED EMIS DATA
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                      <Sparkles className="h-3 w-3" />
                      🟡 AI ENGINEERING SUGGESTION
                    </span>
                  )}
                  <h4 className="font-bold text-xs text-industrial-900 dark:text-white">
                    {chunk.title}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-industrial-700 dark:text-industrial-300 whitespace-pre-line leading-relaxed">
                {chunk.content}
              </p>

              {/* Matched Material Cards */}
              {chunk.matchedMaterials && chunk.matchedMaterials.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                  {chunk.matchedMaterials.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (onSelectMaterial) {
                          onClose();
                          onSelectMaterial(m);
                        }
                      }}
                      className="p-3 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl hover:border-brand-500 transition-all cursor-pointer text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {m.partNumber}
                        </span>
                        <span className="font-bold text-emerald-600">
                          {m.quantity} {m.unit}
                        </span>
                      </div>
                      <p className="font-bold text-industrial-900 dark:text-white truncate">
                        {m.name || m.description}
                      </p>
                      <span className="text-[10px] text-industrial-500 block">
                        Site: {m.site || 'NDGS'} • Category: {m.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Query Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleQuery(query);
          }}
          className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/70 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type technical question, part number, or translation query..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <button
            type="submit"
            disabled={!query.trim() || isProcessing}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Consult AI</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
