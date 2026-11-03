/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Package,
  Layers,
  FileText,
  FileCheck,
  Award,
  Calendar,
  Building2,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Eye,
  Download,
  ExternalLink,
  ChevronRight,
  Wrench,
  Cpu,
  History,
  CheckCircle2,
  Tag,
  Boxes,
  Compass,
  ArrowRight,
  Globe,
  QrCode,
  Camera,
  Upload,
  Trash2,
  Maximize2,
  Check,
  RefreshCw,
  ZoomIn,
  Star,
  RotateCcw,
  Scan,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon,
  Edit3,
  Save,
  Copy
} from 'lucide-react';
import { Material, Equipment, EngineeringDecision, BlacklistItem, User, UserRole, MaterialPhotoLibrary, MaterialHistoryEvent } from '../types';
import { dbService } from '../services/dbService';
import { requestCameraAccess } from '../services/cameraPermissionHelper';

interface MaterialDetailsModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onFindSubstitutes?: (partNumber: string) => void;
  onNavigateToEquipment?: (tagNumber: string) => void;
  onEditMaterial?: (material: Material) => void;
  onOpenIntelligence?: (material: Material) => void;
  onOpenPassport?: (material: Material) => void;
}

type TabType = 'basic' | 'field-data' | 'photos' | 'procurement' | 'technical' | 'inspection' | 'documents' | 'equipment' | 'decisions' | 'history';

