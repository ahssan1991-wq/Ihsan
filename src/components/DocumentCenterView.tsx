/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Search,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileCheck,
  Tag,
  Clock,
  Layers,
  X,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { AppDocument, AppDocumentType, User, UserRole } from '../types';

interface DocumentCenterViewProps {
  currentUser: User;
  initialPartFilter?: string;
  onNavigateToTraceability?: (partNumber: string) => void;
}

const DOCUMENT_TYPES: { type: AppDocumentType | 'ALL'; label: string }[] = [
  { type: 'ALL', label: 'All Documents' },
  { type: 'DATASHEET', label: 'Datasheets' },
  { type: 'CERTIFICATE_OF_CONFORMITY', label: 'CoC Certificates' },
  { type: 'CERTIFICATE_OF_ORIGIN', label: 'CoO Certificates' },
  { type: 'ATEX_CERTIFICATE', label: 'ATEX / HazLoc Certs' },
  { type: 'CALIBRATION_CERTIFICATE', label: 'Calibration Certs' },
  { type: 'INSPECTION_REPORT', label: 'Inspection Reports' },
  { type: 'PURCHASE_ORDER', label: 'Purchase Orders (PO)' },
  { type: 'MATERIAL_REQUEST', label: 'MR / MRF Requisitions' },
  { type: 'WORK_ORDER', label: 'Work Orders (WO)' },
  { type: 'USER_MANUAL', label: 'Manuals & Guides' }
];

