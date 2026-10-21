/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Database, 
  Clock, 
  ArrowUpRight, 
  ChevronDown,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { testFirestorePing } from '../services/apiClient';

interface NetworkStatusIndicatorProps {
  onNavigateToSync?: () => void;
  compact?: boolean;
  className?: string;
  idPrefix?: string;
}

export type ConnectivityStatusType = 'synced' | 'syncing' | 'offline';

export default function NetworkStatusIndicator({
  onNavigateToSync,
  compact = false,
  className = '',
  idPrefix = 'top-nav'
}: NetworkStatusIndicatorProps) {
  const [syncSummary, setSyncSummary] = useState(() => dbService.getSyncStatusSummary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnlineState, setIsOnlineState] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const safetyTimerRef = useRef<any>(null);

  // Check health and ping
  const pingConnection = useCallback(async () => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnlineState(online);
    if (!online) {
      setPingLatency(null);
      return;
    }

    try {
      const res = await testFirestorePing();
      if (res.success) {
        setPingLatency(res.durationMs ?? 0);
      } else {
        setPingLatency(null);
      }
    } catch {
      setPingLatency(null);
    }
  }, []);

  const refreshSummary = useCallback(() => {
    const summary = dbService.getSyncStatusSummary();
    setSyncSummary(summary);
    setIsOnlineState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  }, []);

  useEffect(() => {
    refreshSummary();
    pingConnection();

    const handleOnline = () => {
      setIsOnlineState(true);
      refreshSummary();
      pingConnection();
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      refreshSummary();
    };

    const handleSyncChange = () => {
      refreshSummary();
    };

    const handleSyncStarted = () => {
      setIsSyncing(true);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      // Failsafe auto-reset after 5 seconds to ensure badge is never stuck in spinning state
      safetyTimerRef.current = setTimeout(() => {
        setIsSyncing(false);
        refreshSummary();
      }, 5000);
    };

    const handleSyncFinished = () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      setIsSyncing(false);
      refreshSummary();
      pingConnection();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('emis:sync-status-changed', handleSyncChange);
    window.addEventListener('emis:background-sync-restored', handleSyncChange);
    window.addEventListener('emis:sync-started', handleSyncStarted);
    window.addEventListener('emis:sync-finished', handleSyncFinished);

    // Periodic heartbeat every 40s
    const timer = setInterval(() => {
      refreshSummary();
      pingConnection();
    }, 40000);

    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('emis:sync-status-changed', handleSyncChange);
      window.removeEventListener('emis:background-sync-restored', handleSyncChange);
      window.removeEventListener('emis:sync-started', handleSyncStarted);
      window.removeEventListener('emis:sync-finished', handleSyncFinished);
      clearInterval(timer);
    };
  }, [refreshSummary, pingConnection]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Determine the overall status:
  // 1. Red if offline
  // 2. Yellow if actively syncing or has pending items waiting in queue
  // 3. Green if online and 0 pending items
  const status: ConnectivityStatusType = !isOnlineState
    ? 'offline'
    : (isSyncing || syncSummary.totalPending > 0)
    ? 'syncing'
    : 'synced';

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing || !isOnlineState) return;

    setIsSyncing(true);
    setFeedbackMsg(null);

    try {
      const res = await dbService.syncAllPendingToFirebase();
      refreshSummary();
      await pingConnection();
      setFeedbackMsg({
        text: res.message || 'Synced successfully',
        isError: !res.success
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({
        text: err?.message || 'Sync failed',
        isError: true
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return 'Not yet synced';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Not yet synced';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Not yet synced';
    }
  };

  // Status visual configurations
  const config = {
    synced: {
      label: 'Synced',
      bgClass: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30',
      dotClass: 'bg-emerald-400',
      glowClass: 'shadow-emerald-500/20',
      icon: CheckCircle2,
      description: 'Connected to Firebase Firestore & local state is fully synchronized.'
    },
    syncing: {
      label: isSyncing ? 'Syncing...' : `${syncSummary.totalPending} Pending`,
      bgClass: 'bg-amber-500/15 hover:bg-amber-500/25',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30',
      dotClass: 'bg-amber-400',
      glowClass: 'shadow-amber-500/20',
      icon: RefreshCw,
      description: isSyncing 
        ? 'Actively transferring changes to Firebase Cloud...'
        : `${syncSummary.totalPending} local change(s) stored locally waiting for cloud push.`
    },
    offline: {
      label: 'Offline',
      bgClass: 'bg-red-500/15 hover:bg-red-500/25',
      textClass: 'text-red-400',
      borderClass: 'border-red-500/30',
      dotClass: 'bg-red-500',
      glowClass: 'shadow-red-500/20',
      icon: WifiOff,
      description: 'Network disconnected. Operating in resilient offline LocalDB mode.'
    }
  }[status];

  const IconComponent = config.icon;

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef} id={`${idPrefix}-status-wrapper`}>
      {/* Trigger Button Badge in the Navigation Bar */}
      <button
        type="button"
        id={`${idPrefix}-connectivity-badge`}
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        aria-label={`Connectivity status: ${config.label}`}
        aria-expanded={isPopoverOpen}
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-tight border transition-all cursor-pointer select-none shadow-xs ${config.bgClass} ${config.textClass} ${config.borderClass}`}
        title={`Status: ${config.label} (Click for details)`}
      >
        {/* Pulsing/Animated Status Light Indicator */}
        <span className="relative flex h-2 w-2">
          {status === 'synced' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          {status === 'syncing' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass} ${
            status === 'syncing' ? 'animate-pulse' : ''
          }`} />
        </span>

        {/* Status Icon */}
        <IconComponent className={`h-3 w-3 shrink-0 ${
          isSyncing ? 'animate-spin' : ''
        }`} />

        {/* Status Text Label */}
        <span className={`text-[10px] uppercase font-bold ${compact ? 'hidden sm:inline' : ''}`}>
          {config.label}
        </span>

        {/* Small dropdown arrow */}
        <ChevronDown className={`h-2.5 w-2.5 opacity-60 group-hover:opacity-100 transition-transform duration-200 ${
          isPopoverOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Popover Details Panel */}
      <AnimatePresence>
        {isPopoverOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            id={`${idPrefix}-status-popover`}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-industrial-900 border border-industrial-750 text-white rounded-2xl shadow-2xl z-50 p-4 font-sans text-xs select-none backdrop-blur-md"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
                  <IconComponent className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs leading-none">Real-Time Connectivity</h4>
                  <p className="text-[10px] text-industrial-400 font-mono mt-0.5">EMIS Synchronization Hub</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
                {status}
              </span>
            </div>

            {/* Status explanation */}
            <p className="text-[11px] text-industrial-300 mt-2.5 leading-relaxed">
              {config.description}
            </p>

            {/* Metrics List */}
            <div className="mt-3 space-y-2 bg-industrial-850 p-3 rounded-xl border border-industrial-800/80 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-industrial-400 flex items-center gap-1.5">
                  <Cloud className="h-3 w-3 text-brand-400" />
                  Firebase Cloud:
                </span>
                <span className={`font-semibold ${
                  isOnlineState ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {isOnlineState ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-industrial-400 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-400" />
                  Ping Latency:
                </span>
                <span className="font-semibold text-industrial-200">
                  {pingLatency !== null ? `${pingLatency} ms` : isOnlineState ? 'Checking...' : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-industrial-400 flex items-center gap-1.5">
                  <Database className="h-3 w-3 text-indigo-400" />
                  Pending Queue:
                </span>
                <span className={`font-semibold ${
                  syncSummary.totalPending > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'
                }`}>
                  {syncSummary.totalPending} item{syncSummary.totalPending !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-industrial-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-industrial-400" />
                  Last Synchronized:
                </span>
                <span className="font-semibold text-industrial-300 truncate max-w-[120px]" title={syncSummary.lastSyncTime || ''}>
                  {formatLastSync(syncSummary.lastSyncTime)}
                </span>
              </div>
            </div>

            {/* Feedback message */}
            {feedbackMsg && (
              <div className={`mt-2.5 p-2 rounded-lg text-[11px] font-sans flex items-center gap-1.5 border ${
                feedbackMsg.isError 
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                {feedbackMsg.isError ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || !isOnlineState}
                id={`${idPrefix}-popover-sync-btn`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              {onNavigateToSync && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPopoverOpen(false);
                    onNavigateToSync();
                  }}
                  id={`${idPrefix}-popover-open-sync-btn`}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-industrial-800 hover:bg-industrial-750 text-industrial-300 hover:text-white border border-industrial-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  title="Open Sync Center view"
                >
                  <span>Sync Hub</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
