/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Layers,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  Minus,
  Building2,
  Warehouse,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  Maximize2,
  Camera,
  MapPin,
  Tag
} from 'lucide-react';
import { Material, User, MaterialDocument, MaterialPhotoLibrary } from '../types';
import { dbService } from '../services/dbService';

interface MaterialQuickEditModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onMaterialUpdated?: (updated: Material) => void;
  initialTab?: 'core' | 'docs' | 'photos' | 'specs';
}

export default function MaterialQuickEditModal({
  material,
  isOpen,
  onClose,
  currentUser,
  onMaterialUpdated,
  initialTab = 'core'
}: MaterialQuickEditModalProps) {
  const [activeTab, setActiveTab] = useState<'core' | 'docs' | 'photos' | 'specs'>(initialTab);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [arabicDescription, setArabicDescription] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('pcs');
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [store, setStore] = useState('');
  const [station, setStation] = useState('');
  const [availableStations, setAvailableStations] = useState<string[]>(() => dbService.getAvailableStations());
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [notes, setNotes] = useState('');
  const [engineeringNotes, setEngineeringNotes] = useState('');

  // Engineering & Field Installation Location
  const [tagNumber, setTagNumber] = useState('');
  const [installationLocation, setInstallationLocation] = useState('');
  const [workOrder, setWorkOrder] = useState('');
  const [mrfReference, setMrfReference] = useState('');

  // OEM & Verification
  const [oemVerified, setOemVerified] = useState(false);
  const [oemVerificationStatus, setOemVerificationStatus] = useState<'verified' | 'authorized' | 'alternative' | 'pending'>('pending');
  const [oemCertificateId, setOemCertificateId] = useState('');

  // Documents & Certificates
  const [datasheetUrl, setDatasheetUrl] = useState('');
  const [cocUrl, setCocUrl] = useState('');
  const [calibrationCertUrl, setCalibrationCertUrl] = useState('');
  const [manualsUrl, setManualsUrl] = useState('');
  const [documentsMap, setDocumentsMap] = useState<Record<string, MaterialDocument>>({});
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocUrl, setCustomDocUrl] = useState('');

  // Photos
  const [photos, setPhotos] = useState<MaterialPhotoLibrary>({
    nameplate: [],
    installation: [],
    warehouse: [],
    other: []
  });
  const [activePhotoCategory, setActivePhotoCategory] = useState<'nameplate' | 'installation' | 'warehouse' | 'other'>('nameplate');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [previewingPhoto, setPreviewingPhoto] = useState<string | null>(null);

  // Specs
  const [pressureRating, setPressureRating] = useState('');
  const [connectionSize, setConnectionSize] = useState('');
  const [electricalRating, setElectricalRating] = useState('');
  const [outputProtocol, setOutputProtocol] = useState('');
  const [ipRating, setIpRating] = useState('');

  // Sync state whenever material changes or modal opens
  useEffect(() => {
    if (material) {
      setPartNumber(material.partNumber || '');
      setDescription(material.description || '');
      setArabicDescription(material.arabicDescription || '');
      setManufacturer(material.manufacturer || '');
      setModel(material.model || '');
      setBrand(material.brand || '');
      setSerialNumber(material.serialNumber || '');
      setQuantity(material.quantity ?? 0);
      setUnit(material.unit || 'pcs');
      setMinStockLevel(material.minStockLevel ?? 5);
      setStore(material.store || '');
      setStation(material.station || '');
      setRack(material.rack || '');
      setShelf(material.shelf || '');
      setNotes(material.notes || '');
      setEngineeringNotes(material.engineeringNotes || '');
      setTagNumber(material.tagNumber || '');
      setInstallationLocation(material.installationLocation || material.tagLocation || '');
      setWorkOrder(material.workOrder || material.woNumber || '');
      setMrfReference(material.mrfReference || material.mrfNumber || material.mrf || material.mrReference || '');

      setOemVerified(!!material.oemVerified);
      setOemVerificationStatus(material.oemVerificationStatus || 'pending');
      setOemCertificateId(material.oemCertificateId || '');

      setDatasheetUrl(material.datasheet || material.documents?.datasheet?.fileName || '');
      setCocUrl(material.coc || material.documents?.coc?.fileName || '');
      setCalibrationCertUrl(material.calibrationCertificate || material.documents?.calibrationCertificate?.fileName || '');
      setManualsUrl(material.manuals || material.documents?.operationManual?.fileName || '');
      setDocumentsMap(material.documents || {});

      setPhotos({
        nameplate: material.photos?.nameplate ? [...material.photos.nameplate] : [],
        installation: material.photos?.installation ? [...material.photos.installation] : [],
        warehouse: material.photos?.warehouse ? [...material.photos.warehouse] : [],
        other: material.photos?.other ? [...material.photos.other] : []
      });

      setPressureRating(material.pressureRating || '');
      setConnectionSize(material.connectionSize || '');
      setElectricalRating(material.electricalRating || '');
      setOutputProtocol(material.outputProtocol || '');
      setIpRating(material.ipRating || '');

      setSaveSuccess(false);
      setErrorMessage(null);
    }
  }, [material, isOpen]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen || !material) return null;

  // Handlers for adjusting quantity
  const handleAdjustQty = (delta: number) => {
    setQuantity(prev => Math.max(0, prev + delta));
  };

  // Upload document file handler
  const handleDocumentFileUpload = (
    docKey: 'datasheet' | 'coc' | 'calibrationCertificate' | 'operationManual' | 'inspectionReport',
    docTitle: string,
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newDoc: MaterialDocument = {
        name: docTitle,
        fileName: file.name,
        uploadedBy: currentUser.name,
        uploadedAt: new Date().toISOString(),
        fileSize: `${Math.round(file.size / 1024)} KB`,
        googleDriveWebViewLink: dataUrl,
        status: 'AVAILABLE'
      };

      setDocumentsMap(prev => ({
        ...prev,
        [docKey]: newDoc
      }));

      // Also set top-level convenience fields
      if (docKey === 'datasheet') setDatasheetUrl(dataUrl);
      if (docKey === 'coc') setCocUrl(dataUrl);
      if (docKey === 'calibrationCertificate') setCalibrationCertUrl(dataUrl);
      if (docKey === 'operationManual') setManualsUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomDocument = (title: string, fileOrUrl: File | string) => {
    if (!title.trim()) return;
    const docKey = `doc_${Date.now()}`;
    if (typeof fileOrUrl === 'string') {
      if (!fileOrUrl.trim()) return;
      const newDoc: MaterialDocument = {
        name: title.trim(),
        fileName: title.trim(),
        uploadedBy: currentUser.name,
        uploadedAt: new Date().toISOString(),
        googleDriveWebViewLink: fileOrUrl.trim(),
        status: 'AVAILABLE'
      };
      setDocumentsMap(prev => ({ ...prev, [docKey]: newDoc }));
      setCustomDocTitle('');
      setCustomDocUrl('');
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newDoc: MaterialDocument = {
          name: title.trim(),
          fileName: fileOrUrl.name,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          fileSize: `${Math.round(fileOrUrl.size / 1024)} KB`,
          googleDriveWebViewLink: dataUrl,
          status: 'AVAILABLE'
        };
        setDocumentsMap(prev => ({ ...prev, [docKey]: newDoc }));
        setCustomDocTitle('');
      };
      reader.readAsDataURL(fileOrUrl);
    }
  };

  const handleDeleteCustomDoc = (key: string) => {
    setDocumentsMap(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Upload photo file handler
  const handlePhotoFileUpload = (category: 'nameplate' | 'installation' | 'warehouse' | 'other', file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotos(prev => ({
        ...prev,
        [category]: [dataUrl, ...(prev[category] || [])]
      }));
    };
    reader.readAsDataURL(file);
  };

  // Add photo via URL
  const handleAddPhotoUrl = () => {
    if (!newPhotoUrl.trim()) return;
    setPhotos(prev => ({
      ...prev,
      [activePhotoCategory]: [newPhotoUrl.trim(), ...(prev[activePhotoCategory] || [])]
    }));
    setNewPhotoUrl('');
  };

  // Delete photo
  const handleDeletePhoto = (category: 'nameplate' | 'installation' | 'warehouse' | 'other', index: number) => {
    setPhotos(prev => ({
      ...prev,
      [category]: prev[category].filter((_, idx) => idx !== index)
    }));
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!material) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const updatedMaterial: Material = {
        ...material,
        description: description.trim(),
        arabicDescription: arabicDescription.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        brand: brand.trim(),
        serialNumber: serialNumber.trim(),
        tagNumber: tagNumber.trim() || undefined,
        installationLocation: installationLocation.trim() || undefined,
        tagLocation: installationLocation.trim() || undefined,
        workOrder: workOrder.trim() || undefined,
        woNumber: workOrder.trim() || undefined,
        mrfReference: mrfReference.trim() || undefined,
        mrfNumber: mrfReference.trim() || undefined,
        mrf: mrfReference.trim() || undefined,
        mrReference: mrfReference.trim() || undefined,
        quantity: Math.max(0, quantity),
        unit: unit.trim(),
        minStockLevel: Math.max(0, minStockLevel),
        store: store.trim(),
        station: station.trim() || undefined,
        rack: rack.trim(),
        shelf: shelf.trim(),
        notes: notes.trim(),
        engineeringNotes: engineeringNotes.trim(),
        pressureRating: pressureRating.trim(),
        connectionSize: connectionSize.trim(),
        electricalRating: electricalRating.trim(),
        outputProtocol: outputProtocol.trim(),
        ipRating: ipRating.trim(),

        oemVerified,
        oemVerificationStatus,
        oemCertificateId: oemCertificateId.trim(),

        datasheet: datasheetUrl.trim() || undefined,
        coc: cocUrl.trim() || undefined,
        calibrationCertificate: calibrationCertUrl.trim() || undefined,
        manuals: manualsUrl.trim() || undefined,
        documents: documentsMap,
        photos: photos,
        updatedAt: new Date().toISOString()
      };

      const result = dbService.updateMaterial(updatedMaterial, currentUser);
      if (!result.success) {
        setErrorMessage(result.error || 'فشل حفظ التعديلات في قاعدة البيانات');
        setSaving(false);
        return;
      }

      if (station && station.trim()) {
        dbService.saveCustomStation(station.trim());
      }

      // Add a notification about this update
      try {
        dbService.addNotification({
          type: 'SUCCESS',
          category: 'MATERIAL_UPDATED',
          priority: 'NORMAL',
          title: `تم تحديث بيانات المادة: ${updatedMaterial.partNumber}`,
          message: `تم تعديل الكمية (${updatedMaterial.quantity} ${updatedMaterial.unit}) والوصف والمرفقات للمادة "${updatedMaterial.partNumber}" بواسطة ${currentUser.name}.`,
          materialId: updatedMaterial.partNumber,
          linkType: 'material',
          linkId: updatedMaterial.partNumber,
          site: updatedMaterial.store || currentUser.site || 'NDGS',
          userId: currentUser.id
        });
      } catch (err) {
        console.warn('Notification error:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:materials-updated'));
        window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
      }

      if (onMaterialUpdated) {
        onMaterialUpdated(updatedMaterial);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  const totalPhotosCount = (photos.nameplate?.length || 0) + 
    (photos.installation?.length || 0) + 
    (photos.warehouse?.length || 0) + 
    (photos.other?.length || 0);

  const totalDocsCount = (datasheetUrl ? 1 : 0) + 
    (cocUrl ? 1 : 0) + 
    (calibrationCertUrl ? 1 : 0) + 
    (manualsUrl ? 1 : 0) + 
    Object.keys(documentsMap || {}).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-industrial-850 dark:text-industrial-100"
        id="material-quick-edit-modal"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-industrial-200 dark:border-industrial-800 flex flex-wrap items-center justify-between gap-3 bg-industrial-50/80 dark:bg-industrial-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono tracking-tight text-industrial-900 dark:text-white">
                  {material.partNumber}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50">
                  {quantity} {unit}
                </span>
                {material.store && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400">
                    {material.store}
                  </span>
                )}
              </div>
              <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5 line-clamp-1">
                تعديل فوري للكمية والوصف وشهادات ومستندات وصور المادة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-industrial-400 hover:text-industrial-700 dark:hover:text-industrial-200 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-industrial-200 dark:border-industrial-800 px-4 sm:px-6 bg-white dark:bg-industrial-900 overflow-x-auto gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('core')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'core'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-industrial-500 hover:text-industrial-800 dark:hover:text-industrial-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الكمية والوصف الأساسي</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'docs'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-industrial-500 hover:text-industrial-800 dark:hover:text-industrial-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>المستندات والشهادات</span>
            {totalDocsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {totalDocsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'photos'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-industrial-500 hover:text-industrial-800 dark:hover:text-industrial-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>صور المادة واللوحة المعدنية</span>
            {totalPhotosCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {totalPhotosCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'specs'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-industrial-500 hover:text-industrial-800 dark:hover:text-industrial-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>المواصفات الفنية والموقع</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تم حفظ التعديلات والمرفقات بنجاح! جاري التحديث...</span>
            </div>
          )}

          {/* TAB 1: QUANTITY & DESCRIPTION */}
          {activeTab === 'core' && (
            <div className="space-y-6">
              {/* Quantity Stepper & Stock Adjuster Card */}
              <div className="bg-industrial-50/70 dark:bg-industrial-950/40 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                      <Warehouse className="w-4 h-4 text-brand-600" />
                      <span>الرصيد والكمية المخزنية المتوفرة / Available Stock Quantity</span>
                    </label>
                    <p className="text-[11px] text-industrial-500 mt-0.5">
                      تعديل الكمية الحالية في المستودع مع إمكانية استخدام أزرار الزيادة والنقصان السريعة
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-industrial-500 font-mono">الحد الأدنى للأمان:</span>
                    <input
                      type="number"
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded text-xs font-mono text-center"
                      title="Min stock alert level"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Quantity Input */}
                  <div className="flex items-center border border-industrial-300 dark:border-industrial-700 rounded-xl bg-white dark:bg-industrial-900 overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleAdjustQty(-1)}
                      className="p-2.5 hover:bg-industrial-100 dark:hover:bg-industrial-800 text-industrial-600 dark:text-industrial-300 transition-colors"
                      title="Decrease by 1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 text-center text-base font-bold font-mono py-1.5 bg-transparent border-none focus:outline-hidden text-industrial-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdjustQty(1)}
                      className="p-2.5 hover:bg-industrial-100 dark:hover:bg-industrial-800 text-industrial-600 dark:text-industrial-300 transition-colors"
                      title="Increase by 1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Unit Selector */}
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs font-semibold focus:outline-hidden"
                  >
                    <option value="pcs">pcs (قطع)</option>
                    <option value="set">set (طقم / مجموعة)</option>
                    <option value="meter">meter (متر)</option>
                    <option value="roll">roll (لفة)</option>
                    <option value="box">box (صندوق)</option>
                    <option value="kg">kg (كيلوغرام)</option>
                    <option value="drum">drum (برميل)</option>
                    <option value="pair">pair (زوج)</option>
                  </select>

                  {/* Quick Delta Buttons */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[-10, -5, +5, +10].map(delta => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => handleAdjustQty(delta)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                          delta > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description & Core Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الوصف الفني بالإنجليزية / Technical Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Pressure Transmitter, 4-20mA HART, 0-100 bar, SS316L, 1/2 NPT"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الوصف الفني باللغة العربية / Arabic Technical Description
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={arabicDescription}
                    onChange={(e) => setArabicDescription(e.target.value)}
                    placeholder="مثال: مرسل ضغط تفاضلي مع بروتوكول هارت، ستانلس ستيل"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الشركة الصانعة / Manufacturer (OEM)
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Emerson, Yokogawa, Siemens, Fisher"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الموديل / Model & Type
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. 3051CD2A22A1AB4, EJX110A"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الماركة / Brand Alias
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Rosemount, Foxboro"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الرقم التسلسلي / Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-89234710"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                {/* Engineering Tag & Field Installation Location Card (WO & MRF) */}
                <div className="md:col-span-2 bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span>التاغ الهندسي وموقع التثبيت الميداني وأوامر العمل / Engineering Tag & Field Location</span>
                    </label>
                    <span className="text-[10px] text-purple-700 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-medium">
                      لتحديد مكان تثبيت الصنف الفعلي كالسيلينويد وأرقام WO و MRF
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                        Tag Number (رقم بطاقة المعدة / التاغ الهندسي):
                      </label>
                      <input
                        type="text"
                        value={tagNumber}
                        onChange={(e) => setTagNumber(e.target.value)}
                        placeholder="e.g. 2021-1-5553-XYS-237 أو SOV-4011-A"
                        className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-mono uppercase focus:ring-1.5 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                        موقع التثبيت والتركيب الميداني الفعلي (Installation Location):
                      </label>
                      <input
                        type="text"
                        value={installationLocation}
                        onChange={(e) => setInstallationLocation(e.target.value)}
                        placeholder="e.g. Turbine Skid-A, Solenoid Manifold #3 (مكان تثبيت السيلينويد)"
                        className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 rounded-xl text-xs focus:ring-1.5 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                        Work Order (رقم أمر العمل WO #):
                      </label>
                      <input
                        type="text"
                        value={workOrder}
                        onChange={(e) => setWorkOrder(e.target.value)}
                        placeholder="e.g. WO-2024-8841"
                        className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-mono uppercase focus:ring-1.5 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-700 dark:text-industrial-300 mb-1">
                        MRF Number (رقم طلب صرف وتوريد المواد MRF #):
                      </label>
                      <input
                        type="text"
                        value={mrfReference}
                        onChange={(e) => setMrfReference(e.target.value)}
                        placeholder="e.g. MRF-2024-001 أو 0226-14344-00-00-1"
                        className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-mono uppercase focus:ring-1.5 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Storage Location & Station Card */}
                <div className="md:col-span-2 bg-industrial-50/70 dark:bg-industrial-950/40 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>المحطة والموقع التخزيني / Station & Storage Location</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      يقبل كتابة أي اسم مخصص بحرية تامة دون تقييد
                    </span>
                  </div>

                  {/* Station Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400">
                      اسم المحطة / الموقع (Station):
                    </label>
                    <input
                      type="text"
                      list="edit-material-stations"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="اكتب اسم المحطة بحرية (مثال: محطة السامسونك، مستودع المجمع، المحطة أ...)"
                      className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs font-semibold focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                    <datalist id="edit-material-stations">
                      {availableStations.map((st, i) => (
                        <option key={i} value={st} />
                      ))}
                    </datalist>

                    {/* Quick Station Suggestion Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-industrial-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        مقترحات سريعة:
                      </span>
                      {availableStations.slice(0, 5).map((st, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setStation(st)}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium transition-colors cursor-pointer border ${
                            station === st
                              ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                              : 'bg-white dark:bg-industrial-900 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700 hover:bg-industrial-100 dark:hover:bg-industrial-800'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Store, Rack, Shelf row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-industrial-200 dark:border-industrial-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                        المستودع / Store Room:
                      </label>
                      <input
                        type="text"
                        value={store}
                        onChange={(e) => setStore(e.target.value)}
                        placeholder="e.g. Automation Depot"
                        className="w-full px-3 py-1.5 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                        الرف / Rack:
                      </label>
                      <input
                        type="text"
                        value={rack}
                        onChange={(e) => setRack(e.target.value)}
                        placeholder="e.g. R-12"
                        className="w-full px-3 py-1.5 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                        الخانة / Shelf:
                      </label>
                      <input
                        type="text"
                        value={shelf}
                        onChange={(e) => setShelf(e.target.value)}
                        placeholder="e.g. Shelf-B3"
                        className="w-full px-3 py-1.5 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    ملاحظات هندسية وفنية / Engineering Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={engineeringNotes}
                    onChange={(e) => setEngineeringNotes(e.target.value)}
                    placeholder="ملاحظات التركيب، التوافق، المعايرة، أو اشتراطات خاصة..."
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS & CERTIFICATES */}
          {activeTab === 'docs' && (
            <div className="space-y-5">
              <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/50 dark:border-brand-800/40 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                <div className="text-xs text-brand-900 dark:text-brand-200 leading-relaxed">
                  <span className="font-bold">إرفاق الشهادات والمستندات الفنية:</span> يمكنك تحميل المستندات مباشرة (ملفات PDF أو صور الشهادات) من جهازك، أو وضع رابط المستند المعتمد في السحابة. تضمن هذه الوثائق مطابقة المادة لمواصفات الـ ISO 9001.
                </div>
              </div>

              {/* Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. OEM Datasheet */}
                <div className="p-4 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold">ورقة البيانات الفنية (Datasheet)</span>
                    </div>
                    {datasheetUrl ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> متوفر
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        مفقود
                      </span>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-industrial-200 dark:border-industrial-700 rounded-lg p-3 text-center hover:bg-industrial-50 dark:hover:bg-industrial-800/40 transition-colors">
                    <Upload className="w-5 h-5 text-industrial-400 mx-auto mb-1" />
                    <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                      اسحب أو اختر ملف PDF / صورة للـ Datasheet
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentFileUpload('datasheet', 'OEM Datasheet', file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={datasheetUrl.startsWith('data:') ? 'ملف محمل محلياً (Data URI)' : datasheetUrl}
                      onChange={(e) => setDatasheetUrl(e.target.value)}
                      placeholder="أو أدخل رابط مستند الـ Datasheet..."
                      className="flex-1 px-2.5 py-1.5 bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-700 rounded-lg text-xs"
                    />
                    {datasheetUrl && (
                      <button
                        type="button"
                        onClick={() => setDatasheetUrl('')}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. CoC Certificate of Conformance */}
                <div className="p-4 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">شهادة المطابقة (CoC / Compliance)</span>
                    </div>
                    {cocUrl ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> متوفر
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                        مفقود
                      </span>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-industrial-200 dark:border-industrial-700 rounded-lg p-3 text-center hover:bg-industrial-50 dark:hover:bg-industrial-800/40 transition-colors">
                    <Upload className="w-5 h-5 text-industrial-400 mx-auto mb-1" />
                    <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                      اسحب أو اختر ملف شهادة المطابقة CoC
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentFileUpload('coc', 'Certificate of Conformance', file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cocUrl.startsWith('data:') ? 'ملف محمل محلياً (Data URI)' : cocUrl}
                      onChange={(e) => setCocUrl(e.target.value)}
                      placeholder="رقم أو رابط شهادة المطابقة..."
                      className="flex-1 px-2.5 py-1.5 bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-700 rounded-lg text-xs"
                    />
                    {cocUrl && (
                      <button
                        type="button"
                        onClick={() => setCocUrl('')}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Calibration Certificate */}
                <div className="p-4 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold">شهادة المعايرة (Calibration Certificate)</span>
                    </div>
                    {calibrationCertUrl ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> متوفر
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                        اختياري
                      </span>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-industrial-200 dark:border-industrial-700 rounded-lg p-3 text-center hover:bg-industrial-50 dark:hover:bg-industrial-800/40 transition-colors">
                    <Upload className="w-5 h-5 text-industrial-400 mx-auto mb-1" />
                    <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                      اسحب أو اختر ملف شهادة المعايرة
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentFileUpload('calibrationCertificate', 'Calibration Certificate', file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <input
                    type="text"
                    value={calibrationCertUrl.startsWith('data:') ? 'ملف محمل محلياً' : calibrationCertUrl}
                    onChange={(e) => setCalibrationCertUrl(e.target.value)}
                    placeholder="رابط أو رقم شهادة المعايرة..."
                    className="w-full px-2.5 py-1.5 bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-700 rounded-lg text-xs"
                  />
                </div>

                {/* 4. Manuals / O&M */}
                <div className="p-4 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold">دليل التشغيل والصيانة (O&M Manual)</span>
                    </div>
                    {manualsUrl ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> متوفر
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                        اختياري
                      </span>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-industrial-200 dark:border-industrial-700 rounded-lg p-3 text-center hover:bg-industrial-50 dark:hover:bg-industrial-800/40 transition-colors">
                    <Upload className="w-5 h-5 text-industrial-400 mx-auto mb-1" />
                    <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                      اسحب أو اختر ملف الكتيب والدليل
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentFileUpload('operationManual', 'Operations Manual', file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  <input
                    type="text"
                    value={manualsUrl.startsWith('data:') ? 'ملف محمل محلياً' : manualsUrl}
                    onChange={(e) => setManualsUrl(e.target.value)}
                    placeholder="رابط كتيب التعليمات والتشغيل..."
                    className="w-full px-2.5 py-1.5 bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* OEM Verification Bar */}
              <div className="p-4 bg-industrial-50/70 dark:bg-industrial-950/40 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>اعتماد المصنع والتوثيق / OEM Verification & Status</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-industrial-500 uppercase font-bold mb-1">حالة الاعتماد</label>
                    <select
                      value={oemVerificationStatus}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setOemVerificationStatus(val);
                        setOemVerified(val === 'verified' || val === 'authorized');
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs"
                    >
                      <option value="pending">قيد التحقق (Pending)</option>
                      <option value="verified">معتمد ومطابق للأصل (Verified OEM)</option>
                      <option value="authorized">وكيل معتمد (Authorized Agent)</option>
                      <option value="alternative">بديل معتمد هندسياً (Approved Alternative)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-industrial-500 uppercase font-bold mb-1">رقم شهادة التوثيق / Certificate ID</label>
                    <input
                      type="text"
                      value={oemCertificateId}
                      onChange={(e) => setOemCertificateId(e.target.value)}
                      placeholder="e.g. OEM-CERT-2026-9912"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Custom Certificates & Documents */}
              <div className="p-4 bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-industrial-900 dark:text-white">
                      شهادات ومستندات فنية إضافية / Additional Certificates & Test Reports
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-industrial-400">
                    {Object.keys(documentsMap || {}).filter(k => !['datasheet', 'coc', 'calibrationCertificate', 'operationManual'].includes(k)).length} مستند إضافي
                  </span>
                </div>

                <div className="p-3 bg-industrial-50/70 dark:bg-industrial-950/40 rounded-xl border border-industrial-200 dark:border-industrial-800/80 space-y-2.5">
                  <label className="block text-[11px] font-bold text-industrial-700 dark:text-industrial-300">
                    إضافة شهادة جديدة (شهادة اختبار الضغط، فحص طرف ثالث TPI، شهادة منشأ، بوليصة شحن، إلخ):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customDocTitle}
                      onChange={(e) => setCustomDocTitle(e.target.value)}
                      placeholder="اسم الشهادة (e.g. شهادة فحص TPI، تقرير اختبار ميكانيكي)..."
                      className="px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={customDocUrl}
                      onChange={(e) => setCustomDocUrl(e.target.value)}
                      placeholder="أو ضع رابط المستند السحابي مباشرة..."
                      className="px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="px-3 py-1.5 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 border border-industrial-300 dark:border-industrial-700">
                      <Upload className="w-3.5 h-3.5 text-brand-600" />
                      <span>رفع ملف شهادة (PDF / صورة)</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const docTitle = customDocTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
                            handleAddCustomDocument(docTitle, file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (customDocTitle.trim() && customDocUrl.trim()) {
                          handleAddCustomDocument(customDocTitle, customDocUrl);
                        }
                      }}
                      disabled={!customDocTitle.trim() || !customDocUrl.trim()}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة الشهادة</span>
                    </button>
                  </div>
                </div>

                {/* List of custom docs */}
                <div className="space-y-2">
                  {Object.entries(documentsMap || {})
                    .filter(([key]) => !['datasheet', 'coc', 'calibrationCertificate', 'operationManual'].includes(key))
                    .map(([key, doc]) => {
                      const docObj = (doc || {}) as Record<string, any>;
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-lg border border-industrial-200 dark:border-industrial-800 bg-industrial-50/50 dark:bg-industrial-950/30 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-industrial-800 dark:text-industrial-200 block truncate">
                                {docObj.name || docObj.fileName || key}
                              </span>
                              <span className="text-[10px] text-industrial-400">
                                {docObj.fileSize || 'مستند خارجي'} • {docObj.uploadedBy || 'المستخدم'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {docObj.googleDriveWebViewLink && (
                              <a
                                href={docObj.googleDriveWebViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-industrial-500 hover:text-brand-600 hover:bg-white dark:hover:bg-industrial-800 rounded transition-colors"
                                title="عرض المستند"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomDoc(key)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title="حذف المستند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHOTOS & NAMEPLATES */}
          {activeTab === 'photos' && (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <span className="font-bold">أرشيف صور المادة الميداني:</span> يمكنك التقاط أو رفع صور لوحة البيانات المعدنية (Nameplate)، صور التركيب في الحقل، صور الرف والمستودع، وصور إضافية لتوثيق حالة المادة العينية.
                </div>
              </div>

              {/* Photo Category Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'nameplate', label: 'لوحة البيانات المعدنية (Nameplate)', count: photos.nameplate?.length || 0 },
                  { key: 'installation', label: 'صور الموقع والتركيب (Installation)', count: photos.installation?.length || 0 },
                  { key: 'warehouse', label: 'صور المستودع والرف (Warehouse)', count: photos.warehouse?.length || 0 },
                  { key: 'other', label: 'صور عامة وغلاف المادة (Other)', count: photos.other?.length || 0 }
                ].map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActivePhotoCategory(cat.key as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      activePhotoCategory === cat.key
                        ? 'bg-industrial-900 text-white dark:bg-white dark:text-industrial-950 shadow-xs'
                        : 'bg-industrial-100 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 hover:bg-industrial-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activePhotoCategory === cat.key
                        ? 'bg-white/20 text-white dark:bg-industrial-900/40 dark:text-industrial-950'
                        : 'bg-industrial-200 dark:bg-industrial-700 text-industrial-700 dark:text-industrial-300'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Upload & Camera Dropzone */}
              <div className="bg-industrial-50 dark:bg-industrial-950/40 p-4 rounded-xl border border-industrial-200 dark:border-industrial-800 space-y-3">
                <div className="border-2 border-dashed border-industrial-300 dark:border-industrial-700 rounded-xl p-5 text-center hover:bg-white dark:hover:bg-industrial-900/60 transition-colors">
                  <Upload className="w-7 h-7 text-brand-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-industrial-800 dark:text-industrial-200">
                    إضافة صورة جديدة إلى قسم ({activePhotoCategory})
                  </p>
                  <p className="text-[11px] text-industrial-400 mt-0.5 mb-3">
                    يمكنك استخدام كاميرا الجهاز المباشرة أو اختيار ملف صورة (JPG, PNG, WEBP)
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs">
                      <Camera className="w-4 h-4" />
                      <span>التقاط بالكاميرا مباشرة</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoFileUpload(activePhotoCategory, file);
                        }}
                        className="hidden"
                      />
                    </label>

                    <label className="px-3.5 py-2 bg-industrial-200 dark:bg-industrial-800 hover:bg-industrial-300 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-industrial-300 dark:border-industrial-700">
                      <Upload className="w-4 h-4 text-brand-600" />
                      <span>اختيار ملف من المعرض</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoFileUpload(activePhotoCategory, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="أو الصق رابط صورة خارجية مباشرة (URL)..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    disabled={!newPhotoUrl.trim()}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة الصورة</span>
                  </button>
                </div>
              </div>

              {/* Photos Gallery for Active Category */}
              <div>
                <h4 className="text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-3 flex items-center justify-between">
                  <span>معرض الصور لقسم ({activePhotoCategory}):</span>
                  <span className="text-[11px] font-mono text-industrial-400">
                    {(photos[activePhotoCategory] || []).length} صورة
                  </span>
                </h4>

                {(photos[activePhotoCategory] || []).length === 0 ? (
                  <div className="h-36 border border-dashed border-industrial-200 dark:border-industrial-800 rounded-xl flex flex-col items-center justify-center text-center p-4 text-industrial-400">
                    <ImageIcon className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs font-semibold">لا توجد صور مضافة في هذا القسم حتى الآن</p>
                    <p className="text-[11px] opacity-70 mt-0.5">استخدم مربع الرفع أعلاه لإضافة صور جديدة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photos[activePhotoCategory].map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-4/3 rounded-xl border border-industrial-200 dark:border-industrial-800 overflow-hidden bg-industrial-100 dark:bg-industrial-950 shadow-xs"
                      >
                        <img
                          src={photoUrl}
                          alt={`${activePhotoCategory}-${idx}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewingPhoto(photoUrl)}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs shadow-md transition-colors"
                            title="تكبير ومعاينة"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(activePhotoCategory, idx)}
                            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs shadow-md transition-colors"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL SPECS & LOCATION */}
          {activeTab === 'specs' && (
            <div className="space-y-5">
              {/* Warehouse Location Fields */}
              <div className="p-4 bg-industrial-50/70 dark:bg-industrial-950/40 border border-industrial-200 dark:border-industrial-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-brand-600" />
                  <span>موقع التخزين والمستودع / Warehouse Location Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">المستودع / Store</label>
                    <input
                      type="text"
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                      placeholder="e.g. Main Warehouse, Lab A"
                      className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">الرف / Rack</label>
                    <input
                      type="text"
                      value={rack}
                      onChange={(e) => setRack(e.target.value)}
                      placeholder="e.g. R-04"
                      className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">الخانة / Shelf</label>
                    <input
                      type="text"
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      placeholder="e.g. S-12"
                      className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs font-mono focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Ratings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    تصنيف الضغط / Pressure Rating
                  </label>
                  <input
                    type="text"
                    value={pressureRating}
                    onChange={(e) => setPressureRating(e.target.value)}
                    placeholder="e.g. 150# ANSI, PN40, 250 bar"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    حجم التوصيل / Connection Size
                  </label>
                  <input
                    type="text"
                    value={connectionSize}
                    onChange={(e) => setConnectionSize(e.target.value)}
                    placeholder="e.g. 1/2 inch NPT, DN50"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    الجهد الكهربائي / Electrical Rating
                  </label>
                  <input
                    type="text"
                    value={electricalRating}
                    onChange={(e) => setElectricalRating(e.target.value)}
                    placeholder="e.g. 24 VDC, 230 VAC"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    بروتوكول الإشارة / Signal Protocol
                  </label>
                  <input
                    type="text"
                    value={outputProtocol}
                    onChange={(e) => setOutputProtocol(e.target.value)}
                    placeholder="e.g. 4-20 mA HART, Modbus"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    درجة الحماية / IP Protection
                  </label>
                  <input
                    type="text"
                    value={ipRating}
                    onChange={(e) => setIpRating(e.target.value)}
                    placeholder="e.g. IP66, IP67, NEMA 4X"
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    ملاحظات عامة / General Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية..."
                    className="w-full px-3 py-2 bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-xl text-xs focus:ring-1.5 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-industrial-200 dark:border-industrial-800 bg-industrial-50/90 dark:bg-industrial-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-industrial-500">
            <span>رقم القطعة:</span>
            <span className="font-mono font-bold text-industrial-800 dark:text-industrial-200">{material.partNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء / إغلاق
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
              id="btn-save-material-quick-edit"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات والمرفقات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox / Zoom modal for photo preview */}
      <AnimatePresence>
        {previewingPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setPreviewingPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={previewingPhoto}
                alt="Full preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setPreviewingPhoto(null)}
                className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