export default function MaterialDetailsModal({
  material,
  isOpen,
  onClose,
  currentUser,
  onFindSubstitutes,
  onNavigateToEquipment,
  onEditMaterial,
  onOpenIntelligence,
  onOpenPassport
}: MaterialDetailsModalProps) {
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(material);
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  // Photo management state
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<keyof MaterialPhotoLibrary>('nameplate');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState<boolean>(false);
  const [photoFilterCategory, setPhotoFilterCategory] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Fullscreen Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    category: string;
    label: string;
    date?: string;
    isPrimary?: boolean;
  } | null>(null);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  const handleCopyDirectLink = () => {
    if (!currentMaterial) return;
    const url = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(currentMaterial.partNumber)}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2500);
    }).catch(() => {
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2500);
    });
  };

  // Refs for camera video, canvas and inputs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize when material prop changes
  useEffect(() => {
    if (material) {
      setCurrentMaterial(material);
    }
  }, [material, isOpen]);

  // Engineering & Installation Location Fields (Tag, Field Mounting Loc, WO, MRF)
  const [isEditingEngFields, setIsEditingEngFields] = useState(false);
  const [editTagNumber, setEditTagNumber] = useState('');
  const [editInstallationLoc, setEditInstallationLoc] = useState('');
  const [editWorkOrder, setEditWorkOrder] = useState('');
  const [editMrfReference, setEditMrfReference] = useState('');
  const [isSavingEng, setIsSavingEng] = useState(false);

  useEffect(() => {
    if (currentMaterial) {
      setEditTagNumber(currentMaterial.tagNumber || '');
      setEditInstallationLoc(currentMaterial.installationLocation || currentMaterial.tagLocation || '');
      setEditWorkOrder(currentMaterial.workOrder || currentMaterial.woNumber || '');
      setEditMrfReference(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '');
    }
  }, [currentMaterial]);

  const handleSaveEngFields = () => {
    if (!currentMaterial || currentUser.role === UserRole.VIEWER) return;
    setIsSavingEng(true);
    try {
      const updatedMaterial: Material = {
        ...currentMaterial,
        tagNumber: editTagNumber.trim() || undefined,
        installationLocation: editInstallationLoc.trim() || undefined,
        tagLocation: editInstallationLoc.trim() || undefined,
        workOrder: editWorkOrder.trim() || undefined,
        woNumber: editWorkOrder.trim() || undefined,
        mrfReference: editMrfReference.trim() || undefined,
        mrfNumber: editMrfReference.trim() || undefined,
        mrf: editMrfReference.trim() || undefined,
        mrReference: editMrfReference.trim() || undefined,
        updatedAt: new Date().toISOString()
      };
      const res = dbService.updateMaterial(updatedMaterial, currentUser);
      if (res.success) {
        setCurrentMaterial(updatedMaterial);
        onEditMaterial?.(updatedMaterial);
        setIsEditingEngFields(false);
        setSuccessMessage('تم حفظ وتحديث بيانات التاغ الهندسي وموقع التركيب الميداني وأرقام WO و MRF بنجاح.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'فشل تحديث البيانات');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSavingEng(false);
    }
  };

  // Stop camera tracks cleanly on unmount or tab change
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen || !currentMaterial) return null;

  const blacklistCheck = dbService.checkBlacklistStatus(currentMaterial.partNumber, currentMaterial.serialNumber);
  const status = dbService.computeMaterialStatus(currentMaterial, blacklistCheck.isBlacklisted);

  const decisions = dbService.getEngineeringDecisions().filter(d => 
    d.partNumber.toUpperCase() === currentMaterial.partNumber.toUpperCase()
  );

  const equipmentList = dbService.getEquipment().filter(eq => 
    (currentMaterial.compatibleEquipment && currentMaterial.compatibleEquipment.some(t => t.toUpperCase() === eq.tagNumber.toUpperCase())) ||
    (currentMaterial.equipmentTags && currentMaterial.equipmentTags.some(t => t.toUpperCase() === eq.tagNumber.toUpperCase()))
  );

  // Category labels and photo list aggregation
  const categoryLabels: Record<keyof MaterialPhotoLibrary, string> = {
    nameplate: 'لوحة البيانات المعدنية (Nameplate)',
    identifiers: 'معرفات الباركود والـ QR',
    installation: 'صور الموقع والتركيب الميداني',
    warehouse: 'صور الرف والمستودع والتخزين',
    other: 'صور عامة للمادة ومواصفاتها'
  };

  const allPhotos: Array<{
    url: string;
    category: keyof MaterialPhotoLibrary;
    categoryLabel: string;
    isPrimary: boolean;
    isNameplate: boolean;
  }> = [];

  (Object.keys(categoryLabels) as Array<keyof MaterialPhotoLibrary>).forEach((cat) => {
    const list = currentMaterial.photos?.[cat] || [];
    list.forEach((url) => {
      if (url && typeof url === 'string') {
        allPhotos.push({
          url,
          category: cat,
          categoryLabel: categoryLabels[cat],
          isPrimary: currentMaterial.photo === url || currentMaterial.primaryIdentifierPhoto === url,
          isNameplate: currentMaterial.nameplatePhoto === url || cat === 'nameplate'
        });
      }
    });
  });

  // Include standalone photo if not already in library
  if (currentMaterial.photo && !allPhotos.some(p => p.url === currentMaterial.photo)) {
    allPhotos.unshift({
      url: currentMaterial.photo,
      category: 'other',
      categoryLabel: 'المعرف البصري الرئيسي',
      isPrimary: true,
      isNameplate: false
    });
  }

  const filteredPhotos = photoFilterCategory === 'all'
    ? allPhotos
    : allPhotos.filter(p => p.category === photoFilterCategory);

  // Camera start / stop / capture
  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    stopCamera();
    setIsCameraLoading(true);
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const res = await requestCameraAccess(facing);
      if (res.success && res.stream) {
        mediaStreamRef.current = res.stream;
        if (videoRef.current) {
          videoRef.current.srcObject = res.stream;
          await videoRef.current.play().catch(() => {});
        }
        setIsCameraLoading(false);
      } else {
        setCameraError(res.errorMessage || 'تعذر تشغيل الكاميرا المباشرة');
        setIsCameraLoading(false);
      }
    } catch (err: any) {
      setCameraError(err?.message || 'حدث خطأ أثناء الاتصال بالكاميرا');
      setIsCameraLoading(false);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage('الكاميرا غير جاهزة بعد، يرجى الانتظار ثانية');
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    saveNewPhoto(dataUrl, selectedPhotoCategory);
  };

  // Save new photo as identifier in material's record
  const saveNewPhoto = async (photoDataUrl: string, category: keyof MaterialPhotoLibrary = 'nameplate') => {
    if (currentUser.role === UserRole.VIEWER) {
      setErrorMessage('عذراً، حسابات العرض للقراءة فقط لا تملك صلاحية تعديل أو إضافة صور للمادة.');
      return;
    }
    setIsSavingPhoto(true);
    setErrorMessage(null);

    try {
      const currentPhotos: MaterialPhotoLibrary = {
        nameplate: [...(currentMaterial.photos?.nameplate || [])],
        installation: [...(currentMaterial.photos?.installation || [])],
        warehouse: [...(currentMaterial.photos?.warehouse || [])],
        other: [...(currentMaterial.photos?.other || [])],
        identifiers: [...(currentMaterial.photos?.identifiers || [])]
      };

      const existingList = currentPhotos[category] || [];
      if (!existingList.includes(photoDataUrl)) {
        currentPhotos[category] = [photoDataUrl, ...existingList];
      }

      const catLabel = categoryLabels[category] || category;

      // Determine primary identifier and nameplate
      const isFirstPhoto = !currentMaterial.photo && !currentMaterial.primaryIdentifierPhoto;
      const newPrimary = isFirstPhoto ? photoDataUrl : (currentMaterial.primaryIdentifierPhoto || currentMaterial.photo);
      const newNameplate = category === 'nameplate' && !currentMaterial.nameplatePhoto ? photoDataUrl : currentMaterial.nameplatePhoto;

      const newHistoryEvent: MaterialHistoryEvent = {
        id: `hist-photo-${Date.now()}`,
        action: 'Photo Identifier Added',
        details: `تم توثيق صورة ومعرف بصري جديد (${catLabel}) وتخزينه في سجل المادة`,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      };

      const updatedMaterial: Material = {
        ...currentMaterial,
        photos: currentPhotos,
        photo: newPrimary,
        primaryIdentifierPhoto: newPrimary,
        nameplatePhoto: newNameplate,
        history: [newHistoryEvent, ...(currentMaterial.history || [])],
        updatedAt: new Date().toISOString()
      };

      const res = dbService.updateMaterial(updatedMaterial, currentUser);
      if (!res.success) {
        setErrorMessage(res.error || 'فشل حفظ الصورة في قاعدة البيانات');
        setIsSavingPhoto(false);
        return;
      }

      try {
        dbService.addNotification({
          type: 'INFO',
          category: 'MATERIAL_UPDATED',
          priority: 'NORMAL',
          title: `توثيق معرف بصري للمادة: ${updatedMaterial.partNumber}`,
          message: `تم رفع وتوثيق صورة ومعرف من نوع (${catLabel}) في سجل المادة بواسطة ${currentUser.name}.`,
          materialId: updatedMaterial.partNumber,
          linkType: 'material',
          linkId: updatedMaterial.partNumber,
          site: updatedMaterial.store || currentUser.site || 'NDGS',
          userId: currentUser.id
        });
      } catch (e) {
        console.warn('Notification error:', e);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:materials-updated'));
        window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
      }

      setCurrentMaterial(updatedMaterial);
      onEditMaterial?.(updatedMaterial);
      setSuccessMessage(`تم حفظ وتخزين الصورة كمعرف في سجل المادة بنجاح (${catLabel})`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ الصورة');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Delete photo from material's record
  const handleDeletePhoto = async (photoUrl: string, category: keyof MaterialPhotoLibrary) => {
    if (currentUser.role === UserRole.VIEWER) {
      setErrorMessage('لا تملك الصلاحية لحذف الصور من سجل المادة.');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة من سجل المادة والمعرفات؟')) {
      return;
    }

    setIsSavingPhoto(true);
    try {
      const currentPhotos: MaterialPhotoLibrary = {
        nameplate: [...(currentMaterial.photos?.nameplate || [])],
        installation: [...(currentMaterial.photos?.installation || [])],
        warehouse: [...(currentMaterial.photos?.warehouse || [])],
        other: [...(currentMaterial.photos?.other || [])],
        identifiers: [...(currentMaterial.photos?.identifiers || [])]
      };

      currentPhotos[category] = (currentPhotos[category] || []).filter(p => p !== photoUrl);

      let newPrimary = currentMaterial.primaryIdentifierPhoto === photoUrl ? undefined : currentMaterial.primaryIdentifierPhoto;
      if (!newPrimary && currentMaterial.photo !== photoUrl) {
        newPrimary = currentMaterial.photo;
      }
      if (!newPrimary) {
        const allRemaining = [
          ...(currentPhotos.nameplate || []),
          ...(currentPhotos.identifiers || []),
          ...(currentPhotos.installation || []),
          ...(currentPhotos.warehouse || []),
          ...(currentPhotos.other || [])
        ];
        newPrimary = allRemaining[0];
      }

      const newHistoryEvent: MaterialHistoryEvent = {
        id: `hist-photo-del-${Date.now()}`,
        action: 'Photo Identifier Removed',
        details: `تم إزالة صورة ومعرف من قسم (${categoryLabels[category] || category}) في سجل المادة`,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      };

      const updatedMaterial: Material = {
        ...currentMaterial,
        photos: currentPhotos,
        photo: newPrimary,
        primaryIdentifierPhoto: newPrimary,
        nameplatePhoto: currentMaterial.nameplatePhoto === photoUrl ? undefined : currentMaterial.nameplatePhoto,
        history: [newHistoryEvent, ...(currentMaterial.history || [])],
        updatedAt: new Date().toISOString()
      };

      const res = dbService.updateMaterial(updatedMaterial, currentUser);
      if (!res.success) {
        setErrorMessage(res.error || 'فشل تحديث سجل المادة');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:materials-updated'));
      }

      setCurrentMaterial(updatedMaterial);
      onEditMaterial?.(updatedMaterial);
      setSuccessMessage('تم حذف الصورة من سجل المادة بنجاح.');
      if (lightboxPhoto && lightboxPhoto.url === photoUrl) {
        setLightboxPhoto(null);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Set as primary visual identifier
  const handleSetPrimaryIdentifier = async (photoUrl: string) => {
    if (currentUser.role === UserRole.VIEWER) return;
    setIsSavingPhoto(true);
    try {
      const newHistoryEvent: MaterialHistoryEvent = {
        id: `hist-photo-primary-${Date.now()}`,
        action: 'Primary Identifier Updated',
        details: 'تم تعيين الصورة كمعرف بصري رئيسي للمادة في السجل',
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      };

      const updatedMaterial: Material = {
        ...currentMaterial,
        photo: photoUrl,
        primaryIdentifierPhoto: photoUrl,
        history: [newHistoryEvent, ...(currentMaterial.history || [])],
        updatedAt: new Date().toISOString()
      };

      const res = dbService.updateMaterial(updatedMaterial, currentUser);
      if (!res.success) {
        setErrorMessage(res.error || 'فشل تعيين المعرف الرئيسي');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:materials-updated'));
      }

      setCurrentMaterial(updatedMaterial);
      onEditMaterial?.(updatedMaterial);
      setSuccessMessage('تم تعيين هذه الصورة كمعرف بصري رئيسي للمادة بنجاح.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء تعيين المعرف الرئيسي');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // File upload handler
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('يرجى اختيار ملفات صور فقط (JPG, PNG, WEBP)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          saveNewPhoto(dataUrl, selectedPhotoCategory);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrlPhoto = () => {
    if (!customPhotoUrl.trim()) return;
    saveNewPhoto(customPhotoUrl.trim(), selectedPhotoCategory);
    setCustomPhotoUrl('');
    setShowUrlInput(false);
  };

  const handleDownloadPhoto = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'Blacklisted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-industrial-900 text-white border border-rose-500 shadow-sm animate-pulse">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>⚫ Blacklisted / محظور</span>
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
            <span>🔴 Out of Stock / نافد</span>
          </span>
        );
      case 'Low Stock':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
            <span>🟡 Low Stock / منخفض</span>
          </span>
        );
      case 'Under Inspection':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300">
            <span>🟠 Under Inspection / قيد الفحص</span>
          </span>
        );
      case 'Reserved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <span>🔵 Reserved / محجوز</span>
          </span>
        );
      case 'Pending Engineering Review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
            <span>🟣 Pending Review / قيد المراجعة</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span>🟢 Available / متاح</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-industrial-950/80 backdrop-blur-xs overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-industrial-900 border-t sm:border border-industrial-200 dark:border-industrial-700 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-industrial-300 dark:bg-industrial-700" />
        </div>

        {/* Header Container */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/70 shrink-0 space-y-3">
          {/* Top Bar: Part Number + Status Badge on Left; Action Icons & Close on Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-mono text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800 shrink-0">
                {currentMaterial.partNumber}
              </span>
              <div className="shrink-0">
                {getStatusBadge()}
              </div>
            </div>

            {/* Quick Action Buttons & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Direct button to Photos & Identifiers */}
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'photos'
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}
                title="إدارة وتوثيق صور ومعرفات المادة"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden md:inline">الصور</span>
                <span className="font-mono text-[10px] font-bold">({allPhotos.length})</span>
              </button>

              {onOpenPassport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPassport(currentMaterial);
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="جواز المرور الرقمي المعتمد للمادة (Digital Material Passport - Port 13)"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden md:inline">الجواز الرقمي</span>
                </button>
              )}

              {onOpenIntelligence && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenIntelligence(currentMaterial);
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="استخبارات المواد والترجمة المتعددة اللغات والأدلة الرقمية"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">الذكاء الفني</span>
                </button>
              )}

              {onFindSubstitutes && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFindSubstitutes(currentMaterial.partNumber);
                  }}
                  className="p-2 sm:px-3 sm:py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="البحث عن البدائل الهندسية المكافئة"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden md:inline">البدائل الهندسية</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-industrial-400 hover:text-industrial-700 dark:hover:text-white rounded-xl hover:bg-industrial-200 dark:hover:bg-industrial-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Full-Width Description Headline */}
          <div className="w-full">
            <h3 className="text-sm sm:text-lg font-bold text-industrial-900 dark:text-white leading-normal break-words">
              {currentMaterial.description}
            </h3>
          </div>

          {/* Metadata Row: Manufacturer, Quantity, Location, Model, Copy Link */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-industrial-600 dark:text-industrial-300 pt-0.5">
            <span className="font-semibold text-industrial-900 dark:text-white">{currentMaterial.manufacturer}</span>
            <span className="text-industrial-300 dark:text-industrial-600">·</span>
            <span className="font-mono font-medium">الكمية: <strong className="text-industrial-900 dark:text-white">{currentMaterial.quantity}</strong> {currentMaterial.unit}</span>
            <span className="text-industrial-300 dark:text-industrial-600">·</span>
            <span>الموقع: <strong>{currentMaterial.store}</strong> {currentMaterial.rack ? `(رف: ${currentMaterial.rack})` : ''}</span>

            {currentMaterial.model && (
              <>
                <span className="text-industrial-300 dark:text-industrial-600">·</span>
                <span className="font-mono text-[11px] bg-industrial-100 dark:bg-industrial-800 px-2 py-0.5 rounded-md">
                  Model: {currentMaterial.model}
                </span>
              </>
            )}

            <button
              type="button"
              onClick={handleCopyDirectLink}
              className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-750 text-industrial-700 dark:text-industrial-300 transition-colors inline-flex items-center gap-1 cursor-pointer border border-industrial-200 dark:border-industrial-700 ms-auto"
              title="نسخ الرابط المباشر للوصول السريع إلى هذه المادة"
            >
              {isLinkCopied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-3 w-3" />
                  <span>رابط مباشر للمادة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Blacklist Critical Alert Banner if Flagged */}
        {blacklistCheck.isBlacklisted && (
          <div className="bg-rose-600 text-white p-4 flex items-start gap-3 shadow-inner shrink-0">
            <AlertOctagon className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <h4 className="font-bold text-sm">🚫 تحذير أمني وهندسي: هذه القطعة مسجلة في القائمة السوداء (Blacklisted)</h4>
              <p>
                <strong>سبب الحظر:</strong> {blacklistCheck.item?.reason || 'غير مطابقة للمواصفات أو مقلدة'}{' '}
                | <strong>المورد:</strong> {blacklistCheck.item?.supplierName || 'N/A'}{' '}
                | <strong>المُبلغ:</strong> {blacklistCheck.item?.reporterName || 'N/A'}{' '}
                | <strong>التاريخ:</strong> {blacklistCheck.item?.reportedDate ? new Date(blacklistCheck.item.reportedDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-3 sm:px-6 border-b border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-xs font-bold shrink-0">
          {[
            { id: 'basic', label: 'البيانات الأساسية / Basic' },
            { id: 'field-data', label: 'البيانات الميدانية / Field Data' },
            { id: 'photos', label: `صور ومعرفات المادة (${allPhotos.length})` },
            { id: 'procurement', label: 'المشتريات / MR & PO' },
            { id: 'technical', label: 'المواصفات الفنية / Tech Specs' },
            { id: 'inspection', label: 'الفحص والاستلام / Inspection' },
            { id: 'documents', label: 'الوثائق / Documents' },
            { id: 'equipment', label: `المعدات (${equipmentList.length})` },
            { id: 'decisions', label: `القرارات الهندسية (${decisions.length})` },
            { id: 'history', label: 'سجل العمليات / History' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2.5 border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400 font-bold'
                  : 'border-transparent text-industrial-500 hover:text-industrial-800 dark:text-industrial-400 dark:hover:text-industrial-200'
              }`}
            >
              {tab.id === 'field-data' && <Tag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
              {tab.id === 'photos' && <Camera className="h-3.5 w-3.5 text-blue-500" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Tab 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Visual Identification Card */}
              <div className="md:col-span-2 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700/80 bg-industrial-50/40 dark:bg-industrial-850/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-industrial-200 dark:border-industrial-700 bg-industrial-100 dark:bg-industrial-800 shrink-0 flex items-center justify-center group shadow-xs">
                    {allPhotos.length > 0 ? (
                      <img
                        src={allPhotos.find(p => p.isPrimary)?.url || allPhotos[0].url}
                        alt="المعرف البصري"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-industrial-400" />
                    )}
                    {allPhotos.length > 0 && (
                      <button
                        onClick={() => {
                          const primary = allPhotos.find(p => p.isPrimary) || allPhotos[0];
                          setLightboxPhoto({
                            url: primary.url,
                            category: primary.category,
                            label: primary.categoryLabel,
                            isPrimary: primary.isPrimary
                          });
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        title="تكبير ومعاينة"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-industrial-900 dark:text-white text-xs">
                        المعرف البصري ولوحة بيانات المادة
                      </span>
                      {allPhotos.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                          <span>موثق ({allPhotos.length} صورة)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertCircle className="h-3 w-3" />
                          <span>غير موثق بصرياً</span>
                        </span>
                      )}
                    </div>
                    <p className="text-industrial-500 dark:text-industrial-400 text-[11px] leading-relaxed">
                      {allPhotos.length > 0
                        ? `تم توثيق ${allPhotos.length} صورة ومعرف في سجل المادة (لوحات معدنية، باركود، ومواقع تركيب).`
                        : 'لم يتم حفظ أو التقاط صور ومعرفات لوحة البيانات لهذه المادة حتى الآن.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('photos')}
                  className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>{allPhotos.length > 0 ? 'إدارة واستعراض الصور والمعرفات' : 'التقاط أو رفع أول صورة كمعرف'}</span>
                </button>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700/80 bg-industrial-50/40 dark:bg-industrial-850/40">
                <h4 className="font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-2">
                  <Package className="h-4 w-4 text-brand-600" />
                  <span>تعريف المادة وتصنيفها</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-industrial-400 text-[10px] block">Part Number:</span>
                    <span className="font-mono font-bold text-industrial-900 dark:text-white">{currentMaterial.partNumber}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">Model:</span>
                    <span className="font-mono text-industrial-900 dark:text-white">{currentMaterial.model || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">Manufacturer:</span>
                    <span className="font-medium text-industrial-900 dark:text-white">{currentMaterial.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">Serial Number:</span>
                    <span className="font-mono text-industrial-900 dark:text-white">{currentMaterial.serialNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700/80 bg-industrial-50/40 dark:bg-industrial-850/40">
                <h4 className="font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  <span>الموقع المخزني والرصيد وملف المخزن</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-industrial-400 text-[10px] block">ملف المخزن / File:</span>
                    <span className="font-semibold text-brand-700 dark:text-brand-300 truncate block" title={currentMaterial.fileName || 'NDGS Instrument Materials'}>
                      📁 {currentMaterial.fileName || 'NDGS Instrument Materials'}
                    </span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">التسلسل في الملف / File Seq:</span>
                    <span className="font-mono font-bold text-brand-700 dark:text-brand-300">
                      {currentMaterial.fileSequence !== undefined ? `#${currentMaterial.fileSequence}` : (currentMaterial.sequence !== undefined ? `#${currentMaterial.sequence}` : '—')}
                    </span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">المستودع / Store:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{currentMaterial.store}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">الكمية المتوفرة:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currentMaterial.quantity} {currentMaterial.unit}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">الرف / Rack & Shelf:</span>
                    <span className="font-mono text-industrial-900 dark:text-white">{currentMaterial.rack || 'N/A'} / {currentMaterial.shelf || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-industrial-400 text-[10px] block">حد إعادة الطلب (Min):</span>
                    <span className="font-mono text-industrial-900 dark:text-white">{currentMaterial.minStockLevel || 2} {currentMaterial.unit}</span>
                  </div>
                </div>
              </div>

              {/* Engineering Tag & Field Installation Location Card (WO & MRF) */}
              <div className="md:col-span-2 p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/30 dark:from-purple-950/20 dark:via-industrial-850 dark:to-indigo-950/20 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100 dark:border-purple-900/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-industrial-900 dark:text-white text-xs flex items-center gap-2">
                        <span>التاغ الهندسي وموقع التثبيت الميداني وأوامر العمل</span>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          Engineering & Field Location
                        </span>
                      </h4>
                      <p className="text-[11px] text-industrial-500 dark:text-industrial-400">
                        توثيق مكان التثبيت الفعلي للمادة (مثل مكان تثبيت السلينويد) وأرقام WO و MRF
                      </p>
                    </div>
                  </div>

                  {currentUser.role !== UserRole.VIEWER && (
                    <div>
                      {!isEditingEngFields ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingEngFields(true)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-white dark:bg-industrial-800 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل سريع</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingEngFields(false);
                              if (currentMaterial) {
                                setEditTagNumber(currentMaterial.tagNumber || '');
                                setEditInstallationLoc(currentMaterial.installationLocation || currentMaterial.tagLocation || '');
                                setEditWorkOrder(currentMaterial.workOrder || currentMaterial.woNumber || '');
                                setEditMrfReference(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '');
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-industrial-100 hover:bg-industrial-200 text-industrial-700 dark:bg-industrial-800 dark:text-industrial-300 cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEngFields}
                            disabled={isSavingEng}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                            <span>{isSavingEng ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditingEngFields ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Tag Number */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-industrial-900/80 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-industrial-400 text-[10px] block font-medium">Tag Number (رقم بطاقة المعدة / التاغ):</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300 truncate">
                          {currentMaterial.tagNumber || '— غير محدد —'}
                        </span>
                        {currentMaterial.tagNumber && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(currentMaterial.tagNumber || '')}
                            title="نسخ التاغ"
                            className="text-industrial-400 hover:text-purple-600 p-0.5 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Field Installation Location */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-industrial-900/80 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-industrial-400 text-[10px] block font-medium">موقع التثبيت والتركيب الفعلي:</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-semibold text-xs text-industrial-900 dark:text-white truncate" title={currentMaterial.installationLocation || currentMaterial.tagLocation}>
                          {currentMaterial.installationLocation || currentMaterial.tagLocation || '— غير محدد (مثال: مكان تثبيت السلينويد) —'}
                        </span>
                        {(currentMaterial.installationLocation || currentMaterial.tagLocation) && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(currentMaterial.installationLocation || currentMaterial.tagLocation || '')}
                            title="نسخ موقع التثبيت"
                            className="text-industrial-400 hover:text-purple-600 p-0.5 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Work Order */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-industrial-900/80 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-industrial-400 text-[10px] block font-medium">Work Order (رقم أمر العمل WO #):</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 truncate">
                          {currentMaterial.workOrder || currentMaterial.woNumber || '— لا يوجد أمر عمل —'}
                        </span>
                        {(currentMaterial.workOrder || currentMaterial.woNumber) && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(currentMaterial.workOrder || currentMaterial.woNumber || '')}
                            title="نسخ أمر العمل"
                            className="text-industrial-400 hover:text-amber-600 p-0.5 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* MRF Reference */}
                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-industrial-900/80 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-industrial-400 text-[10px] block font-medium">Material Requisition (رقم MRF #):</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400 truncate">
                          {currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '— لا يوجد رقم طلب —'}
                        </span>
                        {(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference) && (
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '')}
                            title="نسخ رقم MRF"
                            className="text-industrial-400 hover:text-blue-600 p-0.5 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-industrial-600 dark:text-industrial-300 text-[10.5px] font-semibold block mb-1">
                        Tag Number (التاغ الهندسي):
                      </label>
                      <input
                        type="text"
                        value={editTagNumber}
                        onChange={(e) => setEditTagNumber(e.target.value)}
                        placeholder="e.g. 2021-1-5553-XYS-237"
                        className="w-full bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-industrial-600 dark:text-industrial-300 text-[10.5px] font-semibold block mb-1">
                        مكان التثبيت والتركيب الميداني الفعلي:
                      </label>
                      <input
                        type="text"
                        value={editInstallationLoc}
                        onChange={(e) => setEditInstallationLoc(e.target.value)}
                        placeholder="e.g. Turbine Skid-A (مكان تثبيت السلينويد)"
                        className="w-full bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-industrial-600 dark:text-industrial-300 text-[10.5px] font-semibold block mb-1">
                        Work Order (رقم أمر العمل WO #):
                      </label>
                      <input
                        type="text"
                        value={editWorkOrder}
                        onChange={(e) => setEditWorkOrder(e.target.value)}
                        placeholder="e.g. WO-2024-8841"
                        className="w-full bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-industrial-600 dark:text-industrial-300 text-[10.5px] font-semibold block mb-1">
                        MRF Number (رقم طلب صرف المواد):
                      </label>
                      <input
                        type="text"
                        value={editMrfReference}
                        onChange={(e) => setEditMrfReference(e.target.value)}
                        placeholder="e.g. MRF-2024-001 أو 0226-14344"
                        className="w-full bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 text-xs px-2.5 py-1.5 rounded-lg font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {currentMaterial.notes && (
                <div className="md:col-span-2 p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850">
                  <h4 className="font-bold text-industrial-800 dark:text-industrial-200 mb-1">ملاحظات المستودع العامة:</h4>
                  <p className="text-industrial-600 dark:text-industrial-300 whitespace-pre-wrap">{currentMaterial.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Field Data (Tag Number, Plant/Location, Work Orders, MRF) */}
          {activeTab === 'field-data' && (
            <div className="space-y-5">
              {/* Feedback messages */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 font-bold text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2.5 font-bold text-xs"
                  >
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Field Data Hero & Action Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-industrial-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md shrink-0">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-industrial-900 dark:text-white">
                        البيانات الميدانية وموقع التركيب والتشغيل
                      </h3>
                      <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                        Field Data & Plant Asset
                      </span>
                      {currentMaterial.tagNumber ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                          <Check className="h-3 w-3" />
                          <span>تاغ معرف: {currentMaterial.tagNumber}</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                          بانتظار تعيين التاغ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-industrial-600 dark:text-industrial-300">
                      إدارة وتوثيق رقم بطاقة المعدة (Tag #)، موقع التثبيت الفعلي (Plant / Installation Location)، وأوامر العمل (WO) وطلبات صرف المواد (MRF).
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {currentUser.role !== UserRole.VIEWER && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEngFields(!isEditingEngFields)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                        isEditingEngFields
                          ? 'bg-industrial-200 text-industrial-800 dark:bg-industrial-700 dark:text-industrial-200'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>{isEditingEngFields ? 'إغلاق التعديل' : 'تعديل البيانات الميدانية'}</span>
                    </button>
                  )}

                  {currentMaterial.tagNumber && onNavigateToEquipment && (
                    <button
                      type="button"
                      onClick={() => onNavigateToEquipment(currentMaterial.tagNumber!)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-industrial-800 hover:bg-industrial-50 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 border border-industrial-300 dark:border-industrial-600 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="فتح بطاقة المعدة في سجل المعدات"
                    >
                      <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>سجل المعدة</span>
                    </button>
                  )}
                </div>
              </div>

              {/* In-Place Quick Edit Form */}
              {isEditingEngFields && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-industrial-850 shadow-md space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-industrial-100 dark:border-industrial-700">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-purple-600" />
                      <h4 className="font-bold text-xs text-industrial-900 dark:text-white">
                        تعديل وتحديث البيانات الميدانية وموقع التركيب
                      </h4>
                    </div>
                    <span className="text-[11px] text-industrial-400 font-mono">
                      Part: {currentMaterial.partNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tag Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-industrial-700 dark:text-industrial-300 flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-purple-600" />
                        <span>رقم بطاقة المعدة / التاغ الميداني (Tag Number):</span>
                      </label>
                      <input
                        type="text"
                        value={editTagNumber}
                        onChange={(e) => setEditTagNumber(e.target.value)}
                        placeholder="e.g. 2021-1-5553-XYS-237 أو 10-XV-001"
                        className="w-full bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 text-xs px-3 py-2 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 text-industrial-900 dark:text-white"
                      />
                      <p className="text-[10.5px] text-industrial-500">
                        معرف التاغ الهندسي للمعدة أو الأداة في مخططات P&ID والموقع
                      </p>
                    </div>

                    {/* Installation Location / Plant */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-industrial-700 dark:text-industrial-300 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span>موقع التثبيت والمنشأة الميدانية (Plant & Installation Location):</span>
                      </label>
                      <input
                        type="text"
                        value={editInstallationLoc}
                        onChange={(e) => setEditInstallationLoc(e.target.value)}
                        placeholder="e.g. N DGS - Station 1 (مكان تثبيت السلينويد) أو ZUBAIR MAIN PLANT"
                        className="w-full bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-industrial-900 dark:text-white"
                      />
                      <p className="text-[10.5px] text-industrial-500">
                        الموقع الفعلي المحدد للتركيب في الحقل أو المحطة التشغيلية
                      </p>
                    </div>

                    {/* Work Order */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-industrial-700 dark:text-industrial-300 flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <span>رقم أمر العمل (Work Order # / WO):</span>
                      </label>
                      <input
                        type="text"
                        value={editWorkOrder}
                        onChange={(e) => setEditWorkOrder(e.target.value)}
                        placeholder="e.g. 210000337100"
                        className="w-full bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 text-xs px-3 py-2 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 text-industrial-900 dark:text-white"
                      />
                      <p className="text-[10.5px] text-industrial-500">
                        رقم أمر العمل المرتبط بالصيانة الدورية أو التبديل والتركيب
                      </p>
                    </div>

                    {/* MRF Reference */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-industrial-700 dark:text-industrial-300 flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span>رقم طلب المادة أو التوريد (MRF Reference / MR #):</span>
                      </label>
                      <input
                        type="text"
                        value={editMrfReference}
                        onChange={(e) => setEditMrfReference(e.target.value)}
                        placeholder="e.g. 0226-14344-00-00-1 أو MRF-2024-001"
                        className="w-full bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 text-xs px-3 py-2 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-purple-500 text-industrial-900 dark:text-white"
                      />
                      <p className="text-[10.5px] text-industrial-500">
                        الرقم المرجعي المعتمد لطلب المادة (Material Requisition Form)
                      </p>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-industrial-100 dark:border-industrial-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEngFields(false);
                        if (currentMaterial) {
                          setEditTagNumber(currentMaterial.tagNumber || '');
                          setEditInstallationLoc(currentMaterial.installationLocation || currentMaterial.tagLocation || '');
                          setEditWorkOrder(currentMaterial.workOrder || currentMaterial.woNumber || '');
                          setEditMrfReference(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '');
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-industrial-100 hover:bg-industrial-200 text-industrial-700 dark:bg-industrial-800 dark:text-industrial-300 cursor-pointer transition-colors"
                    >
                      إلغاء التعديل
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEngFields}
                      disabled={isSavingEng}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingEng ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{isSavingEng ? 'جارٍ الحفظ والتحديث...' : 'حفظ البيانات الميدانية'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Four Primary Field Identifiers KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Tag Number KPI */}
                <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-industrial-850 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-industrial-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-mono">
                      <Tag className="h-3.5 w-3.5" />
                      <span>Tag Number (التاغ)</span>
                    </span>
                    {currentMaterial.tagNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentMaterial.tagNumber || '');
                          setSuccessMessage(`تم نسخ التاغ: ${currentMaterial.tagNumber}`);
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        className="text-industrial-400 hover:text-purple-600 p-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors"
                        title="نسخ رقم التاغ"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold text-purple-700 dark:text-purple-300 truncate" title={currentMaterial.tagNumber}>
                    {currentMaterial.tagNumber || '— غير محدد —'}
                  </div>
                  <span className="text-[11px] text-industrial-500 block">
                    {currentMaterial.tagNumber ? 'بطاقة المعدة في المخطط الميداني' : 'اضغط تعديل لتعيين رقم التاغ'}
                  </span>
                </div>

                {/* 2. Plant & Installation Location KPI */}
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-industrial-850 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-industrial-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 font-mono">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Location / Plant</span>
                    </span>
                    {(currentMaterial.installationLocation || currentMaterial.tagLocation) && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentMaterial.installationLocation || currentMaterial.tagLocation || '');
                          setSuccessMessage('تم نسخ موقع التركيب الميداني');
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        className="text-industrial-400 hover:text-emerald-600 p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                        title="نسخ الموقع الميداني"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-industrial-900 dark:text-white truncate" title={currentMaterial.installationLocation || currentMaterial.tagLocation}>
                    {currentMaterial.installationLocation || currentMaterial.tagLocation || currentMaterial.store || '— غير محدد —'}
                  </div>
                  <span className="text-[11px] text-industrial-500 block">
                    المستودع/المنشأة: {currentMaterial.store || '—'}
                  </span>
                </div>

                {/* 3. Work Order KPI */}
                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-industrial-850 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-industrial-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-mono">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Work Order (WO #)</span>
                    </span>
                    {(currentMaterial.workOrder || currentMaterial.woNumber) && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentMaterial.workOrder || currentMaterial.woNumber || '');
                          setSuccessMessage(`تم نسخ أمر العمل: ${currentMaterial.workOrder || currentMaterial.woNumber}`);
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        className="text-industrial-400 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                        title="نسخ رقم أمر العمل"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold text-amber-700 dark:text-amber-400 truncate" title={currentMaterial.workOrder || currentMaterial.woNumber}>
                    {currentMaterial.workOrder || currentMaterial.woNumber || '— لا يوجد أمر عمل —'}
                  </div>
                  <span className="text-[11px] text-industrial-500 block">
                    {currentMaterial.woNumbers && currentMaterial.woNumbers.length > 1
                      ? `${currentMaterial.woNumbers.length} أوامر عمل مرتبطة`
                      : 'أمر عمل الصيانة والتركيب'}
                  </span>
                </div>

                {/* 4. MRF Reference KPI */}
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-industrial-850 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-industrial-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-mono">
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>MRF Reference (الطلب)</span>
                    </span>
                    {(currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference) && (
                      <button
                        type="button"
                        onClick={() => {
                          const ref = currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '';
                          navigator.clipboard.writeText(ref);
                          setSuccessMessage(`تم نسخ رقم MRF: ${ref}`);
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        className="text-industrial-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors"
                        title="نسخ رقم طلب المادة"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300 truncate">
                    {currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || '— لا يوجد رقم طلب —'}
                  </div>
                  <span className="text-[11px] text-industrial-500 block">
                    طلب التوريد والصرف المخزني
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Location & Facility Breakdown */}
                <div className="p-4 rounded-2xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-3.5">
                  <h4 className="font-bold text-xs text-industrial-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span>تفاصيل المنشأة وموقع التثبيت الميداني</span>
                  </h4>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-industrial-400 block">مكان التثبيت الفعلي (Installation Point):</span>
                        <span className="font-semibold text-xs text-industrial-900 dark:text-white">
                          {currentMaterial.installationLocation || currentMaterial.tagLocation || '— غير محدد بعد (مثال: مكان تثبيت السلينويد) —'}
                        </span>
                      </div>
                      <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">المستودع / المنشأة:</span>
                        <span className="font-bold text-industrial-800 dark:text-industrial-200">{currentMaterial.store}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">الستاند والرف المخزني:</span>
                        <span className="font-mono font-bold text-industrial-800 dark:text-industrial-200">
                          {currentMaterial.rack || '—'} / {currentMaterial.shelf || '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">المقاول أو الجهة المنفذة:</span>
                        <span className="font-semibold text-industrial-800 dark:text-industrial-200">
                          {currentMaterial.contractor || currentMaterial.supplierName || '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">شروط ووجهة التسليم:</span>
                        <span className="font-semibold text-industrial-800 dark:text-industrial-200">
                          {currentMaterial.deliveryTerms || 'DDP ZUBAIR WAREHOUSE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Work Orders & Requisitions */}
                <div className="p-4 rounded-2xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-3.5">
                  <h4 className="font-bold text-xs text-industrial-900 dark:text-white flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    <span>أوامر العمل المرتبطة وحركات الصيانة</span>
                  </h4>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">
                        أمر العمل الأساسي النشط (Primary Work Order):
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm text-amber-900 dark:text-amber-200">
                          {currentMaterial.workOrder || currentMaterial.woNumber || '— لم يتم إسناد أمر عمل —'}
                        </span>
                        {(currentMaterial.workOrder || currentMaterial.woNumber) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                            ACTIVE WO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Additional Work Orders List if any */}
                    {currentMaterial.woNumbers && currentMaterial.woNumbers.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-industrial-400 block font-semibold">
                          أوامر العمل الإضافية المرتبطة بهذا الصنف:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {currentMaterial.woNumbers.map((wo, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-industrial-100 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 font-mono text-xs font-semibold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5"
                            >
                              <Wrench className="h-3 w-3 text-amber-600" />
                              <span>{wo}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">رقم طلب المادة (MR #):</span>
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {currentMaterial.mrNumber || currentMaterial.mrf || 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-industrial-50/60 dark:bg-industrial-900/60 border border-industrial-200/60 dark:border-industrial-700/60">
                        <span className="text-[10px] text-industrial-400 block">أمر الشراء (PO #):</span>
                        <span className="font-mono font-bold text-industrial-800 dark:text-industrial-200">
                          {currentMaterial.poNumber || currentMaterial.purchaseOrder || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Equipment Section */}
              <div className="p-4 rounded-2xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-bold text-xs text-industrial-900 dark:text-white flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-600" />
                    <span>المعدات المرتبطة ميدانياً بهذا التاغ ({equipmentList.length})</span>
                  </h4>
                  <span className="text-[11px] text-industrial-400 font-mono">
                    Tag Match: {currentMaterial.tagNumber || 'N/A'}
                  </span>
                </div>

                {equipmentList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {equipmentList.map((eq) => (
                      <div
                        key={eq.tagNumber}
                        className="p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                              {eq.tagNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              eq.status === 'operational'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {eq.status}
                            </span>
                          </div>
                          <h5 className="font-semibold text-xs text-industrial-900 dark:text-white">
                            {eq.name}
                          </h5>
                          <p className="text-[11px] text-industrial-500">
                            المنشأة: {eq.plant || '—'} • المنطقة: {eq.area || '—'}
                          </p>
                        </div>

                        {onNavigateToEquipment && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToEquipment(eq.tagNumber);
                            }}
                            className="w-full mt-2 py-1.5 px-2 bg-white dark:bg-industrial-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>استعراض بطاقة المعدة</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-industrial-50/50 dark:bg-industrial-900/40 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 space-y-2">
                    <p className="text-xs text-industrial-600 dark:text-industrial-400">
                      {currentMaterial.tagNumber
                        ? `لا توجد معدة مسجلة في النظام تطابق رقم التاغ (${currentMaterial.tagNumber}) حتى الآن.`
                        : 'لم يتم تعيين رقم التاغ لهذه المادة بعد للربط التلقائي مع سجل المعدات.'}
                    </p>
                    {currentUser.role !== UserRole.VIEWER && (
                      <button
                        type="button"
                        onClick={() => setIsEditingEngFields(true)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{currentMaterial.tagNumber ? 'تعديل رقم التاغ' : 'تعيين رقم التاغ الميداني الآن'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Photos & Visual Identifiers */}
          {activeTab === 'photos' && (
            <div className="space-y-5">
              {/* Feedback messages */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 font-bold text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2.5 font-bold text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFileUpload(e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Photos & Identifiers Hub Header / Action Center */}
              <div className="p-4 sm:p-5 rounded-2xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                      <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>مركز رفع وتوثيق صور ومعرفات المادة</span>
                    </h4>
                    <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-0.5">
                      التقط صور لوحة البيانات المعدنية (Nameplate) والباركود والموقع الميداني لتخزينها كمعرفات رقمية موثقة في سجل المادة.
                    </p>
                  </div>

                  {/* Target Category Selector */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[10px] text-industrial-500 font-semibold whitespace-nowrap">نوع المعرف:</span>
                    <select
                      value={selectedPhotoCategory}
                      onChange={(e) => setSelectedPhotoCategory(e.target.value as keyof MaterialPhotoLibrary)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50 dark:bg-industrial-800 text-industrial-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="nameplate">لوحة البيانات المعدنية (Nameplate)</option>
                      <option value="identifiers">معرف باركود / QR</option>
                      <option value="installation">موقع وتركيب ميداني</option>
                      <option value="warehouse">رف وتخزين المستودع</option>
                      <option value="other">صورة عامة للمادة</option>
                    </select>
                  </div>
                </div>

                {/* Main Action Buttons Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-industrial-100 dark:border-industrial-750">
                  {/* Live WebRTC Camera */}
                  <button
                    onClick={() => {
                      if (isCameraActive) {
                        stopCamera();
                      } else {
                        startCamera('environment');
                      }
                    }}
                    disabled={isSavingPhoto}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                      isCameraActive
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    <span>{isCameraActive ? 'إيقاف الكاميرا' : 'التقاط بالكاميرا المباشرة'}</span>
                  </button>

                  {/* Native Smartphone/Tablet Camera */}
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    disabled={isSavingPhoto}
                    className="px-3.5 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-750 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                    title="التقاط بواسطة تطبيق الكاميرا الرسمي للهاتف أو الجهاز اللوحي"
                  >
                    <Scan className="h-4 w-4 text-emerald-600" />
                    <span>كاميرا الهاتف (Native)</span>
                  </button>

                  {/* Upload Image Files */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSavingPhoto}
                    className="px-3.5 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-750 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-brand-600" />
                    <span>رفع ملفات صور</span>
                  </button>

                  {/* Add URL */}
                  <button
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    disabled={isSavingPhoto}
                    className="px-3.5 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-750 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <LinkIcon className="h-4 w-4 text-indigo-500" />
                    <span>إضافة رابط صورة</span>
                  </button>

                  {isSavingPhoto && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5 ml-auto animate-pulse">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>جاري حفظ وتوثيق الصورة في سجل المادة...</span>
                    </span>
                  )}
                </div>

                {/* Inline URL Input Form */}
                <AnimatePresence>
                  {showUrlInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-xl border border-industrial-200 dark:border-industrial-700 space-y-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="أدخل رابط الصورة المباشر (https://...)"
                          value={customPhotoUrl}
                          onChange={(e) => setCustomPhotoUrl(e.target.value)}
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-industrial-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleAddUrlPhoto}
                          disabled={!customPhotoUrl.trim() || isSavingPhoto}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          تأكيد وحفظ
                        </button>
                        <button
                          onClick={() => setShowUrlInput(false)}
                          className="p-2 text-industrial-400 hover:text-industrial-600 rounded-lg cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live Camera Viewfinder (when active) */}
                <AnimatePresence>
                  {isCameraActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="relative rounded-2xl overflow-hidden border-2 border-blue-500/50 bg-black aspect-video sm:aspect-2/1 flex items-center justify-center shadow-lg"
                    >
                      {/* Video Stream Element */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Viewfinder Reticle Corners Overlay */}
                      <div className="absolute inset-4 sm:inset-8 pointer-events-none flex flex-col justify-between">
                        <div className="flex justify-between">
                          <div className="w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg" />
                          <div className="w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg" />
                        </div>
                        <div className="text-center">
                          <span className="px-3 py-1 rounded-full bg-black/60 text-white font-mono text-[11px] backdrop-blur-xs border border-white/20">
                            وجه الكاميرا نحو {categoryLabels[selectedPhotoCategory]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg" />
                          <div className="w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg" />
                        </div>
                      </div>

                      {/* Loading or Error inside camera */}
                      {isCameraLoading && (
                        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                          <span className="text-xs font-bold">جاري تشغيل الكاميرا المباشرة...</span>
                        </div>
                      )}

                      {cameraError && (
                        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-rose-300 p-6 text-center gap-2">
                          <AlertTriangle className="h-8 w-8 text-rose-500" />
                          <span className="text-xs font-bold text-white">{cameraError}</span>
                          <button
                            onClick={() => startCamera(cameraFacingMode)}
                            className="mt-2 px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      )}

                      {/* Floating Camera Controls */}
                      {!isCameraLoading && !cameraError && (
                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                          <button
                            onClick={switchCamera}
                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20 transition-transform active:scale-95 cursor-pointer"
                            title="تبديل الكاميرا (أمامية / خلفية)"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>

                          <button
                            onClick={capturePhotoFromCamera}
                            className="px-5 py-2.5 rounded-full bg-white hover:bg-white/90 text-industrial-950 font-bold text-xs flex items-center gap-2 shadow-xl transition-transform active:scale-95 cursor-pointer ring-4 ring-white/30"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-pulse" />
                            <span>التقاط وتخزين كمعرف</span>
                          </button>

                          <button
                            onClick={stopCamera}
                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs border border-white/20 transition-transform active:scale-95 cursor-pointer"
                            title="إلغاء وإغلاق الكاميرا"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Drag-and-drop dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-industrial-200 dark:border-industrial-700/80 hover:border-industrial-300 dark:hover:border-industrial-600'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-[11px] text-industrial-500 dark:text-industrial-400">
                    اسحب وأفلت ملفات الصور هنا مباشرة، أو <span className="text-blue-600 dark:text-blue-400 font-bold underline">استعرض من جهازك</span> (يدعم عدة صور في آن واحد)
                  </p>
                </div>
              </div>

              {/* Categories Breakdown and Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `الكل (${allPhotos.length})` },
                    { id: 'nameplate', label: `لوحة البيانات (${currentMaterial.photos?.nameplate?.length || 0})` },
                    { id: 'identifiers', label: `باركود / QR (${currentMaterial.photos?.identifiers?.length || 0})` },
                    { id: 'installation', label: `الموقع والتركيب (${currentMaterial.photos?.installation?.length || 0})` },
                    { id: 'warehouse', label: `الرف والمستودع (${currentMaterial.photos?.warehouse?.length || 0})` },
                    { id: 'other', label: `عام (${currentMaterial.photos?.other?.length || 0})` }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setPhotoFilterCategory(filter.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        photoFilterCategory === filter.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-mono text-industrial-400">
                  إجمالي الصور المعرفة: {allPhotos.length}
                </span>
              </div>

              {/* Photos Gallery Grid */}
              {filteredPhotos.length === 0 ? (
                <div className="p-10 text-center bg-industrial-50/50 dark:bg-industrial-850/50 rounded-2xl border border-dashed border-industrial-200 dark:border-industrial-700 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-industrial-100 dark:bg-industrial-800 flex items-center justify-center mx-auto text-industrial-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-industrial-800 dark:text-industrial-200">
                      {photoFilterCategory === 'all'
                        ? 'لا توجد صور أو معرفات بصرية مسجلة لهذه المادة بعد'
                        : `لا توجد صور مسجلة تحت تصنيف (${photoFilterCategory})`}
                    </h5>
                    <p className="text-xs text-industrial-500 dark:text-industrial-400 max-w-md mx-auto">
                      يمكنك التقاط صورة واضحة للوحة المادة المعدنية بواسطة الكاميرا المباشرة أو رفع صور من الجهاز لربطها وتخزينها كمعرف دائم.
                    </p>
                  </div>
                  <button
                    onClick={() => startCamera('environment')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    <span>تشغيل الكاميرا والتقاط أول صورة</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPhotos.map((photo, idx) => (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group rounded-2xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-4/3 bg-industrial-100 dark:bg-industrial-900 overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.categoryLabel}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                            {photo.categoryLabel}
                          </span>

                          {photo.isPrimary && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-industrial-950 flex items-center gap-1 shadow-xs">
                              <Star className="h-3 w-3 fill-current" />
                              <span>معرف رئيسي</span>
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setLightboxPhoto({
                                url: photo.url,
                                category: photo.category,
                                label: photo.categoryLabel,
                                isPrimary: photo.isPrimary
                              });
                            }}
                            className="p-2 rounded-xl bg-white/90 hover:bg-white text-industrial-900 shadow-md cursor-pointer transition-transform active:scale-95"
                            title="تكبير ومعاينة فائقة الدقة"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadPhoto(photo.url, `material-${currentMaterial.partNumber}-${photo.category}.jpg`)}
                            className="p-2 rounded-xl bg-white/90 hover:bg-white text-industrial-900 shadow-md cursor-pointer transition-transform active:scale-95"
                            title="تنزيل الصورة"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {currentUser.role !== UserRole.VIEWER && (
                            <button
                              onClick={() => handleDeletePhoto(photo.url, photo.category)}
                              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer transition-transform active:scale-95"
                              title="حذف الصورة من سجل المادة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Info & Footer */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-industrial-800 dark:text-industrial-200 block truncate">
                            {photo.categoryLabel}
                          </span>
                          <span className="text-[10px] text-industrial-400 font-mono block">
                            Part: {currentMaterial.partNumber}
                          </span>
                        </div>

                        {/* Set Primary Button */}
                        <div className="pt-2 border-t border-industrial-100 dark:border-industrial-750 flex items-center justify-between gap-2">
                          {!photo.isPrimary ? (
                            <button
                              onClick={() => handleSetPrimaryIdentifier(photo.url)}
                              disabled={currentUser.role === UserRole.VIEWER || isSavingPhoto}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="h-3 w-3" />
                              <span>تعيين كمعرف رئيسي</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              <span>المعرف الرئيسي المعتمد</span>
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setLightboxPhoto({
                                url: photo.url,
                                category: photo.category,
                                label: photo.categoryLabel,
                                isPrimary: photo.isPrimary
                              });
                            }}
                            className="text-[10px] text-industrial-500 hover:text-industrial-800 dark:hover:text-industrial-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Maximize2 className="h-3 w-3" />
                            <span>معاينة</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Fullscreen Lightbox Modal */}
              <AnimatePresence>
                {lightboxPhoto && (
                  <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-4">
                    {/* Lightbox Toolbar */}
                    <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{lightboxPhoto.label}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10">
                          {currentMaterial.partNumber}
                        </span>
                        {lightboxPhoto.isPrimary && (
                          <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span>المعرف الرئيسي</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="تدوير 90 درجة (مفيد لقراءة لوحات البيانات المعدنية)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>تدوير ({lightboxRotation}°)</span>
                        </button>

                        <button
                          onClick={() => setLightboxZoom((z) => Math.min(z + 0.25, 3))}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                          title="تكبير"
                        >
                          +
                        </button>

                        <button
                          onClick={() => setLightboxZoom((z) => Math.max(z - 0.25, 0.5))}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                          title="تصغير"
                        >
                          -
                        </button>

                        <button
                          onClick={() => {
                            setLightboxZoom(1);
                            setLightboxRotation(0);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                        >
                          إعادة ضبط
                        </button>

                        <button
                          onClick={() => handleDownloadPhoto(lightboxPhoto.url, `material-${currentMaterial.partNumber}-${lightboxPhoto.category}.jpg`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تنزيل</span>
                        </button>

                        <button
                          onClick={() => setLightboxPhoto(null)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer ml-2"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Stage */}
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                      <img
                        src={lightboxPhoto.url}
                        alt={lightboxPhoto.label}
                        style={{
                          transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                      />
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tab 2: Procurement Info */}
          {activeTab === 'procurement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">رقم طلب المادة (MR Number):</span>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-sm">
                    {material.mrNumber || material.mrf || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">رقم طلب صرف وتوريد المواد (MRF #):</span>
                  <span className="font-mono font-bold text-industrial-900 dark:text-white text-sm">
                    {currentMaterial.mrfReference || currentMaterial.mrfNumber || currentMaterial.mrf || currentMaterial.mrReference || material.mrfNumber || material.mrf || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">أمر الشراء (PO Number):</span>
                  <span className="font-mono font-bold text-industrial-900 dark:text-white text-sm">
                    {material.poNumber || material.purchaseOrder || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">المورد / Supplier:</span>
                  <span className="font-bold text-industrial-900 dark:text-white">
                    {material.supplierName || material.supplier || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">رقم إشعار التسليم (Delivery Note):</span>
                  <span className="font-mono font-bold text-industrial-900 dark:text-white">
                    {material.deliveryNote || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">تاريخ التوريد / الاستلام:</span>
                  <span className="font-mono text-industrial-900 dark:text-white">
                    {material.deliveryDate || material.purchaseDate || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Work orders */}
              <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-2">
                <h4 className="font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  <span>أوامر العمل المرتبطة (Work Orders):</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(currentMaterial.workOrder || currentMaterial.woNumber || material.workOrder || material.woNumber) && (
                    <span className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-mono font-bold">
                      {currentMaterial.workOrder || currentMaterial.woNumber || material.workOrder || material.woNumber}
                    </span>
                  )}
                  {currentMaterial.woNumbers && currentMaterial.woNumbers.map(wo => (
                    wo !== (currentMaterial.workOrder || currentMaterial.woNumber) && (
                      <span key={wo} className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-mono font-bold">
                        {wo}
                      </span>
                    )
                  ))}
                  {!(currentMaterial.workOrder || currentMaterial.woNumber || material.workOrder || material.woNumber) && (!currentMaterial.woNumbers || currentMaterial.woNumbers.length === 0) && (
                    <span className="text-industrial-400 italic">لا توجد أوامر عمل مرتبطة حالياً</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Technical Specs */}
          {activeTab === 'technical' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { label: 'النوع الفني / Type', val: material.materialType },
                  { label: 'ضغط الدخول / Inlet Press.', val: material.inletPressure },
                  { label: 'ضغط الخروج / Outlet Press.', val: material.outletPressure },
                  { label: 'مقاس التوصيل / Connection', val: material.connectionSize },
                  { label: 'نوع التوصيل / Type', val: material.connectionType },
                  { label: 'مادة الصنع / Body Material', val: material.bodyMaterial || material.materialOfConstruction },
                  { label: 'نطاق الحرارة / Temp Range', val: material.temperatureRange || material.temperatureLimits },
                  { label: 'الجهد الكهربائي / Voltage', val: material.voltage || material.electricalRating },
                  { label: 'بروتوكول الإشارة / Signal', val: material.signalProtocol || material.outputProtocol },
                  { label: 'تصنيف الانفجار / Ex Rating', val: material.exClassification || material.hazardousClassification },
                  { label: 'نطاق القياس / Range', val: material.measuringRange },
                  { label: 'درجة الحماية / IP Rating', val: material.ipRating }
                ].map((spec, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                    <span className="text-industrial-400 text-[10px] block">{spec.label}</span>
                    <span className="font-mono font-semibold text-industrial-900 dark:text-white block truncate">
                      {spec.val || '—'}
                    </span>
                  </div>
                ))}
              </div>

              {material.engineeringNotes && (
                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-brand-50/30 dark:bg-brand-950/20 space-y-1">
                  <h4 className="font-bold text-brand-800 dark:text-brand-300">ملاحظات هندسية متخصصة / Engineering Notes:</h4>
                  <p className="text-industrial-700 dark:text-industrial-300 whitespace-pre-wrap">{material.engineeringNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Inspection */}
          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">حالة الفحص والاستلام:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {material.inspectionStatus || 'PASSED'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">تاريخ الفحص الهندسي:</span>
                  <span className="font-mono font-bold text-industrial-900 dark:text-white">
                    {material.inspectionDate || material.updatedAt?.slice(0, 10) || 'N/A'}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850">
                  <span className="text-industrial-400 text-[10px] block">اسم المهندس الفاحص:</span>
                  <span className="font-bold text-industrial-900 dark:text-white">
                    {material.inspector || 'Inspection QA Engineer'}
                  </span>
                </div>
              </div>

              {material.remarks && (
                <div className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-1">
                  <h4 className="font-bold text-industrial-800 dark:text-industrial-200">تقرير ملاحظات الفحص الفني (Inspection Remarks):</h4>
                  <p className="text-industrial-600 dark:text-industrial-300">{material.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: 'Technical Datasheet', icon: FileText, field: material.datasheet, doc: material.documents?.datasheet },
                  { name: 'Certificate of Conformity (CoC)', icon: Award, field: material.coc, doc: material.documents?.coc },
                  { name: 'Calibration Certificate', icon: FileCheck, field: material.calibrationCertificate, doc: material.documents?.calibrationCertificate },
                  { name: 'User Manual & Operation Guide', icon: FileText, field: material.manuals, doc: material.documents?.operationManual },
                  { name: 'Material Request (MR)', icon: FileText, field: material.mrNumber, doc: material.documents?.materialRequest },
                  { name: 'Inspection Report', icon: ShieldCheck, field: material.inspectionStatus, doc: material.documents?.inspectionReport }
                ].map((docItem, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300">
                        <docItem.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-industrial-800 dark:text-industrial-200 truncate text-[11px]">{docItem.name}</h5>
                        <span className="text-[9px] text-industrial-400 font-mono">
                          {docItem.doc?.fileName || (docItem.field ? 'Registered' : 'Available on Cloud')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => alert(`Opening document: ${docItem.name}`)}
                      className="px-2.5 py-1 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-700 text-industrial-800 dark:text-industrial-200 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Eye className="h-3 w-3" />
                      <span>عرض</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Associated Equipment */}
          {activeTab === 'equipment' && (
            <div className="space-y-3">
              {equipmentList.length === 0 ? (
                <div className="p-8 text-center bg-industrial-50 dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400">
                  لا توجد معدات مرتبطة بهذه القطعة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {equipmentList.map(eq => (
                    <div
                      key={eq.tagNumber}
                      className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs bg-industrial-100 dark:bg-industrial-700 px-2 py-0.5 rounded text-industrial-800 dark:text-industrial-200">
                          {eq.tagNumber}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                          {eq.status}
                        </span>
                      </div>

                      <h5 className="font-bold text-industrial-900 dark:text-white text-xs">{eq.name}</h5>
                      <p className="text-[11px] text-industrial-500 truncate">{eq.plant} • {eq.area}</p>

                      {onNavigateToEquipment && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToEquipment(eq.tagNumber);
                          }}
                          className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <span>عرض بيانات المعدة في السجل</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 7: Decisions */}
          {activeTab === 'decisions' && (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <div className="p-8 text-center bg-industrial-50 dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400">
                  لا توجد قرارات هندسية أو اعتمادات بدائل مسجلة لهذه القطعة
                </div>
              ) : (
                decisions.map(d => (
                  <div key={d.id} className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-brand-600 dark:text-brand-400">{d.title}</span>
                      <span className="text-[10px] font-mono text-industrial-400">{new Date(d.approvalDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-industrial-700 dark:text-industrial-300">{d.details}</p>
                    <div className="text-[10px] text-industrial-500 font-mono">
                      معتمد بواسطة: <strong>{d.approvedBy}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 8: History */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {(!currentMaterial.history || currentMaterial.history.length === 0) ? (
                <div className="p-8 text-center bg-industrial-50 dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400">
                  لا توجد حركات تدقيق سابقة
                </div>
              ) : (
                currentMaterial.history.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-3 rounded-xl border border-industrial-200 dark:border-industrial-700/80 bg-industrial-50/40 dark:bg-industrial-850/40 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-industrial-800 dark:text-industrial-200 block text-xs">{ev.action}</span>
                      <p className="text-industrial-600 dark:text-industrial-400 text-[11px]">{ev.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-industrial-400 block">{new Date(ev.timestamp).toLocaleString()}</span>
                      <span className="text-[10px] font-medium text-industrial-600 dark:text-industrial-300">{ev.userName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850/50 flex items-center justify-between">
          <div className="text-[11px] text-industrial-500 font-mono">
            Part UID: <strong className="text-industrial-700 dark:text-industrial-300">{currentMaterial.partNumber || currentMaterial.model || 'N/A'}</strong> • Seq #{currentMaterial.sequence || 1}
          </div>

          <div className="flex items-center gap-2">
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR) && onEditMaterial && (
              <button
                onClick={() => {
                  onClose();
                  onEditMaterial(currentMaterial);
                }}
                className="px-4 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                تعديل البيانات
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
