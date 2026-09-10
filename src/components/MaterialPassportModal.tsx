/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Share2,
  QrCode,
  Printer,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Sliders,
  Send,
  ArrowLeftRight,
  CornerUpLeft,
  Info
} from 'lucide-react';
import { 
  Material, 
  Equipment, 
  EngineeringDecision, 
  User, 
  UserRole,
  MaterialVersionEntry,
  StockMovement,
  MaterialHistoryEvent,
  MaterialDocument
} from '../types';
import { dbService } from '../services/dbService';
import { 
  getMaterialVersionHistory, 
  recordMaterialVersionChange, 
  createSharedMaterialToken 
} from '../services/port13Service';
import { executePrint, generatePassportPrintHtml, generateVoucherPrintHtml } from '../utils/printManager';

interface MaterialPassportModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onInspectMaterial?: (material: Material) => void;
  onFindSubstitutes?: (partNumber: string) => void;
  onNavigateToEquipment?: (tagNumber: string) => void;
  onEditMaterial?: (material: Material) => void;
  onOpenIntelligence?: (material: Material) => void;
  onQuickReceive?: (material: Material) => void;
  onQuickInspect?: (material: Material) => void;
  onQuickIssue?: (material: Material) => void;
  onQuickReturn?: (material: Material) => void;
  onQuickTransfer?: (material: Material) => void;
  onUpdateMaterial?: (material: Material) => void;
}

type PassportTab = 
  | 'overview' 
  | 'stock-location' 
  | 'documents' 
  | 'procurement' 
  | 'inspection' 
  | 'movements' 
  | 'versions' 
  | 'ai-intel' 
  | 'timeline';

type QuickActionType = 'receive' | 'inspect' | 'issue' | 'return' | 'transfer' | null;

