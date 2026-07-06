/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { Material, User, UserRole, MaterialSerialNumber, MaterialHistoryEvent } from '../types';
import { dbService } from '../services/dbService';
import NameplateScanner from './NameplateScanner';

interface AddMaterialViewProps {
  materials: Material[];
  currentUser: User;
  onAddMaterialSuccess: () => void;
}

export default function AddMaterialView({ materials, currentUser, onAddMaterialSuccess }: AddMaterialViewProps) {
  // Form State
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('pcs');
  const [store, setStore] = useState('Electronics Lab (Lab A)');
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [notes, setNotes] = useState('');
  const [minStockLevel, setMinStockLevel] = useState<number>(10);

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

    if (!partNumber.trim()) {
      setError('Part Number (Primary unique identifier) is required.');
      return;
    }
    if (!description.trim()) {
      setError('A brief description is required.');
      return;
    }
    if (!manufacturer.trim()) {
      setError('Manufacturer is required.');
      return;
    }

    // Perform thorough duplicate detection:
    const normalizedPartNumber = partNumber.trim().toUpperCase();
    const normalizedMfg = manufacturer.trim().toUpperCase();
    const normalizedModel = model.trim().toUpperCase();
    const normalizedSerial = serialNumber.trim().toUpperCase();

    let match = materials.find(m => m.partNumber.trim().toUpperCase() === normalizedPartNumber);
    
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
      partNumber: partNumber.trim(),
      description: description.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim() || 'N/A',
      quantity: Math.max(0, quantity),
      unit: unit,
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
      setSuccess(true);
      // Reset form
      setPartNumber('');
      setDescription('');
      setManufacturer('');
      setModel('');
      setQuantity(0);
      setUnit('pcs');
      setStore('Electronics Lab (Lab A)');
      setRack('');
      setShelf('');
      setNotes('');
      setMinStockLevel(10);
      setCollisionPart(null);
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
              <Tag className="h-3.5 w-3.5 text-brand-600" /> Section 1: Unique Identifiers
            </h3>
            <NameplateScanner onScanSuccess={handleScanSuccess} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Part Number */}
            <div>
              <label htmlFor="part-number-input" className="block text-xs font-semibold text-industrial-700 mb-1.5">
                Part Number / SKU <span className="text-red-500 font-mono font-normal">*</span>
              </label>
              <div className="relative">
                <input
                  id="part-number-input"
                  type="text"
                  value={partNumber}
                  onChange={(e) => handlePartNumberChange(e.target.value)}
                  placeholder="e.g. STM32F407VGT6"
                  className={`w-full bg-industrial-50 border text-xs px-3.5 py-2.5 rounded-xl font-mono uppercase tracking-wide focus:outline-none focus:ring-1.5 focus:border-transparent ${
                    collisionPart 
                      ? 'border-red-400 focus:ring-red-400 text-red-900 bg-red-50/50' 
                      : 'border-industrial-200 focus:ring-brand-500 text-industrial-800'
                  }`}
                  required
                />
                <Database className="absolute right-3.5 top-3 h-4 w-4 text-industrial-400" />
              </div>
              
              {/* Collision warning info */}
              {collisionPart && (
                <p className="text-[10px] text-red-600 mt-1.5 font-semibold font-mono flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> Duplicate SKU detected. This Part Number already exists in the system.
                </p>
              )}
              <p className="text-[10px] text-industrial-450 mt-1.5">
                Unique Primary Key. Case-insensitive index. No duplicates allowed.
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
            <Warehouse className="h-3.5 w-3.5 text-brand-600" /> Section 3: Physical Storage Location
          </h3>

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
                <option value="Electronics Lab (Lab A)">Electronics Lab (Lab A)</option>
                <option value="Mechanical Workshop">Mechanical Workshop</option>
                <option value="Automation Depot">Automation Depot</option>
                <option value="Pneumatics Stockroom">Pneumatics Stockroom</option>
                <option value="Raw Materials Yard">Raw Materials Yard</option>
                <option value="R&D Safety Locker">R&D Safety Locker</option>
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
