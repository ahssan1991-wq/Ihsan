/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Star, 
  ShieldCheck, 
  ShieldAlert, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Award, 
  TrendingUp, 
  FileText,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { SupplierEntity, User, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface SupplierDirectoryTabProps {
  currentUser: User;
  onRefreshSuppliers: () => void;
}

export const SupplierDirectoryTab: React.FC<SupplierDirectoryTabProps> = ({
  currentUser,
  onRefreshSuppliers
}) => {
  const [suppliers, setSuppliers] = useState<SupplierEntity[]>(() => dbService.getSuppliers() || []);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Supplier Form State
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('INSTRUMENTATION');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCountry, setNewCountry] = useState('United States');

  const selectedSupplier = (suppliers || []).find(s => s.id === selectedSupplierId) || suppliers[0];

  const refreshData = () => {
    setSuppliers(dbService.getSuppliers() || []);
    onRefreshSuppliers();
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: SupplierEntity = {
      id: `sup-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      category: newCategory,
      contactPerson: newContactPerson,
      email: newEmail,
      phone: newPhone,
      address: 'Industrial District, Suite 100',
      country: newCountry,
      rating: 4.5,
      status: 'APPROVED',
      totalDeliveries: 1,
      acceptedDeliveries: 1,
      rejectedDeliveries: 0,
      onTimeDeliveryRate: 95,
      complianceScore: 98,
      notes: 'Direct authorized OEM vendor registered with ZFOD Procurement'
    };

    dbService.addSupplier(newSup, currentUser);
    refreshData();
    setSelectedSupplierId(newSup.id);
    setShowAddModal(false);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesCat = filterCategory === 'ALL' || s.category === filterCategory;
    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.country.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            Approved Supplier & OEM Partner Directory
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Vendor quality scorecards, delivery reliability metrics, ISO/API compliance records, and direct vendor contacts.
          </p>
        </div>

        {currentUser.role === UserRole.ADMIN && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Register New Supplier Partner
          </button>
        )}
      </div>

      {/* 2-COLUMN LAYOUT: SUPPLIERS LIST (LEFT 4) & VENDOR SCORECARD (RIGHT 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SUPPLIERS LIST */}
        <div className="lg:col-span-4 bg-industrial-850 border border-industrial-700 rounded-xl p-4 flex flex-col h-[650px]">
          <div className="space-y-2 mb-3 pb-3 border-b border-industrial-700/80">
            <div className="relative">
              <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Search vendor name, code..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-industrial-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-industrial-900 border border-industrial-700 text-white text-xs font-semibold px-2 py-1 rounded"
              >
                <option value="ALL">All Categories ({suppliers.length})</option>
                <option value="INSTRUMENTATION">INSTRUMENTATION</option>
                <option value="ELECTRICAL">ELECTRICAL</option>
                <option value="MECHANICAL">MECHANICAL</option>
                <option value="VALVES_PIPING">VALVES & PIPING</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredSuppliers.map(sup => {
              const isSelected = selectedSupplierId === sup.id;
              return (
                <div 
                  key={sup.id}
                  onClick={() => setSelectedSupplierId(sup.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-brand-600/15 border-brand-500/60 shadow' 
                      : 'bg-industrial-800/70 hover:bg-industrial-800 border-industrial-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{sup.code}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {sup.approvedStatus}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-brand-300 mt-1 line-clamp-1">{sup.name}</h4>
                  <div className="text-[11px] text-industrial-400 mt-0.5">{sup.category} • {sup.country}</div>

                  <div className="mt-2 pt-2 border-t border-industrial-700/60 flex items-center justify-between text-[10px] text-industrial-400">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" /> {sup.rating} / 5.0
                    </span>
                    <span>Delivered: {sup.totalOrdersDelivered} Orders</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SELECTED VENDOR SCORECARD & CONTACTS */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSupplier && (
            <>
              {/* VENDOR HEADER CARD */}
              <div className="bg-industrial-850 border border-industrial-700 rounded-xl p-5 shadow space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-700/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                          {selectedSupplier.code}
                        </span>
                        <span className="text-xs text-industrial-400">{selectedSupplier.category}</span>
                        {selectedSupplier.isoCertified && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> ISO/API Certified
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{selectedSupplier.name}</h3>
                      <p className="text-xs text-industrial-400 mt-0.5">
                        Origin: {selectedSupplier.country} • Account Status: Approved OEM Tier-1 Partner
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-industrial-800 rounded-lg border border-industrial-700 text-center">
                      <span className="text-[10px] text-industrial-400 uppercase block">Vendor Rating</span>
                      <span className="text-base font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                        <Star className="w-4 h-4 fill-amber-400" /> {selectedSupplier.rating}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PERFORMANCE METRICS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-industrial-800/90 rounded-xl border border-industrial-700">
                    <div className="text-xs text-industrial-400">On-Time Delivery Rate</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {selectedSupplier.deliveryPerformanceScore}%
                    </div>
                    <div className="w-full bg-industrial-900 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${selectedSupplier.deliveryPerformanceScore}%` }} 
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-industrial-800/90 rounded-xl border border-industrial-700">
                    <div className="text-xs text-industrial-400">Quality Inspection Pass Rate</div>
                    <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {selectedSupplier.qualityScore}%
                    </div>
                    <div className="w-full bg-industrial-900 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full" 
                        style={{ width: `${selectedSupplier.qualityScore}%` }} 
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-industrial-800/90 rounded-xl border border-industrial-700">
                    <div className="text-xs text-industrial-400">Total Purchase Orders</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {selectedSupplier.totalOrdersDelivered} Shipments
                    </div>
                    <div className="text-[10px] text-industrial-400 mt-1 font-mono">Zero Critical NCRs</div>
                  </div>
                </div>

                {/* CONTACT INFO & PROCUREMENT NOTES */}
                <div className="p-4 bg-industrial-900/60 rounded-xl border border-industrial-750 space-y-3">
                  <h4 className="text-xs font-bold text-industrial-300 uppercase tracking-wider">
                    Procurement Direct Contact & Vendor Profile
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-industrial-300">
                      <Phone className="w-4 h-4 text-brand-400" />
                      <span>{selectedSupplier.phone || '+1 (800) 555-0199'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-industrial-300">
                      <Mail className="w-4 h-4 text-brand-400" />
                      <span>{selectedSupplier.email || 'sales@emerson.com'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-industrial-300">
                      <MapPin className="w-4 h-4 text-brand-400" />
                      <span>Primary Contact: {selectedSupplier.contactPerson || 'Regional Account Director'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-industrial-300">
                      <Globe className="w-4 h-4 text-brand-400" />
                      <span>Country: {selectedSupplier.country}</span>
                    </div>
                  </div>

                  <p className="text-xs text-industrial-400 italic pt-2 border-t border-industrial-700/60">
                    "{selectedSupplier.notes}"
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: ADD SUPPLIER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" /> Register New Supplier Partner
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Add authorized OEM manufacturer or certified industrial parts vendor.
            </p>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Supplier Code</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="SUP-YOKOGAWA" 
                    value={newCode} 
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Category</label>
                  <select 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="INSTRUMENTATION">INSTRUMENTATION</option>
                    <option value="ELECTRICAL">ELECTRICAL</option>
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="VALVES_PIPING">VALVES_PIPING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Supplier Company Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Yokogawa Electric Corporation" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Contact Person</label>
                  <input 
                    type="text" 
                    placeholder="Kenji Sato" 
                    value={newContactPerson} 
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Country</label>
                  <input 
                    type="text" 
                    value={newCountry} 
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="sales@yokogawa.com" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Phone</label>
                  <input 
                    type="text" 
                    placeholder="+81 422 52 5555" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded shadow"
                >
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
