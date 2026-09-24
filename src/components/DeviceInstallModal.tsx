import React, { useState } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Laptop, 
  ExternalLink, 
  Terminal, 
  HardDrive, 
  Copy, 
  Check, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Share2, 
  PlusSquare, 
  ArrowRight,
  Sparkles,
  WifiOff,
  QrCode,
  PackageCheck,
  FileCode,
  Box,
  AlertTriangle,
  Send,
  MessageCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';

interface DeviceInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'android' | 'pwa' | 'local';
}

export default function DeviceInstallModal({ 
  isOpen, 
  onClose, 
  initialTab = 'android' 
}: DeviceInstallModalProps) {
  const { language, isRTL } = useLanguage();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'pwa' | 'local'>(initialTab);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  // The permanent public URL for direct installation outside iframe
  const PUBLIC_APP_URL = 'https://ais-pre-uab747mlg7atmvci4grrgk-40726130594.europe-west1.run.app';
  
  // Detect if running inside an iframe (like AI Studio preview pane)
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  const downloadBatFile = () => {
    const batContent = `@echo off
title EMIS - Engineering Material Intelligence System
echo ========================================================
echo   EMIS Industrial System - Local Launcher (Windows)
echo ========================================================
echo.
echo Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

echo Starting EMIS Local Industrial Server...
call npm run dev
pause
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'start-emis.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadShFile = () => {
    const shContent = `#!/bin/bash
# EMIS Industrial System - Local Launcher (macOS / Linux)
echo "========================================================"
echo "  EMIS Industrial System - Local Launcher"
echo "========================================================"
echo ""
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo "Starting EMIS Local Industrial Server..."
npm run dev
`;
    const blob = new Blob([shContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'start-emis.sh';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-industrial-900 rounded-2xl shadow-2xl border border-industrial-200 dark:border-industrial-750 overflow-hidden my-8"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header with App Branding */}
        <div className="bg-gradient-to-r from-industrial-900 via-brand-950 to-industrial-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-industrial-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center p-2 shadow-lg border border-emerald-400/30 shrink-0">
              <img src="/pwa-192x192.png" alt="EMIS" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-sans">
                  {language === 'ar' ? 'تثبيت نظام EMIS بصيغة أندرويد (Android APK)' : 'Install EMIS on Android & Device'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  <Smartphone className="w-3 h-3" />
                  APK Ready
                </span>
              </div>
              <p className="text-xs text-industrial-300 mt-1">
                {language === 'ar' 
                  ? 'طرق التثبيت المباشر على هاتف أندرويد أو استخراج ملف APK أو التثبيت على الكمبيوتر'
                  : 'Direct mobile install on Android phone, compile native APK, or run standalone on PC.'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center gap-2 px-3.5 py-1.8 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'android'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-industrial-300'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{language === 'ar' ? 'تثبيت أندرويد (Android APK)' : 'Android APK'}</span>
            </button>
            <button
              onClick={() => setActiveTab('pwa')}
              className={`flex items-center gap-2 px-3.5 py-1.8 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pwa'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-industrial-300'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تثبيت الكمبيوتر (Windows / Mac)' : 'PC / Mac Install'}</span>
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`flex items-center gap-2 px-3.5 py-1.8 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'local'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-industrial-300'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'خادم محلي بدون إنترنت' : 'Local PC Server'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-industrial-800 dark:text-industrial-200">

          {/* IFRAME ENVIRONMENT ALERT: Explains why direct click fails inside AI Studio preview */}
          {isInsideIframe && (
            <div className="mb-5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/40 rounded-xl p-4 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                    {language === 'ar' ? 'لماذا لا يمكن التثبيت بنقرة واحدة من هذه الشاشة؟' : 'Why Direct Install Cannot Run Inside this Preview:'}
                  </h4>
                  <p className="mt-1 text-industrial-700 dark:text-industrial-300 leading-relaxed">
                    {language === 'ar'
                      ? 'أنت تتصفح التطبيق حالياً من داخل إطار المعاينة (Preview) في منصة AI Studio على الكمبيوتر. متصفحات الويب (Chrome / Edge) تمنع أمنياً تثبيت أي برنامج من داخل الإطارات الفرعية (iframes)، كما أن التثبيت بصيغة أندرويد يحتاج إما لفتحه من هاتفك المحمول أو في صفحة مستقلة.'
                      : 'You are viewing the app inside the AI Studio development iframe. Browsers strictly block app installation inside iframes.'}
                  </p>
                  
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={PUBLIC_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{language === 'ar' ? 'افتح التطبيق في صفحة مستقلة' : 'Open in New Standalone Tab'}</span>
                    </a>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent('رابط تثبيت تطبيق EMIS على هاتفك الأندرويد: ' + PUBLIC_APP_URL)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{language === 'ar' ? 'أرسل الرابط لهاتفي عبر واتساب' : 'Send to Phone via WhatsApp'}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 1: ANDROID APK INSTALLATION */}
          {activeTab === 'android' && (
            <div className="space-y-6">
              
              {/* Option 1: Direct Mobile Install (Scan QR or Open Link) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Zap className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                        {language === 'ar' ? 'الطريقة 1: التثبيت الفوري على الهاتف (WebAPK رسمي بدون كمبيوتر)' : 'Method 1: Instant Mobile Install (Official WebAPK)'}
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {language === 'ar' ? 'يقوم هاتف أندرويد ببناء وتثبيت حزمة APK رسمية على جهازك خلال 10 ثوانٍ' : 'Your Android phone creates and installs an official APK package directly'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                    {language === 'ar' ? 'الأسهل والأسرع' : 'Instant'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-white dark:bg-industrial-850 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-xs border border-industrial-200 shrink-0">
                    <QRCodeSVG 
                      value={PUBLIC_APP_URL}
                      size={135}
                      level="M"
                      includeMargin={true}
                    />
                    <span className="text-[10px] text-industrial-600 font-bold mt-1 text-center">
                      {language === 'ar' ? 'امسح بكاميرا هاتف أندرويد' : 'Scan with Android Camera'}
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="sm:col-span-2 text-xs space-y-2 text-industrial-700 dark:text-industrial-300">
                    <p className="font-bold text-industrial-900 dark:text-white">
                      {language === 'ar' ? 'الخطوات على هاتفك الأندرويد:' : 'Steps on your Android phone:'}
                    </p>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <span>
                        {language === 'ar' 
                          ? 'امسح كود الـ QR أعلاه بكاميرا هاتفك أو افتح الرابط في متصفح Chrome.'
                          : 'Scan QR above with your Android phone or open the link in Chrome.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <span>
                        {language === 'ar'
                          ? 'ستظهر رسالة فورية أسفل الشاشة أو في القائمة (⋮) اختر: «تثبيت التطبيق» (Install app).'
                          : 'Tap "Install app" on the prompt or select "Add to Home screen" in Chrome menu.'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <span>
                        {language === 'ar'
                          ? 'يثبّت أندرويد تطبيق EMIS في درج التطبيقات بهاتفك مع أيقونة رسمية وكامل صلاحيات الكاميرا والعمل بدون إنترنت!'
                          : 'Android installs EMIS as an authentic standalone app in your app drawer.'}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(PUBLIC_APP_URL, 'app-url')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        {copiedScript === 'app-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript === 'app-url' ? (language === 'ar' ? 'تم نسخ الرابط!' : 'URL Copied!') : (language === 'ar' ? 'نسخ رابط التثبيت' : 'Copy Mobile URL')}</span>
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent('رابط تثبيت تطبيق EMIS على هاتفك الأندرويد: ' + PUBLIC_APP_URL)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إرسال لواتساب' : 'WhatsApp'}</span>
                      </a>

                      <a
                        href={PUBLIC_APP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'فتح الرابط' : 'Open'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Native Android Project & APK Build via Capacitor */}
              <div className="bg-industrial-50 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-industrial-900 dark:text-white">
                        {language === 'ar' ? 'الطريقة 2: استخراج ملف الـ APK المباشر (Capacitor Android)' : 'Method 2: Standalone .apk Binary File'}
                      </h3>
                      <p className="text-xs text-industrial-600 dark:text-industrial-400">
                        {language === 'ar' ? 'مشروع أندرويد كامل جاهز داخل المجلد android/ لتجميع ملف APK' : 'Pre-configured native Android studio project in android/ directory'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                    com.emis.inspection
                  </span>
                </div>

                <div className="space-y-3 text-xs text-industrial-700 dark:text-industrial-300">
                  <p>
                    {language === 'ar' 
                      ? 'إذا كنت تريد ملف app-debug.apk مستقل لتثبيته يدوياً عبر USB أو مشاركته مع فنيي الموقع:'
                      : 'If you want a standalone app-debug.apk file to install via USB or distribute to field technicians:'}
                  </p>

                  <div className="p-3 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700/80 space-y-1.5">
                    <div className="font-bold text-industrial-900 dark:text-white">
                      {language === 'ar' ? '1. تنزيل كود المشروع إلى جهازك:' : '1. Export / Download project code:'}
                    </div>
                    <p className="text-industrial-500">
                      {language === 'ar'
                        ? 'من أعلى شاشة AI Studio اضغط على زر التصدير (Export / Download ZIP) لحفظ المشروع على جهازك.'
                        : 'Click Export / Download ZIP in the AI Studio top bar to save the code to your PC.'}
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700/80 space-y-2">
                    <div className="flex items-center justify-between font-mono font-bold text-[11px] text-industrial-900 dark:text-white">
                      <span>{language === 'ar' ? '2. أمر التجميع المباشر لملف الـ APK (Gradlew):' : '2. Compile APK with one command:'}</span>
                      <button
                        onClick={() => copyToClipboard('cd android && ./gradlew assembleDebug', 'gradle-cmd')}
                        className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        {copiedScript === 'gradle-cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript === 'gradle-cmd' ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>
                    <code className="block bg-industrial-950 text-emerald-400 p-2 rounded-lg font-mono text-xs">
                      cd android && ./gradlew assembleDebug
                    </code>
                    <p className="text-[11px] text-industrial-500 font-mono">
                      📍 مسار ملف الـ APK الناتج جاهزاً: <br />
                      <span className="text-industrial-800 dark:text-industrial-200 font-bold">android/app/build/outputs/apk/debug/app-debug.apk</span>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PWA / DESKTOP INSTALLATION */}
          {activeTab === 'pwa' && (
            <div className="space-y-6">
              {isInstalled ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      {language === 'ar' ? 'التطبيق مثبّت ويعمل كنافذة مستقلة' : 'EMIS is Installed as a Standalone App'}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      {language === 'ar' 
                        ? 'نظام EMIS يعمل الآن مباشرة من جهازك مع ميزة الكاش والتخزين المحلي ومقاومة انقطاع الشبكة.'
                        : 'EMIS is running directly from your device storage with active service worker caching and offline resilience.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/30 border border-brand-200 dark:border-brand-800/60 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                        <Download className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-industrial-900 dark:text-white">
                          {language === 'ar' ? 'تثبيت التطبيق على الكمبيوتر' : 'Desktop Standalone Installation'}
                        </h3>
                        <p className="text-xs text-industrial-600 dark:text-industrial-400 mt-0.5">
                          {language === 'ar'
                            ? 'إضافة اختصار لسطح المكتب وشريط المهام والعمل بدون متصفح'
                            : 'Add instant desktop shortcut & app launcher without extra software'}
                        </p>
                      </div>
                    </div>

                    <a
                      href={PUBLIC_APP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-300" />
                      <span>{language === 'ar' ? 'فتح بنافذة مستقلة للتثبيت' : 'Open in New Tab'}</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Step by step for desktop */}
              <div className="p-3.5 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700/80 text-xs">
                <div className="flex items-center justify-between font-bold text-industrial-900 dark:text-white mb-2">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-brand-500" />
                    <span>Chrome / Edge (Windows, Mac, Linux)</span>
                  </div>
                  <span className="text-[10px] bg-brand-50 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded">
                    {language === 'ar' ? 'سطح المكتب' : 'Desktop'}
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-industrial-600 dark:text-industrial-300 pr-2">
                  <li>
                    {language === 'ar'
                      ? 'افتح الرابط في صفحة مستقلة (خارج إطار معاينة AI Studio).'
                      : 'Open the URL in a fresh browser tab outside the preview frame.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'في شريط عنوان المتصفح (URL)، انقر على أيقونة التثبيت (🖥️ أو ⊕ تثبيت EMIS).'
                      : 'In the address bar, click the Install App icon (🖥️ or ⊕ Install EMIS).'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'أو من قائمة المتصفح (⋮) اختر: حفظ ومشاركة > تثبيت تطبيق EMIS.'
                      : 'Or click browser menu (⋮) > Save and share > Install EMIS.'}
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL HOST / SERVER */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="bg-industrial-50 dark:bg-industrial-800/60 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-brand-500" />
                  <span>{language === 'ar' ? 'تشغيل خادم محلي كامل على كمبيوترك' : 'Run Self-Hosted Local Server on Your PC'}</span>
                </h3>
                <p className="text-xs text-industrial-600 dark:text-industrial-400 mt-1">
                  {language === 'ar'
                    ? 'لتشغيل النظام بالكامل وقاعدة البيانات المحلية على جهاز الكمبيوتر الخاص بك بدون أي اتصال بالإنترنت:'
                    : 'Run the full EMIS server, local JSON database, and AI integrations directly on your personal computer:'}
                </p>
              </div>

              {/* Windows One-Click Batch File */}
              <div className="p-4 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-industrial-900 dark:text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-brand-500" />
                    <span>Windows (start-emis.bat)</span>
                  </div>
                  <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-0.5">
                    {language === 'ar' ? 'ملف تشغيل تلقائي لويندوز (دبل كليك للبدء)' : 'Double-click executable batch script for Windows'}
                  </p>
                </div>
                <button
                  onClick={downloadBatFile}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تحميل الملف' : 'Download .bat'}</span>
                </button>
              </div>

              {/* Mac / Linux Shell Script */}
              <div className="p-4 bg-white dark:bg-industrial-850 rounded-xl border border-industrial-200 dark:border-industrial-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-industrial-900 dark:text-white flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span>macOS / Linux (start-emis.sh)</span>
                  </div>
                  <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-0.5">
                    {language === 'ar' ? 'سكريبت تشغيل سريع لأنظمة ماك ولينكس' : 'Bash startup script for macOS / Linux'}
                  </p>
                </div>
                <button
                  onClick={downloadShFile}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تحميل السكريبت' : 'Download .sh'}</span>
                </button>
              </div>

              {/* Terminal Commands */}
              <div className="bg-industrial-950 text-industrial-200 rounded-xl p-3.5 font-mono text-xs relative border border-industrial-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-industrial-800 text-[11px] text-industrial-400">
                  <span>{language === 'ar' ? 'أوامر التشغيل السريع في الطرفية (Terminal):' : 'Terminal Quick Launch Commands:'}</span>
                  <button
                    onClick={() => copyToClipboard('npm install && npm run dev', 'npm-cmd')}
                    className="flex items-center gap-1 text-industrial-300 hover:text-white cursor-pointer"
                  >
                    {copiedScript === 'npm-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript === 'npm-cmd' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
                <code>npm install && npm run dev</code>
                <p className="text-[11px] text-industrial-500 mt-2 font-sans">
                  {language === 'ar' ? 'ثم افتح المتصفح على: http://localhost:3000' : 'Then navigate in browser to: http://localhost:3000'}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-industrial-50 dark:bg-industrial-850 px-6 py-4 border-t border-industrial-200 dark:border-industrial-750 flex items-center justify-between">
          <div className="text-[11px] text-industrial-500 dark:text-industrial-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>EMIS Android APK Ready • Package: com.emis.inspection</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-industrial-200 dark:bg-industrial-700 hover:bg-industrial-300 dark:hover:bg-industrial-600 text-industrial-800 dark:text-industrial-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
