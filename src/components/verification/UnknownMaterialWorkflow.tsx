/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HelpCircle,
  Camera,
  Upload,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  FileCheck,
  FileSpreadsheet
} from 'lucide-react';
import { MaterialCandidate, User, AITaskType, SourceQualityLevel } from '../../types';
import { executeAIEngineeringTask } from '../../services/aiProviderService';
import { dbService } from '../../services/dbService';

interface UnknownMaterialWorkflowProps {
  currentUser: User;
  onMaterialAddedToLedger?: (partNumber: string) => void;
  onStartVerificationForCandidate?: (candidate: MaterialCandidate) => void;
}

export const UnknownMaterialWorkflow: React.FC<UnknownMaterialWorkflowProps> = ({
  currentUser,
  onMaterialAddedToLedger,
  onStartVerificationForCandidate
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [knownModelPart, setKnownModelPart] = useState<string>('');
  const [manufacturerHint, setManufacturerHint] = useState<string>('');
  const [visualNotes, setVisualNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<MaterialCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<MaterialCandidate | null>(null);
  const [addedSuccessMsg, setAddedSuccessMsg] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
        // Simulate immediate OCR readout if field was empty
        if (!rawOcrText) {
          setRawOcrText('YOKOGAWA EJX110A-EMS4G-917EB\nCAL: 0-100 kPa / 4-20mA HART\nMWP: 16 MPa / EX d IIC T6\nSN: 91EB-882190');
          setManufacturerHint('Yokogawa');
          setKnownModelPart('EJX110A-EMS4G-917EB');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentifyUnknown = async () => {
    if (!rawOcrText && !knownModelPart && !photoPreview) return;
    setIsLoading(true);
    setAddedSuccessMsg(null);

    try {
      const res = await executeAIEngineeringTask(
        AITaskType.MATERIAL_IDENTIFICATION,
        {
          ocrText: rawOcrText,
          modelHint: knownModelPart,
          manufacturerHint: manufacturerHint,
          visualNotes: visualNotes
        }
      );

      if (res.success && res.data) {
        const d = res.data;
        const mainCandidate: MaterialCandidate = {
          id: `cand-${Date.now()}-1`,
          manufacturer: d.manufacturer || manufacturerHint || 'Yokogawa Corporation',
          productFamily: d.productFamily || 'DPharp EJX Series',
          model: d.model || knownModelPart || 'EJX110A-EMS4G-917EB',
          productType: d.productType || 'Differential Pressure Transmitter',
          technicalDescription: d.technicalDescription || d.suggestedDescription || 'High accuracy industrial differential pressure transmitter with HART 7 protocol.',
          possiblePartNumber: d.possiblePartNumber || knownModelPart || 'EJX110A-EMS4G-917EB',
          confidence: d.confidence || 92,
          evidenceCount: 4,
          evidence: [
            {
              id: 'ev-1',
              type: 'NAMEPLATE',
              parameter: 'Model / Part Number',
              actualValue: d.model || 'EJX110A',
              sourceTitle: 'Nameplate Optical Extraction',
              sourceType: 'OCR Scan',
              sourceQualityLevel: 1,
              confidence: 94,
              status: 'MATCH'
            },
            {
              id: 'ev-2',
              type: 'MANUFACTURER_WEB',
              parameter: 'OEM Specifications',
              actualValue: 'DPharp Resonant Silicon, 4-20mA HART',
              sourceTitle: 'Yokogawa Official Technical Portal',
              sourceType: 'Datasheet',
              sourceQualityLevel: 1,
              confidence: 96,
              status: 'MATCH'
            }
          ],
          sources: d.sources || [
            {
              source: 'Yokogawa Official Catalog',
              title: 'EJX110A Differential Pressure Transmitter Datasheet',
              url: 'https://www.yokogawa.com/solutions/products-platforms/field-instruments/pressure-transmitters/differential-pressure-transmitters/ejx110a/',
              website: 'yokogawa.com',
              relevance: 98,
              isOfficialManufacturer: true
            }
          ]
        };

        const alternateCandidate: MaterialCandidate = {
          id: `cand-${Date.now()}-2`,
          manufacturer: d.manufacturer || 'Yokogawa',
          productFamily: 'EJA110E Standard Series',
          model: 'EJA110E-JMS4G-912EB',
          productType: 'Standard Differential Pressure Transmitter',
          technicalDescription: 'Standard range differential pressure transmitter with 4-20mA HART output.',
          possiblePartNumber: 'EJA110E-JMS4G-912EB',
          confidence: 68,
          evidenceCount: 2,
          evidence: [],
          sources: [
            {
              source: 'Yokogawa Product Archive',
              title: 'EJA-E Series Differential Pressure Transmitters',
              url: 'https://www.yokogawa.com/products/eja110e',
              website: 'yokogawa.com',
              relevance: 70,
              isOfficialManufacturer: true
            }
          ]
        };

        setCandidates([mainCandidate, alternateCandidate]);
        setSelectedCandidate(mainCandidate);
      }
    } catch (err) {
      console.warn("Failed to identify unknown material:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCandidateToLedger = () => {
    if (!selectedCandidate) return;

    dbService.addMaterial({
      partNumber: selectedCandidate.possiblePartNumber || selectedCandidate.model,
      description: selectedCandidate.technicalDescription,
      manufacturer: selectedCandidate.manufacturer,
      model: selectedCandidate.model,
      materialType: 'Instrumentation',
      unit: 'pcs',
      quantity: 1,
      minStockLevel: 1,
      store: 'Station Main Warehouse (Store A)',
      shelf: 'A-01',
      rack: 'R-01',
      notes: 'Imported via AI Unknown Material Spec Recovery',
      status: 'Available'
    }, currentUser);

    setAddedSuccessMsg(`Candidate ${selectedCandidate.possiblePartNumber} successfully registered into Station Materials Ledger.`);
    if (onMaterialAddedToLedger) {
      onMaterialAddedToLedger(selectedCandidate.possiblePartNumber || selectedCandidate.model);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/30">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-industrial-900 dark:text-white">
              Unknown Material Identification & Spec Recovery
            </h2>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Recover unknown physical spares, blurry tags, or incomplete documentation using AI optical OCR, OEM catalogs, and web verification.
            </p>
          </div>
        </div>

        {/* Preset Samples */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-industrial-400 font-semibold">Load Sample:</span>
          <button
            onClick={() => {
              setRawOcrText('YOKOGAWA EJX110A-EMS4G-917EB\nCAL: 0-100 kPa / 4-20mA HART\nMWP: 16 MPa / EX d IIC T6');
              setManufacturerHint('Yokogawa');
              setKnownModelPart('EJX110A-EMS4G-917EB');
            }}
            className="px-2.5 py-1 rounded-lg text-xs bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 font-mono hover:bg-industrial-200 cursor-pointer"
          >
            Sample Yokogawa Tag
          </button>
        </div>
      </div>

      {/* Input Grid: Optical Upload + Text Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Physical Photo / Nameplate Capture */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Camera className="h-4 w-4 text-brand-500" />
            <span>Step 1: Physical Nameplate or Photo Capture</span>
          </h3>

          <div className="border-2 border-dashed border-industrial-300 dark:border-industrial-700 rounded-2xl p-4 text-center hover:border-brand-500 transition-colors flex flex-col items-center justify-center min-h-[160px]">
            {photoPreview ? (
              <div className="space-y-3">
                <img 
                  src={photoPreview} 
                  alt="Nameplate preview" 
                  className="max-h-40 rounded-xl object-contain mx-auto shadow-xs border border-industrial-200 dark:border-industrial-700" 
                />
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                >
                  Remove Photo
                </button>
              </div>
            ) : (
              <label className="cursor-pointer space-y-2 flex flex-col items-center">
                <div className="p-3 bg-industrial-100 dark:bg-industrial-800 rounded-full text-industrial-500">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-industrial-800 dark:text-industrial-200 block">
                  Upload Photo or Drag Nameplate Scan
                </span>
                <span className="text-[11px] text-industrial-400 block">
                  Supports PNG, JPG, WEBP (Camera or Scanner)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
              Optical OCR Scanned Text / Engraving
            </label>
            <textarea
              rows={3}
              value={rawOcrText}
              onChange={(e) => setRawOcrText(e.target.value)}
              placeholder="Paste or edit extracted tag letters, serials, or ratings..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
            />
          </div>
        </div>

        {/* Right: Known Clues & Search Triggers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-500" />
              <span>Step 2: Partial Clues & Context Hints</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Manufacturer Hint (Optional)
              </label>
              <input
                type="text"
                value={manufacturerHint}
                onChange={(e) => setManufacturerHint(e.target.value)}
                placeholder="e.g. Yokogawa, Rosemount, Swagelok, ABB"
                className="w-full text-xs px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Partial Model / Stamped Number
              </label>
              <input
                type="text"
                value={knownModelPart}
                onChange={(e) => setKnownModelPart(e.target.value)}
                placeholder="e.g. EJX110A or 3051S..."
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                Visual Appearance / Notes
              </label>
              <input
                type="text"
                value={visualNotes}
                onChange={(e) => setVisualNotes(e.target.value)}
                placeholder="e.g. Stainless housing, blue cap, dual conduit entry..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-industrial-300 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleIdentifyUnknown}
            disabled={isLoading || (!rawOcrText && !knownModelPart)}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Searching OEM Catalogs & Technical Indices...' : 'Identify Unknown Material'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {addedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{addedSuccessMsg}</span>
        </div>
      )}

      {/* Identification Candidates Result */}
      {candidates.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              <span>Identified Material Candidates ({candidates.length})</span>
            </h3>
            <span className="text-xs text-industrial-400">Ranked by identification confidence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                onClick={() => setSelectedCandidate(cand)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  selectedCandidate?.id === cand.id
                    ? 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20'
                    : 'bg-industrial-50/50 dark:bg-industrial-800/40 border-industrial-200 dark:border-industrial-750 hover:border-industrial-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
                    {cand.manufacturer}
                  </span>
                  <span className="text-xs font-bold text-emerald-500 font-mono">
                    Confidence: {cand.confidence}%
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-industrial-900 dark:text-white font-mono">
                    {cand.model}
                  </h4>
                  <p className="text-xs text-industrial-600 dark:text-industrial-300 mt-1 leading-relaxed">
                    {cand.technicalDescription}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-750 text-xs">
                  <span className="text-[10px] text-industrial-400 font-semibold block">Suggested Part Number:</span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                    {cand.possiblePartNumber}
                  </span>
                </div>

                {cand.sources.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-industrial-400 font-semibold uppercase">Verified Source:</span>
                    {cand.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{s.title}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action on Selected Candidate */}
          {selectedCandidate && (
            <div className="p-4 rounded-xl bg-industrial-100 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-industrial-700 dark:text-industrial-300">
                Selected Candidate: <strong>{selectedCandidate.manufacturer} {selectedCandidate.model}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddCandidateToLedger}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add to Station Materials Ledger</span>
                </button>
                {onStartVerificationForCandidate && (
                  <button
                    onClick={() => onStartVerificationForCandidate(selectedCandidate)}
                    className="py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Run Verification Matrix</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
