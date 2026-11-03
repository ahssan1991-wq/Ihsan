import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Video,
  Upload, 
  Sparkles, 
  Loader2, 
  Check, 
  X, 
  AlertTriangle, 
  RotateCcw, 
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Wand2,
  Sliders,
  Crop,
  Contrast,
  Sun,
  Image as ImageIcon,
  Edit,
  Layers,
  Box,
  MapPin,
  Barcode,
  QrCode,
  Zap,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Eye,
  CheckCircle2,
  Info,
  SwitchCamera,
  Flashlight,
  Save,
  Tag,
  Hash,
  FileText,
  Clock,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiScanNameplate } from '../services/apiClient';
import { dbService } from '../services/dbService';
import { 
  decodeBarcodeFromImage, 
  decodeBarcodeWithAutoCorrection, 
  lookupMaterialInCatalog,
  parseScannedText,
  yieldToMain,
  AutoCorrectionScanResult 
} from '../services/barcodeScanner';
import { 
  downscaleImageIfNeeded,
  rotateImage, 
  flipImage, 
  enhanceImageContrast, 
  invertImageColors, 
  cropCenterROI, 
  applyAutoCorrectionFilter 
} from '../services/imageScanOptimizer';
import { 
  checkCameraPermission, 
  requestCameraAccess, 
  CameraRequestResult, 
  CameraPermissionStatus 
} from '../services/cameraPermissionHelper';

function playScanBeep() {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const audioCtx = new AudioCtxClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Ignore restricted audio context
  }
}
import { ExtractedData, FieldWithConfidence, Material, User, UserRole } from '../types';

interface NameplateScannerProps {
  onScanSuccess?: (data: Record<string, string | null>) => void;
  onEditMaterial?: (material: Material, scannedData?: Record<string, string | null>) => void;
  onRegisterNewEntry?: (scannedData: Record<string, string | null>) => void;
  onInspectMaterial?: (material: Material) => void;
  materialsList?: Material[];
  buttonClassName?: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

export default function NameplateScanner({ 
  onScanSuccess, 
  onEditMaterial,
  onRegisterNewEntry,
  onInspectMaterial,
  materialsList,
  buttonClassName, 
  renderTrigger
}: NameplateScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | null>(null);
  
  // Image states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [autoCorrectionNotice, setAutoCorrectionNotice] = useState<string | null>(null);
  const [showManualSliders, setShowManualSliders] = useState(false);
  const [contrastLevel, setContrastLevel] = useState(1.5);
  const [brightnessLevel, setBrightnessLevel] = useState(10);
  
  // Instant Barcode / QR Detection Result
  const [instantBarcodeDetected, setInstantBarcodeDetected] = useState<{
    code: string;
    format?: string;
    parsedFields?: Record<string, string | null>;
  } | null>(null);

  // Prompt / Mode states
  const [scannerViewMode, setScannerViewMode] = useState<'scan' | 'edit-matched' | 'unregistered-prompt' | 'analysis-result'>('scan');

  // Camera capture states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionGuide, setPermissionGuide] = useState<CameraRequestResult['errorGuide'] | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Editable Form States for AI extraction
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Matched Material & Full Edit State
  const [matchedMaterial, setMatchedMaterial] = useState<Material | null>(null);
  const [editingMaterialDraft, setEditingMaterialDraft] = useState<Material | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  // Stock Add Quick State
  const [stockAddAmount, setStockAddAmount] = useState<number>(1);
  const [isAddingStock, setIsAddingStock] = useState(false);

  // Drag-and-drop & file inputs
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Load catalog materials for smart duplicate/match detection
  const catalogMaterials = useMemo(() => {
    return materialsList || dbService.getMaterials();
  }, [materialsList, isOpen]);

  // Suggested next orderly sequence for new registrations
  const nextSuggestedSequence = useMemo(() => {
    const existingSeqs = catalogMaterials
      .map(m => m.sequence)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);
    return existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
  }, [catalogMaterials]);

  // Check initial permission status on modal open
  useEffect(() => {
    if (isOpen) {
      checkCameraPermission().then(status => {
        setPermissionStatus(status);
      });
    }
  }, [isOpen]);

