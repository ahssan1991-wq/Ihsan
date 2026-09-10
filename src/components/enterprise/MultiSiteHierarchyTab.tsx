/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  MapPin, 
  Warehouse, 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  QrCode, 
  Search, 
  Boxes, 
  BarChart2, 
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import { EnterpriseHierarchyNode, WarehouseLocationDetail, Material, User, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface MultiSiteHierarchyTabProps {
  currentUser: User;
  sites: EnterpriseHierarchyNode[];
  onRefreshSites: () => void;
  materials: Material[];
  onSelectMaterial: (material: Material) => void;
}

export const MultiSiteHierarchyTab: React.FC<MultiSiteHierarchyTabProps> = ({
  currentUser,
  sites = [],
  onRefreshSites,
  materials = [],
  onSelectMaterial
}) => {
  const safeSites = Array.isArray(sites) ? sites : [];
  const safeMaterials = Array.isArray(materials) ? materials : (dbService.getMaterials() || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(safeSites[0]?.id || 'site-ndgs');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'org-root': true,
    'site-ndgs': true,
    'site-hipf': true,
    'site-jamna': true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);

  // New Node Form State
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCode, setNewNodeCode] = useState('');
  const [newNodeType, setNewNodeType] = useState<'SITE' | 'AREA' | 'UNIT' | 'WAREHOUSE' | 'LOCATION'>('WAREHOUSE');
  const [newNodeParentId, setNewNodeParentId] = useState('');
  const [newNodeManager, setNewNodeManager] = useState(currentUser.name);
  const [newNodeLocation, setNewNodeLocation] = useState('');

  // New Location Detail Form State
  const [newLocWarehouse, setNewLocWarehouse] = useState('Central Warehouse');
  const [newLocAisle, setNewLocAisle] = useState('Aisle-01');
  const [newLocRack, setNewLocRack] = useState('Rack-A');
  const [newLocShelf, setNewLocShelf] = useState('Shelf-01');
  const [newLocBin, setNewLocBin] = useState('Bin-01');
  const [newLocZone, setNewLocZone] = useState('ELECTRICAL');

  const locations = dbService.getWarehouseLocations();

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedNode = safeSites.find(s => s.id === selectedNodeId) || safeSites[0];

  // Associated materials for selected node
  const associatedMaterials = safeMaterials.filter(m => {
    if (!selectedNode) return false;
    const store = (m.store || '').toLowerCase();
    const station = (m.station || '').toLowerCase();
    const code = selectedNode.code.toLowerCase();
    const name = selectedNode.name.toLowerCase();
    return store.includes(code) || station.includes(code) || store.includes(name) || station.includes(name);
  });

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !newNodeCode.trim()) return;

    const parentNode = sites.find(s => s.id === newNodeParentId);
    const parentCode = parentNode ? parentNode.code : 'ZFOD';
    const path = parentNode ? `${parentNode.path}/${newNodeCode.toUpperCase()}` : `/ZFOD/${newNodeCode.toUpperCase()}`;

    const newNode: EnterpriseHierarchyNode = {
      id: `node-${Date.now()}`,
      name: newNodeName.trim(),
      code: newNodeCode.trim().toUpperCase(),
      type: newNodeType,
      parentId: newNodeParentId || 'org-root',
      path,
      status: 'ACTIVE',
      manager: newNodeManager,
      address: newNodeLocation,
      currentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbService.addHierarchyNode(newNode, currentUser);
    onRefreshSites();
    setShowAddModal(false);
    setNewNodeName('');
    setNewNodeCode('');
    setSelectedNodeId(newNode.id);
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = `LOC-${selectedNode?.code || 'WH'}-${newLocAisle.replace('Aisle-', 'A')}-${newLocRack.replace('Rack-', 'R')}-${newLocShelf.replace('Shelf-', 'S')}-${newLocBin.replace('Bin-', 'B')}`;
    
    const newLoc: WarehouseLocationDetail = {
      id: `wloc-${Date.now()}`,
      siteId: selectedNode?.id || 'site-ndgs',
      siteName: selectedNode?.name || 'NDGS Station',
      warehouseName: newLocWarehouse,
      zone: newLocZone,
      aisle: newLocAisle,
      rack: newLocRack,
      shelf: newLocShelf,
      bin: newLocBin,
      barcode,
      status: 'AVAILABLE',
      capacityMax: 50,
      currentItemsCount: 0
    };

    dbService.addWarehouseLocation(newLoc, currentUser);
    setShowAddLocationModal(false);
  };

  // Render tree recursively
  const renderTree = (parentId: string | null = null, depth = 0) => {
    const children = sites.filter(s => s.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-4 border-l border-industrial-700/60 pl-2' : ''}`}>
        {children.map(node => {
          const isExpanded = expandedNodes[node.id];
          const isSelected = selectedNodeId === node.id;
          const nodeChildren = sites.filter(s => s.parentId === node.id);
          const hasChildren = nodeChildren.length > 0;

          return (
            <div key={node.id} className="select-none">
              <div 
                onClick={() => setSelectedNodeId(node.id)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                  isSelected 
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 font-semibold' 
                    : 'text-industrial-300 hover:bg-industrial-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {hasChildren ? (
                    <button 
                      onClick={(e) => toggleExpand(node.id, e)} 
                      className="p-0.5 hover:bg-industrial-700 rounded text-industrial-400"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <div className="w-4" />
                  )}

                  <span className="shrink-0">
                    {node.type === 'ORGANIZATION' && <Building2 className="w-4 h-4 text-amber-400" />}
                    {node.type === 'SITE' && <MapPin className="w-4 h-4 text-emerald-400" />}
                    {node.type === 'AREA' && <Layers className="w-4 h-4 text-blue-400" />}
                    {node.type === 'UNIT' && <FolderTree className="w-4 h-4 text-purple-400" />}
                    {node.type === 'WAREHOUSE' && <Warehouse className="w-4 h-4 text-indigo-400" />}
                  </span>

                  <span className="truncate font-medium">{node.code} - {node.name}</span>
                </div>

                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-400 border border-industrial-700 font-mono shrink-0">
                  {node.type}
                </span>
              </div>

              {hasChildren && isExpanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            Enterprise Multi-Site Organizational Hierarchy
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Full enterprise topology: Organization ➔ Site ➔ Area ➔ Unit ➔ Warehouse ➔ Storage Bins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === UserRole.ADMIN && (
            <>
              <button 
                onClick={() => {
                  setNewNodeParentId(selectedNode?.id || 'org-root');
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Node to Structure
              </button>
              <button 
                onClick={() => setShowAddLocationModal(true)}
                className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-750 text-industrial-200 border border-industrial-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <QrCode className="w-4 h-4 text-emerald-400" /> Define Bin/Rack
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2-COLUMN MAIN LAYOUT: HIERARCHY TREE (LEFT) & NODE DETAILS / INVENTORY (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HIERARCHY TREE BROWSER (4 COLS) */}
        <div className="lg:col-span-4 bg-industrial-850 border border-industrial-700 rounded-xl p-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-industrial-700/80 mb-3">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-bold text-white">Structure Explorer</span>
            </div>
            <span className="text-[11px] text-industrial-400">{sites.length} Nodes</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {renderTree(null)}
          </div>
        </div>

        {/* NODE DETAIL & LOCATION MANAGEMENT (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SELECTED NODE HEADER CARD */}
          {selectedNode && (
            <div className="bg-industrial-850 border border-industrial-700 rounded-xl p-5 shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    {selectedNode.type === 'ORGANIZATION' && <Building2 className="w-6 h-6" />}
                    {selectedNode.type === 'SITE' && <MapPin className="w-6 h-6" />}
                    {selectedNode.type === 'AREA' && <Layers className="w-6 h-6" />}
                    {selectedNode.type === 'UNIT' && <FolderTree className="w-6 h-6" />}
                    {selectedNode.type === 'WAREHOUSE' && <Warehouse className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                        {selectedNode.type}
                      </span>
                      <span className="text-xs text-industrial-400 font-mono">ID: {selectedNode.code}</span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{selectedNode.name}</h3>
                    <p className="text-xs text-industrial-400 font-mono mt-0.5">Path: {selectedNode.path || `/${selectedNode.code}`}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="bg-industrial-800 p-2.5 rounded-lg border border-industrial-700">
                    <span className="text-industrial-400 block text-[10px] uppercase">Manager / PIC</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedNode.manager || 'Field Supervisor'}</span>
                  </div>
                  <div className="bg-industrial-800 p-2.5 rounded-lg border border-industrial-700">
                    <span className="text-industrial-400 block text-[10px] uppercase">Location Coordinates</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedNode.geographicLocation || 'Basra Desert / Block 9'}</span>
                  </div>
                </div>
              </div>

              {/* TABS FOR SELECTED NODE: MATERIALS AT SITE & STORAGE BINS */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-industrial-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-brand-400" />
                    Materials Configured At This Facility ({associatedMaterials.length})
                  </span>
                </h4>

                {associatedMaterials.length === 0 ? (
                  <div className="text-center py-8 bg-industrial-900/50 rounded-lg border border-dashed border-industrial-700">
                    <Boxes className="w-8 h-8 text-industrial-500 mx-auto mb-2" />
                    <p className="text-sm text-industrial-300 font-medium">No materials currently stored under this node filter.</p>
                    <p className="text-xs text-industrial-500 mt-1">Materials registered with this site name will show here automatically.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-industrial-750 bg-industrial-900/40 rounded-lg border border-industrial-750 overflow-hidden max-h-64 overflow-y-auto">
                    {associatedMaterials.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => onSelectMaterial(m)}
                        className="p-3 flex items-center justify-between hover:bg-industrial-800/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <span className="text-xs font-bold text-white font-mono">{m.partNumber}</span>
                            <span className="text-xs text-industrial-300 ml-2">{m.materialDescription}</span>
                            <div className="text-[11px] text-industrial-500 mt-0.5">
                              Store: <span className="text-industrial-400">{m.store || 'Main Store'}</span> • Rack/Shelf: <span className="text-industrial-400">{m.storageBin || 'Unassigned'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-brand-400 font-mono">{m.quantity} {m.unit || 'EA'}</span>
                          <div className="text-[10px] text-emerald-400 font-medium mt-0.5">{m.status || 'Available'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STORAGE LOCATIONS & BINS DEFINED FOR THIS SITE */}
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl p-5 shadow">
            <div className="flex items-center justify-between pb-3 border-b border-industrial-700/80 mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Registered Storage Bins & Rack Coordinates</h3>
              </div>
              <span className="text-xs text-industrial-400 font-mono">{locations.length} Total Bins in System</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {locations.map(loc => (
                <div key={loc.id} className="p-3 bg-industrial-800/80 rounded-lg border border-industrial-700 hover:border-brand-500/40 transition-colors flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-white">{loc.barcode}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {loc.zone}
                      </span>
                    </div>
                    <p className="text-xs text-industrial-300 mt-1">
                      {loc.warehouseName} • {loc.aisle} • {loc.rack} • {loc.shelf} • {loc.bin}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-industrial-400">Cap: {loc.capacityMax}</span>
                    <div className="text-[10px] text-emerald-400 font-medium">Ready</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD HIERARCHY NODE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-400" /> Add Node to Enterprise Topology
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Expand company sites, processing units, or regional warehouse facilities.
            </p>

            <form onSubmit={handleAddNode} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Node Type</label>
                  <select 
                    value={newNodeType}
                    onChange={(e) => setNewNodeType(e.target.value as any)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="SITE">Site / Facility</option>
                    <option value="AREA">Operational Area</option>
                    <option value="UNIT">Processing Unit</option>
                    <option value="WAREHOUSE">Warehouse / Store</option>
                    <option value="LOCATION">Storage Location</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Node Code (e.g., NDGS-W2)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="JAMNA-WH" 
                    value={newNodeCode} 
                    onChange={(e) => setNewNodeCode(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Node Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Jamna High-Pressure Separation Facility" 
                  value={newNodeName} 
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Parent Node</label>
                <select 
                  value={newNodeParentId}
                  onChange={(e) => setNewNodeParentId(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="org-root">🏢 Organization Root (ZFOD)</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Manager / Supervisor</label>
                  <input 
                    type="text" 
                    value={newNodeManager} 
                    onChange={(e) => setNewNodeManager(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Geographic Location</label>
                  <input 
                    type="text" 
                    placeholder="Basra Field / Zone 3" 
                    value={newNodeLocation} 
                    onChange={(e) => setNewNodeLocation(e.target.value)}
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
                  Create Hierarchy Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEFINE BIN/RACK */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" /> Register Storage Bin / Rack Tag
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Configure fine-grained warehouse bin coordinates with barcode tag identifier.
            </p>

            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Warehouse Name</label>
                <input 
                  type="text" 
                  value={newLocWarehouse} 
                  onChange={(e) => setNewLocWarehouse(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Zone</label>
                  <select 
                    value={newLocZone} 
                    onChange={(e) => setNewLocZone(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="ELECTRICAL">ELECTRICAL</option>
                    <option value="INSTRUMENT">INSTRUMENT</option>
                    <option value="MECHANICAL">MECHANICAL</option>
                    <option value="HAZARDOUS">HAZARDOUS</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Aisle</label>
                  <input 
                    type="text" 
                    value={newLocAisle} 
                    onChange={(e) => setNewLocAisle(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Rack</label>
                  <input 
                    type="text" 
                    value={newLocRack} 
                    onChange={(e) => setNewLocRack(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Shelf</label>
                  <input 
                    type="text" 
                    value={newLocShelf} 
                    onChange={(e) => setNewLocShelf(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Bin</label>
                  <input 
                    type="text" 
                    value={newLocBin} 
                    onChange={(e) => setNewLocBin(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow"
                >
                  Generate Location Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
