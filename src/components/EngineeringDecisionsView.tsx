/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck2, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  SlidersHorizontal, 
  Calendar, 
  User, 
  Tag, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Filter,
  Check,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { EngineeringDecision, User as UserType, UserRole, Material } from '../types';
import { dbService } from '../services/dbService';

interface EngineeringDecisionsViewProps {
  currentUser: UserType;
  materials?: Material[];
  onNavigateToTab?: (tabId: string, query?: string) => void;
}

export default function EngineeringDecisionsView({ currentUser, materials = [], onNavigateToTab }: EngineeringDecisionsViewProps) {
  const [decisions, setDecisions] = useState<EngineeringDecision[]>(() => dbService.getEngineeringDecisions() || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New Decision Form State
  const [partNumber, setPartNumber] = useState('');
  const [title, setTitle] = useState('');
  const [decisionType, setDecisionType] = useState<EngineeringDecision['decisionType']>('approval');
  const [details, setDetails] = useState('');
  const [rationale, setRationale] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const refreshDecisions = () => {
    setDecisions(dbService.getEngineeringDecisions());
  };

  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!partNumber.trim()) {
      setFormError('Part Number is required.');
      return;
    }
    if (!title.trim()) {
      setFormError('Decision Title is required.');
      return;
    }
    if (!rationale.trim()) {
      setFormError('Engineering Rationale is required.');
      return;
    }

    const res = dbService.addEngineeringDecision({
      partNumber: partNumber.trim(),
      title: title.trim(),
      decisionType,
      details: details.trim() || 'No additional technical details specified.',
      rationale: rationale.trim()
    }, currentUser);

    if (res.success) {
      refreshDecisions();
      setFormSuccess('Engineering decision preserved and synchronized.');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setPartNumber('');
        setTitle('');
        setDetails('');
        setRationale('');
        setFormSuccess(null);
      }, 1200);
    } else {
      setFormError('Failed to record engineering decision.');
    }
  };

  const filteredDecisions = decisions.filter(d => {
    const matchesSearch = 
      d.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.rationale.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.approvedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || d.decisionType === selectedType;

    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: EngineeringDecision['decisionType']) => {
    switch (type) {
      case 'approval':
        return {
          label: 'Alternative Approved',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2
        };
      case 'rejection':
        return {
          label: 'Material Rejected',
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
          icon: XCircle
        };
      case 'lesson':
        return {
          label: 'Lesson Learned',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
          icon: BookOpen
        };
      case 'maintenance':
      default:
        return {
          label: 'Technical Decision',
          bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
          icon: FileText
        };
    }
  };

  return (
    <div className="space-y-6" id="engineering-decisions-view">
      {/* Header Banner */}
      <div className="bg-white dark:bg-industrial-900 p-6 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <FileCheck2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-industrial-900 dark:text-white heading-display">
                Engineering Decisions & Lessons Learned
              </h1>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Official institutional ledger of approved substitutes, technical evaluations, and field failure lessons.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Record Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-industrial-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Part Number, Decision Title, Approver, or Rationale..."
            className="w-full pl-10 pr-4 py-2 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-xl text-xs text-industrial-900 dark:text-white placeholder-industrial-400 focus:outline-hidden focus:border-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-400 hover:text-industrial-600 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-industrial-400 shrink-0 hidden md:block" />
          {[
            { id: 'all', label: 'All Decisions' },
            { id: 'approval', label: 'Approved Alternatives' },
            { id: 'rejection', label: 'Rejections' },
            { id: 'lesson', label: 'Lessons Learned' },
            { id: 'maintenance', label: 'Technical Decisions' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 hover:bg-industrial-200 dark:hover:bg-industrial-750'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {filteredDecisions.length === 0 ? (
          <div className="bg-white dark:bg-industrial-900 p-12 rounded-2xl border border-industrial-200 dark:border-industrial-800 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-industrial-100 dark:bg-industrial-800 text-industrial-400 flex items-center justify-center mx-auto">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-industrial-800 dark:text-white">
              No Engineering Decisions Found
            </h3>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 max-w-sm mx-auto">
              No engineering decisions match the query. Record new evaluations to build the institutional engineering memory.
            </p>
          </div>
        ) : (
          filteredDecisions.map((decision) => {
            const badge = getTypeBadge(decision.decisionType);
            const BadgeIcon = badge.icon;
            const linkedMaterial = materials.find(m => m.partNumber.toLowerCase() === decision.partNumber.toLowerCase());

            return (
              <motion.div
                key={decision.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-industrial-900 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-800 hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-industrial-100 dark:border-industrial-800">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badge.bg}`}>
                      <BadgeIcon className="h-3.5 w-3.5" />
                      <span>{badge.label}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-industrial-900 dark:text-white bg-industrial-100 dark:bg-industrial-800 px-2 py-0.5 rounded border border-industrial-200 dark:border-industrial-700">
                      PN: {decision.partNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-industrial-500 dark:text-industrial-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-industrial-400" />
                      <span className="font-medium text-industrial-700 dark:text-industrial-300">{decision.approvedBy}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-industrial-400" />
                      <span>{new Date(decision.approvalDate).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-industrial-900 dark:text-white">
                    {decision.title}
                  </h3>
                  <div className="bg-industrial-50 dark:bg-industrial-850 p-3 rounded-xl border border-industrial-200/80 dark:border-industrial-750 text-xs text-industrial-700 dark:text-industrial-300">
                    <p className="font-semibold text-industrial-900 dark:text-white mb-1">Engineering Rationale & Technical Basis:</p>
                    <p className="leading-relaxed">{decision.rationale}</p>
                  </div>
                  {decision.details && decision.details !== 'No additional technical details specified.' && (
                    <div className="text-xs text-industrial-600 dark:text-industrial-400 px-1">
                      <span className="font-semibold text-industrial-800 dark:text-industrial-200">Execution Details: </span>
                      {decision.details}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  {linkedMaterial ? (
                    <span className="text-industrial-500 dark:text-industrial-400 truncate max-w-md">
                      Linked: <strong className="text-industrial-700 dark:text-industrial-200">{linkedMaterial.description}</strong> ({linkedMaterial.manufacturer} {linkedMaterial.model})
                    </span>
                  ) : (
                    <span className="text-industrial-400 italic">No direct inventory record with this part number currently</span>
                  )}

                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('search', decision.partNumber)}
                      className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:text-brand-700 font-semibold cursor-pointer"
                    >
                      <span>Smart Search Part</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Record Decision Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 p-6 rounded-2xl shadow-2xl space-y-5 relative text-industrial-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-industrial-100 dark:border-industrial-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base heading-display">Record Engineering Decision</h3>
                    <p className="text-xs text-industrial-500 dark:text-industrial-400">Add an official technical evaluation or approved alternative.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg text-industrial-400 hover:text-industrial-700 dark:hover:text-white hover:bg-industrial-100 dark:hover:bg-industrial-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateDecision} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-industrial-700 dark:text-industrial-300">Part Number / Tag *</label>
                    <input
                      type="text"
                      required
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. SB20T-N4-M2P/RGLB"
                      className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl font-mono text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-industrial-700 dark:text-industrial-300">Decision Classification *</label>
                    <select
                      value={decisionType}
                      onChange={(e) => setDecisionType(e.target.value as any)}
                      className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                    >
                      <option value="approval">Alternative Approved (اعتماد بديل هندسي)</option>
                      <option value="rejection">Material Rejected (رفض مادة فنية)</option>
                      <option value="lesson">Lesson Learned (درس مستفاد وملاحظة تشغيلية)</option>
                      <option value="maintenance">Technical Decision (قرار هندسي عام)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-industrial-700 dark:text-industrial-300">Decision Title / Summary *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Official approval of Swagelok regulator as primary substitute for Parker model"
                    className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-industrial-700 dark:text-industrial-300">Engineering Rationale & Technical Compatibility Basis *</label>
                  <textarea
                    required
                    rows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Explain why this substitute or decision is valid (e.g. Process compatibility, pressure ratings match 10/4 bar, material of construction SS316 tested in Station 3...)"
                    className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-industrial-700 dark:text-industrial-300">Technical Details / Field Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide additional installation adapters, maintenance torque specs, or field observations..."
                    className="w-full p-2.5 bg-industrial-50 dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-industrial-100 dark:border-industrial-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100 dark:hover:bg-industrial-800 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Save & Preserve Decision
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
