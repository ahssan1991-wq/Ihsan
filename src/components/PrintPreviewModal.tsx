import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  ExternalLink, 
  Download, 
  X, 
  Check, 
  Copy, 
  FileText, 
  ShieldAlert,
  HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PrintPreviewData, 
  subscribeToPrintRequests, 
  downloadDocument, 
  openDocumentInNewTab 
} from '../utils/printManager';

export const PrintPreviewModal: React.FC = () => {
  const [data, setData] = useState<PrintPreviewData | null>(null);
  const [copied, setCopied] = useState(false);
  const [printAttemptMessage, setPrintAttemptMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPrintRequests((incomingData) => {
      setData(incomingData);
      setPrintAttemptMessage(null);
    });
    return () => unsubscribe();
  }, []);

  if (!data || !data.isOpen) {
    return null;
  }

  const handleClose = () => {
    setData(null);
    setPrintAttemptMessage(null);
  };

  const handlePrintInsideIframe = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        setPrintAttemptMessage('تم إرسال أمر الطباعة بنجاح إلى الطابعة.');
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Direct print blocked by browser sandbox:', err);
      setPrintAttemptMessage('تعذرت الطباعة التلقائية بسبب حظر المعاينة المدمجة. يرجى الضغط على "فتح في نافذة مستقلة".');
    }
  };

  const handleOpenNewTab = () => {
    const success = openDocumentInNewTab(data.html, data.title);
    if (!success) {
      // Fallback: download document if popup was blocked
      downloadDocument(data.html, data.filename);
      setPrintAttemptMessage('تم تنزيل المستند تلقائياً لفتحه وطباعته بدون حظر.');
    }
  };

  const handleDownload = () => {
    downloadDocument(data.html, data.filename);
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(data.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm"
        id="print-preview-modal-overlay"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-750 rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-industrial-200 dark:border-industrial-800 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-500/20 border border-brand-400/30 rounded-xl text-brand-300">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>مركز الطباعة الذكية وتصدير المستندات</span>
                  <span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full font-mono">
                    EMIS PRINT
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  {data.title}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Environmental Hint Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>تنبيه المتصفح:</strong> إذا كان متصفحك يمنع نافذة الطباعة التلقائية داخل المعاينة، اضغط على زر <strong>"فتح في نافذة مستقلة"</strong> للطباعة المباشرة بدون أي قيود، أو <strong>"تنزيل كملف"</strong>.
              </span>
            </div>
            {printAttemptMessage && (
              <span className="text-[11px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2.5 py-1 rounded-lg">
                {printAttemptMessage}
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="p-3 sm:px-5 bg-industrial-50 dark:bg-industrial-850 border-b border-industrial-200 dark:border-industrial-750 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintInsideIframe}
                className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                id="btn-print-dialog-direct"
              >
                <Printer className="h-4 w-4" />
                <span>إرسال للطابعة / Print</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                id="btn-print-open-tab"
              >
                <ExternalLink className="h-4 w-4 text-brand-400 dark:text-brand-600" />
                <span>فتح في نافذة مستقلة (طباعة مؤكدة)</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="bg-white dark:bg-industrial-800 hover:bg-industrial-100 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-100 border border-industrial-300 dark:border-industrial-600 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                id="btn-print-download"
              >
                <Download className="h-4 w-4 text-industrial-600 dark:text-industrial-300" />
                <span>تنزيل كملف (HTML / PDF)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="bg-white dark:bg-industrial-800 hover:bg-industrial-100 text-industrial-600 dark:text-industrial-300 border border-industrial-250 dark:border-industrial-700 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="نسخ كود المستند"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ المستند'}</span>
              </button>
            </div>
          </div>

          {/* Document Preview Pane */}
          <div className="flex-1 bg-slate-100 dark:bg-industrial-950 p-3 sm:p-6 overflow-hidden flex justify-center">
            <div className="w-full max-w-4xl h-full bg-white shadow-lg rounded-xl overflow-hidden border border-slate-300">
              <iframe
                ref={iframeRef}
                title={data.title}
                srcDoc={data.html}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-modals"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrintPreviewModal;