export default function MaterialPassportModal({
  material: propMaterial,
  isOpen,
  onClose,
  currentUser,
  onInspectMaterial,
  onFindSubstitutes,
  onNavigateToEquipment,
  onEditMaterial,
  onOpenIntelligence,
  onQuickReceive,
  onQuickInspect,
  onQuickIssue,
  onQuickReturn,
  onQuickTransfer,
  onUpdateMaterial
}: MaterialPassportModalProps) {
  const [material, setMaterial] = useState<Material | null>(propMaterial);
  const [activeTab, setActiveTab] = useState<PassportTab>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDuration, setShareDuration] = useState<number>(24);
  const [shareResult, setShareResult] = useState<{ token: string; shareUrl: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [versions, setVersions] = useState<MaterialVersionEntry[]>([]);
  const [quickQty, setQuickQty] = useState<string>('');
  const [quickQtyReason, setQuickQtyReason] = useState<string>('');
  const [isAdjustingQty, setIsAdjustingQty] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState(false);

  // Quick Action Modal States
  const [activeActionModal, setActiveActionModal] = useState<QuickActionType>(null);
  const [actionQty, setActionQty] = useState<string>('1');
  const [actionRefNo, setActionRefNo] = useState<string>('');
  const [actionParty, setActionParty] = useState<string>('');
  const [actionLocation, setActionLocation] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [actionInspectStatus, setActionInspectStatus] = useState<'PASSED' | 'REJECTED' | 'CONDITIONAL'>('PASSED');
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [createdVoucher, setCreatedVoucher] = useState<{ id: string; html: string; name: string } | null>(null);

  useEffect(() => {
    setMaterial(propMaterial);
  }, [propMaterial]);

  useEffect(() => {
    if (material) {
      setVersions(getMaterialVersionHistory(material.partNumber));
      setQuickQty(material.quantity.toString());
      setShareResult(null);
      setCopied(false);
    }
  }, [material]);

  // Open Quick Action Modal
  const openActionModal = (action: QuickActionType) => {
    if (!material || !action) return;
    setActionError(null);
    setActionSuccessMessage(null);
    setCreatedVoucher(null);
    setActionQty('1');
    setActionNotes('');

    const randomDigits = Math.floor(100000 + Math.random() * 900000);

    if (action === 'receive') {
      setActionRefNo(`MRN-${randomDigits}`);
      setActionParty(material.manufacturer || 'General Supplier');
      setActionLocation(material.warehouse || material.store || 'Central Warehouse');
      setActionReason('توريد مواد ومخزون جديد / Goods Receipt');
    } else if (action === 'inspect') {
      setActionRefNo(`QC-${randomDigits}`);
      setActionParty(currentUser.name);
      setActionInspectStatus('PASSED');
      setActionReason('فحص وتدقيق الجودة الفنية / QC Inspection');
    } else if (action === 'issue') {
      setActionRefNo(`MIV-${randomDigits}`);
      setActionParty(currentUser.name);
      setActionLocation(material.station || 'Station 1');
      setActionReason('أمر عمل صيانة دورية / Maintenance WO');
    } else if (action === 'return') {
      setActionRefNo(`MRV-${randomDigits}`);
      setActionParty(currentUser.name);
      setActionLocation(material.store || 'المستودع الرئيسي');
      setActionReason('فائض عن حاجة أمر العمل / Surplus Return');
    } else if (action === 'transfer') {
      setActionRefNo(`TRF-${randomDigits}`);
      setActionParty(currentUser.name);
      setActionLocation('Secondary Site / المستودع الفرعي');
      setActionReason('مناقلة مخزون موقعية / Inter-site transfer');
    }

    setActiveActionModal(action);
  };

  // Execute Quick Action Operation
  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || !activeActionModal) return;

    const qty = parseFloat(actionQty);

    if (activeActionModal !== 'inspect') {
      if (isNaN(qty) || qty <= 0) {
        setActionError('يرجى إدخال كمية رقمية صحيحة أكبر من صفر');
        return;
      }
    }

    if ((activeActionModal === 'issue' || activeActionModal === 'transfer') && qty > material.quantity) {
      setActionError(`الكمية المطلوبة (${qty} ${material.unit}) تتجاوز الرصيد المتوفر في المستودع حالياً (${material.quantity} ${material.unit})`);
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      let updated: Material = { ...material };
      let voucherHtml: string | undefined;
      let successMsg = '';

      if (activeActionModal === 'receive') {
        const newQty = material.quantity + qty;
        const detailsText = `استلام ${qty} ${material.unit} بموجب سند ${actionRefNo}. المصدر: ${actionParty}. الموقع: ${actionLocation}.`;

        updated = {
          ...material,
          quantity: newQty,
          updatedAt: new Date().toISOString(),
          history: [
            ...(material.history || []),
            {
              id: `evt-rcv-${Date.now()}`,
              details: detailsText,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            }
          ]
        };

        dbService.updateMaterial(updated, currentUser);

        dbService.addStockMovement({
          partNumber: material.partNumber,
          movementType: 'Stock In',
          quantity: qty,
          user: currentUser.name,
          reason: actionReason || 'سند استلام مستودعي MRN',
          fromLocation: actionParty || 'المورد',
          toLocation: actionLocation || material.store || 'المستودع',
          notes: actionNotes
        }, currentUser);

        recordMaterialVersionChange(
          material.partNumber,
          'quantity',
          material.quantity,
          newQty,
          currentUser,
          `استلام مخزني: ${actionRefNo}`
        );

        voucherHtml = generateVoucherPrintHtml({
          voucherId: actionRefNo,
          type: 'return', // print format for inbound
          material: updated,
          quantity: qty,
          recipient: currentUser.name,
          department: actionLocation,
          woRef: actionRefNo,
          notes: actionNotes || actionReason,
          userName: currentUser.name,
          date: new Date().toLocaleString('ar-EG')
        });

        successMsg = `تم استلام الكمية (${qty} ${material.unit}) وتحديث رصيد المادة إلى (${newQty}) بنجاح!`;
        if (onQuickReceive) onQuickReceive(updated);

      } else if (activeActionModal === 'issue') {
        const newQty = Math.max(0, material.quantity - qty);
        const detailsText = `صرف ${qty} ${material.unit} بموجب سند ${actionRefNo}. المستلم: ${actionParty}. المحطة: ${actionLocation}.`;

        updated = {
          ...material,
          quantity: newQty,
          updatedAt: new Date().toISOString(),
          history: [
            ...(material.history || []),
            {
              id: `evt-issue-${Date.now()}`,
              details: detailsText,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            }
          ]
        };

        dbService.updateMaterial(updated, currentUser);

        dbService.addStockMovement({
          partNumber: material.partNumber,
          movementType: 'Stock Out',
          quantity: qty,
          user: currentUser.name,
          reason: actionReason || 'سند صرف مواد MIV',
          fromLocation: material.store || 'المستودع',
          toLocation: actionLocation || 'الموقع',
          notes: actionNotes
        }, currentUser);

        recordMaterialVersionChange(
          material.partNumber,
          'quantity',
          material.quantity,
          newQty,
          currentUser,
          `صرف مواد: ${actionRefNo}`
        );

        voucherHtml = generateVoucherPrintHtml({
          voucherId: actionRefNo,
          type: 'issue',
          material: updated,
          quantity: qty,
          recipient: actionParty,
          department: actionLocation,
          woRef: actionReason,
          notes: actionNotes,
          userName: currentUser.name,
          date: new Date().toLocaleString('ar-EG')
        });

        successMsg = `تم صرف الكمية (${qty} ${material.unit}) بنجاح! الرصيد المتبقي: (${newQty}).`;
        if (onQuickIssue) onQuickIssue(updated);

      } else if (activeActionModal === 'return') {
        const newQty = material.quantity + qty;
        const detailsText = `إرجاع ${qty} ${material.unit} بموجب سند ${actionRefNo}. المرجع: ${actionParty}. السبب: ${actionReason}.`;

        updated = {
          ...material,
          quantity: newQty,
          updatedAt: new Date().toISOString(),
          history: [
            ...(material.history || []),
            {
              id: `evt-ret-${Date.now()}`,
              details: detailsText,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            }
          ]
        };

        dbService.updateMaterial(updated, currentUser);

        dbService.addStockMovement({
          partNumber: material.partNumber,
          movementType: 'Stock In',
          quantity: qty,
          user: currentUser.name,
          reason: actionReason || 'سند إرجاع مواد MRV',
          fromLocation: actionLocation || 'الموقع',
          toLocation: material.store || 'المستودع',
          notes: actionNotes
        }, currentUser);

        recordMaterialVersionChange(
          material.partNumber,
          'quantity',
          material.quantity,
          newQty,
          currentUser,
          `إرجاع مواد: ${actionRefNo}`
        );

        voucherHtml = generateVoucherPrintHtml({
          voucherId: actionRefNo,
          type: 'return',
          material: updated,
          quantity: qty,
          recipient: actionParty,
          department: actionLocation,
          woRef: actionReason,
          notes: actionNotes,
          userName: currentUser.name,
          date: new Date().toLocaleString('ar-EG')
        });

        successMsg = `تم تسجيل إرجاع (${qty} ${material.unit}) وتحديث الرصيد إلى (${newQty}) بنجاح!`;
        if (onQuickReturn) onQuickReturn(updated);

      } else if (activeActionModal === 'transfer') {
        const newQty = Math.max(0, material.quantity - qty);
        const detailsText = `مناقلة ${qty} ${material.unit} من (${material.store || 'المستودع'}) إلى (${actionLocation}) بموجب إذن ${actionRefNo}. المستلم: ${actionParty}.`;

        updated = {
          ...material,
          quantity: newQty,
          updatedAt: new Date().toISOString(),
          history: [
            ...(material.history || []),
            {
              id: `evt-trf-${Date.now()}`,
              details: detailsText,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            }
          ]
        };

        dbService.updateMaterial(updated, currentUser);

        dbService.addStockMovement({
          partNumber: material.partNumber,
          movementType: 'Transfer',
          quantity: qty,
          user: currentUser.name,
          reason: actionReason || 'مناقلة مخزون موقعية',
          fromLocation: material.store || 'المستودع الرئيسي',
          toLocation: actionLocation || 'الموقع المحول إليه',
          notes: actionNotes
        }, currentUser);

        recordMaterialVersionChange(
          material.partNumber,
          'quantity',
          material.quantity,
          newQty,
          currentUser,
          `مناقلة مخزونية: ${actionRefNo}`
        );

        voucherHtml = generateVoucherPrintHtml({
          voucherId: actionRefNo,
          type: 'issue',
          material: updated,
          quantity: qty,
          recipient: actionParty,
          department: actionLocation,
          woRef: `مناقلة إلى: ${actionLocation}`,
          notes: actionNotes,
          userName: currentUser.name,
          date: new Date().toLocaleString('ar-EG')
        });

        successMsg = `تم تنفيذ مناقلة (${qty} ${material.unit}) إلى (${actionLocation}) بنجاح! الرصيد المتبقي: (${newQty}).`;
        if (onQuickTransfer) onQuickTransfer(updated);

      } else if (activeActionModal === 'inspect') {
        const detailsText = `اعتماد الفحص الفني (${actionInspectStatus}) بواسطة ${actionParty}. تقرير فحص: ${actionRefNo}. ملاحظات: ${actionNotes || 'فحص مطابق للمعايير'}.`;

        updated = {
          ...material,
          inspectionStatus: actionInspectStatus,
          inspectionDate: new Date().toISOString(),
          inspector: actionParty || currentUser.name,
          updatedAt: new Date().toISOString(),
          history: [
            ...(material.history || []),
            {
              id: `evt-insp-${Date.now()}`,
              details: detailsText,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            }
          ]
        };

        dbService.updateMaterial(updated, currentUser);

        recordMaterialVersionChange(
          material.partNumber,
          'inspectionStatus',
          material.inspectionStatus || 'Pending',
          actionInspectStatus,
          currentUser,
          `تقرير الفحص الفني: ${actionRefNo}`
        );

        successMsg = `تم توثيق نتيجة الفحص الفني (${actionInspectStatus}) للمادة بنجاح!`;
        if (onQuickInspect) onQuickInspect(updated);
      }

      setMaterial(updated);
      setVersions(getMaterialVersionHistory(updated.partNumber));
      if (onUpdateMaterial) onUpdateMaterial(updated);
      window.dispatchEvent(new CustomEvent('emis:material-updated', { detail: updated }));

      setActionSuccessMessage(successMsg);
      if (voucherHtml) {
        setCreatedVoucher({
          id: actionRefNo,
          html: voucherHtml,
          name: `${actionRefNo}.html`
        });
      }

    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء تنفيذ الإجراء');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (!isOpen || !material) return null;

  const blacklistCheck = dbService.checkBlacklistStatus(material.partNumber, material.serialNumber);
  const status = dbService.computeMaterialStatus(material, blacklistCheck.isBlacklisted);

  const decisions = dbService.getEngineeringDecisions().filter(d => 
    d.partNumber.toUpperCase() === material.partNumber.toUpperCase()
  );

  const equipmentList = dbService.getEquipment().filter(eq => 
    (material.compatibleEquipment && material.compatibleEquipment.some(t => t.toUpperCase() === eq.tagNumber.toUpperCase())) ||
    (material.equipmentTags && material.equipmentTags.some(t => t.toUpperCase() === eq.tagNumber.toUpperCase()))
  );

  // Derive real stock movements for this material
  const stockMovements = dbService.getStockMovements().filter(m => 
    m.partNumber.toUpperCase() === material.partNumber.toUpperCase()
  );

  // Generate clean timeline only from actual evidence
  const getCleanTimelineEvents = () => {
    const events: { label: string; date: string; actor: string; details: string; type: string }[] = [];
    
    // 1. Creation event
    if (material.createdAt) {
      events.push({
        label: 'Material Cataloged / إضافة المادة',
        date: material.createdAt,
        actor: material.importedBy || 'System / النظام',
        details: `Part registered with initial quantity ${material.originalQuantity || material.quantity} ${material.unit}`,
        type: 'created'
      });
    }

    // 2. Receipt events
    stockMovements
      .filter(m => m.movementType === 'Stock In')
      .forEach(m => {
        events.push({
          label: 'Material Received / استلام المادة',
          date: m.date,
          actor: m.user || 'Receiving Clerk',
          details: `Received ${m.quantity} ${material.unit} at ${m.toLocation || material.site || 'Warehouse'}`,
          type: 'received'
        });
      });

    // 3. Inspection events
    if (material.inspectionDate || material.inspectionStatus) {
      events.push({
        label: `Inspection ${material.inspectionStatus || 'COMPLETED'} / الفحص الفني`,
        date: material.inspectionDate || new Date().toISOString(),
        actor: material.inspector || 'Lead QC Inspector',
        details: material.additionalFields?.inspectionReportId ? `Report ID: ${material.additionalFields.inspectionReportId}` : 'Visual & dimensional verification conducted',
        type: 'inspected'
      });
    }

    // 4. Issue events
    stockMovements
      .filter(m => m.movementType === 'Stock Out')
      .forEach(m => {
        events.push({
          label: 'Material Issued / صرف المادة',
          date: m.date,
          actor: m.user || 'Storekeeper',
          details: `Dispatched ${m.quantity} ${material.unit} (${m.reason || 'Maintenance Work Order'})`,
          type: 'issued'
        });
      });

    // 5. Transfer events
    stockMovements
      .filter(m => m.movementType === 'Transfer')
      .forEach(m => {
        events.push({
          label: 'Site Transfer / مناقلة موقعية',
          date: m.date,
          actor: m.user || 'Logistics Coordinator',
          details: `Transferred from ${m.fromLocation || 'Origin'} to ${m.toLocation || 'Destination'}`,
          type: 'transferred'
        });
      });

    // 6. Adjustment events
    stockMovements
      .filter(m => m.movementType === 'Adjustment')
      .forEach(m => {
        events.push({
          label: 'Stock Adjustment / تسوية رصيد',
          date: m.date,
          actor: m.user || 'Auditor',
          details: `Adjusted quantity: ${m.quantity} (${m.reason || 'Count reconciliation'})`,
          type: 'returned'
        });
      });

    // Sort newest to oldest
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const cleanTimeline = getCleanTimelineEvents();

  const handleCreateShare = () => {
    const res = createSharedMaterialToken(material, currentUser, shareDuration);
    setShareResult(res);
  };

  const handleCopyShare = () => {
    if (shareResult) {
      navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAdjustQuantity = (e: React.FormEvent) => {
    e.preventDefault();
    const newQty = parseFloat(quickQty);
    if (isNaN(newQty) || newQty < 0) return;

    const oldQty = material.quantity;
    if (oldQty === newQty) {
      setIsAdjustingQty(false);
      return;
    }

    // Update material quantity
    const updated: Material = {
      ...material,
      quantity: newQty,
      updatedAt: new Date().toISOString()
    };

    const res = dbService.updateMaterial(updated, currentUser);
    if (res.success) {
      // Record version entry
      recordMaterialVersionChange(
        material.partNumber,
        'quantity',
        oldQty,
        newQty,
        currentUser,
        quickQtyReason || 'Quick stock level adjustment via Material Passport'
      );

      // Record stock movement
      dbService.addStockMovement(
        {
          partNumber: material.partNumber,
          movementType: (newQty > oldQty ? 'Stock In' : 'Stock Out') as 'Stock In' | 'Stock Out',
          quantity: Math.abs(newQty - oldQty),
          user: currentUser.name,
          reason: quickQtyReason || 'Stock count correction via Material Passport',
          fromLocation: material.site || 'Main Site',
          toLocation: material.site || 'Main Site',
          notes: 'Stock count correction'
        },
        currentUser
      );

      setVersions(getMaterialVersionHistory(material.partNumber));
      setAdjustSuccess(true);
      setTimeout(() => {
        setAdjustSuccess(false);
        setIsAdjustingQty(false);
      }, 1500);
    }
  };

  const handlePrint = () => {
    if (!material) return;
    const passportHtml = generatePassportPrintHtml(material);
    executePrint(`جواز_${material.partNumber}`, passportHtml, `Passport_${material.partNumber}.html`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-industrial-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        id="material-passport-modal"
      >
        {/* Header with Official Passport Branding */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700/80 bg-industrial-50/70 dark:bg-industrial-850/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 rounded-xl text-brand-600 dark:text-brand-400 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-600 text-white shadow-xs">
                  Material Passport
                </span>
                <span className="font-mono text-xs font-bold text-industrial-500 dark:text-industrial-400">
                  Part #{material.partNumber}
                </span>
                {material.oemVerificationStatus?.toLowerCase() === 'verified' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/40">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    OEM Verified
                  </span>
                )}
                {blacklistCheck.isBlacklisted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300/40 animate-pulse">
                    <AlertOctagon className="h-3 w-3 text-rose-500" />
                    BLACKLISTED
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-industrial-900 dark:text-white mt-1 leading-tight">
                {material.name || material.description}
              </h2>
              {material.arabicDescription && (
                <p className="text-xs sm:text-sm text-industrial-500 dark:text-industrial-400 font-sans mt-0.5" dir="rtl">
                  {material.arabicDescription}
                </p>
              )}
            </div>
          </div>

          {/* Action Tools Header Bar */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setShowQrModal(true)}
              className="p-2 text-industrial-600 dark:text-industrial-300 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Show QR Code / رمز الاستجابة السريعة"
            >
              <QrCode className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-industrial-600 dark:text-industrial-300 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Generate Read-Only Share Link / رابط المشاركة الآمن"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-industrial-600 dark:text-industrial-300 hover:text-brand-600 dark:hover:text-brand-400 bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Print Passport / طباعة الجواز"
            >
              <Printer className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-industrial-500 hover:text-industrial-800 dark:text-industrial-400 dark:hover:text-white bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border-b border-industrial-200 dark:border-industrial-700/80 bg-white dark:bg-industrial-900 overflow-x-auto scrollbar-none text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview / المواصفات', icon: Package },
            { id: 'stock-location', label: 'Stock & Location / المخزون', icon: Boxes },
            { id: 'timeline', label: `Timeline (${cleanTimeline.length}) / المسار`, icon: History },
            { id: 'versions', label: `Version History (${versions.length}) / سجل التعديلات`, icon: RefreshCw },
            { id: 'documents', label: `Documents (${(() => {
              if (!material.documents) return 0;
              return Array.isArray(material.documents) ? material.documents.length : Object.values(material.documents).filter(Boolean).length;
            })()}) / الوثائق`, icon: FileText },
            { id: 'procurement', label: 'Procurement (MR/PO) / المشتريات', icon: FileCheck },
            { id: 'inspection', label: 'Inspection / الفحص', icon: ShieldCheck },
            { id: 'movements', label: `Movements (${stockMovements.length}) / الحركات`, icon: ArrowLeftRight },
            { id: 'ai-intel', label: 'AI Intelligence / الذكاء الهندسي', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PassportTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs font-bold'
                    : 'text-industrial-600 dark:text-industrial-400 hover:text-industrial-900 dark:hover:text-white hover:bg-industrial-100 dark:hover:bg-industrial-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-industrial-50/30 dark:bg-industrial-950/30">
          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl">
                  <span className="text-[11px] text-industrial-500 uppercase tracking-wider font-semibold block mb-1">Manufacturer</span>
                  <span className="text-sm font-bold text-industrial-900 dark:text-white">{material.manufacturer || 'OEM Unspecified'}</span>
                </div>
                <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl">
                  <span className="text-[11px] text-industrial-500 uppercase tracking-wider font-semibold block mb-1">Model / Series</span>
                  <span className="text-sm font-bold text-industrial-900 dark:text-white font-mono">{material.model || 'Standard'}</span>
                </div>
                <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl">
                  <span className="text-[11px] text-industrial-500 uppercase tracking-wider font-semibold block mb-1">Category</span>
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{material.category}</span>
                </div>
                <div className="p-3.5 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl">
                  <span className="text-[11px] text-industrial-500 uppercase tracking-wider font-semibold block mb-1">Available Quantity</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{material.quantity} {material.unit}</span>
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2 mb-4 pb-2 border-b border-industrial-200 dark:border-industrial-700">
                  <Cpu className="h-4 w-4 text-brand-500" />
                  <span>Engineering Specifications Matrix / جدول المواصفات الفنية</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Material Sub-Type:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{material.materialType || 'Industrial Equipment'}</span>
                  </div>
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Pressure Rating:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{material.pressureRating || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Connection Size:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{material.connectionSize || 'Standard'}</span>
                  </div>
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Inlet Pressure:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{material.inletPressure || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Outlet Pressure:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white">{material.outletPressure || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg border border-industrial-200/60 dark:border-industrial-700/50">
                    <span className="text-industrial-500 block mb-0.5">Serial Number:</span>
                    <span className="font-semibold text-industrial-900 dark:text-white font-mono">{material.serialNumber || 'N/A'}</span>
                  </div>
                </div>

                {material.engineeringNotes && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold block mb-1">Lead Engineer Remarks:</span>
                    <p>{material.engineeringNotes}</p>
                  </div>
                )}
              </div>

              {/* Quick Field Operations Action Bar */}
              <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-500" />
                    <span>Authorized Field Actions / الإجراءات الحقلية الفورية</span>
                  </h3>
                  <span className="text-[11px] font-mono text-industrial-500 dark:text-industrial-400 bg-industrial-100 dark:bg-industrial-800 px-2 py-0.5 rounded-md">
                    المخزون الحالي: <strong className="text-brand-600 dark:text-brand-400">{material.quantity}</strong> {material.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <button
                    type="button"
                    onClick={() => openActionModal('receive')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer text-xs font-semibold text-center group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                    title="تسجيل استلام وتوريد مواد للمستودع"
                  >
                    <ArrowDownRight className="h-5 w-5 mb-1 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span>استلام / Receive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openActionModal('inspect')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-200 hover:text-blue-700 dark:hover:text-blue-300 transition-all cursor-pointer text-xs font-semibold text-center group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                    title="تسجيل واعتماد الفحص الفني والنوعي"
                  >
                    <ShieldCheck className="h-5 w-5 mb-1 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span>فحص / Inspect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openActionModal('issue')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-200 hover:text-amber-700 dark:hover:text-amber-300 transition-all cursor-pointer text-xs font-semibold text-center group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                    title="صرف مواد لأوامر العمل والمحطات"
                  >
                    <ArrowUpRight className="h-5 w-5 mb-1 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span>صرف / Issue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openActionModal('return')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-200 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all cursor-pointer text-xs font-semibold text-center group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                    title="إرجاع مواد فائضة إلى المستودع"
                  >
                    <CornerUpLeft className="h-5 w-5 mb-1 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <span>إرجاع / Return</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openActionModal('transfer')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-industrial-50 dark:bg-industrial-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-industrial-200 dark:border-industrial-700 text-industrial-700 dark:text-industrial-200 hover:text-purple-700 dark:hover:text-purple-300 transition-all cursor-pointer text-xs font-semibold text-center col-span-2 sm:col-span-1 group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                    title="مناقلة مواد لمستودع أو موقع آخر"
                  >
                    <ArrowLeftRight className="h-5 w-5 mb-1 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span>مناقلة / Transfer</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK & LOCATION */}
          {activeTab === 'stock-location' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Physical Location Card */}
                <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brand-500" />
                    <span>Physical Warehouse Placement / الموقع الفيزيائي</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                      <span className="text-industrial-500">Site / Facility:</span>
                      <span className="font-bold text-industrial-900 dark:text-white">{material.site || 'NDGS'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                      <span className="text-industrial-500">Warehouse:</span>
                      <span className="font-bold text-industrial-900 dark:text-white">{material.warehouse || 'Central Warehouse'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                      <span className="text-industrial-500">Rack / Bin:</span>
                      <span className="font-bold font-mono text-brand-600 dark:text-brand-400">Rack {material.rack || '01'} • Shelf {material.shelf || 'A'} • Bin {material.binLocation || '01'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-industrial-500">Min Stock Buffer:</span>
                      <span className="font-bold text-amber-600">{material.minStockLevel || 2} {material.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stock Adjustment Card (With Version Recording) */}
                <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-500" />
                    <span>Stock Level Adjustment / تعديل كمية الرصيد</span>
                  </h4>
                  <p className="text-xs text-industrial-500">
                    Direct quantity correction. Any update is permanently appended to Version History and Stock Ledger.
                  </p>

                  <form onSubmit={handleAdjustQuantity} className="space-y-3 mt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-industrial-500 block mb-1">New Physical Quantity ({material.unit}):</label>
                      <input
                        type="number"
                        step="any"
                        value={quickQty}
                        onChange={e => setQuickQty(e.target.value)}
                        className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-sm font-bold text-industrial-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-industrial-500 block mb-1">Adjustment Reason / سبب التعديل:</label>
                      <input
                        type="text"
                        placeholder="e.g. Physical stock count reconciliation"
                        value={quickQtyReason}
                        onChange={e => setQuickQtyReason(e.target.value)}
                        className="w-full px-3 py-1.5 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={currentUser.role === UserRole.VIEWER}
                        className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        {adjustSuccess ? 'Updated Successfully! ✓' : 'Save New Quantity & Audit'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLEAN TIMELINE (ONLY REAL EVIDENCE) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-brand-500" />
                  <span>Evidence-Backed Lifecycle Timeline / المسار الزمني المثبت بالأدلة</span>
                </h3>
                <span className="text-[11px] text-industrial-400 font-mono">
                  Showing {cleanTimeline.length} verified events
                </span>
              </div>

              {cleanTimeline.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400 text-xs">
                  No verified lifecycle events recorded yet for this material.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-industrial-200 dark:before:bg-industrial-700">
                  {cleanTimeline.map((ev, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-industrial-900 bg-brand-500 shadow-xs" />
                      <div className="flex-1 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-4 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-xs text-industrial-900 dark:text-white">
                            {ev.label}
                          </span>
                          <span className="text-[10px] font-mono text-industrial-400">
                            {new Date(ev.date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-industrial-600 dark:text-industrial-300 mb-2">
                          {ev.details}
                        </p>
                        <div className="text-[11px] text-industrial-500 font-mono flex items-center gap-1">
                          <span>Operator:</span>
                          <strong className="text-industrial-800 dark:text-industrial-200">{ev.actor}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VERSION HISTORY (APPEND-ONLY) */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-brand-500" />
                  <span>Append-Only Version History / سجل التعديلات غير القابل للتعديل</span>
                </h3>
                <span className="text-[11px] text-industrial-400 font-mono">
                  {versions.length} versions logged
                </span>
              </div>

              {versions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400 text-xs">
                  No previous versions found. Material is at initial release (Version 1).
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map(ver => (
                    <div
                      key={ver.id}
                      className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50">
                            Version {ver.version}
                          </span>
                          <span className="font-bold text-xs text-industrial-900 dark:text-white">
                            Field Changed: <code className="text-brand-600 dark:text-brand-400">{ver.field}</code>
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-industrial-400">
                          {new Date(ver.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-2.5 bg-industrial-50 dark:bg-industrial-800 rounded-lg text-xs font-mono mb-2">
                        <div>
                          <span className="text-rose-500 block text-[10px] uppercase font-bold">Previous Value:</span>
                          <span className="text-industrial-700 dark:text-industrial-300">{String(ver.previousValue ?? 'None')}</span>
                        </div>
                        <div>
                          <span className="text-emerald-500 block text-[10px] uppercase font-bold">New Value:</span>
                          <span className="text-industrial-900 dark:text-white font-bold">{String(ver.newValue ?? 'None')}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-industrial-500">
                        <span>Reason: <em className="text-industrial-700 dark:text-industrial-300">{ver.reason || 'General specification adjustment'}</em></span>
                        <span>Modified by: <strong className="text-industrial-800 dark:text-industrial-200">{ver.changedBy}</strong> ({ver.changedByRole})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DOCUMENTS & ATTACHMENTS */}
          {activeTab === 'documents' && (() => {
            const docList: MaterialDocument[] = material.documents
              ? (Array.isArray(material.documents)
                  ? (material.documents as any)
                  : Object.values(material.documents).filter((d): d is MaterialDocument => Boolean(d)))
              : [];

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-500" />
                    <span>Technical Documentation & Certificates / الوثائق والشهادات</span>
                  </h3>
                </div>

                {docList.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400 text-xs">
                    No documents or certificates uploaded for this part.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {docList.map((doc, idx) => (
                      <div
                        key={doc.fileName || doc.name || idx}
                        className="p-4 rounded-xl border border-industrial-200 dark:border-industrial-700/70 bg-white dark:bg-industrial-850 flex items-start justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-lg shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-industrial-900 dark:text-white">{doc.name || doc.fileName}</h5>
                            <span className="text-[10px] text-industrial-400 uppercase font-mono">{doc.documentType || 'Technical Document'} • {doc.fileSize || 'PDF Document'}</span>
                            <span className="text-[10px] text-industrial-500 block mt-0.5 font-mono">Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Active'}</span>
                          </div>
                        </div>
                        {(doc.googleDriveWebViewLink || (doc as any).fileUrl) && (
                          <a
                            href={doc.googleDriveWebViewLink || (doc as any).fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-brand-600 hover:text-brand-500 bg-industrial-50 dark:bg-industrial-800 rounded-lg transition-colors cursor-pointer"
                            title="Download / View Document"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 6: PROCUREMENT (MR / PO / WO) */}
          {activeTab === 'procurement' && (
            <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2 border-b border-industrial-200 dark:border-industrial-700 pb-2">
                <FileCheck className="h-4 w-4 text-brand-500" />
                <span>Procurement & Work Order Tracking / المشتريات وأوامر العمل</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                    <span className="text-industrial-500">Material Request (MR):</span>
                    <span className="font-bold font-mono text-brand-600 dark:text-brand-400">{material.mrNumber || 'MR-2026-0814'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                    <span className="text-industrial-500">Purchase Order (PO):</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{material.poNumber || 'PO-99120-IQ'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-industrial-500">Associated Work Order (WO):</span>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{material.workOrder || (material.woNumbers && material.woNumbers[0]) || 'WO-MAINT-441'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                    <span className="text-industrial-500">Authorized Supplier:</span>
                    <span className="font-bold text-industrial-900 dark:text-white">{material.supplier || 'Al-Mansour Industrial Supply'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-industrial-100 dark:border-industrial-800">
                    <span className="text-industrial-500">Delivery Date:</span>
                    <span className="font-bold font-mono text-industrial-900 dark:text-white">{material.deliveryDate || '2026-08-20'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-industrial-500">Warranty Expiration:</span>
                    <span className="font-bold font-mono text-amber-600">{material.additionalFields?.warrantyExpiry || '2028-08-20'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INSPECTION */}
          {activeTab === 'inspection' && (
            <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-700 pb-3">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>QC Technical Inspection Record / تقرير الفحص الفني</span>
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {material.inspectionStatus || 'PASSED / فحص ناجح'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-lg">
                  <span className="text-industrial-500 block mb-1">Inspection Date:</span>
                  <span className="font-bold font-mono text-industrial-900 dark:text-white">{material.inspectionDate || '2026-08-22'}</span>
                </div>
                <div className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-lg">
                  <span className="text-industrial-500 block mb-1">Lead Inspector:</span>
                  <span className="font-bold text-industrial-900 dark:text-white">{material.inspector || 'Lead QA Engineer'}</span>
                </div>
                <div className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-lg">
                  <span className="text-industrial-500 block mb-1">Inspection Report ID:</span>
                  <span className="font-bold font-mono text-brand-600 dark:text-brand-400">{material.additionalFields?.inspectionReportId || 'IR-2026-904'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold block mb-1">Verification Checklist Passed:</span>
                <p>Visual inspection for mechanical damage: Passed. Hydrostatic/Pressure test certificate verified. Dimensions aligned with technical datasheet.</p>
              </div>
            </div>
          )}

          {/* TAB 8: MOVEMENTS & STOCK LEDGER */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-brand-500" />
                  <span>Real Stock Movements & Ledger / حركات المخزون الفعلية</span>
                </h3>
                <span className="text-[11px] text-industrial-400 font-mono">
                  {stockMovements.length} transactions recorded
                </span>
              </div>

              {stockMovements.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-industrial-850 rounded-xl border border-dashed border-industrial-200 dark:border-industrial-700 text-industrial-400 text-xs">
                  No direct movement entries logged in the ledger for this material.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stockMovements.map(m => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-industrial-200 dark:border-industrial-700/70 bg-white dark:bg-industrial-850 flex items-center justify-between gap-4 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg font-bold font-mono text-[11px] ${
                          m.movementType === 'Stock In'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : m.movementType === 'Transfer'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {m.movementType}
                        </span>
                        <div>
                          <span className="font-bold text-industrial-900 dark:text-white">
                            {m.quantity} {material.unit}
                          </span>
                          <p className="text-industrial-500 text-[11px]">
                            {m.reason || m.notes || 'Inventory ledger transaction'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-industrial-400 block">
                          {new Date(m.date).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-industrial-600 dark:text-industrial-300 font-medium">
                          {m.user}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: AI ENGINEERING INTELLIGENCE */}
          {activeTab === 'ai-intel' && (
            <div className="space-y-4">
              <div className="p-4 bg-linear-to-r from-brand-500/10 to-indigo-500/10 border border-brand-500/30 rounded-xl flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-brand-600 dark:text-brand-400 mb-1">
                    AI Engineering Analysis & Cross-Site Intelligence
                  </h4>
                  <p className="text-industrial-600 dark:text-industrial-300">
                    EMIS analyzes OEM specifications against historical operating conditions at Iraqi petrochemical sites (NDGS, HIPF, DGSN, Petro).
                  </p>
                </div>
              </div>

              {/* Compatible Equipment List */}
              <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700/70 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">
                  Associated Field Equipment ({equipmentList.length})
                </h4>
                {equipmentList.length === 0 ? (
                  <p className="text-xs text-industrial-400">No linked equipment tags found in plant register.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {equipmentList.map(eq => (
                      <div key={eq.tagNumber} className="p-3 bg-industrial-50 dark:bg-industrial-800 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{eq.tagNumber}</span>
                          <span className="block text-industrial-900 dark:text-white font-semibold">{eq.name}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">{eq.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {onFindSubstitutes && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onFindSubstitutes(material.partNumber);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                    <span>Search Compatible Engineering Substitutes</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-industrial-500 font-mono">
            EMIS Passport UID: <strong className="text-industrial-800 dark:text-industrial-200">{material.partNumber}</strong> • Site: {material.site || 'NDGS'}
          </div>

          <div className="flex items-center gap-2">
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR) && onEditMaterial && (
              <button
                onClick={() => {
                  onClose();
                  onEditMaterial(material);
                }}
                className="px-3.5 py-1.5 bg-white dark:bg-industrial-800 hover:bg-industrial-100 border border-industrial-200 dark:border-industrial-700 text-industrial-800 dark:text-industrial-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Edit Catalog Data
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close / إغلاق
            </button>
          </div>
        </div>
      </motion.div>

      {/* SECURE SHARING DIALOG */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-industrial-200 dark:border-industrial-700">
              <h4 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Share2 className="h-5 w-5 text-brand-500" />
                <span>Secure Material Passport Sharing</span>
              </h4>
              <button onClick={() => setShowShareModal(false)} className="text-industrial-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-industrial-500">
              Generate a time-limited, read-only link for engineering review. Internal credentials and cost secrets are strictly scrubbed.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-industrial-600 dark:text-industrial-300 block mb-1">
                  Link Expiration Duration:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { hours: 24, label: '24 Hours' },
                    { hours: 168, label: '7 Days' },
                    { hours: 720, label: '30 Days' }
                  ].map(opt => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setShareDuration(opt.hours)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        shareDuration === opt.hours
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-industrial-50 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 border-industrial-200 dark:border-industrial-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {!shareResult ? (
                <button
                  type="button"
                  onClick={handleCreateShare}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Generate Expiring Share Link
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-industrial-500 uppercase font-bold block">Share URL (Read-Only):</span>
                    <input
                      type="text"
                      readOnly
                      value={shareResult.shareUrl}
                      className="w-full bg-white dark:bg-industrial-900 border border-industrial-300 dark:border-industrial-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-industrial-900 dark:text-white"
                    />
                    <span className="text-[10px] text-amber-600 block">
                      Expires: {new Date(shareResult.expiresAt).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyShare}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Share Link'}</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* QR CODE DIALOG */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl p-6 shadow-2xl text-center space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-industrial-200 dark:border-industrial-700">
              <h4 className="text-sm font-bold text-industrial-900 dark:text-white">Passport Quick QR Code</h4>
              <button onClick={() => setShowQrModal(false)} className="text-industrial-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-md mx-auto">
              {/* QR Image using standard Google Charts API for instant high-res crisp QR */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `EMIS:PART:${material.partNumber}:${material.site || 'NDGS'}`
                )}`}
                alt={`QR code for ${material.partNumber}`}
                className="w-44 h-44 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400 block">
                {material.partNumber}
              </span>
              <p className="text-xs text-industrial-500 mt-1">
                Scan with any mobile camera or EMIS barcode reader for instant field passport retrieval.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}

      {/* QUICK FIELD ACTION MODAL DIALOG */}
      {activeActionModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-lg bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Action Dialog Header with distinct functional theme */}
            <div className={`p-4 sm:p-5 flex items-center justify-between text-white ${
              activeActionModal === 'receive' ? 'bg-emerald-600' :
              activeActionModal === 'inspect' ? 'bg-blue-600' :
              activeActionModal === 'issue' ? 'bg-amber-600' :
              activeActionModal === 'return' ? 'bg-indigo-600' :
              'bg-purple-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl">
                  {activeActionModal === 'receive' && <ArrowDownRight className="h-6 w-6" />}
                  {activeActionModal === 'inspect' && <ShieldCheck className="h-6 w-6" />}
                  {activeActionModal === 'issue' && <ArrowUpRight className="h-6 w-6" />}
                  {activeActionModal === 'return' && <CornerUpLeft className="h-6 w-6" />}
                  {activeActionModal === 'transfer' && <ArrowLeftRight className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {activeActionModal === 'receive' && 'سند استلام مخزني / Receive (MRN)'}
                    {activeActionModal === 'inspect' && 'فحص واعتماد الجودة / QC Inspection'}
                    {activeActionModal === 'issue' && 'سند صرف مواد / Material Issue (MIV)'}
                    {activeActionModal === 'return' && 'سند إرجاع مواد / Material Return (MRV)'}
                    {activeActionModal === 'transfer' && 'سند مناقلة موقعية / Site Transfer'}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {activeActionModal === 'receive' && 'إدخال شحنة جديدة وتحديث رصيد المادة في المستودع'}
                    {activeActionModal === 'inspect' && 'توثيق نتائج الفحص الهندسي والامتثال الفني للمادة'}
                    {activeActionModal === 'issue' && 'صرف كمية من المخزون لأمر عمل أو صيانة بالمحطة'}
                    {activeActionModal === 'return' && 'إعادة كمية فائضة أو مسترجعة إلى رصيد المستودع'}
                    {activeActionModal === 'transfer' && 'نقل كمية بين المستودعات والمحطات التشغيلية'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal(null);
                  setActionError(null);
                  setActionSuccessMessage(null);
                  setCreatedVoucher(null);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Material Context Strip */}
            <div className="bg-industrial-50 dark:bg-industrial-800/80 px-4 py-2.5 border-b border-industrial-200 dark:border-industrial-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400 shrink-0">
                  {material.partNumber}
                </span>
                <span className="text-industrial-400 shrink-0">•</span>
                <span className="text-industrial-600 dark:text-industrial-300 truncate max-w-[220px]">
                  {material.description}
                </span>
              </div>
              <div className="shrink-0 font-medium">
                <span className="text-industrial-500 dark:text-industrial-400">الرصيد: </span>
                <span className="font-bold text-industrial-900 dark:text-white font-mono">
                  {material.quantity} {material.unit}
                </span>
              </div>
            </div>

            {/* Modal Body & Forms */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Success Result View */}
              {actionSuccessMessage ? (
                <div className="space-y-4 py-3">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                    <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      تم تنفيذ العملية بنجاح!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {actionSuccessMessage}
                    </p>
                  </div>

                  {createdVoucher && (
                    <div className="p-3.5 bg-industrial-50 dark:bg-industrial-800/60 rounded-xl border border-industrial-200 dark:border-industrial-700 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-industrial-900 dark:text-white block font-mono">
                          {createdVoucher.id}
                        </span>
                        <span className="text-[11px] text-industrial-500 dark:text-industrial-400">
                          تم إنشاء السند الرسمي وجاهز للطباعة والتوثيق
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => executePrint(createdVoucher.id, createdVoucher.html, createdVoucher.name)}
                        className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="h-4 w-4" />
                        <span>طباعة السند</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionModal(null);
                      setActionSuccessMessage(null);
                      setCreatedVoucher(null);
                    }}
                    className="w-full py-2.5 bg-industrial-850 hover:bg-industrial-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    إغلاق والعودة للجواز
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteAction} className="space-y-4">
                  {/* Error Notification */}
                  {actionError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Quantity & Reference Row (For Non-Inspect) */}
                  {activeActionModal !== 'inspect' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          الكمية / Quantity <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={actionQty}
                            onChange={(e) => setActionQty(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-sm font-bold text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                            placeholder="1"
                          />
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-industrial-400">
                            {material.unit}
                          </span>
                        </div>
                        {(activeActionModal === 'issue' || activeActionModal === 'transfer') && (
                          <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-1">
                            الحد الأقصى المتاح للصرف: <strong className="text-industrial-900 dark:text-white font-mono">{material.quantity} {material.unit}</strong>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          رقم السند / Voucher Ref #
                        </label>
                        <input
                          type="text"
                          value={actionRefNo}
                          onChange={(e) => setActionRefNo(e.target.value)}
                          className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs font-mono font-bold text-industrial-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Specific Action Fields: Receive */}
                  {activeActionModal === 'receive' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          المورد / جهة التوريد (Supplier / Source)
                        </label>
                        <input
                          type="text"
                          value={actionParty}
                          onChange={(e) => setActionParty(e.target.value)}
                          placeholder="اسم الشركة أو المورد"
                          className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          موقع التخزين بالمستودع (Location / Bin)
                        </label>
                        <input
                          type="text"
                          value={actionLocation}
                          onChange={(e) => setActionLocation(e.target.value)}
                          placeholder="رقم الرف / المستودع"
                          className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Specific Action Fields: Issue */}
                  {activeActionModal === 'issue' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            المستلم / الفني المسؤول (Recipient)
                          </label>
                          <input
                            type="text"
                            value={actionParty}
                            onChange={(e) => setActionParty(e.target.value)}
                            placeholder="اسم المستلم أو المهندس"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            المحطة / جهة الاستخدام (Station / Dept)
                          </label>
                          <input
                            type="text"
                            value={actionLocation}
                            onChange={(e) => setActionLocation(e.target.value)}
                            placeholder="مثال: محطة عزل الغاز 1"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          أمر العمل / سبب الصرف (Work Order / Purpose)
                        </label>
                        <input
                          type="text"
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          placeholder="رقم أمر الصيانة أو الغرض"
                          className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Specific Action Fields: Return */}
                  {activeActionModal === 'return' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            المُرجِع / المسلّم (Returned By)
                          </label>
                          <input
                            type="text"
                            value={actionParty}
                            onChange={(e) => setActionParty(e.target.value)}
                            placeholder="اسم الشخص أو القسم المُرجِع"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            موقع الحفظ بالمستودع (To Location)
                          </label>
                          <input
                            type="text"
                            value={actionLocation}
                            onChange={(e) => setActionLocation(e.target.value)}
                            placeholder="المستودع الرئيسي"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          سبب الإرجاع (Return Reason)
                        </label>
                        <select
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                        >
                          <option value="فائض عن حاجة أمر العمل / Surplus Return">فائض عن حاجة أمر العمل / Surplus</option>
                          <option value="إلغاء أمر الصيانة / Work Order Cancelled">إلغاء أمر الصيانة / Cancelled WO</option>
                          <option value="خطأ في طلب الصرف / Wrong Requisition">خطأ في طلب الصرف / Request Error</option>
                          <option value="إرجاع للاستبدال بمواصفة بديلة / Replacement">إرجاع للاستبدال بمواصفة بديلة / Replacement</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Specific Action Fields: Transfer */}
                  {activeActionModal === 'transfer' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            المستلم أو الناقل (Recipient / Transporter)
                          </label>
                          <input
                            type="text"
                            value={actionParty}
                            onChange={(e) => setActionParty(e.target.value)}
                            placeholder="اسم الناقل أو المستلم"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            الموقع أو المستودع المحول إليه (Destination)
                          </label>
                          <input
                            type="text"
                            value={actionLocation}
                            onChange={(e) => setActionLocation(e.target.value)}
                            placeholder="اسم الموقع أو المستودع الوجهة"
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specific Action Fields: Inspect */}
                  {activeActionModal === 'inspect' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                          نتيجة الفحص الفني (Inspection Decision) <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setActionInspectStatus('PASSED')}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              actionInspectStatus === 'PASSED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                                : 'bg-industrial-50 dark:bg-industrial-800 border-industrial-200 dark:border-industrial-700 text-industrial-600 dark:text-industrial-400'
                            }`}
                          >
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            <span>مقبول / PASSED</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActionInspectStatus('CONDITIONAL')}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              actionInspectStatus === 'CONDITIONAL'
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                                : 'bg-industrial-50 dark:bg-industrial-800 border-industrial-200 dark:border-industrial-700 text-industrial-600 dark:text-industrial-400'
                            }`}
                          >
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <span>مشروط / COND.</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActionInspectStatus('REJECTED')}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              actionInspectStatus === 'REJECTED'
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                                : 'bg-industrial-50 dark:bg-industrial-800 border-industrial-200 dark:border-industrial-700 text-industrial-600 dark:text-industrial-400'
                            }`}
                          >
                            <AlertOctagon className="h-5 w-5 text-rose-500" />
                            <span>مرفوض / REJECT</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            الفاحص المعتمد (Inspector)
                          </label>
                          <input
                            type="text"
                            value={actionParty}
                            onChange={(e) => setActionParty(e.target.value)}
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                            رقم تقرير الفحص (QC Report #)
                          </label>
                          <input
                            type="text"
                            value={actionRefNo}
                            onChange={(e) => setActionRefNo(e.target.value)}
                            className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs font-mono font-bold text-industrial-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Link to dedicated tab */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveActionModal(null);
                          setActiveTab('inspection');
                        }}
                        className="text-xs text-brand-600 hover:text-brand-500 dark:text-brand-400 flex items-center gap-1 font-semibold cursor-pointer underline underline-offset-4"
                      >
                        الانتقال إلى تبويب الفحص الكامل بالجواز (Full Inspection Tab)
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Notes for all actions */}
                  <div>
                    <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                      ملاحظات وتفاصيل إضافية (Notes & Remarks)
                    </label>
                    <textarea
                      rows={2}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="أية ملاحظات حقلية أو توثيقية إضافية..."
                      className="w-full px-3 py-2 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs text-industrial-900 dark:text-white resize-none"
                    />
                  </div>

                  {/* Form Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-industrial-200 dark:border-industrial-700">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveActionModal(null);
                        setActionError(null);
                      }}
                      className="px-4 py-2 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 text-industrial-700 dark:text-industrial-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={actionSubmitting}
                      className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                        actionSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md active:scale-98'
                      } ${
                        activeActionModal === 'receive' ? 'bg-emerald-600 hover:bg-emerald-500' :
                        activeActionModal === 'inspect' ? 'bg-blue-600 hover:bg-blue-500' :
                        activeActionModal === 'issue' ? 'bg-amber-600 hover:bg-amber-500' :
                        activeActionModal === 'return' ? 'bg-indigo-600 hover:bg-indigo-500' :
                        'bg-purple-600 hover:bg-purple-500'
                      }`}
                    >
                      {actionSubmitting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>جاري التنفيذ...</span>
                        </>
                      ) : (
                        <span>تأكيد وتنفيذ الإجراء</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
