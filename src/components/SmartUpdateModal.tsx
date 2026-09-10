/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  X,
  FileText,
  Clock
} from 'lucide-react';
import { AppVersionInfo } from '../types';
import { getAppVersionInfo } from '../services/port13Service';
import { getBaseApiUrl } from '../services/apiClient';

interface SmartUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartUpdateModal({ isOpen, onClose }: SmartUpdateModalProps) {
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>(getAppVersionInfo());
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchVersionFromBackend = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/app/version`);
      if (res.ok) {
        const data = await res.json();
        setVersionInfo(data);
      }
    } catch {
      // fallback to local stored config
      setVersionInfo(getAppVersionInfo());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersionFromBackend();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyUpdate = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setUpdateSuccess(true);
      // Update local version to latest
      setVersionInfo(prev => ({
        ...prev,
        currentVersion: prev.latestVersion,
        isUpdateAvailable: false
      }));
      setTimeout(() => {
        setUpdateSuccess(false);
        onClose();
        window.location.reload();
      }, 1500);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl">
              <RefreshCw className={`h-6 w-6 ${isChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-industrial-900 dark:text-white">
                  EMIS Smart Version & Update Center
                </h3>
                {versionInfo.isUpdateAvailable && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                    UPDATE AVAILABLE
                  </span>
                )}
              </div>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Authoritative software release verification for Web and Android field clients.
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

        {/* Version Badge Grid */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-6 bg-industrial-50/40 dark:bg-industrial-950/40 border-b border-industrial-200 dark:border-industrial-800 text-center text-xs">
          <div className="p-3 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-800">
            <span className="text-[10px] text-industrial-500 uppercase font-bold block mb-1">Installed Version</span>
            <span className="font-mono text-base font-bold text-industrial-900 dark:text-white">v{versionInfo.currentVersion}</span>
          </div>

          <div className="p-3 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-800">
            <span className="text-[10px] text-brand-600 dark:text-brand-400 uppercase font-bold block mb-1">Latest Available</span>
            <span className="font-mono text-base font-bold text-brand-600 dark:text-brand-400">v{versionInfo.latestVersion}</span>
          </div>

          <div className="p-3 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-800">
            <span className="text-[10px] text-industrial-500 uppercase font-bold block mb-1">Minimum Supported</span>
            <span className="font-mono text-base font-bold text-industrial-700 dark:text-industrial-300">v{versionInfo.minimumSupportedVersion}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Release Notes */}
          <div className="space-y-2">
            <h4 className="font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              <span>Release Notes / ميزات الإصدار</span>
            </h4>
            <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-xl space-y-1.5">
              {versionInfo.releaseNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2 text-industrial-700 dark:text-industrial-300">
                  <span className="text-brand-500 font-bold">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Changes */}
          <div className="space-y-2">
            <h4 className="font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Security & Hardening Enhancements / تحسينات الأمان والحماية</span>
            </h4>
            <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-xl space-y-1.5">
              {versionInfo.securityChanges.map((sec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-industrial-700 dark:text-industrial-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{sec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Changes */}
          <div className="space-y-2">
            <h4 className="font-bold text-industrial-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Feature Updates / التحديثات الوظيفية</span>
            </h4>
            <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-xl space-y-1.5">
              {versionInfo.featureChanges.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-industrial-700 dark:text-industrial-300">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/60 dark:bg-industrial-850/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-industrial-500 font-mono">
            Release Date: {versionInfo.releaseDate} • Channel: Production
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchVersionFromBackend}
              disabled={isChecking}
              className="px-3 py-2 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Check Again
            </button>

            {versionInfo.isUpdateAvailable ? (
              <button
                onClick={handleApplyUpdate}
                disabled={isApplying || updateSuccess}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Applying Update...</span>
                  </>
                ) : updateSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>Updated! Reloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Update Now to v{versionInfo.latestVersion}</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>System is Up-to-Date</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
