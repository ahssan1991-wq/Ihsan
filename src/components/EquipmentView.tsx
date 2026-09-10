/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Warehouse, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  SlidersHorizontal, 
  Calendar, 
  Tag, 
  Wrench, 
  Cpu, 
  Clock, 
  MapPin, 
  Layers, 
  Activity, 
  CheckCircle, 
  X, 
  FileText, 
  ChevronRight,
  Info
} from 'lucide-react';
import { Equipment, Material, User, UserRole } from '../types';
import { dbService } from '../services/dbService';

interface EquipmentViewProps {
  equipment?: Equipment[];
  materials?: Material[];
  currentUser: User;
  onUpdateEquipment: () => void;
  onNavigateToTab: (tabId: string, query: string) => void;
  triggerToast: (type: 'success' | 'error', message: string) => void;
}

export default function EquipmentView({ 
  equipment: rawEquipment = [], 
  materials: rawMaterials = [], 
  currentUser, 
  onUpdateEquipment, 
  onNavigateToTab,
  triggerToast 
}: EquipmentViewProps) {
  const equipment = Array.isArray(rawEquipment) && rawEquipment.length > 0 ? rawEquipment : (dbService.getEquipment() || []);
  const materials = Array.isArray(rawMaterials) && rawMaterials.length > 0 ? rawMaterials : (dbService.getMaterials() || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPlant, setFilterPlant] = useState<string>('All');
  
  // Selected Equipment for inspection/details modal
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  
  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTagNumber, setEditTagNumber] = useState(''); // lock if edit
  
  // Form Fields
  const [eqName, setEqName] = useState('');
  const [eqTagNumber, setEqTagNumber] = useState('');
  const [eqManufacturer, setEqManufacturer] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqPlant, setEqPlant] = useState('');
  const [eqArea, setEqArea] = useState('');
  const [eqUnit, setEqUnit] = useState('');
  const [eqDescription, setEqDescription] = useState('');
  const [eqPhotoUrl, setEqPhotoUrl] = useState('');
  const [eqInstallationDate, setEqInstallationDate] = useState('');
  const [eqStatus, setEqStatus] = useState<'operational' | 'maintenance' | 'offline' | 'standby'>('operational');
  const [eqSelectedSpares, setEqSelectedSpares] = useState<string[]>([]);
  
  const isWritable = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ENGINEER;

  // Extract unique plants for filtration
  const uniquePlants = ['All', ...Array.from(new Set(equipment.map(e => e.plant).filter((p): p is string => !!p && p !== 'All')))];

  // Filters logic
  const filteredEquipment = equipment.filter(e => {
    const matchesSearch = 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.tagNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.model.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchesPlant = filterPlant === 'All' || e.plant === filterPlant;
    
    return matchesSearch && matchesStatus && matchesPlant;
  });

  const handleOpenCreateForm = () => {
    setFormMode('create');
    setEqName('');
    setEqTagNumber('');
    setEqManufacturer('');
    setEqModel('');
    setEqPlant('');
    setEqArea('');
    setEqUnit('');
    setEqDescription('');
    setEqPhotoUrl('');
    setEqInstallationDate(new Date().toISOString().split('T')[0]);
    setEqStatus('operational');
    setEqSelectedSpares([]);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (eq: Equipment) => {
    setFormMode('edit');
    setEditTagNumber(eq.tagNumber);
    setEqName(eq.name);
    setEqTagNumber(eq.tagNumber);
    setEqManufacturer(eq.manufacturer);
    setEqModel(eq.model);
    setEqPlant(eq.plant);
    setEqArea(eq.area);
    setEqUnit(eq.unit);
    setEqDescription(eq.description);
    setEqPhotoUrl(eq.photoUrl || '');
    setEqInstallationDate(eq.installationDate);
    setEqStatus(eq.status);
    setEqSelectedSpares(eq.compatibleSpares || []);
    setIsFormOpen(true);
  };

  const handleToggleSpareSelection = (partNumber: string) => {
    if (eqSelectedSpares.includes(partNumber)) {
      setEqSelectedSpares(eqSelectedSpares.filter(s => s !== partNumber));
    } else {
      setEqSelectedSpares([...eqSelectedSpares, partNumber]);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWritable) return;

    if (formMode === 'create') {
      const res = dbService.addEquipment({
        tagNumber: eqTagNumber,
        name: eqName,
        manufacturer: eqManufacturer,
        model: eqModel,
        plant: eqPlant,
        area: eqArea,
        unit: eqUnit,
        description: eqDescription,
        photoUrl: eqPhotoUrl || undefined,
        installationDate: eqInstallationDate,
        status: eqStatus,
        compatibleSpares: eqSelectedSpares
      }, currentUser);

      if (res.success) {
        triggerToast('success', `Equipment ${eqTagNumber} registered successfully`);
        onUpdateEquipment();
        setIsFormOpen(false);
      } else {
        triggerToast('error', res.error || 'Failed to add equipment');
      }
    } else {
      const res = dbService.updateEquipment({
        tagNumber: editTagNumber,
        name: eqName,
        manufacturer: eqManufacturer,
        model: eqModel,
        plant: eqPlant,
        area: eqArea,
        unit: eqUnit,
        description: eqDescription,
        photoUrl: eqPhotoUrl || undefined,
        installationDate: eqInstallationDate,
        status: eqStatus,
        compatibleSpares: eqSelectedSpares
      }, currentUser);

      if (res.success) {
        triggerToast('success', `Equipment ${editTagNumber} updated successfully`);
        onUpdateEquipment();
        // Sync selected detail if currently viewing
        if (selectedEq && selectedEq.tagNumber === editTagNumber) {
          setSelectedEq({
            tagNumber: editTagNumber,
            name: eqName,
            manufacturer: eqManufacturer,
            model: eqModel,
            plant: eqPlant,
            area: eqArea,
            unit: eqUnit,
            description: eqDescription,
            photoUrl: eqPhotoUrl || undefined,
            installationDate: eqInstallationDate,
            status: eqStatus,
            compatibleSpares: eqSelectedSpares
          });
        }
        setIsFormOpen(false);
      } else {
        triggerToast('error', res.error || 'Failed to update equipment');
      }
    }
  };

  const handleDeleteEquipment = (tagNumber: string) => {
    if (!isWritable) return;
    if (window.confirm(`Are you sure you want to delete equipment tag ${tagNumber}? This will unlink all spare parts.`)) {
      const res = dbService.deleteEquipment(tagNumber, currentUser);
      if (res.success) {
        triggerToast('success', `Equipment ${tagNumber} has been deleted.`);
        onUpdateEquipment();
        if (selectedEq && selectedEq.tagNumber === tagNumber) {
          setSelectedEq(null);
        }
      } else {
        triggerToast('error', res.error || 'Failed to delete equipment');
      }
    }
  };

  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case 'operational':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> Operational
          </span>
        );
      case 'maintenance':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-150 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Maintenance
          </span>
        );
      case 'offline':
        return (
          <span className="bg-red-50 text-red-700 border border-red-150 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Offline
          </span>
        );
      case 'standby':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Standby
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="equipment-management-view">
      
      {/* Banner Header */}
      <div className="bg-white p-6 rounded-2xl border border-industrial-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
            <Warehouse className="h-5.5 w-5.5 text-brand-600" /> Engineering Equipment Directory
          </h2>
          <p className="text-xs text-industrial-500 mt-1">
            Browse plant equipment, inspect physical tags, and coordinate active compatibility linkages with physical spare parts.
          </p>
        </div>
        
        {isWritable && (
          <button
            onClick={handleOpenCreateForm}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer shadow-sm hover:shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Register Equipment</span>
          </button>
        )}
      </div>

      {/* Filters Form & Grid Block */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Filter Specifiers */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-industrial-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-industrial-100">
            <SlidersHorizontal className="h-4 w-4 text-industrial-400" />
            <h3 className="text-xs font-bold text-industrial-500 uppercase tracking-widest font-mono">
              Directory Filters
            </h3>
          </div>

          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Asset Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tag, Name, Manufacturer..."
                className="w-full bg-industrial-50 border border-industrial-200 text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-industrial-400" />
            </div>
          </div>

          {/* Plant Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Plant Location
            </label>
            <select
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              className="w-full bg-industrial-50 border border-industrial-200 text-xs px-2 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800 font-medium"
            >
              {uniquePlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-industrial-600 uppercase tracking-wider">
              Operational Status
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['All', 'operational', 'maintenance', 'offline', 'standby'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`text-[10px] font-mono font-semibold px-2 py-1 rounded transition-all cursor-pointer border ${
                    filterStatus === st
                      ? 'bg-industrial-800 text-white border-industrial-800'
                      : 'bg-industrial-50 text-industrial-600 hover:bg-industrial-100 border-industrial-200'
                  }`}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Equipment Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white px-5 py-3 rounded-xl border border-industrial-200 shadow-2xs flex justify-between items-center text-xs text-industrial-500 font-mono">
            <span>Query Matches:</span>
            <span className="font-semibold text-industrial-800">{filteredEquipment.length} equipment assets listed</span>
          </div>

          {filteredEquipment.length === 0 ? (
            <div className="bg-white text-center p-12 rounded-2xl border border-industrial-200 shadow-sm space-y-3">
              <div className="inline-flex p-4 bg-industrial-100 rounded-full text-industrial-400">
                <Warehouse className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-industrial-800">No Equipment Matches</p>
              <p className="text-xs text-industrial-500 max-w-sm mx-auto">
                No active plant machinery records match your filter criteria. Try relaxing search strings or selecting 'All' locations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEquipment.map((eq, idx) => {
                const linkedCount = eq.compatibleSpares?.length || 0;
                return (
                  <div
                    key={`${eq.tagNumber}-${idx}`}
                    className="bg-white rounded-2xl border border-industrial-200 shadow-sm hover:border-brand-300 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Image block / Tag Header */}
                      <div className="relative h-28 bg-industrial-950 flex items-center justify-center overflow-hidden">
                        {eq.photoUrl ? (
                          <img 
                            src={eq.photoUrl} 
                            alt={eq.name} 
                            className="absolute inset-0 h-full w-full object-cover opacity-60"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-industrial-700 font-mono text-[9px] uppercase tracking-widest font-bold">
                            No Asset Image Registered
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-industrial-900/90 text-white font-mono font-bold text-[10px] px-2 py-1 rounded border border-industrial-700 tracking-tight">
                          {eq.tagNumber}
                        </div>
                        <div className="absolute top-3 right-3">
                          {getStatusBadge(eq.status)}
                        </div>
                      </div>

                      {/* Info block */}
                      <div className="p-4 space-y-2">
                        <div>
                          <h4 className="font-bold text-sm text-industrial-900 tracking-tight leading-tight line-clamp-1">
                            {eq.name}
                          </h4>
                          <p className="text-[10px] font-semibold text-industrial-500">
                            {eq.manufacturer} · Model {eq.model}
                          </p>
                        </div>

                        <p className="text-xs text-industrial-550 line-clamp-2 min-h-[2rem]">
                          {eq.description}
                        </p>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-industrial-450 border-t border-b border-industrial-100 py-2 my-2">
                          <div>
                            <span className="block uppercase text-[8px] text-industrial-400">PLANT:</span>
                            <span className="font-semibold text-industrial-700 truncate block">{eq.plant}</span>
                          </div>
                          <div>
                            <span className="block uppercase text-[8px] text-industrial-400">UNIT/AREA:</span>
                            <span className="font-semibold text-industrial-700 truncate block">{eq.unit}</span>
                          </div>
                        </div>

                        {/* compatible spare indicators */}
                        <div className="flex items-center justify-between text-[11px] text-industrial-600 font-sans">
                          <span className="flex items-center gap-1 font-medium">
                            <Layers className="h-3.5 w-3.5 text-brand-600" /> 
                            <span>{linkedCount} Compatible Spare Parts</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-industrial-50/70 px-4 py-3 border-t border-industrial-100 flex justify-between items-center">
                      <div className="flex gap-2">
                        {isWritable && (
                          <>
                            <button
                              onClick={() => handleOpenEditForm(eq)}
                              className="text-industrial-500 hover:text-brand-600 p-1 rounded hover:bg-industrial-100 transition-colors cursor-pointer"
                              title="Edit specifications"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEquipment(eq.tagNumber)}
                              className="text-industrial-500 hover:text-red-600 p-1 rounded hover:bg-industrial-100 transition-colors cursor-pointer"
                              title="Delete machinery record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedEq(eq)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        Inspect Spares <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Equipment Detailed Inspection & Compatibility Modal */}
      <AnimatePresence>
        {selectedEq && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-white border border-industrial-300 rounded-2xl shadow-2xl text-industrial-800 relative overflow-hidden"
            >
              {/* Header */}
              <div className="bg-industrial-900 p-5 text-white flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-brand-400 font-extrabold uppercase tracking-widest">Machinery File</span>
                  <h3 className="text-base font-extrabold tracking-tight heading-display flex items-center gap-1.5 mt-0.5">
                    {selectedEq.name}
                  </h3>
                  <p className="text-xs text-industrial-400 font-mono mt-1">
                    Tag Reference: <span className="font-semibold text-white">{selectedEq.tagNumber}</span> · Installed: {selectedEq.installationDate}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedEq(null)}
                  className="text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Grid content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[75vh] overflow-y-auto">
                
                {/* Left side: machinery specs */}
                <div className="md:col-span-1 space-y-4 border-r border-industrial-100 pr-5">
                  {selectedEq.photoUrl && (
                    <div className="rounded-xl overflow-hidden border border-industrial-200">
                      <img src={selectedEq.photoUrl} alt={selectedEq.name} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div>
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Manufacturer</h5>
                    <p className="text-xs font-semibold text-industrial-850">{selectedEq.manufacturer}</p>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Model Number</h5>
                    <p className="text-xs font-semibold text-industrial-850 font-mono">{selectedEq.model}</p>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Plant Location</h5>
                    <p className="text-xs font-semibold text-industrial-850 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-industrial-400" /> {selectedEq.plant}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Functional Area / Unit</h5>
                    <p className="text-xs font-semibold text-industrial-850">{selectedEq.area} ({selectedEq.unit})</p>
                  </div>

                  <div>
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Status</h5>
                    <div className="mt-1">{getStatusBadge(selectedEq.status)}</div>
                  </div>

                  <div className="pt-2">
                    <h5 className="text-[9px] font-mono text-industrial-400 uppercase font-bold">Operational Scope</h5>
                    <p className="text-xs text-industrial-600 mt-1 italic leading-relaxed">
                      {selectedEq.description}
                    </p>
                  </div>
                </div>

                {/* Right side: Linked compatible spares list */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-industrial-100">
                    <h4 className="text-xs font-bold text-industrial-800 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-brand-600" /> Compatible Spare Materials Ledger
                    </h4>
                    <span className="text-[10px] bg-industrial-100 px-2 py-0.5 rounded font-mono font-bold text-industrial-700">
                      {selectedEq.compatibleSpares?.length || 0} Registered SKUs
                    </span>
                  </div>

                  {(!selectedEq.compatibleSpares || selectedEq.compatibleSpares.length === 0) ? (
                    <div className="bg-industrial-50 text-center p-8 rounded-xl border border-dashed border-industrial-200">
                      <p className="text-xs font-bold text-industrial-700">No Compatible Spares Linked</p>
                      <p className="text-[11px] text-industrial-450 mt-1 max-w-sm mx-auto">
                        There are no spare parts explicitly flagged as compatible with this machinery yet. Use 'Adjust' or update a Material record to tie compatibility.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedEq.compatibleSpares.map((sparePartNo, idx) => {
                        const spareMat = materials.find(m => m.partNumber.toUpperCase() === sparePartNo.toUpperCase());
                        if (!spareMat) return null;
                        
                        const isLowStock = spareMat.quantity <= spareMat.minStockLevel;
                        
                        return (
                          <div 
                            key={`${sparePartNo}-${idx}`}
                            onClick={() => {
                              setSelectedEq(null);
                              onNavigateToTab('materials', sparePartNo);
                            }}
                            className="bg-industrial-50 hover:bg-industrial-100 p-3.5 rounded-xl border border-industrial-200 transition-colors flex justify-between items-center cursor-pointer group"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-xs text-brand-700 group-hover:underline">
                                  {spareMat.partNumber}
                                </span>
                                {isLowStock && (
                                  <span className="bg-amber-100 text-amber-800 text-[8px] font-mono px-1 rounded uppercase font-bold animate-pulse">
                                    Low Stock
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-industrial-600 line-clamp-1">{spareMat.description}</p>
                              <div className="text-[9px] font-mono text-industrial-400">
                                Storage: {spareMat.store} · Rack {spareMat.rack} / Shelf {spareMat.shelf}
                              </div>
                            </div>

                            <div className="text-right font-mono shrink-0 pl-4">
                              <p className="text-xs font-extrabold text-industrial-900">
                                {spareMat.quantity} <span className="text-[9px] text-industrial-500 font-normal">{spareMat.unit}</span>
                              </p>
                              <p className="text-[9px] text-industrial-450">{spareMat.manufacturer}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isWritable && (
                    <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 text-xs text-brand-850 flex items-start gap-2.5">
                      <Wrench className="h-4.5 w-4.5 text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Engineer Alignment Tip:</p>
                        <p className="text-brand-700 text-[11px] mt-0.5 leading-relaxed">
                          To associate more parts with this equipment tag, click "Edit machinery" above or search for a specific spare part in the ledger, expand its details, and select this tag in the "Compatible Equipment" section.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom footer */}
              <div className="bg-industrial-50 p-4 border-t border-industrial-150 flex justify-end">
                <button
                  onClick={() => setSelectedEq(null)}
                  className="bg-industrial-900 hover:bg-industrial-850 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Close Machine File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Register / Edit Equipment Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white border border-industrial-300 rounded-2xl shadow-2xl text-industrial-800 relative overflow-hidden"
            >
              {/* Header */}
              <div className="bg-industrial-900 p-5 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight heading-display">
                    {formMode === 'create' ? 'Register New Plant Equipment' : `Edit Machine Specs: ${editTagNumber}`}
                  </h3>
                  <p className="text-xs text-industrial-400 mt-1">
                    Please specify all indexed metadata. Double check tag naming conventions.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Equipment Tag (Locked if Editing) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Equipment Tag Number *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={formMode === 'edit'}
                      value={eqTagNumber}
                      onChange={(e) => setEqTagNumber(e.target.value)}
                      placeholder="e.g. EQ-PMP-101"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg font-mono focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800 disabled:opacity-60"
                    />
                  </div>

                  {/* Equipment Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Equipment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={eqName}
                      onChange={(e) => setEqName(e.target.value)}
                      placeholder="e.g. Centrifugal Water Pump"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Manufacturer */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      required
                      value={eqManufacturer}
                      onChange={(e) => setEqManufacturer(e.target.value)}
                      placeholder="e.g. Festo Automation"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>

                  {/* Model */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Model / Series *
                    </label>
                    <input
                      type="text"
                      required
                      value={eqModel}
                      onChange={(e) => setEqModel(e.target.value)}
                      placeholder="e.g. V-CENT-200"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Plant Location */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Plant Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={eqPlant}
                      onChange={(e) => setEqPlant(e.target.value)}
                      placeholder="Water Treatment Plant"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>

                  {/* Area */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Functional Area
                    </label>
                    <input
                      type="text"
                      value={eqArea}
                      onChange={(e) => setEqArea(e.target.value)}
                      placeholder="Pumping Station Alpha"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Unit Number
                    </label>
                    <input
                      type="text"
                      value={eqUnit}
                      onChange={(e) => setEqUnit(e.target.value)}
                      placeholder="Unit 3 / Filtration"
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Installation Date */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Installation Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={eqInstallationDate}
                      onChange={(e) => setEqInstallationDate(e.target.value)}
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Status *
                    </label>
                    <select
                      value={eqStatus}
                      onChange={(e) => setEqStatus(e.target.value as any)}
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800 font-medium"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                      <option value="standby">Standby</option>
                    </select>
                  </div>

                  {/* Photo Url */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                      Machinery Photo URL
                    </label>
                    <input
                      type="url"
                      value={eqPhotoUrl}
                      onChange={(e) => setEqPhotoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                    Equipment Description *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={eqDescription}
                    onChange={(e) => setEqDescription(e.target.value)}
                    placeholder="Provide detailed engineering remarks, physical specs, voltage loads..."
                    className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-brand-500 text-industrial-800"
                  />
                </div>

                {/* Spare parts alignment checkbox selector */}
                <div className="space-y-2 border-t border-industrial-100 pt-3">
                  <label className="block text-[10px] font-mono text-industrial-550 uppercase font-bold tracking-wider">
                    Select Compatible Spares from Warehouse Ledger
                  </label>
                  <p className="text-[10px] text-industrial-400">
                    Which mechanical/electronic parts in stock are compatible with this equipment? Matches are synced instantly.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-2 bg-industrial-50 border border-industrial-200 rounded-lg">
                    {materials.map((mat, idx) => {
                      const isSelected = eqSelectedSpares.includes(mat.partNumber);
                      return (
                        <div
                          key={`${mat.partNumber}-${idx}`}
                          onClick={() => handleToggleSpareSelection(mat.partNumber)}
                          className={`p-2 rounded-md border text-[11px] flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-brand-50 border-brand-300 text-brand-800 font-medium'
                              : 'bg-white border-industrial-200 hover:bg-industrial-100 text-industrial-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono font-bold block">{mat.partNumber}</span>
                            <span className="text-[9px] text-industrial-450 truncate block">{mat.description}</span>
                          </div>
                          <div className="h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors">
                            {isSelected && <span className="h-2.5 w-2.5 rounded bg-brand-600"></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Buttons */}
                <div className="border-t border-industrial-100 pt-4 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-white border border-industrial-250 text-industrial-700 font-semibold text-xs px-4 py-2.5 rounded-xl cursor-pointer hover:bg-industrial-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    {formMode === 'create' ? 'Register Asset' : 'Save Changes'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
