/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Package,
  Cpu,
  Boxes,
  MapPin,
  Calendar,
  Clock,
  Printer,
  CheckCircle2,
  AlertOctagon,
  FileText,
  AlertTriangle,
  Download
} from 'lucide-react';
import { getSharedMaterialByToken } from '../services/port13Service';
import { Material } from '../types';
import { dbService } from '../services/dbService';
import { getBaseApiUrl } from '../services/apiClient';
import { executePrint, generatePassportPrintHtml } from '../utils/printManager';

interface SharedPassportViewProps {
  token?: string;
  partNumber?: string;
  onExit?: () => void;
  onClose?: () => void;
  onOpenMaterialDetails?: (material: Material) => void;
}

export default function SharedPassportView({ token, partNumber, onExit, onClose, onOpenMaterialDetails }: SharedPassportViewProps) {
  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<Material | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = onClose || onExit;

  useEffect(() => {
    const fetchShared = async () => {
      setLoading(true);
      setError(null);

      // If partNumber was directly supplied
      if (partNumber) {
        dbService.initialize();
        const allMats = dbService.getMaterials();
        const found = allMats.find(m => m.partNumber.toUpperCase() === partNumber.toUpperCase());
        if (found) {
          setMaterial(found);
          setLoading(false);
          return;
        }
      }

      if (!token) {
        setError('No token or part number specified for passport.');
        setLoading(false);
        return;
      }

      try {
        // Try backend endpoint first
        const res = await fetch(`${getBaseApiUrl()}/api/shared/material/${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setMaterial(data.material);
          setExpiresAt(data.expiresAt);
        } else {
          // Fallback to local storage
          dbService.initialize();
          const localItem = getSharedMaterialByToken(token, dbService.getMaterials());
          if (localItem.success && localItem.data) {
            setMaterial(localItem.data as any);
            setExpiresAt(localItem.data.expiresAt);
          } else {
            setError(localItem.error || 'This shared passport link is invalid, revoked, or expired.');
          }
        }
      } catch {
        dbService.initialize();
        const localItem = getSharedMaterialByToken(token, dbService.getMaterials());
        if (localItem.success && localItem.data) {
          setMaterial(localItem.data as any);
          setExpiresAt(localItem.data.expiresAt);
        } else {
          setError('Unable to load shared passport. The link may have expired.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [token, partNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-industrial-950 text-white p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-industrial-400 font-mono">Verifying secure passport authorization token...</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-industrial-950 text-white p-4">
        <div className="max-w-md w-full bg-industrial-900 border border-industrial-800 rounded-2xl p-8 text-center space-y-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl inline-block">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <h2 className="text-lg font-bold text-white">Passport Unavailable</h2>
          <p className="text-xs text-industrial-400">
            {error || 'This read-only link has expired or been revoked by the system administrator.'}
          </p>
          {handleClose && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Go to EMIS Portal / Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-industrial-950 text-industrial-100 p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Read-Only Notice Banner */}
        <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Read-Only Shared Passport</strong> • Commercial cost data and administrative secrets scrubbed.
            </span>
          </div>
          {expiresAt && (
            <div className="text-[11px] font-mono text-amber-300">
              Valid until: {new Date(expiresAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Passport Card */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-industrial-800 bg-industrial-850/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-600 text-white">
                  EMIS Passport
                </span>
                <span className="font-mono text-xs text-industrial-400">
                  Part #{material.partNumber}
                </span>
                {material.oemVerificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    OEM Verified
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {material.name || material.description}
              </h1>
              {material.arabicDescription && (
                <p className="text-xs text-industrial-400 mt-0.5 font-sans" dir="rtl">
                  {material.arabicDescription}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                const passportHtml = generatePassportPrintHtml(material);
                executePrint(`جواز_${material.partNumber}`, passportHtml, `Passport_${material.partNumber}.html`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-industrial-800 hover:bg-industrial-750 text-white rounded-xl text-xs font-bold transition-colors border border-industrial-700 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Passport</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 text-xs">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-industrial-850 border border-industrial-800 rounded-xl">
                <span className="text-[10px] text-industrial-400 uppercase font-bold block mb-1">Manufacturer</span>
                <span className="font-bold text-white">{material.manufacturer || 'OEM Standard'}</span>
              </div>
              <div className="p-3 bg-industrial-850 border border-industrial-800 rounded-xl">
                <span className="text-[10px] text-industrial-400 uppercase font-bold block mb-1">Category</span>
                <span className="font-bold text-brand-400">{material.category}</span>
              </div>
              <div className="p-3 bg-industrial-850 border border-industrial-800 rounded-xl">
                <span className="text-[10px] text-industrial-400 uppercase font-bold block mb-1">Stock Balance</span>
                <span className="font-bold text-emerald-400">{material.quantity} {material.unit}</span>
              </div>
              <div className="p-3 bg-industrial-850 border border-industrial-800 rounded-xl">
                <span className="text-[10px] text-industrial-400 uppercase font-bold block mb-1">Location</span>
                <span className="font-bold text-white">{material.site || 'NDGS'} • Rack {material.rack || '01'}</span>
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="bg-industrial-850 border border-industrial-800 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-brand-400" />
                <span>Technical Specifications Matrix</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-industrial-900 rounded-lg">
                  <span className="text-industrial-400 block text-[11px]">Pressure Rating:</span>
                  <span className="font-semibold text-white">{material.pressureRating || 'Standard'}</span>
                </div>
                <div className="p-2.5 bg-industrial-900 rounded-lg">
                  <span className="text-industrial-400 block text-[11px]">Connection Size:</span>
                  <span className="font-semibold text-white">{material.connectionSize || 'Standard'}</span>
                </div>
                <div className="p-2.5 bg-industrial-900 rounded-lg">
                  <span className="text-industrial-400 block text-[11px]">Material Sub-Type:</span>
                  <span className="font-semibold text-white">{material.materialType || 'Field Component'}</span>
                </div>
              </div>
            </div>

            {/* Documents */}
            {material.documents && material.documents.length > 0 && (
              <div className="bg-industrial-850 border border-industrial-800 rounded-xl p-5 space-y-3">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-400" />
                  <span>Approved Engineering Documents ({material.documents.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {material.documents.map(doc => (
                    <div key={doc.id} className="p-3 bg-industrial-900 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-white">{doc.title}</h5>
                        <span className="text-[10px] text-industrial-400 uppercase font-mono">{doc.type}</span>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-brand-400 hover:text-white bg-industrial-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-industrial-800 bg-industrial-850/40 flex items-center justify-between text-[11px] text-industrial-400 font-mono">
            <span>EMIS Engineering Material Intelligence System • Sovereign Enterprise Protocol</span>
            {handleClose && (
              <button
                onClick={handleClose}
                className="text-brand-400 hover:underline font-bold cursor-pointer"
              >
                Close / Full EMIS Portal &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
