/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Cpu,
  Database,
  Tag,
  Warehouse,
  FileText,
  Boxes,
  Lock,
  X,
  RefreshCw,
  Check,
  Hash,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Material, User, UserRole, MaterialSerialNumber, MaterialHistoryEvent, MaterialTransactionEvent } from '../types';
import { dbService } from '../services/dbService';
import { apiAutoCompleteMaterial } from '../services/apiClient';
import NameplateScanner from './NameplateScanner';

interface AddMaterialViewProps {
  materials: Material[];
  currentUser: User;
  onAddMaterialSuccess: () => void;
  initialPrefillData?: Record<string, string | null> | null;
  onClearPrefill?: () => void;
}

export default function AddMaterialView({ 
  materials, 
  currentUser, 
  onAddMaterialSuccess,
  initialPrefillData,
  onClearPrefill
}: AddMaterialViewProps) {
  // Form State
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [installationLocation, setInstallationLocation] = useState('');
  const [woNumber, setWoNumber] = useState('');
  const [mrfNumber, setMrfNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('pcs');
  const [station, setStation] = useState('ZFOD Warehouse');
  const [store, setStore] = useState('Electronics Lab (Lab A)');
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [notes, setNotes] = useState('');
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [prefillAlert, setPrefillAlert] = useState<string | null>(null);

  // Available stations from database & custom history
  const [availableStations, setAvailableStations] = useState<string[]>(() => dbService.getAvailableStations());

  // Master Warehouses from Port 10 Master Data
  const masterWarehouses = useMemo(() => dbService.getWarehouses(), []);

  // Apply initial prefill data if passed from scanner
  useEffect(() => {
    if (initialPrefillData) {
      if (initialPrefillData.partNumber) setPartNumber(initialPrefillData.partNumber);
      if (initialPrefillData.manufacturer) setManufacturer(initialPrefillData.manufacturer);
      if (initialPrefillData.model) setModel(initialPrefillData.model);
      if (initialPrefillData.serialNumber) setSerialNumber(initialPrefillData.serialNumber);
      if (initialPrefillData.tagNumber) setTagNumber(initialPrefillData.tagNumber);
      if (initialPrefillData.installationLocation) setInstallationLocation(initialPrefillData.installationLocation);
      if (initialPrefillData.tagLocation) setInstallationLocation(initialPrefillData.tagLocation);
      if (initialPrefillData.woNumber) setWoNumber(initialPrefillData.woNumber);
      if (initialPrefillData.workOrder) setWoNumber(initialPrefillData.workOrder);
      if (initialPrefillData.mrfNumber) setMrfNumber(initialPrefillData.mrfNumber);
      if (initialPrefillData.mrf) setMrfNumber(initialPrefillData.mrf);
      if (initialPrefillData.mrfReference) setMrfNumber(initialPrefillData.mrfReference);
      if (initialPrefillData.mrReference) setMrfNumber(initialPrefillData.mrReference);
      if (initialPrefillData.description) setDescription(initialPrefillData.description);
      else if (initialPrefillData.manufacturer && initialPrefillData.model) {
        setDescription(`${initialPrefillData.manufacturer} ${initialPrefillData.model} Industrial Component`);
      }
      if (initialPrefillData.station) setStation(initialPrefillData.station);
      if (initialPrefillData.store) setStore(initialPrefillData.store);
      if (initialPrefillData.rack) setRack(initialPrefillData.rack);
      if (initialPrefillData.shelf) setShelf(initialPrefillData.shelf);
      
      let extraNotes = '';
      if (initialPrefillData.voltage) extraNotes += `Voltage: ${initialPrefillData.voltage}\n`;
      if (initialPrefillData.current) extraNotes += `Current: ${initialPrefillData.current}\n`;
      if (initialPrefillData.power) extraNotes += `Power: ${initialPrefillData.power}\n`;
      if (initialPrefillData.barcode) extraNotes += `Barcode: ${initialPrefillData.barcode}\n`;
      if (initialPrefillData.qrCode) extraNotes += `QR: ${initialPrefillData.qrCode}\n`;

      if (extraNotes) {
        setNotes(prev => prev ? `${prev}\n\n-- Scanned Data --\n${extraNotes}` : `-- Scanned Data --\n${extraNotes}`);
      }

      setPrefillAlert(`✨ تم تعبئة بيانات الصنف الجديد تلقائياً من المسح الضوئي (Part: ${initialPrefillData.partNumber || 'N/A'}) وتطبيق التسلسل المنظم.`);
      
      if (onClearPrefill) {
        onClearPrefill();
      }
    }
  }, [initialPrefillData]);

  // Sequential Order State (Auto & Manual sequence numbering)
  const nextSuggestedSequence = useMemo(() => {
    const existingSeqs = materials
      .map(m => m.sequence)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);
    return existingSeqs.length > 0 ? Math.max(...existingSeqs) + 1 : 1;
  }, [materials]);

  const [sequence, setSequence] = useState<number | ''>(nextSuggestedSequence);
  const [isAutoSequence, setIsAutoSequence] = useState<boolean>(true);

  // Keep sequence synced when auto-mode is enabled and materials update
  useEffect(() => {
    if (isAutoSequence) {
      setSequence(nextSuggestedSequence);
    }
  }, [nextSuggestedSequence, isAutoSequence]);

  // Duplicate Dialog States
  const [existingMatchMaterial, setExistingMatchMaterial] = useState<Material | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [dupTab, setDupTab] = useState<'qty' | 'serial' | 'docs' | 'location' | 'notes' | 'merge'>('qty');

  // Duplicate Dialog Field States
  const [dupQtyAdd, setDupQtyAdd] = useState<number>(0);
  const [dupNewSerial, setDupNewSerial] = useState('');
  const [dupSerialStatus, setDupSerialStatus] = useState<'Available' | 'Installed' | 'Reserved' | 'Damaged'>('Available');
  const [dupSerialEq, setDupSerialEq] = useState('');
  const [dupSerialDate, setDupSerialDate] = useState('');
  const [dupSerialNotes, setDupSerialNotes] = useState('');
  
  const [dupDatasheetName, setDupDatasheetName] = useState('');
  const [dupCocName, setDupCocName] = useState('');
  const [dupMaintName, setDupMaintName] = useState('');
  const [dupPhotoNameplate, setDupPhotoNameplate] = useState('');

  const [dupStore, setDupStore] = useState('');
  const [dupRack, setDupRack] = useState('');
  const [dupShelf, setDupShelf] = useState('');
  const [dupNotesAppend, setDupNotesAppend] = useState('');

  // AI Scanner integration callback
  const handleScanSuccess = (data: any) => {
    if (data.partNumber) handlePartNumberChange(data.partNumber);
    if (data.manufacturer) setManufacturer(data.manufacturer);
    if (data.model) setModel(data.model);
    if (data.serialNumber) setSerialNumber(data.serialNumber);
    
    // Auto populate description if empty
    if (data.manufacturer && data.model && !description) {
      setDescription(`${data.manufacturer} ${data.model} Industrial Component`);
    }

    // Build notes from electrical specifications
    let specs = '';
    if (data.serialNumber) specs += `Serial Number: ${data.serialNumber}\n`;
    if (data.voltage) specs += `Voltage: ${data.voltage}\n`;
    if (data.current) specs += `Current: ${data.current}\n`;
    if (data.power) specs += `Power: ${data.power}\n`;
    if (data.output) specs += `Output: ${data.output}\n`;
    if (data.input) specs += `Input: ${data.input}\n`;
    if (data.frequency) specs += `Frequency: ${data.frequency}\n`;
    if (data.revision) specs += `Revision Code: ${data.revision}\n`;
    if (data.manufactureDate) specs += `Manufacture Date: ${data.manufactureDate}\n`;
    if (data.countryOfOrigin) specs += `Country of Origin: ${data.countryOfOrigin}\n`;
    if (data.certificationMarks) specs += `Certification Marks: ${data.certificationMarks}\n`;
    if (data.barcode) specs += `Barcode: ${data.barcode}\n`;
    if (data.qrCode) specs += `QR Code: ${data.qrCode}\n`;

    if (specs) {
      setNotes(prev => prev ? `${prev}\n\n-- AI Nameplate Scan --\n${specs}` : `-- AI Nameplate Scan --\n${specs}`);
    }
  };

  // OEM Verification Form State
  const [oemVerificationStatus, setOemVerificationStatus] = useState<'verified' | 'authorized' | 'alternative' | 'pending'>('pending');
  const [oemCertificateId, setOemCertificateId] = useState('');
  const [oemVerificationNotes, setOemVerificationNotes] = useState('');

  // Status State
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [collisionPart, setCollisionPart] = useState<string | null>(null);
  const [isAutoEnriching, setIsAutoEnriching] = useState(false);
  const [aiEnrichSuccess, setAiEnrichSuccess] = useState<string | null>(null);

  // Gemini AI Auto-Enrichment handler
  const handleAiEnrich = async () => {
    if (!partNumber.trim() && !model.trim() && !description.trim() && !manufacturer.trim()) {
      setError('يرجى كتابة رقم القطعة (Part Number) أو اسم المصنع / الطراز أولاً ليقوم الذكاء الاصطناعي بالتعرف عليه وإكمال البيانات.');
      return;
    }

    setError(null);
    setIsAutoEnriching(true);
    setAiEnrichSuccess(null);

    try {
      const enriched = await apiAutoCompleteMaterial({
        partNumber: partNumber.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        description: description.trim(),
        scannedText: notes
      });

      if (enriched.description) setDescription(enriched.description);
      if (enriched.manufacturer) setManufacturer(enriched.manufacturer);
      if (enriched.model && (!model || model === 'N/A')) setModel(enriched.model);
      if (enriched.unit) setUnit(enriched.unit);
      if (enriched.minStockLevel && enriched.minStockLevel > 0) setMinStockLevel(enriched.minStockLevel);
      if (enriched.suggestedStore) setStore(enriched.suggestedStore);

      // Build structured engineering notes
      const specBlock = `\n--- ⚡ المواصفات الفنية المعتمدة (Gemini Engineering Specs) ---\n` +
        `• الوصف الفني: ${enriched.technicalSummary || 'N/A'}\n` +
        `• الجهد التشغيلي: ${enriched.voltage || 'N/A'}\n` +
        `• التيار: ${enriched.current || 'N/A'}\n` +
        `• القدرة: ${enriched.power || 'N/A'}\n` +
        `• إشارة الإخراج: ${enriched.signalOutput || 'N/A'}\n` +
        `• النطاق التشغيلي: ${enriched.operatingRange || 'N/A'}\n` +
        `• درجة الحماية: ${enriched.ipRating || 'N/A'}\n` +
        `• شهادات المناطق الخطرة: ${enriched.hazardousCertification || 'N/A'}\n` +
        `• تعليمات الأمان بالمستودع: ${enriched.safetyNotes || 'N/A'}\n`;

      setNotes(prev => prev ? `${prev}\n${specBlock}` : specBlock.trim());
      setAiEnrichSuccess(`✨ تم استخراج وإكمال المواصفات الفنية بالذكاء الاصطناعي بنجاح (${enriched.manufacturer} ${enriched.model || ''})`);
    } catch (err: any) {
      console.error("AI Enrich Error:", err);
      setError('تعذر إكمال البيانات عبر الذكاء الاصطناعي حالياً. يرجى التحقق من الاتصال بالشبكة.');
    } finally {
      setIsAutoEnriching(false);
    }
  };

  // Checks in real-time for Part Number collision
  const handlePartNumberChange = (val: string) => {
    const cleaned = val.trim();
    setPartNumber(val);
    if (!cleaned) {
      setCollisionPart(null);
      return;
    }
    const exists = materials.some(
      m => m.partNumber.trim().toUpperCase() === cleaned.toUpperCase()
    );
    if (exists) {
      setCollisionPart(cleaned);
    } else {
      setCollisionPart(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const finalSeq = isAutoSequence 
      ? nextSuggestedSequence 
      : (typeof sequence === 'number' && sequence > 0 ? sequence : nextSuggestedSequence);

    const isAutoPN = !partNumber.trim();
    const finalPartNumber = partNumber.trim();

    if (!description.trim()) {
      setError('A brief description is required.');
      return;
    }
    if (!manufacturer.trim()) {
      setError('Manufacturer is required.');
      return;
    }

    // Perform thorough duplicate detection (only for explicit non-empty part numbers):
    const normalizedPartNumber = finalPartNumber.trim().toUpperCase();
    const normalizedMfg = manufacturer.trim().toUpperCase();
    const normalizedModel = model.trim().toUpperCase();
    const normalizedSerial = serialNumber.trim().toUpperCase();

    let match = (!normalizedPartNumber || isAutoPN) ? undefined : materials.find(m => m.partNumber && m.partNumber.trim().toUpperCase() === normalizedPartNumber);
    
    if (!match && manufacturer.trim() && model.trim()) {
      match = materials.find(m => 
        m.manufacturer.trim().toUpperCase() === normalizedMfg && 
        m.model.trim().toUpperCase() === normalizedModel
      );
    }

    if (!match && normalizedSerial) {
      match = materials.find(m => 
        m.serialNumbers?.some(sn => sn.serialNumber.toUpperCase() === normalizedSerial)
      );
    }

    // If an existing material is matched, open the duplicate handling dialogue instead of creating a new record
    if (match) {
      setExistingMatchMaterial(match);
      setDupStore(match.store);
      setDupRack(match.rack || '');
      setDupShelf(match.shelf || '');
      setDupQtyAdd(quantity || 0);
      setDupNewSerial(serialNumber || '');
      setShowDuplicateDialog(true);
      return;
    }

    // Build serial number array if initial serial was provided
    const initialSerials = serialNumber.trim() ? [{
      serialNumber: serialNumber.trim(),
      status: 'Available' as const,
      photos: [],
      maintenanceHistory: [],
      calibrationHistory: []
    }] : [];

    const payload = {
      sequence: finalSeq,
      partNumber: finalPartNumber,
      isPartNumberAutoGenerated: isAutoPN,
      description: description.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim() || 'N/A',
      tagNumber: tagNumber.trim() || undefined,
      installationLocation: installationLocation.trim() || undefined,
      tagLocation: installationLocation.trim() || undefined,
      woNumber: woNumber.trim() || undefined,
      workOrder: woNumber.trim() || undefined,
      mrfNumber: mrfNumber.trim() || undefined,
      mrf: mrfNumber.trim() || undefined,
      mrfReference: mrfNumber.trim() || undefined,
      mrReference: mrfNumber.trim() || undefined,
      quantity: Math.max(0, quantity),
      unit: unit,
      station: station.trim() || 'ZFOD Warehouse',
      store: store,
      rack: rack.trim() || 'N/A',
      shelf: shelf.trim() || 'N/A',
      notes: notes.trim(),
      minStockLevel: Math.max(0, minStockLevel),
      serialNumbers: initialSerials,
      healthScore: 85, // Default health score for newly registered materials
      oemVerified: oemVerificationStatus === 'verified' || oemVerificationStatus === 'authorized',
      oemVerificationStatus: oemVerificationStatus,
      oemCertificateId: oemCertificateId.trim(),
      oemVerifiedBy: (oemVerificationStatus === 'verified' || oemVerificationStatus === 'authorized') ? currentUser.name : '',
      oemVerificationDate: (oemVerificationStatus === 'verified' || oemVerificationStatus === 'authorized') ? new Date().toISOString() : '',
      oemVerificationNotes: oemVerificationNotes.trim()
    };

    const result = dbService.addMaterial(payload as any, currentUser);
    if (result.success) {
      // Port 10: Dispatch Transaction Alert Email & Audit
      const eventPayload: MaterialTransactionEvent = {
        eventId: `evt-mat-create-${Date.now()}`,
        timestamp: new Date().toISOString(),
        transactionType: 'NEW_MATERIAL',
        materialId: payload.partNumber,
        partNumber: payload.partNumber,
        description: payload.description,
        manufacturer: payload.manufacturer,
        model: payload.model,
        warehouse: payload.store,
        site: currentUser.site || 'NDGS',
        quantityAdded: payload.quantity,
        previousQuantity: 0,
        currentQuantity: payload.quantity,
        unit: payload.unit,
        user: currentUser.name,
        userId: currentUser.id,
        userRole: currentUser.role,
        notes: payload.notes || 'Created via Add Material form'
      };
      dbService.sendMaterialAlertEmail(eventPayload);

      if (station && station.trim()) {
        dbService.saveCustomStation(station.trim());
      }

      setSuccess(true);
      // Reset form
      setPartNumber('');
      setDescription('');
      setManufacturer('');
      setModel('');
      setTagNumber('');
      setInstallationLocation('');
      setWoNumber('');
      setMrfNumber('');
      setQuantity(0);
      setUnit('pcs');
      setStore('Electronics Lab (Lab A)');
      setRack('');
      setShelf('');
      setNotes('');
      setMinStockLevel(10);
      setCollisionPart(null);
      setIsAutoSequence(true);
      setSequence(nextSuggestedSequence + 1);
      setOemVerificationStatus('pending');
      setOemCertificateId('');
      setOemVerificationNotes('');
      
      // Auto trigger parent callback with standard timeout
      setTimeout(() => {
        onAddMaterialSuccess();
      }, 1000);
    } else {
      setError(result.error || 'Failed to persist material in local database.');
    }
  };

  const handleDuplicateResolve = (actionType: 'adjust' | 'merge') => {
    if (!existingMatchMaterial) return;

    // Create a copy to work with
    const updatedMaterial = { ...existingMatchMaterial };

    // Initialize fields if undefined
    if (!updatedMaterial.serialNumbers) updatedMaterial.serialNumbers = [];
    if (!updatedMaterial.documents) updatedMaterial.documents = {};
    if (!updatedMaterial.photos) updatedMaterial.photos = { nameplate: [], installation: [], warehouse: [], other: [] };
    if (!updatedMaterial.history) updatedMaterial.history = [];

    let resolveDetails = `Duplicate material resolution (${actionType === 'merge' ? 'Merge Records' : 'Update Existing'}). `;

    if (actionType === 'adjust') {
      // 1. Quantity adjust
      if (dupQtyAdd > 0) {
        updatedMaterial.quantity = (updatedMaterial.quantity || 0) + dupQtyAdd;
        resolveDetails += `Increased stock by ${dupQtyAdd} ${updatedMaterial.unit || 'pcs'}. `;
      }

      // 2. Add a new Serial Number
      if (dupNewSerial.trim()) {
        const serialExists = updatedMaterial.serialNumbers.some(sn => sn.serialNumber.trim().toUpperCase() === dupNewSerial.trim().toUpperCase());
        if (!serialExists) {
          const newSN: MaterialSerialNumber = {
            serialNumber: dupNewSerial.trim(),
            status: dupSerialStatus,
            equipmentLocation: dupSerialEq.trim() || undefined,
            installationDate: dupSerialDate || undefined,
            photos: dupPhotoNameplate ? [dupPhotoNameplate] : [],
            maintenanceHistory: dupSerialNotes.trim() ? [
              {
                id: `sn-maint-${Date.now()}`,
                type: 'system',
                details: dupSerialNotes.trim(),
                performedBy: currentUser.name,
                date: new Date().toISOString().split('T')[0]
              }
                ] : []
          };
          updatedMaterial.serialNumbers.push(newSN);
          resolveDetails += `Added serial number: ${dupNewSerial.trim()} (${dupSerialStatus}). `;
        }
      }

      // 3. Upload Additional Documents
      if (dupDatasheetName.trim()) {
        updatedMaterial.documents.datasheet = {
          name: dupDatasheetName.trim(),
          fileName: `${dupDatasheetName.trim().toLowerCase().replace(/\s+/g, '_')}.pdf`,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          fileSize: '2.4 MB'
        };
        resolveDetails += `Uploaded Datasheet: ${dupDatasheetName.trim()}. `;
      }

      if (dupCocName.trim()) {
        updatedMaterial.documents.coc = {
          name: dupCocName.trim(),
          fileName: `${dupCocName.trim().toLowerCase().replace(/\s+/g, '_')}_coc.pdf`,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          fileSize: '1.1 MB'
        };
        resolveDetails += `Uploaded COC Certificate: ${dupCocName.trim()}. `;
      }

      if (dupMaintName.trim()) {
        updatedMaterial.documents.inspectionReport = {
          name: dupMaintName.trim(),
          fileName: `${dupMaintName.trim().toLowerCase().replace(/\s+/g, '_')}_report.pdf`,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          fileSize: '3.1 MB'
        };
        resolveDetails += `Uploaded Maintenance Record: ${dupMaintName.trim()}. `;
      }

      if (dupPhotoNameplate) {
        updatedMaterial.photos.nameplate.push(dupPhotoNameplate);
        resolveDetails += `Uploaded new Nameplate Image. `;
      }

      // 4. Update Location
      if (dupStore && dupStore !== updatedMaterial.store) {
        resolveDetails += `Storage Store Room changed from ${updatedMaterial.store} to ${dupStore}. `;
        updatedMaterial.store = dupStore;
      }
      if (dupRack && dupRack !== updatedMaterial.rack) {
        resolveDetails += `Rack location changed from ${updatedMaterial.rack} to ${dupRack}. `;
        updatedMaterial.rack = dupRack;
      }
      if (dupShelf && dupShelf !== updatedMaterial.shelf) {
        resolveDetails += `Shelf location changed from ${updatedMaterial.shelf} to ${dupShelf}. `;
        updatedMaterial.shelf = dupShelf;
      }

      // 5. Update Engineering Notes
      if (dupNotesAppend.trim()) {
        updatedMaterial.engineeringNotes = updatedMaterial.engineeringNotes 
          ? `${updatedMaterial.engineeringNotes}\n\n[Update ${new Date().toLocaleDateString()} by ${currentUser.name}]: ${dupNotesAppend.trim()}`
          : `[Update ${new Date().toLocaleDateString()} by ${currentUser.name}]: ${dupNotesAppend.trim()}`;
        resolveDetails += `Appended engineering notes. `;
      }
    } else {
      // MERGE ACTION: Merge duplicate records
      if (description.trim() && description !== updatedMaterial.description) {
        updatedMaterial.description = description.trim();
      }
      if (manufacturer.trim() && manufacturer !== updatedMaterial.manufacturer) {
        updatedMaterial.manufacturer = manufacturer.trim();
      }
      if (model.trim() && model !== 'N/A' && model !== updatedMaterial.model) {
        updatedMaterial.model = model.trim();
      }
      if (quantity > 0) {
        updatedMaterial.quantity += quantity;
        resolveDetails += `Merged Stock (+${quantity} ${unit}). `;
      }
      if (serialNumber.trim()) {
        const serialExists = updatedMaterial.serialNumbers.some(sn => sn.serialNumber.trim().toUpperCase() === serialNumber.trim().toUpperCase());
        if (!serialExists) {
          updatedMaterial.serialNumbers.push({
            serialNumber: serialNumber.trim(),
            status: 'Available',
            photos: [],
            maintenanceHistory: []
          });
          resolveDetails += `Merged Serial: ${serialNumber.trim()}. `;
        }
      }
      if (store && store !== updatedMaterial.store) {
        updatedMaterial.store = store;
      }
      if (rack.trim() && rack !== 'N/A' && rack !== updatedMaterial.rack) {
        updatedMaterial.rack = rack.trim();
      }
      if (shelf.trim() && shelf !== 'N/A' && shelf !== updatedMaterial.shelf) {
        updatedMaterial.shelf = shelf.trim();
      }
      if (notes.trim()) {
        updatedMaterial.notes = updatedMaterial.notes 
          ? `${updatedMaterial.notes}\n\n[Merged notes on ${new Date().toLocaleDateString()}]: ${notes.trim()}`
          : notes.trim();
        resolveDetails += `Merged notes. `;
      }
    }

    // Add final history event
    const historyEvent: MaterialHistoryEvent = {
      id: `hist-dup-${Date.now()}`,
      action: 'Duplicate Resolved',
      details: resolveDetails,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    };
    updatedMaterial.history.push(historyEvent);
    updatedMaterial.updatedAt = new Date().toISOString();

    // Persist changes
    const result = dbService.updateMaterial(updatedMaterial, currentUser);
    if (result.success) {
      // Port 10: Dispatch Transaction Alert Email for existing material updates
      const eventPayload: MaterialTransactionEvent = {
        eventId: `evt-mat-update-${Date.now()}`,
        timestamp: new Date().toISOString(),
        transactionType: 'EXISTING_MATERIAL_QUANTITY_CHANGED',
        materialId: updatedMaterial.partNumber,
        partNumber: updatedMaterial.partNumber,
        description: updatedMaterial.description,
        manufacturer: updatedMaterial.manufacturer,
        model: updatedMaterial.model,
        warehouse: updatedMaterial.store,
        site: currentUser.site || 'NDGS',
        quantityAdded: dupQtyAdd || quantity || 0,
        previousQuantity: existingMatchMaterial.quantity || 0,
        currentQuantity: updatedMaterial.quantity || 0,
        unit: updatedMaterial.unit,
        user: currentUser.name,
        userId: currentUser.id,
        userRole: currentUser.role,
        notes: resolveDetails
      };
      dbService.sendMaterialAlertEmail(eventPayload);

      setSuccess(true);
      setShowDuplicateDialog(false);
      setTimeout(() => {
        onAddMaterialSuccess();
      }, 1500);
    } else {
      setError(result.error || 'Failed to update matched material.');
      setShowDuplicateDialog(false);
    }
  };

  const isWritable = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ENGINEER;

  if (!isWritable) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-industrial-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4" id="add-material-locked">
        <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full border border-red-100">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold tracking-tight text-industrial-800 heading-display">Clearance Level Insufficient</h2>
        <p className="text-xs text-industrial-500 leading-normal">
          Your current account role is <span className="font-mono text-red-600 uppercase font-semibold">[{currentUser.role}]</span>. 
          Registration of new hardware or materials is strictly reserved for Admin and Engineer clearance tiers.
        </p>
        <div className="p-3.5 bg-industrial-50 border border-industrial-200 rounded-xl text-[11px] text-industrial-600 text-left font-mono leading-relaxed">
          - View-only ledger operations are authorized.<br />
          - Database write actions rejected.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5" id="add-material-view">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
          <PlusCircle className="h-5.5 w-5.5 text-brand-600" /> Material Registry Portal
        </h2>
        <p className="text-xs text-industrial-500 mt-1">
          Add new physical items or electronic hardware to the centralized ledger. All additions are integrity-checked.
        </p>
      </div>

      {prefillAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-brand-50 border border-brand-300 text-brand-900 text-xs rounded-xl flex items-center justify-between gap-3 shadow-xs"
          id="add-material-prefill-alert"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-brand-600 shrink-0" />
            <div>
              <p className="font-bold">{prefillAlert}</p>
              <p className="text-[11px] text-brand-700 mt-0.5">تم تخصيص التسلسل المنظم التالي (#{sequence}) تلقائياً. يمكنك مراجعة البيانات والضغط على حفظ.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setPrefillAlert(null)}
            className="text-brand-600 hover:text-brand-900 p-1 rounded-lg hover:bg-brand-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-3"
          id="add-material-success"
        >
          <CheckCircle className="h-5.5 w-5.5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold">Material SKU Successfully Registered</p>
            <p className="text-[10px] mt-0.5">Database indexed. Returning you to the master materials ledger...</p>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl flex items-start gap-3"
          id="add-material-error"
        >
          <AlertTriangle className="h-5.5 w-5.5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Write Operation Failed</p>
            <p className="text-[10px] mt-0.5">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-industrial-200 shadow-sm overflow-hidden divide-y divide-industrial-100">
        
        {/* Core Primary Keys */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-brand-600" /> Section 1: Unique Identifiers / المعرفات الفريدة
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAiEnrich}
                disabled={isAutoEnriching}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="إكمال الوصف الفني والمواصفات الكهربائية والمصنع تلقائياً باستخدام Gemini AI"
              >
                {isAutoEnriching ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري تحليل وإكمال البيانات بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>إكمال وتوليد المواصفات بالذكاء الاصطناعي (AI Auto-Enrich)</span>
                  </>
                )}
              </button>
              <NameplateScanner 
                materialsList={materials}
                onScanSuccess={handleScanSuccess} 
                onEditMaterial={(mat) => {
                  setExistingMatchMaterial(mat);
                  setDupStore(mat.store);
                  setDupRack(mat.rack || '');
                  setDupShelf(mat.shelf || '');
                  setShowDuplicateDialog(true);
                }}
              />
            </div>
          </div>

          {aiEnrichSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-950 text-xs rounded-xl flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                <span className="font-semibold">{aiEnrichSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiEnrichSuccess(null)}
                className="text-purple-700 hover:text-purple-900 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Automatic Sequence Allocation Banner / Field */}
          <div className="bg-brand-50/70 border border-brand-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-industrial-900 font-mono">
                    تسلسل المادة المنظم / Material Sequence
                  </span>
                  {isAutoSequence ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> تسلسل تلقائي منتظم (التالي: #{nextSuggestedSequence})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      تخصيص يدوي
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-industrial-600 mt-0.5">
                  يتم اقتراح وتطبيق رقم التسلسل المنظم تلقائياً لكافة المواد الجديدة غير المسجلة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={isAutoSequence ? nextSuggestedSequence : sequence}
                  disabled={isAutoSequence}
                  onChange={(e) => setSequence(parseInt(e.target.value) || '')}
                  className={`w-28 text-center font-mono font-bold text-sm px-3 py-2 rounded-xl border transition-all ${
                    isAutoSequence
                      ? 'bg-brand-100/70 border-brand-300 text-brand-900 cursor-not-allowed'
                      : 'bg-white border-industrial-300 text-industrial-900 focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-2xs'
                  }`}
                  placeholder="Seq #"
                />
                <span className="absolute left-2.5 top-2 text-xs font-mono text-industrial-400 font-bold">#</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isAutoSequence) {
                    setIsAutoSequence(false);
                    setSequence(nextSuggestedSequence);
                  } else {
                    setIsAutoSequence(true);
                    setSequence(nextSuggestedSequence);
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAutoSequence
                    ? 'bg-white border border-brand-300 text-brand-700 hover:bg-brand-50 shadow-2xs'
                    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-2xs'
                }`}
              >
                {isAutoSequence ? 'تعديل يدوي' : 'تطبيق تلقائي'}
              </button>
            </div>
          </div>

          {/* Real-time Collision & Match Banner */}
          {(() => {
            const collisionMatch = collisionPart ? materials.find(m => m.partNumber.trim().toUpperCase() === collisionPart.toUpperCase()) : null;
            if (!collisionMatch) return null;

            return (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-industrial-900 shadow-xs" id="collision-match-banner">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                      ⚠️ تنبيه: مادة مسجلة مسبقاً في المخزون
                    </span>
                    {collisionMatch.sequence !== undefined && (
                      <span className="text-xs font-bold font-mono text-industrial-700">
                        تسلسل #{collisionMatch.sequence}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-industrial-900">
                    {collisionMatch.partNumber} — {collisionMatch.description}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-industrial-600 font-sans mt-1">
                    <span>المصنع: <strong>{collisionMatch.manufacturer} ({collisionMatch.model})</strong></span>
                    <span>•</span>
                    <span>الرصيد المتوفر: <strong className="font-mono text-emerald-700">{collisionMatch.quantity} {collisionMatch.unit}</strong></span>
                    <span>•</span>
                    <span>الموقع: <strong>{collisionMatch.store} (ستاند {collisionMatch.rack || 'N/A'} - رف {collisionMatch.shelf || 'N/A'})</strong></span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExistingMatchMaterial(collisionMatch);
                      setDupStore(collisionMatch.store);
                      setDupRack(collisionMatch.rack || '');
                      setDupShelf(collisionMatch.shelf || '');
                      setShowDuplicateDialog(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>تعديل المادة أو إضافة رصيد / Edit & Restock</span>
                  </button>
                </div>
              </div>
            );
          })()}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Part Number */}
            <div>
              <label htmlFor="part-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Part Number / رقم القطعة <span className="text-industrial-400 font-normal">(اختياري / Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="part-number-input"
                  type="text"
                  value={partNumber}
                  onChange={(e) => handlePartNumberChange(e.target.value)}
                  placeholder="e.g. STM32F407VGT6 (اتركه فارغاً إذا لم يتوفر)"
                  className={`w-full bg-industrial-50 border text-xs px-3.5 py-2.5 rounded-xl font-mono uppercase tracking-wide focus:outline-none focus:ring-1.5 focus:border-transparent ${
                    collisionPart 
                      ? 'border-red-400 focus:ring-red-400 text-red-900 bg-red-50/50' 
                      : 'border-industrial-200 focus:ring-brand-500 text-industrial-800'
                  }`}
                />
                <Database className="absolute right-3.5 top-3 h-4 w-4 text-industrial-400" />
              </div>
              
              {/* Collision warning info */}
              {collisionPart && (
                <p className="text-[10px] text-red-600 mt-1.5 font-semibold font-mono flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> صنف مكرر: هذا الرقم مسجل بالفعل في المستودع. اضغط على زر التعديل أعلاه لإضافة رصيد أو تعديل البيانات.
                </p>
              )}
              <p className="text-[10px] text-industrial-450 mt-1.5">
                رقم القطعة أو الكتالوج (إذا لم يتوفر للمادة رقم قطعة يمكنك تركه فارغاً وسيتم تمييز الصنف بالوصف والتسلسل).
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Detailed Component Description <span className="text-red-500">*</span>
              </label>
              <input
                id="description-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. High-performance ARM Cortex-M4 Microcontroller..."
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                required
              />
              <p className="text-[10px] text-industrial-450 mt-1.5">
                Include primary functional details, size, pins, or specific application.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            {/* Manufacturer */}
            <div>
              <label htmlFor="manufacturer-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Manufacturer / Brand <span className="text-red-500">*</span>
              </label>
              <input
                id="manufacturer-input"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. STMicroelectronics"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
                required
              />
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Model / Series
              </label>
              <input
                id="model-input"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. STM32F4"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label htmlFor="serial-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Initial Serial Number
              </label>
              <input
                id="serial-number-input"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-A26025691"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 1.5: Engineering Tag & Field Installation Location */}
        <div className="p-6 space-y-4 bg-industrial-50/40 border-t border-industrial-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-industrial-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-purple-600" />
              <span>Section 1.5: Engineering Tag & Field Installation / التاغ الهندسي وموقع التثبيت الفعلي</span>
            </h3>
            <span className="text-[10.5px] font-medium text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
              لتثبيت موقع المواد (مثل السيلينويد) وأرقام العمل والمطالبات
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tag Number */}
            <div>
              <label htmlFor="tag-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Tag Number (رقم بطاقة المعدة / التاغ الهندسي)
              </label>
              <input
                id="tag-number-input"
                type="text"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
                placeholder="e.g. 2021-1-5553-XYS-237 أو SOV-4011-A"
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-brand-500 shadow-2xs"
              />
              <p className="text-[10px] text-industrial-450 mt-1">
                الرقم الهندسي الخاص بالقطعة أو المعدة (Tag #)
              </p>
            </div>

            {/* Field Installation Location */}
            <div>
              <label htmlFor="installation-loc-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Field Installation & Mounting Location (مكان التثبيت والتركيب الميداني الفعلي)
              </label>
              <input
                id="installation-loc-input"
                type="text"
                value={installationLocation}
                onChange={(e) => setInstallationLocation(e.target.value)}
                placeholder="e.g. Turbine Skid-A, Solenoid Manifold #3 أو مكان تثبيت السلينويد"
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500 shadow-2xs"
              />
              <p className="text-[10px] text-industrial-450 mt-1">
                الموقع الدقيق لتثبيت المادة في المحطة أو على المعدة في الموقع
              </p>
            </div>

            {/* Work Order (WO #) */}
            <div>
              <label htmlFor="wo-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Work Order (WO # / رقم أمر العمل)
              </label>
              <input
                id="wo-number-input"
                type="text"
                value={woNumber}
                onChange={(e) => setWoNumber(e.target.value)}
                placeholder="e.g. WO-2024-8841"
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-brand-500 shadow-2xs"
              />
              <p className="text-[10px] text-industrial-450 mt-1">
                رقم أمر العمل المرتبط بتركيب أو صيانة هذه المادة
              </p>
            </div>

            {/* MRF Number */}
            <div>
              <label htmlFor="mrf-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Material Request Form (MRF # / رقم طلب صرف المواد)
              </label>
              <input
                id="mrf-number-input"
                type="text"
                value={mrfNumber}
                onChange={(e) => setMrfNumber(e.target.value)}
                placeholder="e.g. MRF-2024-0912 أو 0226-14344-00-00-1"
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono uppercase focus:outline-none focus:ring-1.5 focus:ring-brand-500 shadow-2xs"
              />
              <p className="text-[10px] text-industrial-450 mt-1">
                رقم استمارة أو طلب صرف وتوريد المادة (MR / MRF)
              </p>
            </div>
          </div>
        </div>

        {/* Quantities & Levels */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-brand-600" /> Section 2: Quantities & Alerts
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Initial Stock Quantity */}
            <div>
              <label htmlFor="quantity-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Initial Stock Quantity
              </label>
              <input
                id="quantity-input"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>

            {/* Unit type */}
            <div>
              <label htmlFor="unit-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Unit of Measurement
              </label>
              <select
                id="unit-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-700 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              >
                <option value="pcs">pcs (Pieces)</option>
                <option value="m">m (Meters)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="bars">bars (Lengths)</option>
                <option value="packs">packs (Multi-pack)</option>
                <option value="reels">reels (SMD Reels)</option>
              </select>
            </div>

            {/* Minimum stock limit */}
            <div>
              <label htmlFor="min-stock-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Minimum Stock Level Warning
              </label>
              <input
                id="min-stock-input"
                type="number"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
              <p className="text-[9px] text-industrial-450 mt-1">
                Generates low stock warnings when catalog quantity falls to or below this.
              </p>
            </div>
          </div>
        </div>

        {/* Location Coordinates */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Warehouse className="h-3.5 w-3.5 text-brand-600" /> Section 3: Physical Storage Location & Station (موقع التخزين والمحطة)
          </h3>

          {/* Station / Plant Custom Input with Suggestions */}
          <div className="bg-industrial-50/70 p-3.5 rounded-xl border border-industrial-200/90 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label htmlFor="station-input" className="text-xs font-bold text-industrial-800 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Station / اسم المحطة أو الموقع:</span>
              </label>
              <span className="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                يمكنك كتابة أي اسم محطة بحرية تامة دون تقييد
              </span>
            </div>

            <div className="relative">
              <input
                id="station-input"
                type="text"
                list="add-material-stations"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                placeholder="اكتب اسم المحطة بحرية (مثال: محطة السامسونك، مستودع المجمع، المحطة أ...)"
                className="w-full bg-white border border-industrial-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-industrial-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
              />
              <datalist id="add-material-stations">
                {availableStations.map((st, i) => (
                  <option key={i} value={st} />
                ))}
              </datalist>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[10px] text-industrial-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                مقترحات سريعة:
              </span>
              {availableStations.slice(0, 5).map((st, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStation(st)}
                  className={`px-2 py-0.8 rounded-lg text-[10.5px] font-medium transition-colors cursor-pointer border ${
                    station === st
                      ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                      : 'bg-white text-industrial-700 border-industrial-200 hover:bg-industrial-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Store Room */}
            <div className="md:col-span-1">
              <label htmlFor="store-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Store Room / Lab
              </label>
              <select
                id="store-input"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-700 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              >
                {masterWarehouses.length > 0 ? (
                  masterWarehouses.map(w => (
                    <option key={w.id} value={w.name}>{w.name} ({w.siteName || 'NDGS'})</option>
                  ))
                ) : (
                  <>
                    <option value="Electronics Lab (Lab A)">Electronics Lab (Lab A)</option>
                    <option value="Mechanical Workshop">Mechanical Workshop</option>
                    <option value="Automation Depot">Automation Depot</option>
                    <option value="Pneumatics Stockroom">Pneumatics Stockroom</option>
                    <option value="Raw Materials Yard">Raw Materials Yard</option>
                    <option value="R&D Safety Locker">R&D Safety Locker</option>
                  </>
                )}
              </select>
            </div>

            {/* Rack Location */}
            <div>
              <label htmlFor="rack-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Rack Identifier
              </label>
              <input
                id="rack-input"
                type="text"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                placeholder="e.g. R-12"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>

            {/* Shelf Location */}
            <div>
              <label htmlFor="shelf-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Shelf Identifier
              </label>
              <input
                id="shelf-input"
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                placeholder="e.g. Shelf-B3"
                className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Remarks and Notes */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-brand-600" /> Section 4: Supplementary Remarks
          </h3>

          <div>
            <label htmlFor="notes-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
              Engineering Notes / Datasheet Links / Handling Instructions
            </label>
            <textarea
              id="notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. ESD protection required. Primary datasheet stored in folder D-12. Keep away from humidity..."
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* OEM Verification Section */}
        <div className="p-6 space-y-4 border-t border-industrial-100 bg-emerald-50/10">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-600" /> Section 5: OEM Supply Verification (التحقق من الشركة الأم)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Status Selector */}
            <div>
              <label htmlFor="oem-status-select" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Verification Status / حالة التحقق
              </label>
              <select
                id="oem-status-select"
                value={oemVerificationStatus}
                onChange={(e) => setOemVerificationStatus(e.target.value as any)}
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              >
                <option value="verified">مؤكد من الشركة الأم (OEM Verified)</option>
                <option value="authorized">موزع معتمد للشركة الأم (Authorized Distributor)</option>
                <option value="alternative">مورد بديل / جهة تجارية (Alternative Supplier)</option>
                <option value="pending">قيد التحقق الفني (Pending Audit)</option>
              </select>
            </div>

            {/* Certificate ID */}
            <div>
              <label htmlFor="oem-cert-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                CoC Certificate ID / رقم شهادة المطابقة والمنشأ
              </label>
              <input
                id="oem-cert-input"
                type="text"
                value={oemCertificateId}
                onChange={(e) => setOemCertificateId(e.target.value)}
                placeholder="e.g. CERT-OEM-2026-8841"
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>

            {/* Verification Notes */}
            <div className="md:col-span-2">
              <label htmlFor="oem-notes-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Verification Notes / ملاحظات التدقيق والتوثيق
              </label>
              <textarea
                id="oem-notes-input"
                rows={2}
                value={oemVerificationNotes}
                onChange={(e) => setOemVerificationNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات فنية تدعم صحة التوريد من الشركة المصنعة الأصلية..."
                className="w-full bg-white border border-industrial-200 text-xs px-3.5 py-2.5 rounded-xl text-industrial-800 focus:outline-none focus:ring-1.5 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 bg-industrial-50/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onAddMaterialSuccess}
            className="bg-white border border-industrial-250 text-industrial-600 font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-industrial-100 transition-colors cursor-pointer"
          >
            Cancel Registration
          </button>
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-500 disabled:bg-industrial-300 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-brand-900/10 cursor-pointer"
            id="register-submit-btn"
          >
            {collisionPart ? 'Verify / Update Existing Material' : 'Commit to Central Ledger'}
          </button>
        </div>
      </form>

      {showDuplicateDialog && existingMatchMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/60 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-industrial-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col text-left font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-industrial-100 bg-industrial-50 flex justify-between items-start">
              <div className="space-y-1">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Existing Material Found / مادة مطابقة موجودة بالفعل
                </span>
                <h3 className="text-base font-bold text-industrial-800">
                  This material already exists in the central ledger
                </h3>
                <p className="text-[11px] text-industrial-500 font-mono">
                  Matched on Part Number: {existingMatchMaterial.partNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateDialog(false)}
                className="text-industrial-400 hover:text-industrial-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing details overview */}
            <div className="p-4 bg-amber-50/45 border-b border-amber-150 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-industrial-400 block font-semibold">DESCRIPTION</span>
                <span className="text-industrial-800 font-medium truncate block">{existingMatchMaterial.description}</span>
              </div>
              <div>
                <span className="text-[10px] text-industrial-400 block font-semibold">MANUFACTURER</span>
                <span className="text-industrial-800 font-medium truncate block">{existingMatchMaterial.manufacturer}</span>
              </div>
              <div>
                <span className="text-[10px] text-industrial-400 block font-semibold">STORE ROOM</span>
                <span className="text-industrial-800 font-medium truncate block">{existingMatchMaterial.store}</span>
              </div>
              <div>
                <span className="text-[10px] text-industrial-400 block font-semibold">CURRENT STOCK</span>
                <span className="text-industrial-800 font-bold block">{existingMatchMaterial.quantity} {existingMatchMaterial.unit}</span>
              </div>
            </div>

            {/* Modal Body / Resolution options */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tabs for actions */}
              <div className="flex border-b border-industrial-100 text-xs gap-1 overflow-x-auto pb-px">
                <button
                  type="button"
                  onClick={() => setDupTab('qty')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'qty' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  Quantity / الكمية
                </button>
                <button
                  type="button"
                  onClick={() => setDupTab('serial')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'serial' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  New Serial Number / رقم تسلسلي جديد
                </button>
                <button
                  type="button"
                  onClick={() => setDupTab('docs')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'docs' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  Files & Certificates / الملفات والشهادات
                </button>
                <button
                  type="button"
                  onClick={() => setDupTab('location')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'location' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  Location / الموقع
                </button>
                <button
                  type="button"
                  onClick={() => setDupTab('notes')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'notes' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  Engineering Notes / ملاحظات فنية
                </button>
                <button
                  type="button"
                  onClick={() => setDupTab('merge')}
                  className={`px-3 py-2 font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${dupTab === 'merge' ? 'border-brand-600 text-brand-600' : 'border-transparent text-industrial-500 hover:text-industrial-800'}`}
                >
                  Merge Records / دمج السجلات
                </button>
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                {dupTab === 'qty' && (
                  <div className="space-y-3">
                    <p className="text-xs text-industrial-500">
                      Increase or decrease the stock quantity of this registered material directly.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Additional Quantity to Add / الكمية المضافة
                        </label>
                        <input
                          type="number"
                          value={dupQtyAdd}
                          onChange={(e) => setDupQtyAdd(parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500 text-industrial-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Resulting Stock Quantity / إجمالي المخزون
                        </label>
                        <input
                          type="text"
                          disabled
                          value={`${(existingMatchMaterial.quantity || 0) + dupQtyAdd} ${existingMatchMaterial.unit}`}
                          className="w-full bg-industrial-100 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono text-industrial-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {dupTab === 'serial' && (
                  <div className="space-y-3">
                    <p className="text-xs text-industrial-500">
                      Register a new serial number under this Part Number. Each serial number tracks individual maintenance/installation states.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          New Serial Number
                        </label>
                        <input
                          type="text"
                          value={dupNewSerial}
                          onChange={(e) => setDupNewSerial(e.target.value)}
                          placeholder="e.g. SN-99411A"
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 text-industrial-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Current Status
                        </label>
                        <select
                          value={dupSerialStatus}
                          onChange={(e) => setDupSerialStatus(e.target.value as any)}
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-700 focus:outline-none focus:ring-1"
                        >
                          <option value="Available">Available / جاهز للاستخدام</option>
                          <option value="Installed">Installed / مثبت بالموقع</option>
                          <option value="Reserved">Reserved / محجوز</option>
                          <option value="Damaged">Damaged / تالف أو معيب</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Equipment Location Tag (Optional)
                        </label>
                        <input
                          type="text"
                          value={dupSerialEq}
                          onChange={(e) => setDupSerialEq(e.target.value)}
                          placeholder="e.g. EQ-XMTR-402"
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1 text-industrial-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Installation Date
                        </label>
                        <input
                          type="date"
                          value={dupSerialDate}
                          onChange={(e) => setDupSerialDate(e.target.value)}
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-700 focus:outline-none focus:ring-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-industrial-700 mb-1">
                        Initial Serial Maintenance Notes
                      </label>
                      <textarea
                        rows={2}
                        value={dupSerialNotes}
                        onChange={(e) => setDupSerialNotes(e.target.value)}
                        placeholder="e.g. Initial calibration performed at warehouse, accuracy 0.1% FS..."
                        className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-850 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>
                )}

                {dupTab === 'docs' && (
                  <div className="space-y-4">
                    <p className="text-xs text-industrial-500">
                      Upload and link newer documents, safety certificates, datasheets, COCs, or maintenance reports.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Datasheet */}
                      <div className="p-3 border border-industrial-200 rounded-xl space-y-1.5 bg-industrial-50/50">
                        <span className="font-semibold block text-industrial-700">Datasheet Link / كراسة البيانات</span>
                        <input
                          type="text"
                          placeholder="e.g. Rosemount_3051S_RevE"
                          value={dupDatasheetName}
                          onChange={(e) => setDupDatasheetName(e.target.value)}
                          className="w-full text-xs bg-white border border-industrial-250 p-1.5 rounded-lg focus:outline-none text-industrial-800"
                        />
                      </div>
                      
                      {/* CoC */}
                      <div className="p-3 border border-industrial-200 rounded-xl space-y-1.5 bg-industrial-50/50">
                        <span className="font-semibold block text-industrial-700">Certificate of Conformity (COC)</span>
                        <input
                          type="text"
                          placeholder="e.g. COC-ZFOD-2026-0034"
                          value={dupCocName}
                          onChange={(e) => setDupCocName(e.target.value)}
                          className="w-full text-xs bg-white border border-industrial-250 p-1.5 rounded-lg focus:outline-none text-industrial-800"
                        />
                      </div>

                      {/* Maintenance Records */}
                      <div className="p-3 border border-industrial-200 rounded-xl space-y-1.5 bg-industrial-50/50">
                        <span className="font-semibold block text-industrial-700">Calibration / Inspection Report</span>
                        <input
                          type="text"
                          placeholder="e.g. CAL-REPORT-44021"
                          value={dupMaintName}
                          onChange={(e) => setDupMaintName(e.target.value)}
                          className="w-full text-xs bg-white border border-industrial-250 p-1.5 rounded-lg focus:outline-none text-industrial-800"
                        />
                      </div>

                      {/* Nameplate Photo */}
                      <div className="p-3 border border-industrial-200 rounded-xl space-y-1.5 bg-industrial-50/50">
                        <span className="font-semibold block text-industrial-700">Add another Nameplate Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDupPhotoNameplate(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-[10px] text-industrial-500"
                        />
                        {dupPhotoNameplate && (
                          <span className="text-[10px] text-emerald-600 block">✓ Nameplate photo uploaded & queued</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {dupTab === 'location' && (
                  <div className="space-y-3">
                    <p className="text-xs text-industrial-500">
                      Update the physical warehouse or rack locations of the items in stock.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Store Room / Lab
                        </label>
                        <select
                          value={dupStore}
                          onChange={(e) => setDupStore(e.target.value)}
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg text-industrial-750 focus:outline-none text-industrial-800"
                        >
                          <option value="Electronics Lab (Lab A)">Electronics Lab (Lab A)</option>
                          <option value="Mechanical Workshop">Mechanical Workshop</option>
                          <option value="Automation Depot">Automation Depot</option>
                          <option value="Pneumatics Stockroom">Pneumatics Stockroom</option>
                          <option value="Raw Materials Yard">Raw Materials Yard</option>
                          <option value="R&D Safety Locker">R&D Safety Locker</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Rack Identifier
                        </label>
                        <input
                          type="text"
                          value={dupRack}
                          onChange={(e) => setDupRack(e.target.value)}
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none text-industrial-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-industrial-700 mb-1">
                          Shelf Identifier
                        </label>
                        <input
                          type="text"
                          value={dupShelf}
                          onChange={(e) => setDupShelf(e.target.value)}
                          className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none text-industrial-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {dupTab === 'notes' && (
                  <div className="space-y-3">
                    <p className="text-xs text-industrial-500">
                      Append specialized engineering remarks, notes, calibration warnings, or handling instructions for this stock.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-industrial-700 mb-1">
                        Additional Engineering Notes
                      </label>
                      <textarea
                        rows={4}
                        value={dupNotesAppend}
                        onChange={(e) => setDupNotesAppend(e.target.value)}
                        placeholder="e.g. Shelf life extended. Tested on laboratory jig by David Miller on 2026-07. Functional stability confirmed."
                        className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2.5 rounded-lg text-industrial-800 focus:outline-none text-industrial-800"
                      />
                    </div>
                  </div>
                )}

                {dupTab === 'merge' && (
                  <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    <h4 className="font-bold">Merging Record Overview</h4>
                    <p>
                      Selecting "Merge Records" will intelligently combine the new form's parameters with the existing ledger. 
                      Empty parameters in the existing ledger will be populated with values you entered in the form, 
                      and stock levels will be added together.
                    </p>
                    <p className="font-semibold text-[10px] text-amber-700">
                      Warning: This is an irreversible structural database action. All historical changes are fully logged in the audit trail.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-industrial-50 border-t border-industrial-100 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDuplicateDialog(false)}
                className="px-4 py-2 border border-industrial-250 bg-white hover:bg-industrial-100 rounded-lg text-industrial-600 font-semibold cursor-pointer"
              >
                Cancel / إلغاء
              </button>
              
              {dupTab === 'merge' ? (
                <button
                  type="button"
                  onClick={() => handleDuplicateResolve('merge')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Merge Duplicate Records / دمج السجلين</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDuplicateResolve('adjust')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Update Existing Material / تحديث المادة الحالية</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
