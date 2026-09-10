/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  BellRing, 
  Search, 
  X, 
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';
import { getPort14ReleaseInfo } from '../services/port14Service';
import { EMISDialog, EMISBadge, EMISButton } from './design-system';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const versionInfo = getPort14ReleaseInfo();
  const [activeSection, setActiveSection] = useState<'features' | 'security' | 'notes'>('features');

  return (
    <EMISDialog
      isOpen={isOpen}
      onClose={onClose}
      title="What's New in EMIS — Port 14"
      subtitle={`Engineering Material Intelligence System • Version ${versionInfo.currentVersion}`}
      maxWidth="2xl"
      actions={
        <EMISButton
          variant="primary"
          size="sm"
          onClick={onClose}
        >
          Acknowledge & Continue
        </EMISButton>
      }
    >
      <div className="space-y-5">
        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-linear-to-r from-brand-950/60 to-indigo-950/60 border border-brand-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-300">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">EMIS Production Version {versionInfo.currentVersion}</h3>
                <EMISBadge variant="success" size="xs">
                  UP TO DATE
                </EMISBadge>
              </div>
              <p className="text-xs text-industrial-300 mt-0.5">
                Released on {versionInfo.releaseDate} • Architecture: Android / Web Unified System
              </p>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center gap-2 border-b border-industrial-800 pb-2">
          <button
            onClick={() => setActiveSection('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'features'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            Major Operational Upgrades
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'security'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            Security & Trust Layer
          </button>
          <button
            onClick={() => setActiveSection('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'notes'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            Full Release Notes
          </button>
        </div>

        {/* Section Content */}
        <div className="space-y-3 min-h-[220px]">
          {activeSection === 'features' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 mt-0.5 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Centralized EMIS Design System</h4>
                  <p className="text-xs text-industrial-300 mt-0.5 leading-relaxed">
                    Standardized UI typography, touch-targets, and reusable components across Web and Android field views.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
                  <BellRing className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Command Center & Action Center</h4>
                  <p className="text-xs text-industrial-300 mt-0.5 leading-relaxed">
                    Real-time operational dashboard with categorized actionable tasks (Critical, Pending, Warning, Info) with direct action handlers.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 mt-0.5 shrink-0">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Persistent Global Search</h4>
                  <p className="text-xs text-industrial-300 mt-0.5 leading-relaxed">
                    Header search bar indexing Material PN, SN, MR, PO, WO, Documents, Equipment, and External Stores simultaneously with grouped jump cards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-3">
              {versionInfo.securityChanges.map((sec, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-industrial-850 border border-industrial-750 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-industrial-200 leading-relaxed">{sec}</p>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'notes' && (
            <div className="space-y-2">
              {versionInfo.releaseNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-industrial-300">
                  <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EMISDialog>
  );
}
