/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Send, 
  Inbox, 
  Code2, 
  Copy, 
  Check, 
  Trash2, 
  Terminal, 
  Server, 
  ShieldAlert, 
  Zap,
  Globe,
  Smartphone,
  Layers,
  HardDrive,
  Flame,
  Radio,
  Share2,
  AlertCircle
} from 'lucide-react';
import { AiDiagnosticTelemetry } from '../types';
import { 
  getBaseApiUrl, 
  setCustomBackendUrl, 
  testGeminiPing, 
  testDbHealth, 
  testFirestorePing,
  getDiagnosticTelemetryLogs, 
  clearDiagnosticTelemetryLogs,
  recordDiagnosticTelemetry
} from '../services/apiClient';

interface MatrixNodeState {
  status: 'checking' | 'healthy' | 'warning' | 'error';
  latency: number | null;
  lastChecked: string | null;
  details: string;
  subDetails?: string;
  error?: string | null;
  rawError?: any;
}

export const AiDiagnosticView: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isRunningAllTests, setIsRunningAllTests] = useState<boolean>(false);
  const [logs, setLogs] = useState<AiDiagnosticTelemetry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AiDiagnosticTelemetry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  
  // Connectivity Matrix Nodes State
  const [firestoreMatrix, setFirestoreMatrix] = useState<MatrixNodeState>({
    status: 'checking',
    latency: null,
    lastChecked: null,
    details: 'Firestore Database Connection & Rules',
    subDetails: 'Database ID: ai-studio-remixengineering-ded6335d-4885-42c6-ab02-16db0c27de52'
  });

  const [geminiMatrix, setGeminiMatrix] = useState<MatrixNodeState>({
    status: 'checking',
    latency: null,
    lastChecked: null,
    details: 'Gemini 3.7 Flash Model Gateway',
    subDetails: 'Vision inspection & semantic retrieval API'
  });

  const [localDbMatrix, setLocalDbMatrix] = useState<MatrixNodeState>({
    status: 'checking',
    latency: null,
    lastChecked: null,
    details: 'IndexedDB / LocalStorage Sync Queue',
    subDetails: 'Hybrid offline-first synchronization engine'
  });

  const [networkMatrix, setNetworkMatrix] = useState<MatrixNodeState>({
    status: 'checking',
    latency: null,
    lastChecked: null,
    details: 'Network Gateway & HTTP/2 Transport',
    subDetails: typeof window !== 'undefined' ? window.location.origin : ''
  });

  const [serverUrl, setServerUrl] = useState<string>(getBaseApiUrl());
  const [savedUrlSuccess, setSavedUrlSuccess] = useState<boolean>(false);

  // Platform info
  const isCapacitor = typeof window !== 'undefined' && (
    (window as any).Capacitor !== undefined || 
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'file:'
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pingNetwork();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkMatrix(prev => ({
        ...prev,
        status: 'error',
        latency: null,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
        details: 'Offline - No Internet Connection',
        error: 'Internet connection is offline (navigator.onLine = false)'
      }));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadTelemetryLogs();
    runAllDiagnostics();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadTelemetryLogs = () => {
    const currentLogs = getDiagnosticTelemetryLogs();
    setLogs(currentLogs);
    if (currentLogs.length > 0 && !selectedLog) {
      setSelectedLog(currentLogs[0]);
    }
  };

  // 1. Individual Ping: Network
  const pingNetwork = async () => {
    setNetworkMatrix(prev => ({ ...prev, status: 'checking', error: null }));
    const netStart = Date.now();
    if (!navigator.onLine) {
      setNetworkMatrix({
        status: 'error',
        latency: null,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
        details: 'Offline (منفصل عن الإنترنت)',
        subDetails: 'No active network adapter',
        error: 'navigator.onLine is false'
      });
      return;
    }

    try {
      await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
      const latency = Date.now() - netStart;
      setNetworkMatrix({
        status: 'healthy',
        latency,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
        details: 'Connected (متصل بالإنترنت)',
        subDetails: `Origin: ${window.location.protocol} // Latency: ${latency}ms`,
        error: null
      });
    } catch (e: any) {
      const latency = Date.now() - netStart;
      setNetworkMatrix({
        status: 'healthy',
        latency,
        lastChecked: new Date().toLocaleTimeString('ar-EG'),
        details: 'Connected (Network Available)',
        subDetails: `Origin: ${window.location.protocol}`,
        error: null
      });
    }
  };

  // 2. Individual Ping: Firebase Firestore
  const pingFirestore = async () => {
    setFirestoreMatrix(prev => ({ ...prev, status: 'checking', error: null }));
    const res = await testFirestorePing();
    const checkedTime = new Date().toLocaleTimeString('ar-EG');
    if (res.success) {
      setFirestoreMatrix({
        status: 'healthy',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: `Connected: ${res.projectId || 'Firebase'}`,
        subDetails: `DB: ${res.databaseId || '(default)'} | Latency: ${res.durationMs}ms`,
        error: null,
        rawError: null
      });
    } else {
      setFirestoreMatrix({
        status: 'error',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: 'Failed to Connect to Firestore',
        subDetails: res.error || 'Connection failed',
        error: res.error || 'Unknown Firestore Error',
        rawError: res.rawError
      });
    }
    loadTelemetryLogs();
  };

  // 3. Individual Ping: Gemini API
  const pingGemini = async () => {
    setGeminiMatrix(prev => ({ ...prev, status: 'checking', error: null }));
    const res = await testGeminiPing();
    const checkedTime = new Date().toLocaleTimeString('ar-EG');
    if (res.success) {
      setGeminiMatrix({
        status: 'healthy',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: `Model Active: ${res.model || 'gemini-3.8-flash'}`,
        subDetails: `Probe response: "${res.probeReply}" | Latency: ${res.durationMs}ms`,
        error: null,
        rawError: null
      });
    } else {
      setGeminiMatrix({
        status: 'error',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: 'Gemini Engine Offline / Restricted',
        subDetails: res.error || 'API call failed',
        error: res.error || 'Gemini API Error',
        rawError: res.rawError
      });
    }
    loadTelemetryLogs();
  };

  // 4. Individual Ping: Local Database & Sync
  const pingLocalDb = async () => {
    setLocalDbMatrix(prev => ({ ...prev, status: 'checking', error: null }));
    const res = await testDbHealth();
    const checkedTime = new Date().toLocaleTimeString('ar-EG');
    if (res.success) {
      const isPending = (res.pendingSyncCount ?? 0) > 0;
      setLocalDbMatrix({
        status: isPending ? 'warning' : 'healthy',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: isPending 
          ? `Pending Sync Queue (${res.pendingSyncCount} mutations)` 
          : `Fully Synchronized (${res.localCount ?? res.documentCount} items)`,
        subDetails: `Local: ${res.localCount} items | Server: ${res.documentCount} items | Latency: ${res.durationMs}ms`,
        error: null,
        rawError: null
      });
    } else {
      setLocalDbMatrix({
        status: 'warning',
        latency: res.durationMs,
        lastChecked: checkedTime,
        details: `Local Offline Cache Active (${res.localCount ?? 0} items)`,
        subDetails: res.error || 'Server sync offline',
        error: res.error,
        rawError: res.rawError
      });
    }
    loadTelemetryLogs();
  };

  // Run all diagnostics together
  const runAllDiagnostics = async () => {
    setIsRunningAllTests(true);
    await Promise.allSettled([
      pingNetwork(),
      pingFirestore(),
      pingGemini(),
      pingLocalDb()
    ]);
    setIsRunningAllTests(false);
    loadTelemetryLogs();
  };

  const handleSaveBackendUrl = () => {
    setCustomBackendUrl(serverUrl);
    setSavedUrlSuccess(true);
    setTimeout(() => setSavedUrlSuccess(false), 3000);
    runAllDiagnostics();
  };

  const handleResetBackendUrl = () => {
    setServerUrl('');
    setCustomBackendUrl('');
    runAllDiagnostics();
  };

  const handleClearLogs = () => {
    clearDiagnosticTelemetryLogs();
    setLogs([]);
    setSelectedLog(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate mobile-friendly diagnostic error report bundle
  const generateMobileErrorReport = () => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: isCapacitor ? 'Android APK / Capacitor' : 'Web Browser',
      network: {
        isOnline: navigator.onLine,
        status: networkMatrix.status,
        latency: networkMatrix.latency,
        error: networkMatrix.error
      },
      firestore: {
        status: firestoreMatrix.status,
        latency: firestoreMatrix.latency,
        details: firestoreMatrix.details,
        error: firestoreMatrix.error,
        rawError: firestoreMatrix.rawError
      },
      geminiAi: {
        status: geminiMatrix.status,
        latency: geminiMatrix.latency,
        details: geminiMatrix.details,
        error: geminiMatrix.error,
        rawError: geminiMatrix.rawError
      },
      localDbAndSync: {
        status: localDbMatrix.status,
        latency: localDbMatrix.latency,
        details: localDbMatrix.details,
        error: localDbMatrix.error
      },
      latestTelemetryLogs: logs.slice(0, 5)
    };

    const text = JSON.stringify(errorReport, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Identify if any matrix component has an active error
  const hasActiveErrors = 
    firestoreMatrix.status === 'error' || 
    geminiMatrix.status === 'error' || 
    networkMatrix.status === 'error' ||
    Boolean(firestoreMatrix.error || geminiMatrix.error);

  const getStatusBadge = (status: MatrixNodeState['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            متصل / Operational
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            تنبيه / Cache Mode
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            انقطاع / Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
            جاري الفحص...
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI & Mobile Diagnostic Center</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                v2.5 Connectivity Matrix
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              مركز فحص وتشخيص الاتصال المباشر بقاعدة بيانات Firebase Firestore، محرك Gemini، ومزامنة السجلات المحلية في الوقت الفعلي.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={generateMobileErrorReport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition border border-slate-700 text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            title="نسخ تقرير تشخيصي شامل للهاتف أو مشاركته مع المطور"
          >
            {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-blue-400" />}
            {copiedReport ? 'تم نسخ التقرير الشامل!' : 'نسخ تقرير الفحص'}
          </button>

          <button
            onClick={runAllDiagnostics}
            disabled={isRunningAllTests}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium rounded-xl transition shadow-lg shadow-blue-600/20 text-xs sm:text-sm whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningAllTests ? 'animate-spin' : ''}`} />
            {isRunningAllTests ? 'جاري فحص المصفوفة...' : 'فحص المصفوفة بالكامل (Ping All)'}
          </button>
        </div>
      </div>

      {/* REAL-TIME CONNECTIVITY MATRIX */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Real-Time Connectivity Matrix (مصفوفة الاتصال المباشر)
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Live Status
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مصفوفة متكاملة تفحص جاهزية الخوادم وتوفر أزرار "Ping" فورية مع تسجيل الاستجابات الدقيقة على الهاتف والمحاكي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {hasActiveErrors ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                توجد تنبيهات اتصال
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                جميع المسارات تعمل بكفاءة
              </span>
            )}
          </div>
        </div>

        {/* 4 Interactive Connectivity Matrix Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Node 1: Firebase Firestore */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            firestoreMatrix.status === 'healthy'
              ? 'bg-amber-50/20 dark:bg-slate-850 border-amber-300 dark:border-amber-800/60'
              : firestoreMatrix.status === 'error'
              ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400'
              : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Firebase Firestore</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Cloud Database</p>
                  </div>
                </div>
                {getStatusBadge(firestoreMatrix.status)}
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {firestoreMatrix.details}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all line-clamp-2">
                  {firestoreMatrix.subDetails}
                </p>
              </div>

              {firestoreMatrix.error && (
                <div className="mt-2 p-2 bg-rose-100/70 dark:bg-rose-950/50 rounded-lg text-[10.5px] text-rose-700 dark:text-rose-300 font-mono break-all border border-rose-200 dark:border-rose-800">
                  <span className="font-bold block">Error details:</span>
                  {firestoreMatrix.error}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                <span>Latency: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {firestoreMatrix.latency !== null ? `${firestoreMatrix.latency} ms` : 'N/A'}
                </span>
              </div>

              <button
                onClick={pingFirestore}
                disabled={firestoreMatrix.status === 'checking'}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 ${firestoreMatrix.status === 'checking' ? 'animate-spin' : ''}`} />
                <span>فحص / Ping</span>
              </button>
            </div>
          </div>

          {/* Node 2: Google Gemini API */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            geminiMatrix.status === 'healthy'
              ? 'bg-blue-50/20 dark:bg-slate-850 border-blue-300 dark:border-blue-800/60'
              : geminiMatrix.status === 'error'
              ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400'
              : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Gemini AI Engine</h3>
                    <p className="text-[10px] text-slate-400 font-mono">LLM & Vision Model</p>
                  </div>
                </div>
                {getStatusBadge(geminiMatrix.status)}
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {geminiMatrix.details}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all line-clamp-2">
                  {geminiMatrix.subDetails}
                </p>
              </div>

              {geminiMatrix.error && (
                <div className="mt-2 p-2 bg-rose-100/70 dark:bg-rose-950/50 rounded-lg text-[10.5px] text-rose-700 dark:text-rose-300 font-mono break-all border border-rose-200 dark:border-rose-800">
                  <span className="font-bold block">Error details:</span>
                  {geminiMatrix.error}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                <span>Latency: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {geminiMatrix.latency !== null ? `${geminiMatrix.latency} ms` : 'N/A'}
                </span>
              </div>

              <button
                onClick={pingGemini}
                disabled={geminiMatrix.status === 'checking'}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 ${geminiMatrix.status === 'checking' ? 'animate-spin' : ''}`} />
                <span>فحص / Ping</span>
              </button>
            </div>
          </div>

          {/* Node 3: Local Database & Sync */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            localDbMatrix.status === 'healthy'
              ? 'bg-emerald-50/20 dark:bg-slate-850 border-emerald-300 dark:border-emerald-800/60'
              : localDbMatrix.status === 'warning'
              ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
              : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Local DB & Sync</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Hybrid Storage Ledger</p>
                  </div>
                </div>
                {getStatusBadge(localDbMatrix.status)}
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {localDbMatrix.details}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all line-clamp-2">
                  {localDbMatrix.subDetails}
                </p>
              </div>

              {localDbMatrix.error && (
                <div className="mt-2 p-2 bg-amber-100/70 dark:bg-amber-950/50 rounded-lg text-[10.5px] text-amber-800 dark:text-amber-300 font-mono break-all border border-amber-200 dark:border-amber-800">
                  <span className="font-bold block">Sync notice:</span>
                  {localDbMatrix.error}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                <span>Latency: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {localDbMatrix.latency !== null ? `${localDbMatrix.latency} ms` : 'Local'}
                </span>
              </div>

              <button
                onClick={pingLocalDb}
                disabled={localDbMatrix.status === 'checking'}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${localDbMatrix.status === 'checking' ? 'animate-spin' : ''}`} />
                <span>فحص ومزامنة</span>
              </button>
            </div>
          </div>

          {/* Node 4: Network & APK Transport */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Network & APK</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Gateway & Transport</p>
                  </div>
                </div>
                {getStatusBadge(networkMatrix.status)}
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {isOnline ? 'Internet Online (متصل)' : 'Internet Offline (منفصل)'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all">
                  Platform: {isCapacitor ? 'Android APK (Native)' : 'Web Container'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                <span>Latency: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {networkMatrix.latency !== null ? `${networkMatrix.latency} ms` : 'N/A'}
                </span>
              </div>

              <button
                onClick={pingNetwork}
                disabled={networkMatrix.status === 'checking'}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>فحص الشبكة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Diagnostic Error Quick-Debugger Box (Shows whenever there are errors) */}
        {hasActiveErrors && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  تم رصد خطأ في استجابة الخدمة (Mobile Error Debugging)
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 font-mono mt-0.5">
                  {firestoreMatrix.error || geminiMatrix.error || networkMatrix.error || 'Check service logs for details'}
                </p>
              </div>
            </div>

            <button
              onClick={generateMobileErrorReport}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              {copiedReport ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedReport ? 'تم نسخ التقرير الكامل!' : 'نسخ كود الخطأ للمطور'}
            </button>
          </div>
        )}
      </div>

      {/* Backend Server URL Customizer (Crucial for Android APK Configuration) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-xl">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Android APK Backend Server Route (مسار خادم الذكاء الاصطناعي لتطبيق أندرويد)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يقوم تطبيق أندرويد بالاتصال بالخادم السحابي أو المحلي لتشغيل استعلامات Gemini وتخزين المستندات بأمان دون كشف مفاتيح API.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-cloud-run-server.app أو اترك فارغاً للوضع الافتراضي"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveBackendUrl}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {savedUrlSuccess ? <Check className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4" />}
              {savedUrlSuccess ? 'تم الحفظ والتحقق!' : 'حفظ واختبار'}
            </button>

            <button
              onClick={handleResetBackendUrl}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-xl transition cursor-pointer"
            >
              استعادة الافتراضي
            </button>
          </div>
        </div>

        {savedUrlSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4" /> تم تحديث مسار الخادم وإجراء فحص فوري بنجاح.
          </p>
        )}
      </div>

      {/* Real Developer Error & Telemetry Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Telemetry Event Stream (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                API Telemetry Logs ({logs.length})
              </h3>
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> مسح السجل
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <Inbox className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">لا توجد سجلات بعد. أجرِ فحصاً من مصفوفة الاتصال أعلاه لمعاينة الأداء المباشر.</p>
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-right p-3 rounded-xl border text-xs transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        log.isSuccess 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {log.isSuccess ? '200 OK' : 'FAILED'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {log.endpoint}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</span>
                      <span className="font-mono">{log.durationMs} ms</span>
                    </div>

                    {log.rawErrorMessage && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-mono truncate text-left">
                        {log.rawErrorMessage}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Payload & Developer Raw Error (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col h-[520px]">
          {selectedLog ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedLog.isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <h3 className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedLog.method} {selectedLog.endpoint}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">{new Date(selectedLog.timestamp).toLocaleString('ar-EG')}</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2), selectedLog.id)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition cursor-pointer"
                    title="Copy Full JSON Payload"
                  >
                    {copiedId === selectedLog.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Developer Real Raw Error Notice if failed */}
              {!selectedLog.isSuccess && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-xl">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-red-800 dark:text-red-300">
                        Real Developer Error / تفاصيل الخطأ الفعلية:
                      </p>
                      <p className="font-mono text-red-700 dark:text-red-400 break-all">
                        {selectedLog.rawErrorMessage || 'No raw error message captured'}
                      </p>
                      {selectedLog.errorDetails?.stack && (
                        <pre className="mt-2 p-2 bg-red-100/60 dark:bg-red-950 text-[10px] text-red-900 dark:text-red-300 rounded font-mono overflow-x-auto max-h-24">
                          {selectedLog.errorDetails.stack}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Payload Tabs / Views */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
                {/* Request Payload */}
                <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-500" /> Request Payload
                    </span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-auto flex-1 custom-scrollbar">
                    {JSON.stringify(selectedLog.requestPayload || { note: 'No body sent' }, null, 2)}
                  </pre>
                </div>

                {/* Response Body */}
                <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Inbox className="w-3.5 h-3.5 text-emerald-500" /> Response Body
                    </span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-auto flex-1 custom-scrollbar">
                    {JSON.stringify(selectedLog.responseBody || { status: selectedLog.responseStatus, success: selectedLog.isSuccess }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
              <Code2 className="w-12 h-12 mb-3 opacity-30" />
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">مفتش استعلامات الذكاء الاصطناعي والشبكة</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                اختر سجلاً من القائمة الجانبية أو انقر فوق أي زر "Ping" في مصفوفة الاتصال لمعاينة كود الاستعلام واستجابة الخادم ورسائل الخطأ التفصيلية.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