export const DocumentCenterView: React.FC<DocumentCenterViewProps> = ({
  currentUser,
  initialPartFilter = '',
  onNavigateToTraceability
}) => {
  const [documents, setDocuments] = useState<AppDocument[]>(() => dbService.getDocuments() || []);
  const [searchQuery, setSearchQuery] = useState<string>(initialPartFilter);
  const [selectedType, setSelectedType] = useState<AppDocumentType | 'ALL'>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // New Document Upload State
  const [newDocName, setNewDocName] = useState<string>('');
  const [newDocType, setNewDocType] = useState<AppDocumentType>('DATASHEET');
  const [newFileName, setNewFileName] = useState<string>('');
  const [newRelatedPN, setNewRelatedPN] = useState<string>(initialPartFilter);
  const [newRelatedTag, setNewRelatedTag] = useState<string>('');
  const [newRelatedMR, setNewRelatedMR] = useState<string>('');
  const [newRelatedPO, setNewRelatedPO] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter(doc => {
      // Type filter
      if (selectedType !== 'ALL' && doc.documentType !== selectedType) {
        return false;
      }

      if (!q) return true;

      const nameMatch = (doc.name || '').toLowerCase().includes(q);
      const fileMatch = (doc.fileName || '').toLowerCase().includes(q);
      const pnMatch = (doc.relatedPartNumber || '').toLowerCase().includes(q);
      const tagMatch = (doc.relatedEquipmentTag || '').toLowerCase().includes(q);
      const mrMatch = (doc.relatedMrNumber || '').toLowerCase().includes(q);
      const poMatch = (doc.relatedPoNumber || '').toLowerCase().includes(q);

      return nameMatch || fileMatch || pnMatch || tagMatch || mrMatch || poMatch;
    });
  }, [documents, searchQuery, selectedType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setNewFileName(f.name);
    if (!newDocName) {
      setNewDocName(f.name.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' '));
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newFileName.trim()) return;

    const res = dbService.addDocument({
      name: newDocName.trim(),
      documentType: newDocType,
      fileName: newFileName.trim(),
      fileSize: selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '1.2 MB',
      fileType: selectedFile?.type || 'application/pdf',
      relatedPartNumber: newRelatedPN.trim() || undefined,
      relatedEquipmentTag: newRelatedTag.trim() || undefined,
      relatedMrNumber: newRelatedMR.trim() || undefined,
      relatedPoNumber: newRelatedPO.trim() || undefined,
      notes: newNotes.trim() || undefined
    }, currentUser);

    if (res.success) {
      setDocuments(dbService.getDocuments());
      setIsUploadModalOpen(false);
      // Reset form
      setNewDocName('');
      setNewFileName('');
      setNewRelatedPN('');
      setNewRelatedTag('');
      setNewRelatedMR('');
      setNewRelatedPO('');
      setNewNotes('');
      setSelectedFile(null);
    }
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to delete this technical document record?')) {
      const res = dbService.deleteDocument(docId, currentUser);
      if (res.success) {
        setDocuments(dbService.getDocuments());
      }
    }
  };

  return (
    <div className="space-y-6" id="document-center-view">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/30">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-industrial-900 dark:text-white">Document Center</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-semibold">
                v0.4 Vault
              </span>
            </div>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Centralized repository for datasheets, certificates of conformity, ATEX records, purchase orders, and QA reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-industrial-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Document Name, Part Number, Equipment Tag, MR/PO..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-industrial-300 dark:border-industrial-700 bg-industrial-50 dark:bg-industrial-900 text-industrial-900 dark:text-white"
            />
          </div>

          <span className="text-xs font-semibold text-industrial-500 whitespace-nowrap">
            Showing {filteredDocs.length} of {documents.length} docs
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          {DOCUMENT_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => setSelectedType(t.type)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                selectedType === t.type
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400 hover:bg-industrial-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 text-industrial-400">
          <FileText className="h-8 w-8 mx-auto mb-2 text-industrial-300" />
          <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">No documents found</p>
          <p className="text-xs mt-1">Try changing your search query or document type filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs hover:border-teal-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400">
                    {doc.documentType}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-industrial-900 dark:text-white line-clamp-2">
                    {doc.name}
                  </h3>
                  <p className="text-[11px] font-mono text-industrial-500 truncate mt-0.5">
                    {doc.fileName} ({doc.fileSize || 'PDF'})
                  </p>
                </div>

                {/* Metadata tags */}
                <div className="space-y-1 text-xs pt-1 border-t border-industrial-100 dark:border-industrial-800">
                  {doc.relatedPartNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 text-[11px]">Part Number:</span>
                      <button
                        onClick={() => onNavigateToTraceability && onNavigateToTraceability(doc.relatedPartNumber!)}
                        className="font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        {doc.relatedPartNumber}
                      </button>
                    </div>
                  )}
                  {doc.relatedEquipmentTag && (
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 text-[11px]">Equipment Tag:</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">{doc.relatedEquipmentTag}</span>
                    </div>
                  )}
                  {doc.relatedMrNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 text-[11px]">MR / MRF:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">{doc.relatedMrNumber}</span>
                    </div>
                  )}
                  {doc.relatedPoNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 text-[11px]">Purchase Order:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{doc.relatedPoNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-3 border-t border-industrial-100 dark:border-industrial-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-industrial-400 font-mono">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert(`Simulating viewing certified technical document: ${doc.fileName}`)}
                    className="p-1.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-teal-500/10 hover:text-teal-600 text-industrial-600 dark:text-industrial-300 transition-colors cursor-pointer"
                    title="View Document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>

                  {currentUser.role === UserRole.ADMIN && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-red-500/10 hover:text-red-500 text-industrial-400 transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-750 pb-3">
              <h2 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-teal-500" />
                <span>Upload Technical Document</span>
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-industrial-400 hover:text-industrial-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              {/* File Attachment Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-industrial-300 dark:border-industrial-700 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer bg-industrial-50/50 dark:bg-industrial-900/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileText className="h-6 w-6 text-teal-500 mx-auto mb-1" />
                <p className="font-semibold text-industrial-800 dark:text-industrial-200">
                  {selectedFile ? selectedFile.name : 'Select or drop PDF, DWG, DOCX, or scan certificate'}
                </p>
                <p className="text-[11px] text-industrial-400 mt-0.5">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'All technical formats supported'}
                </p>
              </div>

              <div>
                <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Rosemount 3051S Factory Datasheet Rev 4"
                  className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Document Category
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as AppDocumentType)}
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
                  >
                    <option value="DATASHEET">Datasheet</option>
                    <option value="CERTIFICATE_OF_CONFORMITY">Certificate of Conformity</option>
                    <option value="CERTIFICATE_OF_ORIGIN">Certificate of Origin</option>
                    <option value="ATEX_CERTIFICATE">ATEX / Hazardous Cert</option>
                    <option value="CALIBRATION_CERTIFICATE">Calibration Cert</option>
                    <option value="INSPECTION_REPORT">Inspection Report</option>
                    <option value="PURCHASE_ORDER">Purchase Order (PO)</option>
                    <option value="MATERIAL_REQUEST">Material Request (MR)</option>
                    <option value="WORK_ORDER">Work Order (WO)</option>
                    <option value="USER_MANUAL">User Manual</option>
                    <option value="OTHER">Other Technical Record</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Related Part Number
                  </label>
                  <input
                    type="text"
                    value={newRelatedPN}
                    onChange={(e) => setNewRelatedPN(e.target.value)}
                    placeholder="e.g. PT-3051S-01"
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    Equipment Tag
                  </label>
                  <input
                    type="text"
                    value={newRelatedTag}
                    onChange={(e) => setNewRelatedTag(e.target.value)}
                    placeholder="e.g. 10-PT-101"
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    MR / MRF #
                  </label>
                  <input
                    type="text"
                    value={newRelatedMR}
                    onChange={(e) => setNewRelatedMR(e.target.value)}
                    placeholder="e.g. MR-2024-001"
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-industrial-700 dark:text-industrial-300 mb-1">
                    PO #
                  </label>
                  <input
                    type="text"
                    value={newRelatedPO}
                    onChange={(e) => setNewRelatedPO(e.target.value)}
                    placeholder="e.g. PO-ZFOD-991"
                    className="w-full px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-industrial-200 dark:border-industrial-750">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-industrial-300 dark:border-industrial-750 text-industrial-600 dark:text-industrial-300 hover:bg-industrial-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                >
                  Save to Document Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
