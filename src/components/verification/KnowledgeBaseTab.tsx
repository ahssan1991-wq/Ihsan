/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Edit,
  Trash2,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { KnowledgeRecord, User } from '../../types';
import { dbService } from '../../services/dbService';

interface KnowledgeBaseTabProps {
  currentUser: User;
}

export const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({ currentUser }) => {
  const [records, setRecords] = useState<KnowledgeRecord[]>(() => dbService.getKnowledgeBase());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingRecord, setEditingRecord] = useState<KnowledgeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State
  const [mfg, setMfg] = useState<string>('');
  const [family, setFamily] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [specsText, setSpecsText] = useState<string>('Signal Output: 4-20mA HART\nProcess Pressure: 0-4000 psig\nAccuracy: ±0.04%');
  const [urlInput, setUrlInput] = useState<string>('https://');

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.productFamily.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ENGINEER_VERIFIED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'SOURCE_VERIFIED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'AI_SUGGESTED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'AI_GENERATED':
      default:
        return 'bg-industrial-500/10 text-industrial-600 dark:text-industrial-400 border-industrial-500/30';
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfg.trim() || !model.trim()) return;

    const parsedSpecs: Record<string, string> = {};
    specsText.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        parsedSpecs[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    });

    const newRec: KnowledgeRecord = {
      id: editingRecord ? editingRecord.id : `kb-${Date.now()}`,
      manufacturer: mfg.trim(),
      productFamily: family.trim() || `${mfg} Series`,
      model: model.trim(),
      productType: type.trim() || 'Instrumentation',
      description: desc.trim(),
      knownSpecs: parsedSpecs,
      sourceUrls: urlInput.trim() ? [urlInput.trim()] : [],
      status: 'ENGINEER_VERIFIED',
      verifiedBy: `${currentUser.name} (${currentUser.role})`,
      verifiedDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (editingRecord) {
      dbService.updateKnowledgeRecord(newRec, currentUser);
    } else {
      dbService.addKnowledgeRecord(newRec, currentUser);
    }

    setRecords(dbService.getKnowledgeBase());
    setIsAddModalOpen(false);
    setEditingRecord(null);
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setMfg('');
    setFamily('');
    setModel('');
    setType('');
    setDesc('');
    setSpecsText('Signal Output: 4-20mA HART\nProcess Pressure: 0-4000 psig\nAccuracy: ±0.04%');
    setUrlInput('https://');
    setIsAddModalOpen(true);
  };

  const openEditModal = (rec: KnowledgeRecord) => {
    setEditingRecord(rec);
    setMfg(rec.manufacturer);
    setFamily(rec.productFamily);
    setModel(rec.model);
    setType(rec.productType);
    setDesc(rec.description);
    setSpecsText(Object.entries(rec.knownSpecs).map(([k, v]) => `${k}: ${v}`).join('\n'));
    setUrlInput(rec.sourceUrls[0] || 'https://');
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-industrial-900 dark:text-white">
              Engineering Knowledge Base & OEM Specs
            </h2>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Verified OEM specifications, technical tolerance tables, and certified engineering references for industrial equipment.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Verified Specification</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by OEM, Model, Family..."
            className="text-xs pl-8 pr-3 py-2 rounded-xl border border-industrial-200 dark:border-industrial-750 bg-white dark:bg-industrial-850 text-industrial-900 dark:text-white w-64"
          />
        </div>

        <div className="flex items-center gap-1 bg-industrial-100 dark:bg-industrial-800 p-1 rounded-xl">
          {(['ALL', 'ENGINEER_VERIFIED', 'SOURCE_VERIFIED', 'AI_SUGGESTED', 'AI_GENERATED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white dark:bg-industrial-700 text-brand-600 dark:text-brand-400 shadow-2xs'
                  : 'text-industrial-500 hover:text-industrial-900 dark:hover:text-white'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map((rec) => (
          <div
            key={rec.id}
            className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4 hover:border-brand-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 font-mono">
                  {rec.manufacturer}
                </span>
                <span className="text-[11px] text-industrial-400 font-mono">{rec.productFamily}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getStatusBadge(rec.status)}`}>
                {rec.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-industrial-900 dark:text-white font-mono">
                {rec.model}
              </h3>
              <p className="text-xs text-industrial-600 dark:text-industrial-300 mt-1 leading-relaxed">
                {rec.description}
              </p>
            </div>

            {/* Spec Attributes Key-Values */}
            <div className="p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800/70 border border-industrial-200 dark:border-industrial-750 text-xs space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-industrial-400 block mb-1">
                Verified Technical Parameters
              </span>
              {Object.entries(rec.knownSpecs).map(([k, v], i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-industrial-500 truncate">{k}:</span>
                  <span className="font-mono font-semibold text-industrial-800 dark:text-industrial-200 text-right">{v}</span>
                </div>
              ))}
            </div>

            {/* Source & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-industrial-100 dark:border-industrial-800 text-xs">
              {rec.sourceUrls.length > 0 ? (
                <a
                  href={rec.sourceUrls[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>OEM Portal Reference</span>
                </a>
              ) : (
                <span className="text-industrial-400 italic text-[11px]">Internal Verified Spec</span>
              )}

              <button
                onClick={() => openEditModal(rec)}
                className="p-1.5 rounded-lg text-industrial-500 hover:text-brand-500 hover:bg-industrial-100 dark:hover:bg-industrial-800 cursor-pointer"
                title="Edit Record"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleSaveRecord} className="w-full max-w-lg bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span>{editingRecord ? 'Edit Knowledge Record' : 'Add Verified OEM Specification'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-industrial-400 hover:text-industrial-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Manufacturer</label>
                <input
                  type="text"
                  required
                  value={mfg}
                  onChange={(e) => setMfg(e.target.value)}
                  placeholder="e.g. Emerson, Yokogawa"
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>
              <div>
                <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Product Family</label>
                <input
                  type="text"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  placeholder="e.g. 3051S Scalable Series"
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Model / Part Number</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. 3051S2TG4A2B11A1AB4"
                  className="w-full font-mono px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>
              <div>
                <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Product Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Pressure Transmitter"
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">Description</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="High-accuracy gage pressure transmitter with HART communication"
                className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              />
            </div>

            <div className="text-xs">
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Verified Specs (Key: Value per line)
              </label>
              <textarea
                rows={4}
                value={specsText}
                onChange={(e) => setSpecsText(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              />
            </div>

            <div className="text-xs">
              <label className="font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Official OEM / Datasheet URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Save Specification
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
