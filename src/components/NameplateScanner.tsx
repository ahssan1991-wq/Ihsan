import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Loader2, 
  Check, 
  X, 
  AlertTriangle, 
  RotateCcw, 
  Image as ImageIcon,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FieldWithConfidence {
  value: string | null;
  confidence: number;
}

interface ExtractedData {
  manufacturer?: FieldWithConfidence;
  brand?: FieldWithConfidence;
  model?: FieldWithConfidence;
  partNumber?: FieldWithConfidence;
  serialNumber?: FieldWithConfidence;
  voltage?: FieldWithConfidence;
  current?: FieldWithConfidence;
  power?: FieldWithConfidence;
  output?: FieldWithConfidence;
  input?: FieldWithConfidence;
  frequency?: FieldWithConfidence;
  revision?: FieldWithConfidence;
  manufactureDate?: FieldWithConfidence;
  countryOfOrigin?: FieldWithConfidence;
  certificationMarks?: FieldWithConfidence;
  barcode?: FieldWithConfidence;
  qrCode?: FieldWithConfidence;
}

interface NameplateScannerProps {
  onScanSuccess: (data: Record<string, string | null>) => void;
  buttonClassName?: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

export default function NameplateScanner({ onScanSuccess, buttonClassName, renderTrigger }: NameplateScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | null>(null);
  
  // Image states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Camera capture states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Editable Form States
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Start camera helper
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      const errName = err.name || '';
      const errMsg = err.message || '';
      const isPermissionDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('denied') || errMsg.toLowerCase().includes('permission');
      
      if (isPermissionDenied) {
        setCameraError(
          "تم رفض الوصول إلى الكاميرا. يرجى تفعيل صلاحية الكاميرا من إعدادات المتصفح، أو فتح التطبيق في علامة تبويب جديدة لتجاوز قيود المعاينة.\n\n" +
          "Camera access was denied. Please enable camera permission in your browser settings, or open the application in a new tab to bypass iframe preview constraints."
        );
      } else {
        setCameraError(
          "عذراً، لم نتمكن من تشغيل الكاميرا. يرجى التحقق من توصيل الكاميرا أو استخدام خيار رفع الصورة.\n\n" +
          "Could not initialize camera stream. Please check your camera hardware or use the manual image upload option instead."
        );
      }
    }
  };

  // Switch modes
  useEffect(() => {
    if (activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeMode]);

  // Clean up on modal close
  const handleClose = () => {
    stopCamera();
    setImageSrc(null);
    setScanError(null);
    setIsAnalyzing(false);
    setExtractedData(null);
    setActiveMode(null);
    setIsOpen(false);
  };

  // Handle Capture from Webcam
  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageSrc(dataUrl);
        stopCamera();
        setActiveMode(null);
      }
    }
  };

  // Handle File upload & drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit to Gemini API
  const handleAnalyze = async () => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    setScanError(null);

    try {
      const response = await fetch('/api/gemini/scan-nameplate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64: imageSrc })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze nameplate image");
      }

      const data: ExtractedData = await response.json();
      setExtractedData(data);
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setScanError("لم نتمكن من قراءة الصورة بوضوح، الرجاء إدخال البيانات يدويًا");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and Send back to Parent
  const handleConfirm = () => {
    if (extractedData) {
      const flatData: Record<string, string | null> = {};
      Object.keys(extractedData).forEach(key => {
        const field = extractedData[key as keyof ExtractedData];
        flatData[key] = field ? field.value : null;
      });
      onScanSuccess(flatData);
      handleClose();
    }
  };

  const updateField = (field: keyof ExtractedData, value: string) => {
    if (extractedData) {
      const currentField = extractedData[field] || { value: null, confidence: 100 };
      setExtractedData({
        ...extractedData,
        [field]: {
          ...currentField,
          value: value === '' ? null : value
        }
      });
    }
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setIsOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={buttonClassName || "flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"}
          id="btn-scan-nameplate"
        >
          <Camera className="h-4 w-4" />
          <span>📷 Scan Nameplate</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="scanner-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white border border-industrial-200 rounded-2xl shadow-2xl text-industrial-900 relative my-8"
              id="scanner-modal-body"
            >
              {/* Header */}
              <div className="p-5 border-b border-industrial-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-industrial-900">قراءة لوحة معلومات المادة بالذكاء الاصطناعي</h3>
                    <p className="text-[10px] text-industrial-400 font-mono tracking-wider">AI Nameplate Scanner (v0.2)</p>
                  </div>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-industrial-100 text-industrial-400 hover:text-industrial-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* 1. Pick source mode if no image is loaded */}
                {!imageSrc && !activeMode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Live Camera Box */}
                    <button
                      type="button"
                      onClick={() => setActiveMode('camera')}
                      className="flex flex-col items-center justify-center p-8 bg-brand-50/40 border border-brand-100 hover:border-brand-300 rounded-2xl transition-all group cursor-pointer text-center"
                    >
                      <div className="p-4 bg-brand-100/60 text-brand-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Camera className="h-7 w-7" />
                      </div>
                      <span className="font-semibold text-sm text-brand-900">التقاط صورة بالكاميرا</span>
                      <span className="text-xs text-industrial-400 mt-1">توجيه الكاميرا نحو لوحة معلومات المعدة</span>
                    </button>

                    {/* Upload Image Box */}
                    <button
                      type="button"
                      onClick={() => setActiveMode('upload')}
                      className="flex flex-col items-center justify-center p-8 bg-industrial-50 border border-industrial-100 hover:border-industrial-300 rounded-2xl transition-all group cursor-pointer text-center"
                    >
                      <div className="p-4 bg-industrial-200/60 text-industrial-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="h-7 w-7" />
                      </div>
                      <span className="font-semibold text-sm text-industrial-800">رفع صورة من المعرض</span>
                      <span className="text-xs text-industrial-400 mt-1">سحب وإفلات أو تصفح الملفات</span>
                    </button>
                  </div>
                )}

                {/* 2. Active Mode View */}
                {!imageSrc && activeMode === 'camera' && (
                  <div className="space-y-4">
                    {cameraError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex gap-2.5 whitespace-pre-line">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                        <div>{cameraError}</div>
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-industrial-200">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-4 flex justify-center">
                          <button
                            type="button"
                            onClick={handleCapture}
                            className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-2 px-6 rounded-full text-xs flex items-center gap-1.5 shadow-lg shadow-brand-950/20 cursor-pointer"
                          >
                            <Camera className="h-4 w-4" />
                            <span>التقاط الصورة / Capture</span>
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveMode(null)}
                      className="text-xs text-industrial-500 hover:text-industrial-800 flex items-center gap-1.5 font-mono"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>الرجوع للخيارات / Back</span>
                    </button>
                  </div>
                )}

                {!imageSrc && activeMode === 'upload' && (
                  <div className="space-y-4">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        isDragging 
                          ? 'border-brand-500 bg-brand-50/20' 
                          : 'border-industrial-200 hover:border-brand-400 bg-industrial-50/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Upload className="mx-auto h-10 w-10 text-industrial-400 mb-2.5" />
                      <p className="text-xs font-semibold text-industrial-700">اسحب الصورة وأفلتها هنا، أو اضغط للتصفح</p>
                      <p className="text-[10px] text-industrial-400 mt-1">يدعم صيغ JPG, PNG, WEBP</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMode(null)}
                      className="text-xs text-industrial-500 hover:text-industrial-800 flex items-center gap-1.5 font-mono"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>الرجوع للخيارات / Back</span>
                    </button>
                  </div>
                )}

                {/* 3. Image Loaded and Pending AI scan */}
                {imageSrc && !extractedData && !isAnalyzing && (
                  <div className="space-y-4">
                    <div className="relative max-h-64 rounded-xl overflow-hidden border border-industrial-200 bg-industrial-100 flex justify-center">
                      <img src={imageSrc} alt="Scanned Nameplate" className="max-h-64 object-contain" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setImageSrc(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                        title="إعادة التقاط"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {scanError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex gap-2.5">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                        <div className="space-y-1">
                          <p className="font-semibold">{scanError}</p>
                          <p className="text-[10px] text-red-600/85 leading-normal">تأكد من أن الإضاءة جيدة وأن الكلمات مكتوبة بوضوح في الصورة.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-950/10 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4 animate-bounce" />
                        <span>تحليل الصورة بالذكاء الاصطناعي / Start AI Scan</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setImageSrc(null);
                          setScanError(null);
                        }}
                        className="border border-industrial-200 text-industrial-700 hover:bg-industrial-50 font-medium py-2.5 px-4 rounded-xl text-xs cursor-pointer"
                      >
                        إعادة اختيار الصورة / Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Analyzing Loading State */}
                {isAnalyzing && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm text-industrial-800">جاري قراءة لوحة المعلومات بالذكاء الاصطناعي...</p>
                      <p className="text-xs text-industrial-400">نستخدم طرازات Gemini المتطورة لاستخراج الحقول التقنية بدقة</p>
                    </div>
                    <div className="w-48 h-1.5 bg-industrial-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full animate-progress" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}

                {/* 5. Analysis Complete - Editable form review */}
                {extractedData && (
                  <div className="space-y-5">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-semibold">اكتمل تحليل البيانات بنجاح!</p>
                        <p className="text-[10px] text-emerald-700 leading-normal">يرجى مراجعة وتعديل البيانات المستخرجة أدناه للتأكد من مطابقتها التامة قبل الحفظ.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-industrial-100 p-4 rounded-xl bg-industrial-50/40">
                      {/* Manufacturer */}
                      {(() => {
                        const renderScannerField = (labelAr: string, labelEn: string, fieldKey: keyof ExtractedData, placeholder = 'N/A', isMono = false) => {
                          const field = extractedData?.[fieldKey];
                          const val = field ? field.value : '';
                          const conf = field ? field.confidence : 0;

                          let confColor = 'text-industrial-400 bg-industrial-100';
                          if (conf >= 80) {
                            confColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
                          } else if (conf >= 50) {
                            confColor = 'text-amber-700 bg-amber-50 border border-amber-200';
                          } else if (conf > 0) {
                            confColor = 'text-rose-700 bg-rose-50 border border-rose-200';
                          }

                          return (
                            <div className="space-y-1.5 p-3 rounded-lg border border-industrial-100 bg-white shadow-xs">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider">
                                  {labelAr} / {labelEn}
                                </label>
                                {field !== undefined && conf > 0 && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono ${confColor}`}>
                                    {conf}% AI
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={val || ''}
                                onChange={(e) => updateField(fieldKey, e.target.value)}
                                placeholder={placeholder}
                                className={`w-full text-xs border border-industrial-200 rounded-lg p-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white ${isMono ? 'font-mono font-bold text-brand-700' : ''}`}
                              />
                              {conf > 0 && (
                                <div className="w-full h-1 bg-industrial-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${conf >= 80 ? 'bg-emerald-500' : conf >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                    style={{ width: `${conf}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        };

                        return (
                          <>
                            {renderScannerField('الشركة المصنعة', 'Manufacturer', 'manufacturer')}
                            {renderScannerField('العلامة التجارية', 'Brand', 'brand')}
                            {renderScannerField('الموديل', 'Model', 'model')}
                            {renderScannerField('رقم القطعة', 'Part Number', 'partNumber', 'Required', true)}
                            {renderScannerField('الرقم التسلسلي', 'Serial Number', 'serialNumber', 'N/A', true)}
                            {renderScannerField('الجهد الكهربائي', 'Voltage', 'voltage')}
                            {renderScannerField('شدة التيار', 'Current', 'current')}
                            {renderScannerField('القدرة الكهربائية', 'Power', 'power')}
                            {renderScannerField('الإشارة الخارجة', 'Output', 'output')}
                            {renderScannerField('الإشارة الداخلة / النطاق', 'Input', 'input')}
                            {renderScannerField('التردد', 'Frequency', 'frequency')}
                            {renderScannerField('كود الإصدار', 'Revision Code', 'revision')}
                            {renderScannerField('تاريخ الصنع', 'Manufacture Date', 'manufactureDate')}
                            {renderScannerField('بلد المنشأ', 'Country of Origin', 'countryOfOrigin')}
                            {renderScannerField('علامات الاعتماد', 'Certification Marks', 'certificationMarks')}
                            {renderScannerField('الباركود', 'Barcode', 'barcode', 'N/A', true)}
                            {renderScannerField('رمز الاستجابة السريعة', 'QR Code', 'qrCode', 'N/A', true)}
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/10 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>تأكيد وتعبئة النموذج / Confirm & Fill Form</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setExtractedData(null)}
                        className="border border-industrial-200 text-industrial-700 hover:bg-industrial-50 font-medium py-2.5 px-4 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 font-mono"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>إعادة المسح / Re-Scan</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-industrial-50 border-t border-industrial-100 flex justify-between rounded-b-2xl">
                <span className="text-[10px] text-industrial-400 font-mono flex items-center gap-1">
                  <span>Powered by</span>
                  <span className="font-bold text-brand-600 uppercase">Gemini 3.5</span>
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-white border border-industrial-200 text-industrial-600 hover:bg-industrial-50 font-semibold py-1.5 px-3 rounded-lg text-xs cursor-pointer"
                >
                  إغلاق / Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
