/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  FileSpreadsheet, 
  CheckCircle, 
  Trash2, 
  Layers, 
  Cpu,
  Info,
  FileText
} from 'lucide-react';
import { Material, User, UserRole, MaterialHistoryEvent } from '../types';
import { dbService } from '../services/dbService';

interface BackupSyncViewProps {
  currentUser: User;
  onRefreshData: () => void;
}

interface BackupItem {
  key: string;
  timestamp: string;
  type: 'manual' | 'auto';
  recordsCount: number;
  label: string;
}

export default function BackupSyncView({ currentUser, onRefreshData }: BackupSyncViewProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupLabel, setBackupLabel] = useState('');
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [syncFileName, setSyncFileName] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'parsing' | 'ready' | 'syncing' | 'completed'>('idle');
  const [parsedSyncRows, setParsedSyncRows] = useState<any[]>([]);
  const [syncReport, setSyncReport] = useState<{
    total: number;
    merged: number;
    skipped: number;
    created: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load available local storage backups
  const loadBackups = () => {
    const list: BackupItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('emis_manual_backup_') || key.startsWith('emis_auto_backup_'))) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            const isManual = key.startsWith('emis_manual_backup_');
            const timestampPart = key.replace(isManual ? 'emis_manual_backup_' : 'emis_auto_backup_', '');
            
            list.push({
              key,
              timestamp: new Date(parseInt(timestampPart)).toLocaleString(),
              type: isManual ? 'manual' : 'auto',
              recordsCount: Array.isArray(data.materials) ? data.materials.length : 0,
              label: data.label || (isManual ? 'Manual Snapshot' : 'System Auto-Backup')
            });
          }
        } catch (e) {
          // Skip corrupt keys
        }
      }
    }
    // Sort newest first
    list.sort((a, b) => {
      const tA = parseInt(a.key.split('_').pop() || '0');
      const tB = parseInt(b.key.split('_').pop() || '0');
      return tB - tA;
    });
    setBackups(list);
  };

  useEffect(() => {
    loadBackups();
  }, []);

  // Action: Create Manual Backup snapshot
  const handleCreateManualBackup = () => {
    const timestamp = Date.now();
    const state = {
      timestamp,
      label: backupLabel.trim() || 'Manual Snapshot',
      materials: dbService.getMaterials(),
      activities: dbService.getActivities(),
      equipment: dbService.getEquipment ? dbService.getEquipment() : []
    };

    dbService.safeSetItem(`emis_manual_backup_${timestamp}`, JSON.stringify(state));
    setBackupLabel('');
    loadBackups();
    triggerToast('success', 'Manual snapshot successfully saved into localized flash memory storage.');
    
    // Add activity record
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Manual database backup snapshot saved: "${state.label}"`
    });
    onRefreshData();
  };

  const handleResetMaterialsDatabase = () => {
    if (window.confirm('🚨 تحذير هام: هل أنت متأكد من حذف جميع المواد؟\n\nWARNING: Are you absolutely sure you want to reset the materials database? This will permanently delete all registered engineering materials and can NOT be undone.')) {
      dbService.saveMaterials([]);
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        details: 'Materials database reset. Cleared all material records for official Excel import.'
      });
      triggerToast('success', 'Materials database cleared successfully! Database is ready for official inventory import.');
      onRefreshData();
    }
  };

  // Action: Export entire database file (.json)
  const handleExportDatabaseFile = () => {
    const backupState = {
      appId: 'ZFOD-EMIS-LEDGER',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      version: '1.0',
      materials: dbService.getMaterials(),
      activities: dbService.getActivities(),
      equipment: dbService.getEquipment ? dbService.getEquipment() : []
    };

    const str = JSON.stringify(backupState, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EMIS_ZFOD_Full_Backup_${new Date().toISOString().slice(0,10)}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast('success', 'Complete database backup file successfully packed and downloaded.');
  };

  // Action: Restore database state from local backup record
  const handleRestoreFromLocalBackup = (key: string) => {
    if (!window.confirm('CRITICAL WARNING: This action will completely overwrite all current material ledgers, sequence allocations, and log registers with the selected backup snapshot. Proceed?')) {
      return;
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('Data key missing');
      const data = JSON.parse(raw);

      if (!Array.isArray(data.materials)) {
        throw new Error('Invalid backup structure: Materials list is missing.');
      }

      // Restore to database service
      dbService.restoreFullState(data.materials, data.activities || [], data.equipment || []);
      
      triggerToast('success', 'Central database registers successfully restored to the chosen historical state.');
      onRefreshData();
      loadBackups();

      // Log restoration activity
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Ledger fully restored to historical snapshot: "${data.label || 'Snapshot'}"`
      });
    } catch (e: any) {
      triggerToast('error', `Failed to restore backup: ${e.message}`);
    }
  };

  // Action: Delete localized backup record
  const handleDeleteLocalBackup = (key: string) => {
    if (window.confirm('Delete this backup snapshot permanently from localized browser memory?')) {
      localStorage.removeItem(key);
      loadBackups();
      triggerToast('success', 'Backup snapshot purged successfully.');
    }
  };

  // Action: Import JSON file to restore
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);

        if (data.appId !== 'ZFOD-EMIS-LEDGER' && !data.materials) {
          throw new Error('File does not match the ZFOD EMIS Ledger backup signature specification.');
        }

        if (!Array.isArray(data.materials)) {
          throw new Error('Materials ledger payload is corrupted or missing.');
        }

        if (window.confirm(`Restore Database from imported file?\nExported by: ${data.exportedBy || 'Unknown'}\nExported at: ${data.exportedAt || 'Unknown'}\nRecords to Restore: ${data.materials.length}`)) {
          dbService.restoreFullState(data.materials, data.activities || [], data.equipment || []);
          triggerToast('success', 'Ledger database fully restored from external JSON backup packet.');
          onRefreshData();
          loadBackups();
        }
      } catch (err: any) {
        triggerToast('error', `Corrupt file packet: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Safe Multi-Station Inventory Synchronization logic
  const handleSyncFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncFile(file);
    setSyncFileName(file.name);
    setSyncStatus('parsing');

    // Parse external JSON backup for merging, or spreadsheets
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);

        if (!data.materials || !Array.isArray(data.materials)) {
          throw new Error('No materials record array detected in the incoming synchronization packet.');
        }

        const incomingMaterials: Material[] = data.materials;
        const currentMaterials = dbService.getMaterials();
        const rowsToSync: any[] = [];

        incomingMaterials.forEach(incoming => {
          const matched = currentMaterials.find(c => c.partNumber.toUpperCase().trim() === incoming.partNumber.toUpperCase().trim());
          
          if (matched) {
            const isDiff = matched.quantity !== incoming.quantity || 
                           matched.store !== incoming.store || 
                           matched.rack !== incoming.rack || 
                           matched.shelf !== incoming.shelf;

            rowsToSync.push({
              partNumber: incoming.partNumber,
              description: incoming.description,
              manufacturer: incoming.manufacturer,
              currentQty: matched.quantity,
              incomingQty: incoming.quantity,
              currentLoc: `${matched.store} / Rack ${matched.rack} / Shelf ${matched.shelf}`,
              incomingLoc: `${incoming.store || 'Unknown'} / Rack ${incoming.rack || ''} / Shelf ${incoming.shelf || ''}`,
              hasConflict: isDiff,
              incomingData: incoming,
              action: isDiff ? 'merge_notes' : 'skip'
            });
          } else {
            rowsToSync.push({
              partNumber: incoming.partNumber,
              description: incoming.description,
              manufacturer: incoming.manufacturer,
              currentQty: 0,
              incomingQty: incoming.quantity,
              currentLoc: 'N/A (New SKU)',
              incomingLoc: `${incoming.store || 'Default'} / Rack ${incoming.rack || ''} / Shelf ${incoming.shelf || ''}`,
              hasConflict: false,
              incomingData: incoming,
              action: 'create'
            });
          }
        });

        setParsedSyncRows(rowsToSync);
        setSyncStatus('ready');
      } catch (err: any) {
        triggerToast('error', `Synchronization Parsing Failed: ${err.message}`);
        setSyncStatus('idle');
        setSyncFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteSync = () => {
    setSyncStatus('syncing');
    let merged = 0;
    let created = 0;
    let skipped = 0;

    parsedSyncRows.forEach(row => {
      const existing = dbService.getMaterialByPartNumber(row.partNumber);
      if (existing) {
        if (row.action === 'skip') {
          skipped++;
        } else {
          // Merge / Overwrite depending on selection
          const updated = { ...existing };
          if (row.action === 'replace') {
            updated.quantity = row.incomingData.quantity;
            updated.store = row.incomingData.store;
            updated.rack = row.incomingData.rack;
            updated.shelf = row.incomingData.shelf;
          } else if (row.action === 'update_qty') {
            updated.quantity = row.incomingData.quantity;
          } else if (row.action === 'merge_notes') {
            // Merge engineering notes
            if (row.incomingData.notes || row.incomingData.engineeringNotes) {
              const extra = row.incomingData.engineeringNotes || row.incomingData.notes;
              updated.engineeringNotes = updated.engineeringNotes 
                ? `${updated.engineeringNotes}\n\n[Station Sync Merge ${new Date().toLocaleDateString()}]: ${extra}`
                : extra;
              updated.notes = updated.engineeringNotes;
            }
          }
          dbService.updateMaterial(updated, currentUser);
          merged++;
        }
      } else {
        // Create new
        const payload = {
          ...row.incomingData,
          importedAt: new Date().toISOString(),
          importedBy: `${currentUser.name} (Station Sync)`
        };
        dbService.addMaterial(payload, currentUser);
        created++;
      }
    });

    setSyncReport({
      total: parsedSyncRows.length,
      merged,
      created,
      skipped
    });
    setSyncStatus('completed');
    onRefreshData();

    // Log sync history event
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Safe Inventory merge completed from external station: Merged: ${merged}, Created: ${created}, Skipped: ${skipped}`
    });
  };

  return (
    <div className="space-y-6" id="backup-sync-view">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-industrial-800 heading-display flex items-center gap-2">
            <Database className="h-5.5 w-5.5 text-brand-600 animate-pulse" /> Backup & Safe Synchronization Center
          </h2>
          <p className="text-xs text-industrial-500 mt-1">
            ZFOD Instrument Department central database maintenance portal. Manage rolling state logs, manual ledger snapshots, and safe multi-station synchronization.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExportDatabaseFile}
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Full Ledger (.JSON)
          </button>
          
          <button
            onClick={() => restoreInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 bg-industrial-100 hover:bg-industrial-150 text-industrial-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-industrial-250"
          >
            <Upload className="h-4 w-4 text-industrial-600" /> Restore backup (.JSON)
          </button>
          <input 
            type="file" 
            ref={restoreInputRef} 
            onChange={handleRestoreFileSelected} 
            className="hidden" 
            accept=".json"
          />
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <ShieldCheck className={`h-5 w-5 ${toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1 */}
        <div className="space-y-6">
          {/* PANEL 1: MANUAL BACKUP GENERATOR */}
          <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-industrial-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-600" /> Rolling Snapshots
              </h3>
              <p className="text-[11px] text-industrial-400">
                Create localized manual database snapshots inside browser flash memory before major inventory shifts.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-industrial-500 font-mono">Snapshot Title / Comment</label>
                <input
                  type="text"
                  placeholder="e.g. Pre-Annual Stock Count Station B"
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                  className="w-full bg-industrial-50 border border-industrial-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-industrial-800 placeholder-industrial-400"
                />
              </div>
              
              <button
                onClick={handleCreateManualBackup}
                disabled={!backupLabel.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 disabled:hover:bg-brand-50 text-brand-700 border border-brand-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Database className="h-4 w-4" /> Commit Local Snapshot
              </button>
            </div>

            {/* Guidelines info card */}
            <div className="p-3 bg-brand-50/40 border border-brand-100 rounded-xl text-[10px] text-industrial-600 leading-normal space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-brand-800 font-mono uppercase tracking-wider text-[9px]">
                <Info className="h-3.5 w-3.5 text-brand-600" /> Automatic Safety Engine:
              </div>
              <p>
                The EMIS system executes state captures inside the database on major changes, maintaining a rolling audit ledger to protect structural numbering registers.
              </p>
            </div>
          </div>

          {/* DANGER ZONE PANEL: DATABASE RESET */}
          <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-red-600 animate-pulse" /> Danger Zone / منطقة خطر
              </h3>
              <p className="text-[11px] text-industrial-500 leading-relaxed font-sans">
                <strong>Reset Materials Database (إعادة تعيين قاعدة بيانات المواد)</strong>: Clear all imported materials and mock records to prepare the registry for official engineering imports.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleResetMaterialsDatabase}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Reset Materials Database / حذف جميع المواد
              </button>
            </div>

            <div className="p-3 bg-red-50/40 border border-red-100 rounded-xl text-[9.5px] text-red-800 leading-normal space-y-1 font-sans">
              <p className="font-semibold">⚠️ This action will permanently delete:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>All material rows and engineering inventory records</li>
                <li>Material-associated custom comments or custom quantity updates</li>
              </ul>
              <p className="font-semibold mt-1">🔒 This action will PRESERVE:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Users, Settings, AI Modules, Documents, System Configuration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PANEL 2: ROLLING BACKUPS REGISTER */}
        <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-industrial-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Database className="h-4 w-4 text-brand-600" /> Snapshots Log Registry
              </h3>
              <p className="text-[11px] text-industrial-400">
                Rolling historical database snapshots stored securely in browser cache memory.
              </p>
            </div>
            <span className="text-[10px] font-mono bg-industrial-100 text-industrial-600 px-2 py-0.5 rounded-full border border-industrial-200">
              Total Snapshots: {backups.length}
            </span>
          </div>

          <div className="border border-industrial-250 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto text-xs">
            {backups.length === 0 ? (
              <p className="p-6 text-center text-industrial-400 italic">No historical snapshots saved in local memory storage.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200 text-industrial-500 font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-2.5 pl-3">Backup Title / Purpose</th>
                    <th className="p-2.5">Saved At</th>
                    <th className="p-2.5 text-center">Records</th>
                    <th className="p-2.5 text-center">Type</th>
                    <th className="p-2.5 text-right pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 font-mono text-[11px]">
                  {backups.map(item => (
                    <tr key={item.key} className="hover:bg-industrial-50/50">
                      <td className="p-2.5 pl-3 font-sans font-semibold text-industrial-800">{item.label}</td>
                      <td className="p-2.5 text-industrial-500">{item.timestamp}</td>
                      <td className="p-2.5 text-center text-industrial-700 font-bold">{item.recordsCount} SKUs</td>
                      <td className="p-2.5 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          item.type === 'manual' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-industrial-100 text-industrial-500 border border-industrial-200'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-2.5 text-right pr-3 space-x-1.5 font-sans">
                        <button
                          onClick={() => handleRestoreFromLocalBackup(item.key)}
                          className="text-[10px] text-brand-600 hover:text-brand-800 font-bold cursor-pointer hover:underline"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteLocalBackup(item.key)}
                          className="text-[10px] text-red-600 hover:text-red-800 font-bold cursor-pointer hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PANEL 3: SAFE INVENTORY SYNCHRONIZATION (MULTI-STATION) */}
        <div className="bg-white p-5 rounded-2xl border border-industrial-200 shadow-xs space-y-4 lg:col-span-3">
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-industrial-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-brand-600" /> Multi-Station Inventory Synchronization Engine
            </h3>
            <p className="text-[11px] text-industrial-400">
              Incorporate and merge inventory registries exported from other ZFOD stations (Station B, Station C). Matches and flags discrepancies safely.
            </p>
          </div>

          {syncStatus === 'idle' && (
            <div className="border border-dashed border-industrial-300 rounded-2xl p-6 text-center space-y-3 bg-industrial-50/30">
              <div className="inline-flex p-3 bg-brand-50 border border-brand-100 rounded-2xl text-brand-600">
                <Upload className="h-6 w-6 animate-bounce" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-industrial-700">Ready to synchronize other station inventory files</p>
                <p className="text-industrial-400">Upload an EMIS Ledger Export JSON packet to safely trigger reconciliation and merging.</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Select Station Data File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSyncFileSelected}
                className="hidden"
                accept=".json"
              />
            </div>
          )}

          {syncStatus === 'parsing' && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-brand-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-industrial-700">Decompressing and parsing station registry packets...</p>
            </div>
          )}

          {syncStatus === 'ready' && parsedSyncRows.length > 0 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Sync reconciliation mapping parsed successfully!</p>
                  <p className="text-amber-800 text-[11px]">
                    Detected {parsedSyncRows.filter(r => r.hasConflict).length} overlaps with conflicting material records. Review conflict strategies below and execute merge safely.
                  </p>
                </div>
              </div>

              {/* Conflict Mapping Rows list */}
              <div className="border border-industrial-250 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs bg-white">
                  <thead>
                    <tr className="bg-industrial-50 border-b border-industrial-200 text-industrial-500 font-mono text-[9px] uppercase tracking-wider">
                      <th className="p-2 pl-3">Part Number</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">In-Stock Status</th>
                      <th className="p-2">Physical Location</th>
                      <th className="p-2 text-center w-[180px]">Reconciliation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100 font-mono text-[11px] text-industrial-700">
                    {parsedSyncRows.map((row, idx) => (
                      <tr key={idx} className={row.hasConflict ? 'bg-amber-50/15' : 'bg-emerald-50/5'}>
                        <td className="p-2 pl-3 font-bold text-industrial-900">{row.partNumber}</td>
                        <td className="p-2 max-w-[150px] truncate font-sans" title={row.description}>{row.description}</td>
                        <td className="p-2">
                          {row.hasConflict ? (
                            <span className="text-amber-700 font-bold block">Diff: {row.currentQty} ➔ {row.incomingQty}</span>
                          ) : (
                            <span className="text-emerald-700 font-bold block">New: {row.incomingQty}</span>
                          )}
                        </td>
                        <td className="p-2 max-w-[150px] truncate font-sans" title={row.incomingLoc}>{row.incomingLoc}</td>
                        <td className="p-2 text-center border-l border-industrial-100 font-sans">
                          {row.hasConflict ? (
                            <select
                              value={row.action}
                              onChange={(e) => {
                                const copy = [...parsedSyncRows];
                                copy[idx].action = e.target.value;
                                setParsedSyncRows(copy);
                              }}
                              className="text-[10px] p-1 bg-white border border-industrial-250 rounded font-semibold focus:outline-none"
                            >
                              <option value="merge_notes">Merge Eng. Notes Only</option>
                              <option value="update_qty">Update Quantity Only</option>
                              <option value="replace">Fully Overwrite Record</option>
                              <option value="skip">Skip Row</option>
                            </select>
                          ) : (
                            <span className="text-emerald-700 text-[10px] font-bold">Register as New SKU</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setSyncStatus('idle');
                    setSyncFile(null);
                    setParsedSyncRows([]);
                  }}
                  className="px-4 py-2 text-xs font-bold text-industrial-600 hover:text-industrial-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSync}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-xl cursor-pointer shadow-sm"
                >
                  Confirm and Safe Sync Merge ({parsedSyncRows.length} SKUs)
                </button>
              </div>
            </div>
          )}

          {syncStatus === 'syncing' && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-brand-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-industrial-700">Writing synchronizations to Firebase central registers...</p>
            </div>
          )}

          {syncStatus === 'completed' && syncReport && (
            <div className="p-6 border border-emerald-200 bg-emerald-50/20 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="h-5.5 w-5.5 text-emerald-600 animate-bounce" />
                <div>
                  <h4 className="font-bold text-sm">Station Sync Completed Successfully!</h4>
                  <p className="text-[10px] text-emerald-700">Multi-station registry reconciliation generated report successfully.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-3.5 bg-white border border-industrial-150 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-industrial-450 uppercase tracking-wider font-mono font-medium block">Total Scanned</span>
                  <span className="text-lg font-bold text-industrial-800 font-mono">{syncReport.total}</span>
                </div>
                <div className="p-3.5 bg-white border border-industrial-150 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-emerald-450 uppercase tracking-wider font-mono font-medium block">Merged/Reconciled</span>
                  <span className="text-lg font-bold text-emerald-700 font-mono">{syncReport.merged}</span>
                </div>
                <div className="p-3.5 bg-white border border-industrial-150 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-brand-450 uppercase tracking-wider font-mono font-medium block">New SKUs Added</span>
                  <span className="text-lg font-bold text-brand-600 font-mono">{syncReport.created}</span>
                </div>
                <div className="p-3.5 bg-white border border-industrial-150 rounded-xl text-center space-y-1">
                  <span className="text-[10px] text-industrial-450 uppercase tracking-wider font-mono font-medium block">Skipped/Cancelled</span>
                  <span className="text-lg font-bold text-industrial-500 font-mono">{syncReport.skipped}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setSyncStatus('idle');
                    setSyncFile(null);
                    setParsedSyncRows([]);
                    setSyncReport(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Acknowledge and Clear Report
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
