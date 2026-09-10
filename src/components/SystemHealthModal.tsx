/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  X,
  Server,
  Database,
  Lock,
  HardDrive,
  Mail,
  Bell,
  Wifi,
  Sparkles,
  Camera,
  Shield,
  Globe,
  Radio
} from 'lucide-react';
import { SubsystemHealth, SubsystemHealthState } from '../types';
import { checkSystemHealthMatrix } from '../services/port13Service';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SystemHealthModal({ isOpen, onClose }: SystemHealthModalProps) {
  const [subsystems, setSubsystems] = useState<SubsystemHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastProbeTime, setLastProbeTime] = useState<string>('');

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const results = await checkSystemHealthMatrix();
      setSubsystems(results);
      setLastProbeTime(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const healthyCount = subsystems.filter(s => s.status === 'HEALTHY').length;
  const degradedCount = subsystems.filter(s => s.status === 'DEGRADED').length;
  const failedCount = subsystems.filter(s => s.status === 'FAILED').length;
  const notConfiguredCount = subsystems.filter(s => s.status === 'NOT_CONFIGURED').length;

  const getStatusBadge = (status: SubsystemHealthState) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            DEGRADED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            FAILED
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-industrial-100 text-industrial-600 dark:bg-industrial-800 dark:text-industrial-400">
            <span className="h-1.5 w-1.5 rounded-full bg-industrial-400" />
            NOT CONFIGURED
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: SubsystemHealth['category']) => {
    switch (cat) {
      case 'Backend': return Server;
      case 'Database': return Database;
      case 'Authentication': return Lock;
      case 'File Storage': return HardDrive;
      case 'Email': return Mail;
      case 'Notifications': return Bell;
      case 'Synchronization': return Wifi;
      case 'AI': return Sparkles;
      case 'OCR': return Camera;
      case 'Backup': return Shield;
      case 'Web': return Globe;
      case 'API': return Radio;
      default: return Activity;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <span>Enterprise 12-Subsystem Deep Health Matrix</span>
              </h3>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Authoritative real-time probes across core architectural services. Last checked: {lastProbeTime || 'probed now'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runHealthCheck}
              disabled={isLoading}
              className="p-2 text-industrial-600 dark:text-industrial-300 hover:text-brand-600 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Refresh Probes"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-industrial-400 hover:text-industrial-800 dark:hover:text-white bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-industrial-50/40 dark:bg-industrial-950/40 border-b border-industrial-200 dark:border-industrial-800 text-center text-xs">
          <div className="p-2 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200/80 dark:border-industrial-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-sm">{healthyCount}</span>
            <span className="text-[10px] text-industrial-500 uppercase font-semibold">Healthy</span>
          </div>
          <div className="p-2 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200/80 dark:border-industrial-800">
            <span className="text-amber-500 font-bold block text-sm">{degradedCount}</span>
            <span className="text-[10px] text-industrial-500 uppercase font-semibold">Degraded</span>
          </div>
          <div className="p-2 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200/80 dark:border-industrial-800">
            <span className="text-rose-600 dark:text-rose-400 font-bold block text-sm">{failedCount}</span>
            <span className="text-[10px] text-industrial-500 uppercase font-semibold">Failed</span>
          </div>
          <div className="p-2 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200/80 dark:border-industrial-800">
            <span className="text-industrial-500 font-bold block text-sm">{notConfiguredCount}</span>
            <span className="text-[10px] text-industrial-500 uppercase font-semibold">Optional / Unconfigured</span>
          </div>
        </div>

        {/* Body Matrix */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-industrial-400 space-y-3">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-brand-500" />
              <p className="text-sm font-semibold text-industrial-700 dark:text-industrial-300">
                Executing subsystem diagnostics...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subsystems.map((sub, idx) => {
                const Icon = getCategoryIcon(sub.category);
                return (
                  <div
                    key={idx}
                    className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/80 rounded-xl shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 rounded-lg">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-industrial-900 dark:text-white">
                            {sub.name}
                          </h4>
                          <span className="text-[10px] text-industrial-400 font-mono uppercase">
                            Subsystem: {sub.category}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>

                    <p className="text-xs text-industrial-600 dark:text-industrial-300 pl-1">
                      {sub.details}
                    </p>

                    {sub.latencyMs !== undefined && (
                      <div className="flex items-center justify-between pt-1 border-t border-industrial-100 dark:border-industrial-800 text-[10px] font-mono text-industrial-400">
                        <span>Response Latency:</span>
                        <strong className="text-industrial-700 dark:text-industrial-300">{sub.latencyMs} ms</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850/50 flex items-center justify-between text-xs">
          <span className="text-industrial-500 font-mono text-[11px]">
            Targeting Port 3000 Ingress • Container Architecture
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
