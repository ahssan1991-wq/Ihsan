/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  ExternalLink, 
  Edit3, 
  FileText, 
  Paperclip, 
  Boxes, 
  Building2, 
  Tag, 
  Hash, 
  MapPin, 
  ShieldCheck, 
  ArrowRight,
  Info,
  ChevronRight,
  Check
} from 'lucide-react';
import { Material } from '../types';
import { DuplicateMatchReason } from '../services/duplicateDetectionService';

interface DuplicateMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingMaterial: Material;
  candidateInput?: {
    partNumber?: string | null;
    description?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    quantity?: number;
    serialNumber?: string | null;
  };
  reasons: DuplicateMatchReason[];
  isPossibleDuplicate?: boolean;
  alternativeCandidates?: Array<{
    material: Material;
    score: number;
    reasons: DuplicateMatchReason[];
  }>;
  onOpenExisting: (material: Material) => void;
  onEditExisting: (material: Material) => void;
  onUpdateSpecs: (material: Material) => void;
  onAttachFiles: (material: Material) => void;
  onSelectCandidate?: (material: Material) => void;
}

export default function DuplicateMaterialDialog({
  isOpen,
  onClose,
  existingMaterial: initialMaterial,
  candidateInput,
  reasons,
  isPossibleDuplicate = false,
  alternativeCandidates = [],
  onOpenExisting,
  onEditExisting,
  onUpdateSpecs,
  onAttachFiles,
  onSelectCandidate
}: DuplicateMaterialDialogProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material>(initialMaterial);

  if (!isOpen) return null;

  const mat = selectedMaterial || initialMaterial;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/70 backdrop-blur-sm font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-industrial-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col text-right"
        id="duplicate-material-dialog"
      >
        {/* Header Banner */}
        <div className={`p-5 border-b flex items-start justify-between gap-4 ${
          isPossibleDuplicate ? 'bg-amber-50/70 border-amber-200' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              isPossibleDuplicate ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-industrial-900 tracking-tight">
                  {isPossibleDuplicate ? 'اشتباه في تكرار مادة مسجلة مسبقاً' : 'هذه المادة موجودة مسبقاً في النظام'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPossibleDuplicate ? 'bg-amber-200/60 text-amber-900' : 'bg-rose-200/60 text-rose-900'
                }`}>
                  {isPossibleDuplicate ? 'Possible Match' : 'Exact Duplicate'}
                </span>
              </div>
              <p className="text-xs text-industrial-600 mt-1">
                {isPossibleDuplicate
                  ? 'تم رصد تطابق محتمل مع مادة أو أكثر في قاعدة البيانات. يرجى المراجعة وتأكيد المطابقة.'
                  : 'تم العثور على سجل مادة مسجل بنفس المعرف أو المواصفات في قاعدة البيانات المركزية.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-industrial-400 hover:text-industrial-700 hover:bg-white/80 transition-all cursor-pointer"
            title="إلغاء / Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Match Reasons Pill list */}
          {reasons && reasons.length > 0 && (
            <div className="bg-industrial-50 rounded-2xl p-3 border border-industrial-200/80">
              <div className="text-[11px] font-bold text-industrial-700 mb-1.5 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-brand-600" />
                <span>أسباب التطابق المرصودة / Match Criteria:</span>
              </div>
              <ul className="space-y-1">
                {reasons.map((r, idx) => (
                  <li key={idx} className="text-xs text-industrial-800 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span>{r.descriptionAr}</span>
                    <span className="text-[10px] text-industrial-500 font-mono" dir="ltr">({r.descriptionEn})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* If there are multiple candidate options (Possible Match Mode), allow switching */}
          {alternativeCandidates && alternativeCandidates.length > 1 && (
            <div>
              <div className="text-xs font-bold text-industrial-700 mb-2">
                اختر المادة المرشحة للمراجعة ({alternativeCandidates.length} مواد متقاربة):
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {alternativeCandidates.map((cand, idx) => {
                  const isCur = (selectedMaterial?.id && cand.material.id === selectedMaterial.id) || 
                                (cand.material.partNumber === selectedMaterial?.partNumber);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedMaterial(cand.material);
                        if (onSelectCandidate) onSelectCandidate(cand.material);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        isCur 
                          ? 'bg-brand-50/80 border-brand-300 ring-1 ring-brand-300' 
                          : 'bg-white hover:bg-industrial-50 border-industrial-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-industrial-900 truncate">
                          {cand.material.partNumber || '(بدون رقم قطعة)'} · {cand.material.description}
                        </div>
                        <div className="text-[10px] text-industrial-500 font-mono">
                          {cand.material.manufacturer} {cand.material.model} · تسلسل #{cand.material.sequence || '-'}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 mr-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          مطابقة {cand.score}%
                        </span>
                        {isCur && <Check className="h-4 w-4 text-brand-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Existing Material Card Details */}
          <div className="bg-white rounded-2xl border border-industrial-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-industrial-100 pb-2.5">
              <div>
                <span className="text-[10px] text-industrial-400 font-medium">بيانات السجل الحالي في النظام:</span>
                <h4 className="text-base font-bold text-industrial-900 flex items-center gap-2">
                  <span>{mat.partNumber || '(بدون رقم قطعة / Unassigned Part)'}</span>
                  {mat.sequence && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg">
                      #{mat.sequence}
                    </span>
                  )}
                </h4>
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-industrial-400">الكمية المسجلة حالياً:</div>
                <div className="text-sm font-extrabold text-industrial-800">
                  {mat.quantity} <span className="text-xs font-normal text-industrial-500">{mat.unit || 'pcs'}</span>
                </div>
              </div>
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">الشركة المصنعة / Manufacturer:</div>
                <div className="font-semibold text-industrial-800 truncate">{mat.manufacturer || '-'}</div>
              </div>

              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">الطراز / Model:</div>
                <div className="font-semibold text-industrial-800 truncate font-mono">{mat.model || '-'}</div>
              </div>

              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">رمز المادة / Material Code:</div>
                <div className="font-semibold text-industrial-800 truncate font-mono">{mat.materialCode || '-'}</div>
              </div>

              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">المستودع والموقع / Location:</div>
                <div className="font-semibold text-industrial-800 truncate">
                  {mat.store || '-'} {mat.rack ? `(رف:${mat.rack})` : ''}
                </div>
              </div>

              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">رقم التاغ / Tag #:</div>
                <div className="font-semibold text-industrial-800 truncate font-mono">{mat.tagNumber || '-'}</div>
              </div>

              <div className="bg-industrial-50/60 p-2 rounded-xl">
                <div className="text-[10px] text-industrial-500">حالة التوثيق / OEM Status:</div>
                <div className="font-semibold text-emerald-700 truncate">
                  {mat.oemVerified ? '✓ موثق معتمد' : (mat.oemVerificationStatus || 'قيد المراجعة')}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-industrial-50/40 p-2.5 rounded-xl border border-industrial-100">
              <div className="text-[10px] text-industrial-500 mb-0.5">الوصف الفني للمادة / Description:</div>
              <div className="text-xs text-industrial-800 leading-relaxed font-medium">
                {mat.description}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
            ℹ️ <strong>ملاحظة هامة لحماية سلامة المخزون:</strong> لن يتم إنشاء سجل مكرر أو تضخيم الكميات تلقائياً. يمكنك اختيار أحد الإجراءات المعتمدة أدناه لمتابعة السجل أو تحديث وثائقه ومواصفاته.
          </div>
        </div>

        {/* 5 Distinct Actions Required by Audit */}
        <div className="p-4 bg-industrial-50/80 border-t border-industrial-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Action 1: Open existing material in full viewer */}
          <button
            type="button"
            onClick={() => onOpenExisting(mat)}
            className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>1. فتح بطاقة المادة / View Record</span>
          </button>

          {/* Action 2: Edit existing material core details */}
          <button
            type="button"
            onClick={() => onEditExisting(mat)}
            className="flex items-center justify-center gap-2 bg-industrial-800 hover:bg-industrial-700 active:scale-98 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Edit3 className="h-4 w-4 shrink-0" />
            <span>2. تعديل بيانات المادة / Edit Record</span>
          </button>

          {/* Action 3: Add or update technical description and specs */}
          <button
            type="button"
            onClick={() => onUpdateSpecs(mat)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>3. تحديث المواصفات والوصف الفني</span>
          </button>

          {/* Action 4: Attach documents, certificates, images */}
          <button
            type="button"
            onClick={() => onAttachFiles(mat)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-industrial-100 text-industrial-800 border border-industrial-300 font-bold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
          >
            <Paperclip className="h-4 w-4 shrink-0 text-industrial-600" />
            <span>4. إرفاق وثائق، شهادات أو صور</span>
          </button>

          {/* Action 5: Cancel the operation */}
          <button
            type="button"
            onClick={onClose}
            className="sm:col-span-2 flex items-center justify-center gap-2 bg-transparent hover:bg-industrial-200/60 text-industrial-600 font-semibold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>5. إلغاء العملية والعودة / Cancel Operation</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