  // Stop camera helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      setCameraStream(null);
    }
    setIsTorchOn(false);
    setHasTorchSupport(false);
  };

  // Start camera helper using Permission Request Helper
  const startCamera = async (currentFacing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setPermissionGuide(null);
    setIsRequestingPermission(true);

    stopCamera();

    try {
      const result = await requestCameraAccess(currentFacing);
      setPermissionStatus(result.status);

      if (result.success && result.stream) {
        setCameraStream(result.stream);
        if (videoRef.current) {
          videoRef.current.srcObject = result.stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }

        // Check for torch capability
        const videoTrack = result.stream.getVideoTracks()[0];
        if (videoTrack && typeof (videoTrack.getCapabilities as any) === 'function') {
          const capabilities = (videoTrack.getCapabilities as any)();
          if (capabilities && capabilities.torch) {
            setHasTorchSupport(true);
          }
        }
      } else {
        setCameraError(result.errorMessage || 'تعذر تشغيل الكاميرا.');
        if (result.errorGuide) {
          setPermissionGuide(result.errorGuide);
        }
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("⚠️ تعذر تشغيل بث الفيديو المباشر.");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack && hasTorchSupport) {
      try {
        const nextState = !isTorchOn;
        await (videoTrack.applyConstraints as any)({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
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

  // Live Frame Barcode Detection Loop (Hardware-accelerated Native BarcodeDetector)
  // Provides instantaneous detection (<5ms) directly from live camera feed without lagging or freezing!
  useEffect(() => {
    if (activeMode !== 'camera' || !cameraStream) return;

    let isCancelled = false;
    let detector: any = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: [
            'qr_code', 'code_128', 'code_39', 'code_93', 
            'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix', 'itf', 'aztec', 'pdf417'
          ]
        });
      } catch {
        detector = null;
      }
    }

    if (!detector) return;

    const scanInterval = setInterval(async () => {
      if (isCancelled || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (isCancelled) return;
        if (barcodes && barcodes.length > 0) {
          const primary = barcodes[0];
          const rawValue = (primary.rawValue || primary.displayValue || '').trim();
          if (rawValue) {
            playScanBeep();

            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth || 640, 1280);
            canvas.height = Math.min(video.videoHeight || 480, 720);
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            const snapUrl = canvas.toDataURL('image/jpeg', 0.85);

            stopCamera();
            setActiveMode(null);

            const parsed = parseScannedText(rawValue, primary.format || 'LIVE_CAMERA_SCAN');
            setInstantBarcodeDetected(parsed);
            setImageSrc(snapUrl);
            setOriginalImageSrc(snapUrl);

            const match = lookupMaterialInCatalog({
              code: parsed.code,
              partNumber: parsed.parsedFields?.partNumber,
              serialNumber: parsed.parsedFields?.serialNumber,
              manufacturer: parsed.parsedFields?.manufacturer,
              model: parsed.parsedFields?.model,
              barcode: parsed.parsedFields?.barcode,
              qrCode: parsed.parsedFields?.qrCode
            }, catalogMaterials);

            if (match) {
              setMatchedMaterial(match);
              setEditingMaterialDraft({ ...match });
              setScannerViewMode('edit-matched');
              if (onEditMaterial) {
                onEditMaterial(match, parsed.parsedFields);
              }
            } else {
              setMatchedMaterial(null);
              setScannerViewMode('unregistered-prompt');
            }
          }
        }
      } catch {
        // Skip frame
      }
    }, 220);

    return () => {
      isCancelled = true;
      clearInterval(scanInterval);
    };
  }, [activeMode, cameraStream, catalogMaterials]);

  // Clean up on modal close
  const handleClose = () => {
    stopCamera();
    setImageSrc(null);
    setOriginalImageSrc(null);
    setScanError(null);
    setAutoCorrectionNotice(null);
    setIsAnalyzing(false);
    setIsAdjusting(false);
    setShowManualSliders(false);
    setExtractedData(null);
    setMatchedMaterial(null);
    setEditingMaterialDraft(null);
    setInstantBarcodeDetected(null);
    setScannerViewMode('scan');
    setActiveMode(null);
    setEditSuccessNotice(null);
    setIsOpen(false);
  };

  /**
   * Process loaded image:
   * 1. Run multi-pass auto-correcting Barcode / QR detection (Rotates, Enhances, Inverts, Crops if needed)
   * 2. Perform immediate database lookup
   * 3. If found -> immediately open populated Edit Modal
   * 4. If not found -> prompt user to register as new entry (or run AI scan)
   */
  const processImageForLookup = async (dataUrl: string, isInitial: boolean = true) => {
    setImageSrc(dataUrl);
    if (isInitial) {
      setOriginalImageSrc(dataUrl);
      setAutoCorrectionNotice(null);
    }
    setScanError(null);
    setIsAnalyzing(true);
    await yieldToMain();

    try {
      // Step 1: Intelligent Multi-Pass Decoding & Auto-Correction
      const autoScan = await decodeBarcodeWithAutoCorrection(dataUrl);
      const decodedResult = autoScan.result;

      // If the engine recognized the barcode after auto-rotating, enhancing, or cropping:
      // update imageSrc to the corrected version so the user sees it in the right orientation/clarity!
      if (autoScan.correctedImageSrc && autoScan.correctedImageSrc !== dataUrl) {
        setImageSrc(autoScan.correctedImageSrc);
      }

      if (autoScan.appliedCorrection) {
        setAutoCorrectionNotice(autoScan.appliedCorrection);
      }

      if (decodedResult && decodedResult.code) {
        setInstantBarcodeDetected(decodedResult);

        // Step 2: Immediate lookup in existing inventory database
        const match = lookupMaterialInCatalog({
          code: decodedResult.code,
          partNumber: decodedResult.parsedFields?.partNumber,
          serialNumber: decodedResult.parsedFields?.serialNumber,
          manufacturer: decodedResult.parsedFields?.manufacturer,
          model: decodedResult.parsedFields?.model,
          barcode: decodedResult.parsedFields?.barcode,
          qrCode: decodedResult.parsedFields?.qrCode
        }, catalogMaterials);

        if (match) {
          // Found! Populate full information in edit modal draft and open edit view
          setMatchedMaterial(match);
          setEditingMaterialDraft({ ...match });
          setScannerViewMode('edit-matched');
          setIsAnalyzing(false);

          if (onEditMaterial) {
            onEditMaterial(match, decodedResult.parsedFields);
          }
          return;
        } else {
          // Not found! Prompt user to register as a new entry with detected code
          setMatchedMaterial(null);
          setScannerViewMode('unregistered-prompt');
          setIsAnalyzing(false);
          return;
        }
      }

      // If no barcode was decoded yet, remain in scan view and offer interactive modification tools + AI scan
      setScannerViewMode('scan');
    } catch (e) {
      console.warn("Immediate barcode lookup warning:", e);
      setScannerViewMode('scan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Manual & Interactive Image Modification Suite ---
  const handleRotate = async (degrees: 90 | 180 | 270) => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await rotateImage(imageSrc, degrees);
      setImageSrc(newUrl);
      setAutoCorrectionNotice(`تم تدوير الصورة بمقدار ${degrees}° يدوياً وجاري فحص الرمز...`);
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Rotate error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleFlip = async (dir: 'horizontal' | 'vertical') => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await flipImage(imageSrc, dir);
      setImageSrc(newUrl);
      setAutoCorrectionNotice(`تم قلب الصورة ${dir === 'horizontal' ? 'أفقياً' : 'رأسياً'} وجاري فحص الرمز...`);
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Flip error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleEnhanceContrast = async () => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await enhanceImageContrast(imageSrc, {
        contrastMultiplier: 1.6,
        brightnessOffset: 12,
        sharpen: true,
        grayscale: true
      });
      setImageSrc(newUrl);
      setAutoCorrectionNotice('تم تحسين التباين والحدة وإزالة التشويش وجاري فحص الرمز...');
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Enhance error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleInvertColors = async () => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await invertImageColors(imageSrc);
      setImageSrc(newUrl);
      setAutoCorrectionNotice('تم عكس ألوان الرمز (Dark Polarity) وجاري فحص الرمز...');
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Invert error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleCropCenter = async () => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await cropCenterROI(imageSrc, 0.75);
      setImageSrc(newUrl);
      setAutoCorrectionNotice('تم التركيز على المنطقة المركزية للرمز وقص الحواف...');
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Crop error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSmartAutoFix = async () => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    setAutoCorrectionNotice('جاري تجربة زوايا التدوير (90°, 180°, 270°) وفلاتر التباين التلقائية...');
    try {
      const autoRes = await decodeBarcodeWithAutoCorrection(imageSrc);
      if (autoRes.result && autoRes.result.code) {
        setImageSrc(autoRes.correctedImageSrc);
        setAutoCorrectionNotice(autoRes.appliedCorrection || 'تم تصحيح وتعديل الصورة بنجاح والتعرف على الرمز!');
        await processImageForLookup(autoRes.correctedImageSrc, false);
      } else {
        // Apply visual filter anyway to make it legible for AI and human
        const enhanced = await applyAutoCorrectionFilter(imageSrc);
        setImageSrc(enhanced);
        setAutoCorrectionNotice('تم تعديل وضوح وتباين الصورة تلقائياً. إذا كان الرمز غير مقروء، جرب التحليل بالذكاء الاصطناعي.');
        await processImageForLookup(enhanced, false);
      }
    } catch (err) {
      console.warn("Smart auto-fix error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleApplySliders = async () => {
    if (!imageSrc) return;
    setIsAdjusting(true);
    try {
      const newUrl = await enhanceImageContrast(imageSrc, {
        contrastMultiplier: contrastLevel,
        brightnessOffset: brightnessLevel,
        sharpen: true,
        grayscale: true
      });
      setImageSrc(newUrl);
      setAutoCorrectionNotice(`تم تطبيق إعدادات التباين (${contrastLevel.toFixed(1)}x) والإضاءة (${brightnessLevel > 0 ? '+' : ''}${brightnessLevel})`);
      await processImageForLookup(newUrl, false);
    } catch (err) {
      console.warn("Slider apply error:", err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleResetToOriginal = () => {
    if (originalImageSrc) {
      setImageSrc(originalImageSrc);
      setAutoCorrectionNotice('تمت استعادة الصورة الأصلية كما تم التقاطها/تحميلها.');
      processImageForLookup(originalImageSrc, false);
    }
  };

  // Handle Capture from Webcam
  const handleCapture = async () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      let w = video.videoWidth || 1280;
      let h = video.videoHeight || 720;
      const maxDim = 1280;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        stopCamera();
        setActiveMode(null);
        processImageForLookup(dataUrl);
      }
    }
  };

  // Handle File upload & drop
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsAnalyzing(true);
      await yieldToMain();
      try {
        const optimizedUrl = await downscaleImageIfNeeded(file, 1280);
        setActiveMode(null);
        processImageForLookup(optimizedUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setActiveMode(null);
          processImageForLookup(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsAnalyzing(true);
      await yieldToMain();
      try {
        const optimizedUrl = await downscaleImageIfNeeded(file, 1280);
        setActiveMode(null);
        processImageForLookup(optimizedUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setActiveMode(null);
          processImageForLookup(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Submit image to Gemini Vision OCR for deep nameplate reading & database lookup
  const handleAnalyzeWithAI = async () => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    setScanError(null);

    try {
      const data: ExtractedData = await apiScanNameplate(imageSrc, catalogMaterials);
      if (data && typeof data === 'object') {
        setExtractedData(data);

        // Flatten data for lookup
        const partVal = data.partNumber?.value?.trim() || '';
        const serialVal = data.serialNumber?.value?.trim() || '';
        const mfgVal = data.manufacturer?.value?.trim() || '';
        const mdlVal = data.model?.value?.trim() || '';
        const bcodeVal = data.barcode?.value?.trim() || '';
        const qrVal = data.qrCode?.value?.trim() || '';

        // Verify that meaningful identifier data was extracted from the photo
        const hasIdentifiableData = Boolean(
          (partVal && partVal.length >= 3) || 
          (serialVal && serialVal.length >= 3) || 
          (bcodeVal && bcodeVal.length >= 3) || 
          (qrVal && qrVal.length >= 3) || 
          (mfgVal && mdlVal && mfgVal.length >= 3 && mdlVal.length >= 3)
        );

        let match: Material | null = null;
        if (hasIdentifiableData) {
          match = lookupMaterialInCatalog({
            partNumber: partVal,
            serialNumber: serialVal,
            manufacturer: mfgVal,
            model: mdlVal,
            barcode: bcodeVal,
            qrCode: qrVal
          }, catalogMaterials);
        }

        if (match) {
          setMatchedMaterial(match);
          setEditingMaterialDraft({ ...match });
          setScannerViewMode('edit-matched');
          if (onEditMaterial) {
            const flat: Record<string, string | null> = {};
            Object.keys(data).forEach(k => {
              flat[k] = (data as any)[k]?.value || null;
            });
            onEditMaterial(match, flat);
          }
        } else {
          // If no existing material in database matches, prompt user to register this exact new part!
          setMatchedMaterial(null);
          setScannerViewMode('unregistered-prompt');
        }
      } else {
        throw new Error("Invalid AI scan result format");
      }
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setScanError(err.message || "لم نتمكن من قراءة لوحة المادة بوضوح. الرجاء التأكد من جودة الصورة أو إدخال البيانات يدوياً.");
      setScannerViewMode('scan');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to build flat scanned data
  const getFlatScannedData = (): Record<string, string | null> => {
    const flatData: Record<string, string | null> = {};

    if (instantBarcodeDetected) {
      flatData.partNumber = instantBarcodeDetected.code;
      flatData.barcode = instantBarcodeDetected.code;
      flatData.qrCode = instantBarcodeDetected.code;
      if (instantBarcodeDetected.parsedFields) {
        Object.assign(flatData, instantBarcodeDetected.parsedFields);
      }
    }

    if (extractedData) {
      Object.keys(extractedData).forEach(key => {
        const field = extractedData[key as keyof ExtractedData];
        if (field?.value) {
          flatData[key] = field.value;
        }
      });
    }

    return flatData;
  };

  // Action: Register as New Entry
  const handleRegisterAsNewEntry = () => {
    const flatData = getFlatScannedData();
    if (!flatData.partNumber && instantBarcodeDetected?.code) {
      flatData.partNumber = instantBarcodeDetected.code;
    }

    if (onRegisterNewEntry) {
      onRegisterNewEntry(flatData);
    } else if (onScanSuccess) {
      onScanSuccess(flatData);
    }

    handleClose();
  };

  // Action: Save Edit Material Changes
  const handleSaveEditMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterialDraft) return;

    setIsSavingEdit(true);
    try {
      const currentUser: User = dbService.getCurrentUser() || {
        id: 'usr-engineer',
        name: 'Field Engineer',
        email: 'engineer@emis.local',
        role: UserRole.SUPERVISOR
      };

      const updatedHistory = [
        {
          id: `hist-scan-edit-${Date.now()}`,
          action: 'Material Updated via Scan',
          details: `Updated material information and verified via Barcode / QR Scan.`,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        },
        ...(editingMaterialDraft.history || [])
      ];

      const finalMaterial: Material = {
        ...editingMaterialDraft,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      };

      const result = dbService.updateMaterial(finalMaterial, currentUser);
      if (result.success) {
        setMatchedMaterial(finalMaterial);
        setEditingMaterialDraft(finalMaterial);
        setEditSuccessNotice(`✅ تم حفظ وتحديث بيانات المادة (${finalMaterial.partNumber}) في المخزون بنجاح!`);

        if (onEditMaterial) {
          onEditMaterial(finalMaterial, getFlatScannedData());
        }

        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        alert(result.error || 'Failed to update material');
      }
    } catch (err) {
      console.error('Error updating material:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Stock Adjustment inside Edit Modal
  const handleQuickAddStock = (amount: number) => {
    if (!editingMaterialDraft) return;
    const newQty = Math.max(0, editingMaterialDraft.quantity + amount);
    setEditingMaterialDraft({
      ...editingMaterialDraft,
      quantity: newQty
    });
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
          <span>📷 Scan Barcode / QR / مسح اللوحة</span>
        </button>
      )}

      {/* Hidden container for temp barcode parsing */}
      <div id="barcode-scan-canvas-temp" className="hidden" style={{ display: 'none' }}></div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto" id="scanner-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl bg-white border border-industrial-200 rounded-3xl shadow-2xl text-industrial-900 relative my-4 sm:my-8 overflow-hidden"
              id="scanner-modal-body"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-industrial-100 flex items-center justify-between bg-gradient-to-r from-industrial-50 via-brand-50/20 to-industrial-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-600 text-white rounded-2xl shadow-xs">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-industrial-900 flex items-center gap-2">
                      {scannerViewMode === 'edit-matched' ? (
                        <span>تعديل المادة المطابقة في المخزون / Edit Material</span>
                      ) : scannerViewMode === 'unregistered-prompt' ? (
                        <span>تسجيل مادة جديدة / Register New Entry</span>
                      ) : (
                        <span>ماسح الباركود وQR ولوحات المواد الذكي</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-industrial-500 font-sans">
                      مطابقة فورية مع قاعدة البيانات وفتح نافذة التعديل أو توجيه التسجيل التلقائي.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-industrial-100 text-industrial-400 hover:text-industrial-700 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-4 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
                {/* Hidden input for direct native device camera capture */}
                <input 
                  type="file" 
                  ref={nativeCameraInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />

                {/* VIEW 1: Initial Source Selection Mode */}
                {scannerViewMode === 'scan' && !imageSrc && !activeMode && (
                  <div className="space-y-4">
                    {permissionStatus === 'denied' && (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-[11.5px] font-medium">
                            إذن الكاميرا محظور في المتصفح. ننصح باستخدام <strong>كاميرا الهاتف المباشرة</strong> أو السماح بالإذن في إعدادات المتصفح.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveMode('camera')}
                          className="text-[11px] font-bold text-brand-700 hover:text-brand-900 underline shrink-0 cursor-pointer"
                        >
                          عرض تفاصيل الإذن
                        </button>
                      </div>
                    )}

                    <div className="bg-brand-50/70 border border-brand-200 rounded-2xl p-4 flex items-start gap-3.5 text-xs text-brand-950 shadow-2xs">
                      <Zap className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-sm">كشف فوري ومطابقة تلقائية مع المخزون:</p>
                        <p className="text-[11.5px] text-brand-800 leading-relaxed">
                          عند مسح أي باركود، رمز QR، أو لوحة فنية: إذا كانت المادة مسجلة مسبقاً، ستفتح <strong>نافذة التعديل مباشرة بكامل بياناتها</strong>، وإذا كانت جديدة سيُقترح <strong>تسجيلها فوراً بتسلسل منظم (#)</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Native Device Camera Box */}
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-5 bg-emerald-50/50 border-2 border-emerald-300 hover:border-emerald-500 rounded-2xl transition-all group cursor-pointer text-center relative overflow-hidden shadow-xs hover:shadow-md"
                      >
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          موصى به للهاتف
                        </div>
                        <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl mb-2.5 group-hover:scale-110 transition-transform">
                          <Camera className="h-7 w-7" />
                        </div>
                        <span className="font-bold text-xs text-emerald-950">كاميرا الهاتف المباشرة</span>
                        <span className="text-[10.5px] text-emerald-750 mt-1 font-medium">التقاط عالي الدقة عبر تطبيق الكاميرا الرسمي</span>
                      </button>

                      {/* Live Browser Camera Box */}
                      <button
                        type="button"
                        onClick={() => setActiveMode('camera')}
                        className="flex flex-col items-center justify-center p-5 bg-brand-50/40 border-2 border-brand-200 hover:border-brand-400 rounded-2xl transition-all group cursor-pointer text-center shadow-xs hover:shadow-md"
                      >
                        <div className="p-3.5 bg-brand-100 text-brand-700 rounded-2xl mb-2.5 group-hover:scale-110 transition-transform">
                          <Video className="h-7 w-7" />
                        </div>
                        <span className="font-bold text-xs text-brand-950">البث المباشر في الصفحة</span>
                        <span className="text-[10.5px] text-brand-700 mt-1">تشغيل كاميرا الويب المباشرة داخل المتصفح</span>
                      </button>

                      {/* Upload Image Box */}
                      <button
                        type="button"
                        onClick={() => setActiveMode('upload')}
                        className="flex flex-col items-center justify-center p-5 bg-industrial-50 border-2 border-industrial-200 hover:border-industrial-400 rounded-2xl transition-all group cursor-pointer text-center shadow-xs hover:shadow-md"
                      >
                        <div className="p-3.5 bg-industrial-200/80 text-industrial-700 rounded-2xl mb-2.5 group-hover:scale-110 transition-transform">
                          <Upload className="h-7 w-7" />
                        </div>
                        <span className="font-bold text-xs text-industrial-900">رفع صورة من المعرض</span>
                        <span className="text-[10.5px] text-industrial-500 mt-1">اختيار ملف أو السحب والإفلات</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 2: Live Browser Camera Stream */}
                {scannerViewMode === 'scan' && !imageSrc && activeMode === 'camera' && (
                  <div className="space-y-4">
                    {cameraError ? (
                      <div className="p-5 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-amber-950 text-xs flex flex-col gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-amber-950">
                              {permissionGuide?.title || 'إذن استخدام الكاميرا مطلوب (Camera Permission)'}
                            </h4>
                            <p className="text-[11.5px] text-amber-900 leading-relaxed whitespace-pre-line">
                              {permissionGuide?.description || cameraError}
                            </p>
                          </div>
                        </div>

                        {permissionGuide?.steps && permissionGuide.steps.length > 0 && (
                          <div className="bg-white/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
                            <p className="font-bold text-[11px] text-industrial-900 flex items-center gap-1.5">
                              <Info className="h-3.5 w-3.5 text-brand-600" />
                              <span>طريقة تفعيل إذن الكاميرا يدوياً:</span>
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px] text-industrial-700 leading-relaxed pr-1">
                              {permissionGuide.steps.map((step, idx) => (
                                <li key={idx} className="pl-1">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="border-t border-amber-200/80 pt-3 flex flex-wrap gap-2.5 items-center">
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            disabled={isRequestingPermission}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                          >
                            <RefreshCw className={`h-4 w-4 ${isRequestingPermission ? 'animate-spin' : ''}`} />
                            <span>{isRequestingPermission ? 'جاري طلب الإذن...' : 'إعادة طلب الإذن والمحاولة'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                          >
                            <Camera className="h-4 w-4" />
                            <span>استخدام كاميرا الهاتف المباشرة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveMode('upload')}
                            className="bg-white border border-industrial-300 hover:bg-industrial-100 text-industrial-800 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Upload className="h-4 w-4 text-industrial-600" />
                            <span>رفع صورة من المعرض</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative aspect-video sm:aspect-[16/9] w-full bg-black rounded-2xl overflow-hidden border border-industrial-300 shadow-inner">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Scanning Crosshair */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                          <div className="w-full max-w-sm h-48 border-2 border-dashed border-white/70 rounded-2xl relative flex items-center justify-center">
                            <span className="text-[10px] text-white/90 bg-black/50 px-3 py-1 rounded-full font-mono backdrop-blur-xs">
                              قم بمحاذاة الباركود أو لوحة المادة داخل الإطار
                            </span>
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-brand-400"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-brand-400"></div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-brand-400"></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-brand-400"></div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-auto">
                          <button
                            type="button"
                            onClick={toggleCameraFacing}
                            className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
                          >
                            <SwitchCamera className="h-4 w-4" />
                            <span className="text-[11px] font-mono font-semibold">
                              {facingMode === 'environment' ? 'الخلفية' : 'الأمامية'}
                            </span>
                          </button>

                          {hasTorchSupport && (
                            <button
                              type="button"
                              onClick={toggleTorch}
                              className={`p-2 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-xs cursor-pointer ${
                                isTorchOn ? 'bg-amber-500 text-black font-bold' : 'bg-black/60 hover:bg-black/80 text-white'
                              }`}
                            >
                              <Flashlight className="h-4 w-4" />
                              <span className="text-[11px] font-mono">{isTorchOn ? 'Flash ON' : 'Flash OFF'}</span>
                            </button>
                          )}
                        </div>

                        {/* Capture Button */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCapture}
                            className="bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 px-8 rounded-full text-xs flex items-center gap-2 shadow-xl shadow-black/40 cursor-pointer active:scale-95 transition-all border-2 border-white/40"
                          >
                            <Camera className="h-5 w-5" />
                            <span className="text-sm">التقاط ومطابقة فورية / Capture</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setActiveMode(null);
                        }}
                        className="text-xs text-industrial-600 hover:text-industrial-900 flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>الرجوع للخيارات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="text-xs text-emerald-750 hover:text-emerald-950 font-bold underline cursor-pointer"
                      >
                        التبديل لكاميرا الهاتف المباشرة
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 3: Upload Mode */}
                {scannerViewMode === 'scan' && !imageSrc && activeMode === 'upload' && (
                  <div className="space-y-4">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                        isDragging ? 'border-brand-500 bg-brand-50/20' : 'border-industrial-200 hover:border-brand-400 bg-industrial-50/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Upload className="mx-auto h-10 w-10 text-brand-600 mb-2.5" />
                      <p className="text-xs font-bold text-industrial-800">اسحب الصورة وأفلتها هنا، أو اضغط للتصفح من المعرض</p>
                      <p className="text-[11px] text-industrial-500 mt-1">يدعم قراءة الباركود، QR، واللوحات الفنية تلقائياً</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMode(null)}
                      className="text-xs text-industrial-600 hover:text-industrial-900 flex items-center gap-1.5 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>الرجوع للخيارات</span>
                    </button>
                  </div>
                )}

                {/* Loading / Analyzing State */}
                {isAnalyzing && (
                  <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 shadow-inner">
                      <Loader2 className="h-9 w-9 text-brand-600 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-industrial-800">جاري قراءة الرمز ومطابقة قاعدة بيانات المخزون...</p>
                      <p className="text-xs text-industrial-500">فحص فوري عالي السرعة بتقنية الهاردوير والتسريع الرقمي</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAnalyzing(false);
                        setImageSrc(null);
                        setActiveMode(null);
                      }}
                      className="text-xs text-industrial-500 hover:text-industrial-800 underline font-medium pt-1 cursor-pointer"
                    >
                      إلغاء والعودة للخيارات / Cancel
                    </button>
                  </div>
                )}

                {/* VIEW 4: Image Loaded - Interactive Modification Suite & AI Analysis */}
                {scannerViewMode === 'scan' && imageSrc && !isAnalyzing && (
                  <div className="space-y-4">
                    {/* Auto-Correction or Applied Action Banner */}
                    {autoCorrectionNotice && (
                      <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-brand-950 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Wand2 className="h-4 w-4 text-brand-600 shrink-0" />
                          <span className="font-semibold">{autoCorrectionNotice}</span>
                        </div>
                        {originalImageSrc && originalImageSrc !== imageSrc && (
                          <button
                            type="button"
                            onClick={handleResetToOriginal}
                            className="text-[11px] font-bold text-industrial-600 hover:text-industrial-900 underline shrink-0 cursor-pointer"
                          >
                            استعادة الأصل
                          </button>
                        )}
                      </div>
                    )}

                    {/* Image Display with Adjustment Overlay */}
                    <div className="relative max-h-64 rounded-2xl overflow-hidden border border-industrial-200 bg-industrial-900 flex justify-center items-center">
                      <img 
                        src={imageSrc} 
                        alt="Scanned Target" 
                        className={`max-h-64 object-contain transition-all duration-200 ${isAdjusting ? 'opacity-40 blur-[1px]' : 'opacity-100'}`} 
                        referrerPolicy="no-referrer" 
                      />

                      {/* Processing feedback overlay */}
                      {isAdjusting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-2 z-10">
                          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
                          <span className="text-xs font-bold font-mono">جاري المعالجة وفحص الرمز...</span>
                        </div>
                      )}

                      {/* Corner Dismiss Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setImageSrc(null);
                          setOriginalImageSrc(null);
                          setScanError(null);
                          setAutoCorrectionNotice(null);
                        }}
                        className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer z-20"
                        title="إعادة التقاط / إلغاء"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {scanError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex flex-col gap-3 shadow-xs">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold">{scanError}</p>
                            <p className="text-[11px] text-red-700 leading-normal">
                              يمكنك استخدام أدوات التدوير وتعديل التباين أدناه وإعادة المحاولة، أو المتابعة مباشرة بالإدخال اليدوي دون توقف سير العمل.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              setScannerViewMode('unregistered-prompt');
                            }}
                            className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>المتابعة بالإدخال اليدوي / Manual Entry</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleAnalyzeWithAI}
                            className="bg-white hover:bg-red-50 text-red-800 border border-red-300 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>إعادة محاولة الفحص</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE IMAGE CORRECTION & ORIENTATION SUITE */}
                    <div className="bg-white border border-industrial-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-industrial-900">أدوات تعديل وتصحيح شكل الصورة:</h4>
                            <p className="text-[10.5px] text-industrial-500">
                              إذا كانت الصورة مائلة، مقلوبة، أو باهتة، اضغط على الأدوات لتعديلها وفحصها فورياً
                            </p>
                          </div>
                        </div>

                        {originalImageSrc && originalImageSrc !== imageSrc && (
                          <button
                            type="button"
                            onClick={handleResetToOriginal}
                            className="text-[11px] text-industrial-600 hover:text-industrial-900 font-semibold flex items-center gap-1 cursor-pointer bg-industrial-100 hover:bg-industrial-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>استعادة الأصل</span>
                          </button>
                        )}
                      </div>

                      {/* Tool Buttons Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {/* Rotate 90 Right */}
                        <button
                          type="button"
                          onClick={() => handleRotate(90)}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-brand-50 border border-industrial-200 hover:border-brand-300 rounded-xl font-semibold text-industrial-800 hover:text-brand-900 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="تدوير 90 درجة باتجاه عقارب الساعة"
                        >
                          <RotateCw className="h-4 w-4 text-brand-600" />
                          <span>تدوير 90° يميناً</span>
                        </button>

                        {/* Rotate 90 Left */}
                        <button
                          type="button"
                          onClick={() => handleRotate(270)}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-brand-50 border border-industrial-200 hover:border-brand-300 rounded-xl font-semibold text-industrial-800 hover:text-brand-900 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="تدوير 90 درجة عكس عقارب الساعة"
                        >
                          <RotateCcw className="h-4 w-4 text-brand-600" />
                          <span>تدوير 90° يساراً</span>
                        </button>

                        {/* Auto Enhance Contrast */}
                        <button
                          type="button"
                          onClick={handleEnhanceContrast}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-amber-50 border border-industrial-200 hover:border-amber-300 rounded-xl font-semibold text-industrial-800 hover:text-amber-900 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="تحسين التباين والحدة وإبراز خطوط الباركود"
                        >
                          <Sun className="h-4 w-4 text-amber-600" />
                          <span>تحسين التباين</span>
                        </button>

                        {/* Invert Polarity */}
                        <button
                          type="button"
                          onClick={handleInvertColors}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-indigo-50 border border-industrial-200 hover:border-indigo-300 rounded-xl font-semibold text-industrial-800 hover:text-indigo-900 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="عكس الألوان لقراءة الباركود الأبيض أو المحفور على معدن داكن"
                        >
                          <Contrast className="h-4 w-4 text-indigo-600" />
                          <span>عكس الألوان</span>
                        </button>

                        {/* Flip Horizontal */}
                        <button
                          type="button"
                          onClick={() => handleFlip('horizontal')}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-industrial-100 border border-industrial-200 rounded-xl font-medium text-industrial-700 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="قلب الصورة أفقياً (مرآة)"
                        >
                          <FlipHorizontal className="h-4 w-4 text-industrial-500" />
                          <span>قلب أفقي</span>
                        </button>

                        {/* Rotate 180 (Invert vertically) */}
                        <button
                          type="button"
                          onClick={() => handleRotate(180)}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-industrial-100 border border-industrial-200 rounded-xl font-medium text-industrial-700 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="قلب رأساً على عقب 180 درجة"
                        >
                          <RefreshCw className="h-4 w-4 text-industrial-500" />
                          <span>قلب 180°</span>
                        </button>

                        {/* Crop Center ROI */}
                        <button
                          type="button"
                          onClick={handleCropCenter}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-industrial-50 hover:bg-emerald-50 border border-industrial-200 hover:border-emerald-300 rounded-xl font-medium text-industrial-700 hover:text-emerald-900 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title="التركيز على وسط الصورة واقتصاص الحواف المشوشة"
                        >
                          <Crop className="h-4 w-4 text-emerald-600" />
                          <span>تركيز وقص 75%</span>
                        </button>

                        {/* Comprehensive Auto-Fix & Re-scan */}
                        <button
                          type="button"
                          onClick={handleSmartAutoFix}
                          disabled={isAdjusting}
                          className="flex items-center justify-center gap-1.5 p-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
                          title="فحص تلقائي ذكي وتجربة كافة الزوايا والفلاتر"
                        >
                          <Wand2 className="h-4 w-4" />
                          <span>فحص وتصحيح ذكي</span>
                        </button>
                      </div>

                      {/* Fine-Tune Sliders Toggle */}
                      <div className="pt-2 border-t border-industrial-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setShowManualSliders(!showManualSliders)}
                          className="text-[11px] text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>{showManualSliders ? 'إخفاء الضبط اليدوي للسطوع والتباين' : 'تعديل يدوي متقدم للسطوع والتباين (Fine-Tune)'}</span>
                        </button>
                      </div>

                      {/* Manual Sliders */}
                      {showManualSliders && (
                        <div className="p-3.5 bg-industrial-50 rounded-xl border border-industrial-200 space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-industrial-700">
                              <span>مستوى التباين (Contrast):</span>
                              <span className="font-mono font-bold text-brand-700">{contrastLevel.toFixed(1)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.8"
                              max="3.0"
                              step="0.1"
                              value={contrastLevel}
                              onChange={(e) => setContrastLevel(parseFloat(e.target.value))}
                              className="w-full accent-brand-600 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-industrial-700">
                              <span>مستوى السطوع (Brightness):</span>
                              <span className="font-mono font-bold text-brand-700">
                                {brightnessLevel > 0 ? `+${brightnessLevel}` : brightnessLevel}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="-50"
                              max="50"
                              step="5"
                              value={brightnessLevel}
                              onChange={(e) => setBrightnessLevel(parseInt(e.target.value))}
                              className="w-full accent-brand-600 cursor-pointer"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleApplySliders}
                            disabled={isAdjusting}
                            className="w-full py-2 bg-industrial-800 hover:bg-industrial-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs"
                          >
                            تطبيق التعديلات وإعادة فحص الرمز
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AI Deep Analysis or Alternative Action */}
                    <div className="bg-industrial-50 border border-industrial-200 rounded-2xl p-4 text-xs text-industrial-700 space-y-3">
                      <p className="font-semibold text-industrial-900 leading-relaxed">
                        إذا كان الرمز محفوراً على لوحة فنية، أو غير مطبوع كباركود تقليدي، يمكنك تشغيل التحليل البصري بالذكاء الاصطناعي لقراءة اللوحة المحفورة واستخراج المواصفات:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={handleAnalyzeWithAI}
                          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 transition-all"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>تحليل بالذكاء الاصطناعي</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setScannerViewMode('unregistered-prompt');
                          }}
                          className="bg-industrial-800 hover:bg-industrial-900 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 transition-all"
                        >
                          <Edit className="h-4 w-4" />
                          <span>إدخال يدوي / Manual</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setImageSrc(null);
                            setOriginalImageSrc(null);
                            setScanError(null);
                            setAutoCorrectionNotice(null);
                          }}
                          className="border border-industrial-200 text-industrial-700 hover:bg-industrial-100 font-semibold py-3 px-3.5 rounded-xl text-xs cursor-pointer"
                        >
                          إعادة الالتقاط
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* VIEW 5: FOUND IN DATABASE -> POPULATED EDIT MODAL                         */}
                {/* ========================================================================= */}
                {scannerViewMode === 'edit-matched' && editingMaterialDraft && (
                  <form onSubmit={handleSaveEditMaterial} className="space-y-5" id="edit-matched-material-form">
                    {/* Top Matched Notification Banner */}
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                              تم العثور على المادة في المخزون
                            </span>
                            {editingMaterialDraft.sequence !== undefined && (
                              <span className="text-xs font-bold font-mono text-emerald-900">
                                تسلسل #{editingMaterialDraft.sequence}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-emerald-950 mt-0.5">
                            {editingMaterialDraft.partNumber} — {editingMaterialDraft.description}
                          </h4>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            تمت مطابقة الرمز الممسوح وفتح نافذة التعديل بكامل بيانات المادة المحفوظة.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <span className="bg-white border border-emerald-300 text-emerald-900 font-mono font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs">
                          الرصيد الحالي: {editingMaterialDraft.quantity} {editingMaterialDraft.unit}
                        </span>
                      </div>
                    </div>

                    {editSuccessNotice && (
                      <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-700" />
                        <span>{editSuccessNotice}</span>
                      </div>
                    )}

                    {/* Quick Stock Adjustment Bar */}
                    <div className="bg-industrial-50 border border-industrial-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-industrial-600" />
                        <span className="text-xs font-bold text-industrial-900">تعديل سريع للرصيد المتاح:</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleQuickAddStock(1)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+1 {editingMaterialDraft.unit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddStock(5)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+5 {editingMaterialDraft.unit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddStock(-1)}
                          className="bg-white border border-industrial-300 hover:bg-industrial-100 text-industrial-800 font-bold px-2.5 py-1.5 rounded-xl text-xs cursor-pointer shadow-2xs"
                        >
                          <span>-1</span>
                        </button>
                      </div>
                    </div>

                    {/* Full Populated Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {/* Part Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          رقم القطعة / Part Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingMaterialDraft.partNumber}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, partNumber: e.target.value })}
                          className="w-full text-xs font-mono font-bold border border-industrial-300 rounded-xl p-2.5 bg-white text-brand-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Sequence Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          التسلسل المادي / Sequence #
                        </label>
                        <input
                          type="number"
                          value={editingMaterialDraft.sequence || ''}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, sequence: parseInt(e.target.value) || undefined })}
                          className="w-full text-xs font-mono font-bold border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Manufacturer */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الشركة المصنعة / Manufacturer
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.manufacturer}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, manufacturer: e.target.value })}
                          className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Model */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الموديل / Model
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.model}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, model: e.target.value })}
                          className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Brand */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          العلامة التجارية / Brand
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.brand || ''}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, brand: e.target.value })}
                          className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Serial Number */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الرقم التسلسلي / Serial Number
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.serialNumber || ''}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, serialNumber: e.target.value })}
                          className="w-full text-xs font-mono border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الكمية المتوفرة / Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={editingMaterialDraft.quantity}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full text-xs font-mono font-bold border border-industrial-300 rounded-xl p-2.5 bg-white text-emerald-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Unit */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          وحدة القياس / Unit
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.unit}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, unit: e.target.value })}
                          className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Minimum Stock Level */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الحد الأدنى للطلب / Min Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingMaterialDraft.minStockLevel}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, minStockLevel: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full text-xs font-mono border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Store Warehouse */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          المستودع / Store Warehouse *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingMaterialDraft.store}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, store: e.target.value })}
                          className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Rack / Stand */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الستاند / Rack
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.rack || ''}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, rack: e.target.value })}
                          className="w-full text-xs font-mono border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>

                      {/* Shelf */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                          الرف / Shelf
                        </label>
                        <input
                          type="text"
                          value={editingMaterialDraft.shelf || ''}
                          onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, shelf: e.target.value })}
                          className="w-full text-xs font-mono border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Description Textarea */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                        الوصف الفني / Technical Description *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={editingMaterialDraft.description}
                        onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, description: e.target.value })}
                        className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>

                    {/* Notes Textarea */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-industrial-600 uppercase tracking-wider block font-mono">
                        الملاحظات الفنية والمواصفات / Notes & Specs
                      </label>
                      <textarea
                        rows={2}
                        value={editingMaterialDraft.notes || ''}
                        onChange={(e) => setEditingMaterialDraft({ ...editingMaterialDraft, notes: e.target.value })}
                        className="w-full text-xs border border-industrial-300 rounded-xl p-2.5 bg-white text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        placeholder="معلومات إضافية، الجهد، نطاق القياس، المحطة..."
                      />
                    </div>

                    {/* Form Footer Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-industrial-100">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        <span>حفظ التعديلات والتحديث في المخزون / Save Changes</span>
                      </button>

                      {onInspectMaterial && (
                        <button
                          type="button"
                          onClick={() => {
                            onInspectMaterial(editingMaterialDraft);
                            handleClose();
                          }}
                          className="border border-industrial-300 text-industrial-750 hover:bg-industrial-100 font-bold py-3 px-4 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>عرض السجل الفني الشامل</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setScannerViewMode('scan');
                          setImageSrc(null);
                        }}
                        className="border border-industrial-200 text-industrial-600 hover:bg-industrial-100 font-semibold py-3 px-4 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>مسح مادة أخرى / Scan Another</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ========================================================================= */}
                {/* VIEW 6: NOT FOUND IN DATABASE -> PROMPT TO REGISTER AS NEW ENTRY          */}
                {/* ========================================================================= */}
                {scannerViewMode === 'unregistered-prompt' && (
                  <div className="space-y-6" id="unregistered-prompt-view">
                    <div className="p-5 bg-amber-50/80 border-2 border-amber-300 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 bg-amber-200 text-amber-900 rounded-2xl shrink-0">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase">
                              صنف جديد غير مسجل
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-brand-100 text-brand-800 px-2.5 py-0.5 rounded-full border border-brand-300">
                              <Sparkles className="h-3 w-3 text-brand-600" />
                              التسلسل المقترح: #{nextSuggestedSequence}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-industrial-900 mt-1">
                            لم يتم العثور على هذه المادة في قاعدة بيانات المخزون
                          </h4>
                          <p className="text-xs text-industrial-600 leading-relaxed font-sans">
                            الرمز المكتشف من خلال المسح الضوئي غير مدرج ضمن المواد المسجلة حالياً. يمكنك تسجيله فوراً كصنف SKU جديد مع تعبئة كافة الحقول المكتشفة وتطبيق التسلسل المنظم المقترح تلقائياً.
                          </p>
                        </div>
                      </div>

                      {/* Scanned Details Card */}
                      <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2.5 text-xs font-mono">
                        <div className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider font-sans">
                          البيانات المكتشفة من المسح الضوئي / Scanned Data:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {instantBarcodeDetected?.code && (
                            <div className="p-2 bg-industrial-50 rounded-xl border border-industrial-200">
                              <span className="text-[10px] text-industrial-400 block font-sans">الرمز / Barcode / QR:</span>
                              <span className="font-bold text-brand-700">{instantBarcodeDetected.code}</span>
                            </div>
                          )}
                          {extractedData?.manufacturer?.value && (
                            <div className="p-2 bg-industrial-50 rounded-xl border border-industrial-200">
                              <span className="text-[10px] text-industrial-400 block font-sans">المصنع:</span>
                              <span className="font-bold text-industrial-800">{extractedData.manufacturer.value}</span>
                            </div>
                          )}
                          {extractedData?.model?.value && (
                            <div className="p-2 bg-industrial-50 rounded-xl border border-industrial-200">
                              <span className="text-[10px] text-industrial-400 block font-sans">الموديل:</span>
                              <span className="font-bold text-industrial-800">{extractedData.model.value}</span>
                            </div>
                          )}
                          {extractedData?.serialNumber?.value && (
                            <div className="p-2 bg-industrial-50 rounded-xl border border-industrial-200">
                              <span className="text-[10px] text-industrial-400 block font-sans">الرقم التسلسلي:</span>
                              <span className="font-bold text-industrial-800">{extractedData.serialNumber.value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleRegisterAsNewEntry}
                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-950/10 cursor-pointer active:scale-95 transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        <span>تسجيل كصنف جديد بتسلسل #{nextSuggestedSequence} / Register as New Entry</span>
                      </button>

                      {imageSrc && !extractedData && (
                        <button
                          type="button"
                          onClick={handleAnalyzeWithAI}
                          className="bg-white border border-brand-300 text-brand-800 hover:bg-brand-50 font-bold py-3.5 px-5 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4 text-brand-600" />
                          <span>تحليل تفصيلي بالذكاء الاصطناعي</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setScannerViewMode('scan');
                          setImageSrc(null);
                          setInstantBarcodeDetected(null);
                        }}
                        className="border border-industrial-200 text-industrial-600 hover:bg-industrial-100 font-semibold py-3 px-4 rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>مسح آخر / Scan Again</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-industrial-50 border-t border-industrial-100 flex items-center justify-between">
                <span className="text-[10px] text-industrial-500 font-mono flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Instant Decoders:</span>
                  <span className="font-bold text-industrial-700">Html5Qrcode • Native BarcodeDetector • Gemini Flash OCR</span>
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-white border border-industrial-200 text-industrial-700 hover:bg-industrial-100 font-bold py-1.5 px-4 rounded-xl text-xs cursor-pointer"
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
