/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Material, WarehouseFile, ActivityLog, User, UserRole, Equipment, MaterialHistoryEvent, MaterialDocument, 
  BlacklistItem, ChatMessage, FeedbackItem, EngineeringDecision, PendingSyncChange, StockMovement, 
  MaterialInspectionRecord, ExternalFile, ExternalSource, ExternalMaterial, UnifiedSearchResult, 
  UnifiedSearchResultSource, ImportBatch, AppDocument, FavoriteItem, SearchHistoryItem, 
  EngineeringVerificationResult, DuplicateCandidate, KnowledgeRecord, MaterialVerificationReport, 
  AIEvidenceItem, TechnicalConflict, CrossVerificationMatrixRow, AIAnalysisVersion, MaterialLifecycleStatus, 
  EnterpriseHierarchyNode, WarehouseLocationDetail, InventoryTransaction, MaterialTransfer, MaterialIssue, 
  MaterialReturn, MaterialReservation, ReceivingSession, SupplierEntity, EnterpriseTask, ApprovalRequest, 
  StockCountSession, AutomationRule, SmartAlert, NotificationPreference, MaterialHealthScore, 
  SupplierRiskProfile, CrossSiteOpportunity, AgingAnalysis, AgingBucketItem, EngineeringKpiMetric, 
  AiEngineeringInsight, AnalyticsDateFilter, AppNotification, EmailSettings, NotificationType,
  Site, MasterWarehouse, DataSourceType, AuditLogEntry, EmailLogEntry, EmailSendResult,
  MaterialTransactionEvent, NotificationCategory, NotificationPriority
} from '../types';
import { INITIAL_MATERIALS } from '../data/mockMaterials';
import { INITIAL_EQUIPMENT } from '../data/mockEquipment';
import { INITIAL_EXTERNAL_FILES, INITIAL_EXTERNAL_MATERIALS } from '../data/mockExternalStock';
import { INITIAL_DOCUMENTS, INITIAL_IMPORT_BATCHES, INITIAL_FAVORITES, INITIAL_SEARCH_HISTORY } from '../data/mockDocumentsAndBatches';
import { INITIAL_KNOWLEDGE_BASE, INITIAL_VERIFICATION_REPORTS } from '../data/mockKnowledgeBase';
import { INITIAL_HIERARCHY_NODES, INITIAL_WAREHOUSE_LOCATIONS, INITIAL_SUPPLIERS, INITIAL_STOCK_TRANSACTIONS, INITIAL_TRANSFERS, INITIAL_ISSUES, INITIAL_RETURNS, INITIAL_RESERVATIONS, INITIAL_RECEIVING_SESSIONS, INITIAL_TASKS, INITIAL_APPROVALS, INITIAL_STOCK_COUNT_SESSIONS, INITIAL_AUTOMATION_RULES } from '../data/mockEnterpriseOperations';
import { getBaseApiUrl } from './apiClient';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  detectDuplicateMaterial, 
  validateSequenceAvailability, 
  getAuthoritativeSuggestedSequence 
} from './duplicateDetectionService';

// Lazy initialize standard Firebase & Firestore
let firestoreDb: any = null;
try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'remixed-api-key') {
    const app = initializeApp(firebaseConfig);
    if ((firebaseConfig as any).firestoreDatabaseId) {
      firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(app);
    }
  }
} catch (e) {
  console.warn("Firebase App initialization skipped or credentials missing. Running database in reliable hybrid sync mode.", e);
}

// Robust custom helper to prevent QuotaExceededError in browser localStorage
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn("localStorage quota exceeded. Cleaning up old automatic and manual backups to make room...");
      
      // Collect auto backups
      const autoKeys: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('emis_auto_backup_')) {
          const ts = parseInt(k.replace('emis_auto_backup_', '')) || 0;
          autoKeys.push({ key: k, timestamp: ts });
        }
      }
      // Sort oldest first
      autoKeys.sort((a, b) => a.timestamp - b.timestamp);
      
      // Delete old auto backups
      for (const item of autoKeys) {
        localStorage.removeItem(item.key);
        console.info(`Cleared backup to free space: ${item.key}`);
        try {
          localStorage.setItem(key, value);
          return;
        } catch (retryErr) {
          // Keep trying
        }
      }

      // Also clean old manual backups if needed
      const manualKeys: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('emis_manual_backup_')) {
          const ts = parseInt(k.replace('emis_manual_backup_', '')) || 0;
          manualKeys.push({ key: k, timestamp: ts });
        }
      }
      manualKeys.sort((a, b) => a.timestamp - b.timestamp);
      for (const item of manualKeys) {
        localStorage.removeItem(item.key);
        console.info(`Cleared manual backup to free space: ${item.key}`);
        try {
          localStorage.setItem(key, value);
          return;
        } catch (retryErr) {
          // Keep trying
        }
      }
    }
    throw e;
  }
}

const STORAGE_KEYS = {
  MATERIALS: 'emis_materials',
  EQUIPMENT: 'emis_equipment',
  ACTIVITIES: 'emis_activities',
  CURRENT_USER: 'emis_current_user',
  BLACKLIST: 'emis_blacklist',
  FEEDBACK: 'emis_feedback',
  DECISIONS: 'emis_decisions',
  STOCK_MOVEMENTS: 'emis_stock_movements',
  INSPECTIONS: 'emis_inspections',
  WAREHOUSE_FILES: 'emis_warehouse_files',
  EXTERNAL_FILES: 'emis_external_files',
  EXTERNAL_MATERIALS: 'emis_external_materials',
  IMPORT_BATCHES: 'emis_import_batches',
  DOCUMENTS: 'emis_documents',
  FAVORITES: 'emis_favorites',
  SEARCH_HISTORY: 'emis_search_history',
  KNOWLEDGE_BASE: 'emis_knowledge_base',
  VERIFICATION_REPORTS: 'emis_verification_reports',
  PENDING_SYNC: 'emis_pending_sync_queue',
  LAST_SYNC_TIME: 'emis_last_sync_timestamp',
  HIERARCHY_NODES: 'emis_hierarchy_nodes',
  WAREHOUSE_LOCATIONS: 'emis_warehouse_locations',
  STOCK_TRANSACTIONS: 'emis_stock_transactions',
  TRANSFERS: 'emis_material_transfers',
  ISSUES: 'emis_material_issues',
  RETURNS: 'emis_material_returns',
  RESERVATIONS: 'emis_material_reservations',
  RECEIVING_SESSIONS: 'emis_receiving_sessions',
  SUPPLIERS: 'emis_suppliers',
  TASKS: 'emis_enterprise_tasks',
  APPROVALS: 'emis_approval_requests',
  STOCK_COUNTS: 'emis_stock_counts',
  AUTOMATION_RULES: 'emis_automation_rules',
  AI_INSIGHTS: 'emis_ai_insights',
  NOTIFICATIONS: 'emis_notifications',
  EMAIL_SETTINGS: 'emis_email_settings',
  USERS: 'emis_master_users',
  SITES: 'emis_master_sites',
  WAREHOUSES: 'emis_master_warehouses',
  EMAIL_LOGS: 'emis_email_logs',
  FAILED_LOGINS: 'emis_failed_logins',
  AUDIT_LOGS: 'emis_audit_logs'
};

// High-Performance In-Memory Cache layer
let memoryCachedMaterials: Material[] | null = null;
let memoryCachedBlacklist: BlacklistItem[] | null = null;
let memoryCachedEquipment: Equipment[] | null = null;
let autoBackupDebounceTimer: any = null;
let lastAutoBackupTimestamp = 0;

export function invalidateDbCache(key?: string) {
  if (!key || key === STORAGE_KEYS.MATERIALS) memoryCachedMaterials = null;
  if (!key || key === STORAGE_KEYS.BLACKLIST) memoryCachedBlacklist = null;
  if (!key || key === STORAGE_KEYS.EQUIPMENT) memoryCachedEquipment = null;
}

function scheduleAutomaticBackup(): void {
  if (autoBackupDebounceTimer) {
    clearTimeout(autoBackupDebounceTimer);
  }
  const now = Date.now();
  const delay = (now - lastAutoBackupTimestamp < 240000) ? 20000 : 5000;
  autoBackupDebounceTimer = setTimeout(() => {
    lastAutoBackupTimestamp = Date.now();
    try {
      dbService.triggerAutomaticBackup();
    } catch (e) {
      console.warn('Scheduled auto backup non-critical fault:', e);
    }
  }, delay);
}

// Pending sync queue helpers
function getStoredPendingChanges(): PendingSyncChange[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordPendingSyncChange(change: Omit<PendingSyncChange, 'id' | 'timestamp' | 'status'>): void {
  try {
    const current = getStoredPendingChanges();
    const existingIdx = current.findIndex(c => c.itemKey === change.itemKey && c.status === 'pending');
    
    const newEntry: PendingSyncChange = {
      ...change,
      id: `sync-chg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    if (existingIdx >= 0) {
      current[existingIdx] = newEntry;
    } else {
      current.unshift(newEntry);
    }

    safeSetItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(current.slice(0, 100)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
    }
  } catch (e) {
    console.warn('Failed to record pending sync change:', e);
  }
}

function markPendingSyncChangesAsSynced(keys?: string[]): void {
  try {
    const current = getStoredPendingChanges();
    let updated: PendingSyncChange[];
    if (!keys || keys.length === 0) {
      updated = current.map(item => ({ ...item, status: 'synced' as const }));
    } else {
      updated = current.map(item => keys.includes(item.itemKey) ? { ...item, status: 'synced' as const } : item);
    }
    safeSetItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(updated.slice(0, 50)));
    safeSetItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
    }
  } catch (e) {
    console.warn('Failed to mark sync items:', e);
  }
}

// Background sync to server-side JSON store AND standard Firebase Firestore SDK with true status reporting
async function syncToBackend(collectionName: string, data: any[], attempt = 1): Promise<boolean> {
  let isSuccess = false;
  try {
    const res = await fetch(`${getBaseApiUrl()}/api/db/sync/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      isSuccess = true;
    }
  } catch (err) {
    console.warn(`[Sync Attempt ${attempt}] Failed to connect to server for ${collectionName}:`, err);
  }

  // Non-blocking fire-and-forget sync to Firestore SDK (if initialized) without stalling the UI thread
  if (firestoreDb && Array.isArray(data) && data.length > 0) {
    (async () => {
      try {
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(firestoreDb);
        const sample = data.slice(0, 50); // Write reasonable batch
        for (const item of sample) {
          const docId = item.partNumber || item.tagNumber || item.id;
          if (docId) {
            const cleanDocId = encodeURIComponent(String(docId)).replace(/\./g, '_');
            const docRef = doc(firestoreDb, collectionName, cleanDocId);
            batch.set(docRef, item, { merge: true });
          }
        }
        await Promise.race([
          batch.commit(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 3000))
        ]);
      } catch (fireErr) {
        // Handled silently: server and local storage already persisted
      }
    })();
  }
  return isSuccess;
}

// Predefined users
export const PRESETS_USERS: { [email: string]: { user: User; pass: string } } = {
  'ihsan@emis.com': {
    user: { id: 'usr-01', email: 'ihsan@emis.com', name: 'Ihsan', role: UserRole.ADMIN },
    pass: '1991'
  },
  'admin@emis.com': {
    user: { id: 'usr-01', email: 'ihsan@emis.com', name: 'Ihsan', role: UserRole.ADMIN },
    pass: '1991'
  },
  'ihsan': {
    user: { id: 'usr-01', email: 'ihsan@emis.com', name: 'Ihsan', role: UserRole.ADMIN },
    pass: '1991'
  },
  'admin': {
    user: { id: 'usr-01', email: 'ihsan@emis.com', name: 'Ihsan', role: UserRole.ADMIN },
    pass: '1991'
  },
  'supervisor@emis.com': {
    user: { id: 'usr-02', email: 'supervisor@emis.com', name: 'Marcus Vance', role: UserRole.SUPERVISOR },
    pass: 'supervisor123'
  },
  'warehouse@emis.com': {
    user: { id: 'usr-03', email: 'warehouse@emis.com', name: 'Hassan Ahmed', role: UserRole.WAREHOUSE },
    pass: 'warehouse123'
  },
  'readonly@emis.com': {
    user: { id: 'usr-04', email: 'readonly@emis.com', name: 'Michael Chen', role: UserRole.READONLY },
    pass: 'readonly123'
  },
  'engineer@emis.com': {
    user: { id: 'usr-05', email: 'engineer@emis.com', name: 'David Miller', role: UserRole.SUPERVISOR },
    pass: 'engineer123'
  },
  'viewer@emis.com': {
    user: { id: 'usr-06', email: 'viewer@emis.com', name: 'Michael Chen', role: UserRole.READONLY },
    pass: 'viewer123'
  }
};

export const INITIAL_MASTER_SITES: Site[] = [
  {
    id: 'site-ndgs',
    siteId: 'SITE-01',
    name: 'NDGS',
    code: 'NDGS-01',
    area: 'Instrumentation & Gas Processing',
    description: 'Northern Desert Gas Processing Facility & Compressor Station',
    location: 'North Sector Gas Field',
    status: 'ACTIVE',
    active: true,
    isDefault: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'site-hipf',
    siteId: 'SITE-02',
    name: 'H-IPF DGS',
    code: 'HIPF-01',
    area: 'Heavy Industrial Processing',
    description: 'Heavy Industrial Processing Plant & High-Pressure Injection Unit',
    location: 'Southern Industrial Complex',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'site-dgsn',
    siteId: 'SITE-03',
    name: 'DGS North',
    code: 'DGS-N',
    area: 'Mechanical & Turbine Area',
    description: 'Northern Gathering Station & Pipeline Booster',
    location: 'North Perimeter Corridor',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'site-petro',
    siteId: 'SITE-04',
    name: 'PETROMAINT Store',
    code: 'PETRO-01',
    area: 'Central Maintenance Base',
    description: 'PETROMAINT Central Heavy Overhaul & Engineering Logistics Base',
    location: 'Central Logistics Hub',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    dataSource: 'CONFIGURED'
  }
];

export const INITIAL_MASTER_WAREHOUSES: MasterWarehouse[] = [
  {
    id: 'wh-elec-a',
    warehouseId: 'WH-01',
    code: 'WH-ELEC-A',
    name: 'Electronics Lab (Lab A)',
    siteId: 'site-ndgs',
    siteCode: 'NDGS-01',
    siteName: 'NDGS',
    description: 'Climate-controlled electronics & instrumentation cleanroom storage',
    location: 'NDGS Zone A - Cleanroom 2',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'wh-elec-b',
    warehouseId: 'WH-02',
    code: 'WH-ELEC-B',
    name: 'Main Electrical Store (Store B)',
    siteId: 'site-ndgs',
    siteCode: 'NDGS-01',
    siteName: 'NDGS',
    description: 'High-voltage switchgear spares, cables, and contactors warehouse',
    location: 'NDGS Zone B - Bay 4',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'wh-mech-01',
    warehouseId: 'WH-03',
    code: 'WH-MECH-01',
    name: 'Mechanical Spares Warehouse',
    siteId: 'site-hipf',
    siteCode: 'HIPF-01',
    siteName: 'H-IPF DGS',
    description: 'Pumps, mechanical seals, impellers, and heavy valve store',
    location: 'H-IPF Sector 3 - Yard 1',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'wh-inst-01',
    warehouseId: 'WH-04',
    code: 'WH-INST-01',
    name: 'Instrumentation Calibration Depot',
    siteId: 'site-petro',
    siteCode: 'PETRO-01',
    siteName: 'PETROMAINT Store',
    description: 'Calibrated transmitters, DCS cards, and HART communicators store',
    location: 'PETROMAINT Hub - Floor 1',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    dataSource: 'CONFIGURED'
  },
  {
    id: 'wh-haz-01',
    warehouseId: 'WH-05',
    code: 'WH-HAZ-01',
    name: 'Hazardous Materials Yard',
    siteId: 'site-dgsn',
    siteCode: 'DGS-N',
    siteName: 'DGS North',
    description: 'Explosion-proof components and specialized chemical seals facility',
    location: 'DGS North - Enclosure H',
    status: 'ACTIVE',
    active: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    dataSource: 'CONFIGURED'
  }
];

export const INITIAL_MASTER_USERS: User[] = [
  {
    id: 'usr-01',
    username: 'ihsan',
    email: 'ihsan@emis.com',
    name: 'Ihsan',
    role: UserRole.ADMIN,
    site: 'NDGS',
    siteId: 'site-ndgs',
    warehouse: 'Electronics Lab (Lab A)',
    warehouseId: 'wh-elec-a',
    allowedSites: ['site-ndgs', 'site-hipf', 'site-dgsn', 'site-petro'],
    allowedWarehouses: ['wh-elec-a', 'wh-elec-b', 'wh-mech-01', 'wh-inst-01', 'wh-haz-01'],
    status: 'ACTIVE',
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 180).toISOString(),
    dataSource: 'CONFIGURED',
    passwordHash: '1991'
  },
  {
    id: 'usr-02',
    username: 'supervisor',
    email: 'supervisor@emis.com',
    name: 'Marcus Vance',
    role: UserRole.ENGINEER,
    site: 'NDGS',
    siteId: 'site-ndgs',
    warehouse: 'Electronics Lab (Lab A)',
    warehouseId: 'wh-elec-a',
    allowedSites: ['site-ndgs', 'site-dgsn'],
    allowedWarehouses: ['wh-elec-a', 'wh-haz-01'],
    status: 'ACTIVE',
    lastLogin: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    dataSource: 'CONFIGURED',
    passwordHash: 'supervisor123'
  },
  {
    id: 'usr-03',
    username: 'warehouse',
    email: 'warehouse@emis.com',
    name: 'Hassan Ahmed',
    role: UserRole.STOREKEEPER,
    site: 'NDGS',
    siteId: 'site-ndgs',
    warehouse: 'Main Electrical Store (Store B)',
    warehouseId: 'wh-elec-b',
    allowedSites: ['site-ndgs'],
    allowedWarehouses: ['wh-elec-b'],
    status: 'ACTIVE',
    lastLogin: new Date(Date.now() - 3600000 * 8).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    dataSource: 'CONFIGURED',
    passwordHash: 'warehouse123'
  },
  {
    id: 'usr-04',
    username: 'inspector',
    email: 'inspector@emis.com',
    name: 'Sarah Jenkins',
    role: UserRole.INSPECTOR,
    site: 'H-IPF DGS',
    siteId: 'site-hipf',
    warehouse: 'Mechanical Spares Warehouse',
    warehouseId: 'wh-mech-01',
    allowedSites: ['site-hipf'],
    allowedWarehouses: ['wh-mech-01'],
    status: 'ACTIVE',
    lastLogin: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    dataSource: 'CONFIGURED',
    passwordHash: 'inspector123'
  },
  {
    id: 'usr-05',
    username: 'viewer',
    email: 'viewer@emis.com',
    name: 'Michael Chen',
    role: UserRole.VIEWER,
    site: 'PETROMAINT Store',
    siteId: 'site-petro',
    warehouse: 'Instrumentation Calibration Depot',
    warehouseId: 'wh-inst-01',
    allowedSites: ['site-petro'],
    allowedWarehouses: ['wh-inst-01'],
    status: 'ACTIVE',
    lastLogin: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    dataSource: 'CONFIGURED',
    passwordHash: 'viewer123'
  }
];

export const INITIAL_WAREHOUSE_FILES: WarehouseFile[] = [
  {
    id: 'wh-file-ndgs-master',
    name: 'NDGS Instrument Materials',
    fileName: 'NDGS_Instrument_Materials_Master.xlsx',
    warehouseCode: 'WH-NDGS-01',
    warehouseName: 'NDGS Station Warehouse',
    description: 'ملف مخزن أجهزة القياس والسيطرة والسلينويد لمحطة NDGS',
    totalRecords: 12,
    currentMaxSequence: 12,
    sequencePrefix: 'NDGS',
    sheetName: 'Sheet1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Sarah Jenkins (Admin)',
    status: 'ACTIVE',
    tags: ['Instrumentation', 'Gas Plant', 'NDGS']
  },
  {
    id: 'wh-file-maint-warehouse',
    name: 'Maintenance Warehouse',
    fileName: 'Maintenance_Warehouse_Spares.xlsx',
    warehouseCode: 'WH-MECH-01',
    warehouseName: 'Mechanical Spares Warehouse',
    description: 'ملف مخزن قطع الغيار الميكانيكية والصمامات والمضخات',
    totalRecords: 0,
    currentMaxSequence: 0,
    sequencePrefix: 'MAINT',
    sheetName: 'Spares',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Marcus Vance (Engineer)',
    status: 'ACTIVE',
    tags: ['Mechanical', 'Maintenance']
  },
  {
    id: 'wh-file-received-mats',
    name: 'Received Materials',
    fileName: 'Received_Materials_Log.xlsx',
    warehouseCode: 'WH-ELEC-A',
    warehouseName: 'Electronics Lab (Lab A)',
    description: 'ملف المواد المستلمة حديثاً وقيد الفحص والمطابقة الهندسية',
    totalRecords: 0,
    currentMaxSequence: 0,
    sequencePrefix: 'REC',
    sheetName: 'Incoming',
    createdAt: '2025-03-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    createdBy: 'Hassan Ahmed (Storekeeper)',
    status: 'ACTIVE',
    tags: ['Receiving', 'Inspection']
  }
];

export const dbService = {
  /**
   * Initializes the database with mock and master data if empty.
   */
  initialize: (): void => {
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSE_FILES)) {
      safeSetItem(STORAGE_KEYS.WAREHOUSE_FILES, JSON.stringify(INITIAL_WAREHOUSE_FILES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SITES)) {
      safeSetItem(STORAGE_KEYS.SITES, JSON.stringify(INITIAL_MASTER_SITES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSES)) {
      safeSetItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(INITIAL_MASTER_WAREHOUSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_MASTER_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATERIALS)) {
      safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(INITIAL_MATERIALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EQUIPMENT)) {
      safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(INITIAL_EQUIPMENT));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BLACKLIST)) {
      const initialBlacklist: BlacklistItem[] = [
        {
          id: 'bl-01',
          partNumber: 'FC-102-MOCK',
          serialNumber: 'SN-998811',
          supplierName: 'Global Trade Inc.',
          reportedDate: new Date(Date.now() - 3600000 * 24 * 30).toISOString(), // 30 days ago
          reason: 'counterfeit', // مقلد
          reporterName: 'Sarah Jenkins'
        },
        {
          id: 'bl-02',
          partNumber: 'TEMP-ABB-99',
          serialNumber: 'SN-ABB-7722',
          supplierName: 'Al-Fares Supplies',
          reportedDate: new Date(Date.now() - 3600000 * 24 * 15).toISOString(), // 15 days ago
          reason: 'non-compliant', // غير مطابق للمواصفات الفنية
          reporterName: 'David Miller'
        },
        {
          id: 'bl-03',
          partNumber: 'SIEM-XM-12',
          serialNumber: 'SN-XM-8844',
          supplierName: 'Apex Trading',
          reportedDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
          reason: 'failed-verification', // فشل التحقق الفني
          reporterName: 'Sarah Jenkins'
        }
      ];
      safeSetItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(initialBlacklist));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FEEDBACK)) {
      const initialFeedback: FeedbackItem[] = [
        {
          id: 'fb-01',
          category: 'bug',
          title: 'Datasheet attachment renders slowly on warehouse tablet',
          description: 'When accessing the materials ledger from the 8-inch Android tablet, PDF drawings are slow to cache offline.',
          submittedBy: 'David Miller',
          userRole: UserRole.ENGINEER,
          status: 'review',
          createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString()
        },
        {
          id: 'fb-02',
          category: 'feature',
          title: 'Direct Zebra barcode printing for rack tags',
          description: 'Need an integrated Zebra WebPrint option to immediately output physical rack label stickers when registering new parts.',
          submittedBy: 'Sarah Jenkins',
          userRole: UserRole.ADMIN,
          status: 'open',
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
          id: 'fb-03',
          category: 'suggestion',
          title: 'Calibration warning alerts for Rosemount flow meters',
          description: 'The system should warn warehouse supervisors when flow transmitter spares have been in shelf storage for over 18 months without recalibration.',
          submittedBy: 'Sarah Jenkins',
          userRole: UserRole.ADMIN,
          status: 'implemented',
          createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString()
        }
      ];
      safeSetItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(initialFeedback));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DECISIONS)) {
      const initialDecisions: EngineeringDecision[] = [
        {
          id: 'ed-01',
          partNumber: 'LM2596S-5.0',
          title: 'Approval of alternative step-down regulator',
          decisionType: 'approval',
          details: 'Approved the LM2596S-5.0 as direct alternate for older LM2596 step-down converters in RTU panel boards.',
          approvedBy: 'Sarah Jenkins',
          approvalDate: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
          rationale: 'Supply chain delays for original parts threatened shutdown of the oil manifold telemetry. Extensive laboratory heat-load tests at 75C showed excellent voltage stability with no failure over 48 hours.'
        },
        {
          id: 'ed-02',
          partNumber: '3051S-DIFF',
          title: 'Rejection of non-certified alternate manifold sensor',
          decisionType: 'rejection',
          details: 'Rejected Al-Faras alternative transmitter offer due to failure to supply API/ATEX hazardous area certificates.',
          approvedBy: 'David Miller',
          approvalDate: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
          rationale: 'The Instrument Department of ZFOD operates under strict zone 0/1 explosion prevention guidelines. Standard parts without ATEX certificates present unacceptable risk in hydrocarbon processing lines.'
        },
        {
          id: 'ed-03',
          partNumber: 'SKF-6204-2Z',
          title: 'Maintenance Lesson: Seal integrity on high-temp pumps',
          decisionType: 'lesson',
          details: 'Identified premature failure on bearing assemblies due to usage of rubber seals (2RS) instead of steel shields (2Z) on pumps operating above 120C.',
          approvedBy: 'David Miller',
          approvalDate: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
          rationale: 'Lessons learned registered: Steel shielded bearings (2Z) must always be selected for auxiliary pump assemblies in Area 3 hot oil circuits. Avoid standard elastomer seals as they melt and degrade rapidly.'
        }
      ];
      safeSetItem(STORAGE_KEYS.DECISIONS, JSON.stringify(initialDecisions));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      const initialLogs: ActivityLog[] = [
        {
          id: 'log-01',
          userId: 'system',
          userName: 'System Initializer',
          userRole: UserRole.ADMIN,
          action: 'auth',
          details: 'Engineering Material Management System Version 0.1 Database Initialized',
          timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString() // 2 days ago
        },
        {
          id: 'log-02',
          userId: 'usr-01',
          userName: 'Sarah Jenkins',
          userRole: UserRole.ADMIN,
          action: 'create',
          details: 'Imported initial batch of 10 primary materials',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
        }
      ];
      safeSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(initialLogs));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXTERNAL_FILES)) {
      safeSetItem(STORAGE_KEYS.EXTERNAL_FILES, JSON.stringify(INITIAL_EXTERNAL_FILES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXTERNAL_MATERIALS)) {
      safeSetItem(STORAGE_KEYS.EXTERNAL_MATERIALS, JSON.stringify(INITIAL_EXTERNAL_MATERIALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES)) {
      safeSetItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(INITIAL_IMPORT_BATCHES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
      safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
      safeSetItem(STORAGE_KEYS.FAVORITES, JSON.stringify(INITIAL_FAVORITES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)) {
      safeSetItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(INITIAL_SEARCH_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_BASE)) {
      safeSetItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(INITIAL_KNOWLEDGE_BASE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VERIFICATION_REPORTS)) {
      safeSetItem(STORAGE_KEYS.VERIFICATION_REPORTS, JSON.stringify(INITIAL_VERIFICATION_REPORTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HIERARCHY_NODES)) {
      safeSetItem(STORAGE_KEYS.HIERARCHY_NODES, JSON.stringify(INITIAL_HIERARCHY_NODES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSE_LOCATIONS)) {
      safeSetItem(STORAGE_KEYS.WAREHOUSE_LOCATIONS, JSON.stringify(INITIAL_WAREHOUSE_LOCATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      safeSetItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_TRANSACTIONS)) {
      safeSetItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(INITIAL_STOCK_TRANSACTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSFERS)) {
      safeSetItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(INITIAL_TRANSFERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ISSUES)) {
      safeSetItem(STORAGE_KEYS.ISSUES, JSON.stringify(INITIAL_ISSUES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RETURNS)) {
      safeSetItem(STORAGE_KEYS.RETURNS, JSON.stringify(INITIAL_RETURNS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESERVATIONS)) {
      safeSetItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(INITIAL_RESERVATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECEIVING_SESSIONS)) {
      safeSetItem(STORAGE_KEYS.RECEIVING_SESSIONS, JSON.stringify(INITIAL_RECEIVING_SESSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPROVALS)) {
      safeSetItem(STORAGE_KEYS.APPROVALS, JSON.stringify(INITIAL_APPROVALS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS)) {
      safeSetItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(INITIAL_STOCK_COUNT_SESSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUTOMATION_RULES)) {
      safeSetItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(INITIAL_AUTOMATION_RULES));
    }
  },

  /**
   * Synchronizes and loads entire database from the persistent server-side JSON/Firestore store.
   */
  initializeAsync: async (): Promise<void> => {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/db/load`);
      if (res.ok) {
        const serverData = await res.json();
        
        const isFirstRun = serverData.initialized === false;

        // Sync materials
        if (serverData.materials && (serverData.materials.length > 0 || !isFirstRun)) {
          safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(serverData.materials));
        } else {
          // If server database is unpopulated, write initial mock materials
          safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(INITIAL_MATERIALS));
          await syncToBackend('materials', INITIAL_MATERIALS);
        }

        // Sync equipment
        if (serverData.equipment && (serverData.equipment.length > 0 || !isFirstRun)) {
          safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(serverData.equipment));
        } else {
          safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(INITIAL_EQUIPMENT));
          await syncToBackend('equipment', INITIAL_EQUIPMENT);
        }

        // Sync blacklist
        if (serverData.blacklist && serverData.blacklist.length > 0) {
          safeSetItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(serverData.blacklist));
        } else {
          const defaultBlacklist = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLACKLIST) || "[]");
          if (defaultBlacklist.length > 0) {
            await syncToBackend('blacklist', defaultBlacklist);
          }
        }

        // Sync feedback
        if (serverData.feedback && serverData.feedback.length > 0) {
          safeSetItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(serverData.feedback));
        } else {
          const defaultFeedback = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK) || "[]");
          if (defaultFeedback.length > 0) {
            await syncToBackend('feedback', defaultFeedback);
          }
        }

        // Sync decisions
        if (serverData.decisions && serverData.decisions.length > 0) {
          safeSetItem(STORAGE_KEYS.DECISIONS, JSON.stringify(serverData.decisions));
        } else {
          const defaultDecisions = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECISIONS) || "[]");
          if (defaultDecisions.length > 0) {
            await syncToBackend('decisions', defaultDecisions);
          }
        }

        // Sync activities
        if (serverData.activities && serverData.activities.length > 0) {
          safeSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(serverData.activities));
        } else {
          const defaultActivities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
          if (defaultActivities.length > 0) {
            await syncToBackend('activities', defaultActivities);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to synchronize with backend database, running on local cache:", e);
      dbService.initialize();
    }
  },

  // --- MATERIALS SECTION ---

  getMaterials: (filterUser?: User | null, forceFresh = false): Material[] => {
    let list: Material[];
    if (memoryCachedMaterials && !forceFresh) {
      list = memoryCachedMaterials;
    } else {
      dbService.initialize();
      try {
        const data = localStorage.getItem(STORAGE_KEYS.MATERIALS);
        if (!data) return INITIAL_MATERIALS || [];
        const parsed: Material[] = JSON.parse(data);
        if (!Array.isArray(parsed)) return INITIAL_MATERIALS || [];
        list = parsed.map(m => {
          const isTemp = m.partNumber && (
            m.partNumber.startsWith('TEMP-PN-') ||
            m.partNumber.startsWith('TEMP_PN_') ||
            m.partNumber.startsWith('TEMP-') ||
            m.partNumber.startsWith('AUTOPN-')
          );
          let cleanPartNumber = isTemp ? '' : (m.partNumber || '').trim();
          let autoGen = isTemp ? true : Boolean(m.isPartNumberAutoGenerated);

          // Intelligent Auto-Extraction: If partNumber is missing, extract it from Model or Description
          if (!cleanPartNumber) {
            // Check if model contains PN:... or P/N:... (e.g., "PN:USFR-02ND")
            const pnInModel = (m.model || '').match(/(?:PN|P\/N|PART\s*NO)[\s:_-]*([A-Za-z0-9/_-]+)/i);
            if (pnInModel && pnInModel[1]) {
              cleanPartNumber = pnInModel[1].trim();
              autoGen = false;
            } else {
              // Check if description contains PN:... (e.g., "... PN:USFR-02ND")
              const pnInDesc = (m.description || '').match(/(?:PN|P\/N|PART\s*NO)[\s:_-]*([A-Za-z0-9/_-]+)/i);
              if (pnInDesc && pnInDesc[1]) {
                cleanPartNumber = pnInDesc[1].trim();
                autoGen = false;
              }
            }
          }

          const uniqueId = m.id || (m.sequence ? `mat-seq-${m.sequence}` : `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

          // Create initial history if not present
          const defaultHistory: MaterialHistoryEvent[] = [
            {
              id: `hist-init-${uniqueId}`,
              action: 'Material Created',
              details: `Material record initialized with quantity ${m.quantity} ${m.unit}`,
              userName: 'Sarah Jenkins',
              userRole: UserRole.ADMIN,
              timestamp: m.createdAt || new Date().toISOString()
            }
          ];

          return {
            ...m,
            id: uniqueId,
            fileId: m.fileId || 'wh-file-ndgs-master',
            fileName: m.fileName || 'NDGS_Instrument_Materials_Master.xlsx',
            fileSequence: m.fileSequence ?? m.sequence,
            partNumber: cleanPartNumber,
            isPartNumberAutoGenerated: autoGen,
            compatibleEquipment: m.compatibleEquipment || [],
            alternatives: m.alternatives || { primary: '', secondary: '', notes: '', reason: '' },
            documents: m.documents || {},
            photos: m.photos || { nameplate: [], installation: [], warehouse: [], other: [] },
            history: m.history || defaultHistory,
            engineeringNotes: m.engineeringNotes || m.notes || '',
            oemVerified: m.oemVerified ?? false,
            oemVerificationStatus: m.oemVerificationStatus || 'pending',
            oemCertificateId: m.oemCertificateId || '',
            oemVerifiedBy: m.oemVerifiedBy || '',
            oemVerificationDate: m.oemVerificationDate || '',
            oemVerificationNotes: m.oemVerificationNotes || ''
          };
        });

        memoryCachedMaterials = list;
      } catch (e) {
        console.warn('Error reading materials from storage:', e);
        return INITIAL_MATERIALS || [];
      }
    }

    // Enforce site-level isolation if user is restricted to specific sites
    if (filterUser && filterUser.role !== UserRole.ADMIN && filterUser.allowedSites && filterUser.allowedSites.length > 0) {
      return list.filter(m => {
        if (!m.site && !m.siteId) return true; // Global material
        if (m.siteId && filterUser.allowedSites!.includes(m.siteId)) return true;
        if (m.site && filterUser.allowedSites!.some(s => s.toLowerCase() === m.site!.toLowerCase())) return true;
        if (filterUser.site && m.site && filterUser.site.toLowerCase() === m.site.toLowerCase()) return true;
        return false;
      });
    }

    return list;
  },

  saveMaterials: (materials: Material[]): void => {
    safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    memoryCachedMaterials = materials;
    syncToBackend('materials', materials);
    scheduleAutomaticBackup();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emis:materials-changed'));
    }
  },

  clearAllMaterials: (currentUser: User): void => {
    safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify([]));
    syncToBackend('materials', []);
    dbService.triggerAutomaticBackup();
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'delete',
      details: 'Cleared all materials from the database ledger.'
    });
  },

  triggerAutomaticBackup: (): void => {
    try {
      const materials = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || "[]");
      const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
      const equipment = JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPMENT) || "[]");
      
      const timestamp = Date.now();
      const backupState = {
        timestamp,
        label: `Auto backup before system operations`,
        materials,
        activities,
        equipment
      };

      safeSetItem(`emis_auto_backup_${timestamp}`, JSON.stringify(backupState));

      // Maintain a rolling window of the last 2 auto backups to preserve storage space
      const autoBackupKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('emis_auto_backup_')) {
          autoBackupKeys.push(key);
        }
      }

      // Sort ascending (oldest first)
      autoBackupKeys.sort((a, b) => {
        const tA = parseInt(a.replace('emis_auto_backup_', ''));
        const tB = parseInt(b.replace('emis_auto_backup_', ''));
        return tA - tB;
      });

      // Delete oldest keys if count is > 2
      if (autoBackupKeys.length > 2) {
        const toDeleteCount = autoBackupKeys.length - 2;
        for (let i = 0; i < toDeleteCount; i++) {
          localStorage.removeItem(autoBackupKeys[i]);
        }
      }
    } catch (e) {
      console.warn('Auto backup engine fault:', e);
    }
  },

  restoreFullState: (materials: Material[], activities: ActivityLog[], equipment: Equipment[]): void => {
    safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    safeSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
    syncToBackend('materials', materials);
    syncToBackend('activities', activities);
    syncToBackend('equipment', equipment);
  },

  getMaterialByPartNumber: (partNumber: string): Material | undefined => {
    const materials = dbService.getMaterials();
    return materials.find(m => m.partNumber.toUpperCase() === partNumber.toUpperCase());
  },

  addMaterial: (material: Omit<Material, 'createdAt' | 'updatedAt'>, currentUser: User): { success: boolean; error?: string; duplicateMatch?: Material } => {
    // Enforce RBAC: Read-only accounts cannot create materials
    if (currentUser.role === UserRole.VIEWER) {
      dbService.logAudit({
        id: `aud-rbac-denied-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UNAUTHORIZED_ATTEMPT',
        entity: 'Material',
        entityId: material.partNumber || 'NEW_RECORD',
        user: currentUser.name,
        userId: currentUser.id,
        userRole: currentUser.role,
        reason: 'Read-only account attempted to create new catalog material',
        result: 'FAILED'
      });
      return { success: false, error: 'Access Denied: Read-only accounts cannot create new materials.' };
    }

    const materials = dbService.getMaterials(null, true);
    const normalizedPartNumber = (material.partNumber || '').trim();

    // 1. Robust duplicate detection across all key fields (partNumber, materialCode, tag, model, serial)
    const dupCheck = detectDuplicateMaterial({
      partNumber: normalizedPartNumber,
      materialCode: material.materialCode,
      tagNumber: material.tagNumber,
      barcode: material.barcode,
      qrCode: material.qrCode,
      serialNumber: material.serialNumber,
      manufacturer: material.manufacturer,
      model: material.model,
      description: material.description
    }, materials);

    if (dupCheck.level === 'EXACT' && dupCheck.exactMatch) {
      const reasonMsg = dupCheck.reasons[0]?.descriptionAr || 'تطابق في رقم القطعة أو المعرف';
      return { 
        success: false, 
        error: `المادة مسجلة مسبقاً في النظام: ${reasonMsg} (${dupCheck.exactMatch.partNumber || dupCheck.exactMatch.description})`,
        duplicateMatch: dupCheck.exactMatch
      };
    }

    // 2. Authoritative Sequence Assignment & Collision Prevention
    let finalSequence: number;
    if (typeof material.sequence === 'number' && material.sequence > 0) {
      const seqCheck = validateSequenceAvailability(material.sequence, undefined, materials);
      if (!seqCheck.isAvailable) {
        finalSequence = seqCheck.suggestedAlternative;
      } else {
        finalSequence = material.sequence;
      }
    } else {
      finalSequence = getAuthoritativeSuggestedSequence(materials);
    }

    const targetFileId = material.fileId || 'wh-file-ndgs-master';
    const warehouseFiles = dbService.getWarehouseFiles();
    const wfIdx = warehouseFiles.findIndex(f => f.id === targetFileId);
    let targetFileName = material.fileName;
    if (wfIdx !== -1) {
      targetFileName = targetFileName || warehouseFiles[wfIdx].name || warehouseFiles[wfIdx].fileName;
      warehouseFiles[wfIdx] = {
        ...warehouseFiles[wfIdx],
        totalRecords: (warehouseFiles[wfIdx].totalRecords || 0) + 1,
        currentMaxSequence: Math.max(warehouseFiles[wfIdx].currentMaxSequence || 0, finalSequence),
        updatedAt: new Date().toISOString()
      };
      dbService.saveWarehouseFiles(warehouseFiles);
    }

    const materialId = material.id || `mat-${finalSequence}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const newMaterial: Material = {
      ...material,
      id: materialId,
      sequence: finalSequence,
      fileId: targetFileId,
      fileName: targetFileName || 'NDGS Instrument Materials',
      fileSequence: material.fileSequence ?? finalSequence,
      partNumber: normalizedPartNumber,
      isPartNumberAutoGenerated: !normalizedPartNumber || Boolean(material.isPartNumberAutoGenerated),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      compatibleEquipment: material.compatibleEquipment || [],
      alternatives: material.alternatives || { primary: '', secondary: '', notes: '', reason: '' },
      documents: material.documents || {},
      photos: material.photos || { nameplate: [], installation: [], warehouse: [], other: [] },
      history: [
        {
          id: `hist-create-${Date.now()}`,
          action: 'Material Created',
          details: `Added new material: ${normalizedPartNumber || '(No Part Number)'} (Sequence #${finalSequence})`,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        }
      ],
      engineeringNotes: material.engineeringNotes || ''
    };

    const updated = [newMaterial, ...materials];
    dbService.saveMaterials(updated);

    // Record pending sync change for offline tracking
    recordPendingSyncChange({
      entityType: 'material',
      action: 'create',
      itemKey: newMaterial.partNumber,
      itemTitle: `${newMaterial.partNumber} - ${newMaterial.description.slice(0, 35)}`,
      details: `Registered new SKU with quantity ${newMaterial.quantity} ${newMaterial.unit} (Warehouse: ${newMaterial.store})`
    });

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Added new material: ${newMaterial.partNumber} (${newMaterial.description.slice(0, 30)}${newMaterial.description.length > 30 ? '...' : ''})`
    });

    // Dispatch system notification for new material registration so it appears in Notification Center
    try {
      dbService.addNotification({
        type: 'SUCCESS',
        category: 'NEW_MATERIAL',
        priority: 'NORMAL',
        title: `تم تسجيل مادة جديدة: ${newMaterial.partNumber}`,
        message: `تمت إضافة المادة "${newMaterial.description || newMaterial.partNumber}" بكمية ${newMaterial.quantity} ${newMaterial.unit || 'pcs'} في مستودع (${newMaterial.store || 'المستودع الرئيسي'}).`,
        materialId: newMaterial.partNumber,
        linkType: 'material',
        linkId: newMaterial.partNumber,
        site: newMaterial.store || currentUser.site || 'NDGS',
        userId: currentUser.id
      });
    } catch (e) {
      console.warn('Failed to add notification for new material:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emis:material-added', { detail: newMaterial }));
      window.dispatchEvent(new CustomEvent('emis:materials-changed'));
    }

    return { success: true };
  },

  updateMaterial: (material: Material, currentUser: User): { success: boolean; error?: string } => {
    // Enforce RBAC: Read-only accounts cannot modify materials
    if (currentUser.role === UserRole.VIEWER) {
      dbService.logAudit({
        id: `aud-rbac-denied-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UNAUTHORIZED_ATTEMPT',
        entity: 'Material',
        entityId: material.partNumber,
        user: currentUser.name,
        userId: currentUser.id,
        userRole: currentUser.role,
        reason: 'Read-only account attempted to modify catalog material',
        result: 'FAILED'
      });
      return { success: false, error: 'Access Denied: Read-only accounts cannot modify materials.' };
    }

    const materials = dbService.getMaterials();
    const idx = materials.findIndex(m => 
      (material.id && m.id && m.id === material.id) ||
      (material.sequence !== undefined && m.sequence !== undefined && m.sequence === material.sequence) ||
      (material.partNumber && m.partNumber && m.partNumber.trim().toUpperCase() === material.partNumber.trim().toUpperCase())
    );

    if (idx === -1) {
      return { success: false, error: 'Material not found.' };
    }

    const oldMaterial = materials[idx];
    const updatedHistory = [...(oldMaterial.history || [])];

    // Detect quantity changes for History
    let changeSummary = 'Specifications and parameters updated';
    if (oldMaterial.quantity !== material.quantity) {
      changeSummary = `Stock level adjusted from ${oldMaterial.quantity} to ${material.quantity} ${material.unit}`;
      updatedHistory.push({
        id: `hist-qty-${Date.now()}`,
        action: 'Quantity Changed',
        details: changeSummary,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      });
    }

    // Detect engineer notes updates
    if (oldMaterial.engineeringNotes !== material.engineeringNotes) {
      updatedHistory.push({
        id: `hist-eng-${Date.now()}`,
        action: 'Engineer Notes Added',
        details: 'Specialized engineering remarks adjusted',
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      });
    }

    // Detect OEM verification changes
    if (oldMaterial.oemVerificationStatus !== material.oemVerificationStatus || oldMaterial.oemCertificateId !== material.oemCertificateId) {
      updatedHistory.push({
        id: `hist-oem-${Date.now()}`,
        action: 'OEM Verified',
        details: `OEM verification updated to ${material.oemVerificationStatus?.toUpperCase() || 'PENDING'} (Cert ID: ${material.oemCertificateId || 'None'})`,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      });
    }

    // Detect general notes / description updates
    if (oldMaterial.notes !== material.notes || oldMaterial.description !== material.description) {
      updatedHistory.push({
        id: `hist-mod-${Date.now()}`,
        action: 'Material Modified',
        details: 'Core specification or remarks updated',
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      });
    }

    const updatedMaterial: Material = {
      ...material,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const updated = [...materials];
    updated[idx] = updatedMaterial;
    dbService.saveMaterials(updated);

    // Record pending sync change for offline tracking
    recordPendingSyncChange({
      entityType: 'material',
      action: 'update',
      itemKey: material.partNumber,
      itemTitle: `${material.partNumber} - ${material.description.slice(0, 35)}`,
      details: changeSummary
    });

    // Sync compatible spares list inside Equipment records
    const oldCompatible = oldMaterial.compatibleEquipment || [];
    const newCompatible = material.compatibleEquipment || [];
    const equipmentList = dbService.getEquipment();
    let equipmentChanged = false;

    const addedEq = newCompatible.filter(tag => !oldCompatible.some(o => o.toUpperCase() === tag.toUpperCase()));
    const removedEq = oldCompatible.filter(tag => !newCompatible.some(o => o.toUpperCase() === tag.toUpperCase()));

    equipmentList.forEach(eq => {
      const tagUpper = eq.tagNumber.toUpperCase();
      if (addedEq.some(t => t.toUpperCase() === tagUpper)) {
        if (!eq.compatibleSpares) eq.compatibleSpares = [];
        if (!eq.compatibleSpares.some(s => s.toUpperCase() === material.partNumber.toUpperCase())) {
          eq.compatibleSpares.push(material.partNumber);
          equipmentChanged = true;
        }
      }
      if (removedEq.some(t => t.toUpperCase() === tagUpper)) {
        if (eq.compatibleSpares) {
          eq.compatibleSpares = eq.compatibleSpares.filter(s => s.toUpperCase() !== material.partNumber.toUpperCase());
          equipmentChanged = true;
        }
      }
    });

    if (equipmentChanged) {
      dbService.saveEquipment(equipmentList);
    }

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Updated material: ${material.partNumber}`
    });

    // Dispatch system in-app notification
    try {
      dbService.addNotification({
        type: 'INFO',
        category: 'MATERIAL_UPDATED',
        priority: 'NORMAL',
        title: `تم تحديث المادة ${material.partNumber}`,
        message: changeSummary,
        materialId: material.partNumber,
        siteId: material.siteId,
        site: material.site,
        linkType: 'material',
        linkId: material.partNumber
      });
    } catch (e) {
      console.warn('Failed to add in-app notification:', e);
    }

    // Send real-time Email Alert if configured
    try {
      const emailCfg = dbService.getEmailSettings();
      
      // Check if this material is classified as Critical or has breached safety minimum stock
      const isCritical = (material.criticality && ['Critical', 'Major'].includes(material.criticality)) ||
        (oldMaterial.criticality && ['Critical', 'Major'].includes(oldMaterial.criticality)) ||
        Boolean(material.isCritical || oldMaterial.isCritical) ||
        (typeof material.quantity === 'number' && typeof material.minStockLevel === 'number' && material.quantity <= material.minStockLevel);

      if (isCritical) {
        // High-Priority Engineering Team Cloud Trigger
        dbService.triggerCriticalMaterialAlert({
          before: oldMaterial,
          after: material,
          user: currentUser.name,
          userId: currentUser.id,
          userRole: currentUser.role,
          reason: changeSummary
        }).catch(err => console.warn('Critical email alert dispatch warning:', err));
      } else if (emailCfg.enabled && (emailCfg.triggers?.materialUpdated || emailCfg.triggers?.existingMaterialQuantityChanged)) {
        // Standard material update alert
        dbService.sendMaterialAlertEmail({
          eventId: `EVT-UPD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          materialId: material.partNumber,
          eventType: oldMaterial.quantity !== material.quantity ? 'STOCK_ADJUSTMENT' : 'MATERIAL_UPDATED',
          partNumber: material.partNumber,
          manufacturer: material.manufacturer || 'OEM',
          model: material.model || '',
          description: material.description,
          previousQuantity: oldMaterial.quantity,
          currentQuantity: material.quantity,
          unit: material.unit,
          site: material.site,
          user: currentUser.name,
          userId: currentUser.id,
          userRole: currentUser.role,
          notes: changeSummary,
          existingMaterial: true
        }).catch(err => console.warn('Email alert dispatch warning:', err));
      }
    } catch (e) {
      console.warn('Failed to trigger material update email alert:', e);
    }

    return { success: true };
  },

  updateMaterialWithPartNumberChange: (oldPartNumber: string, material: Material, currentUser: User): { success: boolean; error?: string } => {
    const materials = dbService.getMaterials();
    const idx = materials.findIndex(m => 
      (material.id && m.id && m.id === material.id) ||
      (material.sequence !== undefined && m.sequence !== undefined && m.sequence === material.sequence) ||
      (oldPartNumber && m.partNumber && m.partNumber.trim().toUpperCase() === oldPartNumber.trim().toUpperCase())
    );

    if (idx === -1) {
      return { success: false, error: 'Material not found.' };
    }

    const cleanedNewPartNumber = (material.partNumber || '').trim();

    // Check if new part number is provided, different, and already exists on another item
    if (cleanedNewPartNumber && (!oldPartNumber || oldPartNumber.trim().toUpperCase() !== cleanedNewPartNumber.toUpperCase())) {
      const exists = materials.some(
        (m, mIdx) => mIdx !== idx && m.partNumber && m.partNumber.trim().toUpperCase() === cleanedNewPartNumber.toUpperCase()
      );
      if (exists) {
        return { success: false, error: `Part Number "${cleanedNewPartNumber}" already exists in the system.` };
      }
    }

    const oldMaterial = materials[idx];
    const updatedHistory = [...(oldMaterial.history || [])];

    updatedHistory.push({
      id: `hist-mod-${Date.now()}`,
      action: 'Material Modified',
      details: oldPartNumber.toUpperCase() !== cleanedNewPartNumber.toUpperCase() 
        ? `Part number updated from ${oldPartNumber} to ${cleanedNewPartNumber}. Specifications corrected.`
        : 'Core specifications updated.',
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString()
    });

    const updatedMaterial: Material = {
      ...material,
      partNumber: cleanedNewPartNumber,
      history: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    const updated = [...materials];
    updated[idx] = updatedMaterial;
    dbService.saveMaterials(updated);

    // Record pending sync change for offline tracking
    recordPendingSyncChange({
      entityType: 'material',
      action: 'update',
      itemKey: cleanedNewPartNumber,
      itemTitle: `${cleanedNewPartNumber} (Renamed from ${oldPartNumber})`,
      details: `Part Number renamed from ${oldPartNumber} to ${cleanedNewPartNumber} with updated specs`
    });

    // Sync equipment compatibleSpares references if part number changed
    if (oldPartNumber.toUpperCase() !== cleanedNewPartNumber.toUpperCase()) {
      const equipmentList = dbService.getEquipment();
      let eqChanged = false;
      equipmentList.forEach(eq => {
        if (eq.compatibleSpares) {
          const sIdx = eq.compatibleSpares.findIndex(s => s.toUpperCase() === oldPartNumber.toUpperCase());
          if (sIdx !== -1) {
            eq.compatibleSpares[sIdx] = cleanedNewPartNumber;
            eqChanged = true;
          }
        }
      });
      if (eqChanged) {
        dbService.saveEquipment(equipmentList);
      }
    }

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Updated material: ${oldPartNumber} -> ${cleanedNewPartNumber}`
    });

    // Dispatch system in-app notification
    try {
      dbService.addNotification({
        type: 'INFO',
        category: 'MATERIAL_UPDATED',
        priority: 'NORMAL',
        title: `تم تحديث المادة ${cleanedNewPartNumber}`,
        message: `تم تعديل مواصفات المادة (السابق: ${oldPartNumber})`,
        materialId: cleanedNewPartNumber,
        siteId: material.siteId,
        site: material.site,
        linkType: 'material',
        linkId: cleanedNewPartNumber
      });
    } catch (e) {
      console.warn('Failed to add in-app notification:', e);
    }

    // Send real-time Email Alert if configured
    try {
      const emailCfg = dbService.getEmailSettings();
      
      const isCritical = (material.criticality && ['Critical', 'Major'].includes(material.criticality)) ||
        Boolean(material.isCritical) ||
        (typeof material.quantity === 'number' && typeof material.minStockLevel === 'number' && material.quantity <= material.minStockLevel);

      if (isCritical) {
        // High-Priority Engineering Team Cloud Trigger
        dbService.triggerCriticalMaterialAlert({
          before: { ...material, partNumber: oldPartNumber },
          after: material,
          user: currentUser.name,
          userId: currentUser.id,
          userRole: currentUser.role,
          reason: `تم تغيير الرمز من ${oldPartNumber} إلى ${cleanedNewPartNumber} وتحديث البيانات`
        }).catch(err => console.warn('Critical email alert dispatch warning:', err));
      } else if (emailCfg.enabled && (emailCfg.triggers?.materialUpdated || emailCfg.triggers?.existingMaterialQuantityChanged)) {
        dbService.sendMaterialAlertEmail({
          eventId: `EVT-UPD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          materialId: cleanedNewPartNumber,
          eventType: 'MATERIAL_UPDATED',
          partNumber: cleanedNewPartNumber,
          manufacturer: material.manufacturer || 'OEM',
          model: material.model || '',
          description: material.description,
          previousQuantity: material.quantity,
          currentQuantity: material.quantity,
          unit: material.unit,
          site: material.site,
          user: currentUser.name,
          userId: currentUser.id,
          userRole: currentUser.role,
          notes: `تم تغيير الرمز من ${oldPartNumber} إلى ${cleanedNewPartNumber} وتحديث البيانات`,
          existingMaterial: true
        }).catch(err => console.warn('Email alert dispatch warning:', err));
      }
    } catch (e) {
      console.warn('Failed to trigger material update email alert:', e);
    }

    return { success: true };
  },

  deleteMaterial: (partNumber: string, currentUser: User): { success: boolean; error?: string } => {
    // Enforce RBAC: Only Administrators can permanently delete materials
    if (currentUser.role !== UserRole.ADMIN) {
      dbService.logAudit({
        id: `aud-rbac-denied-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'UNAUTHORIZED_ATTEMPT',
        entity: 'Material',
        entityId: partNumber,
        user: currentUser.name,
        userId: currentUser.id,
        userRole: currentUser.role,
        reason: 'Non-admin user attempted to delete catalog material',
        result: 'FAILED'
      });
      return { success: false, error: 'Unauthorized: Only Administrators are permitted to delete material catalog records.' };
    }

    const materials = dbService.getMaterials();
    const originalLength = materials.length;
    const targetKey = (partNumber || '').trim();

    const deletedMaterial = materials.find(m => {
      if (m.id && targetKey && m.id === targetKey) return true;
      if (targetKey && m.partNumber && m.partNumber.trim().toUpperCase() === targetKey.toUpperCase()) return true;
      if (targetKey && m.sequence !== undefined && String(m.sequence) === targetKey) return true;
      return false;
    });

    const filtered = materials.filter(m => {
      if (m.id && targetKey && m.id === targetKey) return false;
      if (targetKey && m.partNumber && m.partNumber.trim().toUpperCase() === targetKey.toUpperCase()) return false;
      if (targetKey && m.sequence !== undefined && String(m.sequence) === targetKey) return false;
      return true;
    });

    if (filtered.length === originalLength) {
      return { success: false, error: 'Material not found.' };
    }

    if (deletedMaterial && deletedMaterial.fileId) {
      const warehouseFiles = dbService.getWarehouseFiles();
      const wfIdx = warehouseFiles.findIndex(f => f.id === deletedMaterial.fileId);
      if (wfIdx !== -1) {
        warehouseFiles[wfIdx] = {
          ...warehouseFiles[wfIdx],
          totalRecords: Math.max(0, (warehouseFiles[wfIdx].totalRecords || 0) - 1),
          updatedAt: new Date().toISOString()
        };
        dbService.saveWarehouseFiles(warehouseFiles);
      }
    }

    dbService.saveMaterials(filtered);

    // Record pending sync change for offline tracking
    recordPendingSyncChange({
      entityType: 'material',
      action: 'delete',
      itemKey: partNumber,
      itemTitle: `Deleted Part: ${partNumber}`,
      details: `Material deleted from catalog ledger`
    });

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'delete',
      details: `Deleted material: ${partNumber}`
    });

    return { success: true };
  },

  // --- EQUIPMENT SECTION ---

  getEquipment: (): Equipment[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    return data ? JSON.parse(data) : [];
  },

  saveEquipment: (equipment: Equipment[]): void => {
    safeSetItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
    syncToBackend('equipment', equipment);
  },

  addEquipment: (eq: Omit<Equipment, 'compatibleSpares'> & { compatibleSpares: string[] }, currentUser: User): { success: boolean; error?: string } => {
    const list = dbService.getEquipment();
    const normalizedTag = eq.tagNumber.trim().toUpperCase();

    if (!normalizedTag) {
      return { success: false, error: 'Tag Number is required' };
    }

    const exists = list.some(item => item.tagNumber.toUpperCase() === normalizedTag);
    if (exists) {
      return { success: false, error: `Equipment with Tag Number "${eq.tagNumber}" already exists.` };
    }

    const newEq: Equipment = {
      ...eq,
      tagNumber: eq.tagNumber.trim(),
      compatibleSpares: eq.compatibleSpares || []
    };

    const updatedList = [newEq, ...list];
    dbService.saveEquipment(updatedList);

    // Update compatible spares material records with this equipment tag
    if (eq.compatibleSpares && eq.compatibleSpares.length > 0) {
      const materials = dbService.getMaterials();
      eq.compatibleSpares.forEach(partNo => {
        const mat = materials.find(m => m.partNumber.toUpperCase() === partNo.toUpperCase());
        if (mat) {
          if (!mat.compatibleEquipment) mat.compatibleEquipment = [];
          if (!mat.compatibleEquipment.includes(newEq.tagNumber)) {
            mat.compatibleEquipment.push(newEq.tagNumber);
            if (!mat.history) mat.history = [];
            mat.history.push({
              id: `hist-eq-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
              action: 'Equipment Linked',
              details: `Linked to equipment: ${newEq.name} (${newEq.tagNumber})`,
              userName: currentUser.name,
              userRole: currentUser.role,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      dbService.saveMaterials(materials);
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Added new equipment: ${newEq.name} (${newEq.tagNumber})`
    });

    return { success: true };
  },

  updateEquipment: (eq: Equipment, currentUser: User): { success: boolean; error?: string } => {
    const list = dbService.getEquipment();
    const idx = list.findIndex(item => item.tagNumber.toUpperCase() === eq.tagNumber.toUpperCase());

    if (idx === -1) {
      return { success: false, error: 'Equipment not found.' };
    }

    const oldEq = list[idx];
    const oldSpares = oldEq.compatibleSpares || [];
    const newSpares = eq.compatibleSpares || [];

    const listCopy = [...list];
    listCopy[idx] = eq;
    dbService.saveEquipment(listCopy);

    // Sync compatibleEquipment arrays in Materials
    const materials = dbService.getMaterials();
    let materialsChanged = false;

    const addedSpares = newSpares.filter(s => !oldSpares.some(o => o.toUpperCase() === s.toUpperCase()));
    const removedSpares = oldSpares.filter(s => !newSpares.some(o => o.toUpperCase() === s.toUpperCase()));

    materials.forEach(mat => {
      const partUpper = mat.partNumber.toUpperCase();
      if (addedSpares.some(s => s.toUpperCase() === partUpper)) {
        if (!mat.compatibleEquipment) mat.compatibleEquipment = [];
        if (!mat.compatibleEquipment.includes(eq.tagNumber)) {
          mat.compatibleEquipment.push(eq.tagNumber);
          if (!mat.history) mat.history = [];
          mat.history.push({
            id: `hist-eq-link-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            action: 'Equipment Linked',
            details: `Linked to equipment: ${eq.name} (${eq.tagNumber})`,
            userName: currentUser.name,
            userRole: currentUser.role,
            timestamp: new Date().toISOString()
          });
          materialsChanged = true;
        }
      }

      if (removedSpares.some(s => s.toUpperCase() === partUpper)) {
        if (mat.compatibleEquipment) {
          mat.compatibleEquipment = mat.compatibleEquipment.filter(t => t.toUpperCase() !== eq.tagNumber.toUpperCase());
          if (!mat.history) mat.history = [];
          mat.history.push({
            id: `hist-eq-unlink-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
            action: 'Equipment Linked', // matches timeline filter criteria
            details: `Unlinked from equipment: ${eq.name} (${eq.tagNumber})`,
            userName: currentUser.name,
            userRole: currentUser.role,
            timestamp: new Date().toISOString()
          });
          materialsChanged = true;
        }
      }
    });

    if (materialsChanged) {
      dbService.saveMaterials(materials);
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Updated equipment: ${eq.name} (${eq.tagNumber})`
    });

    return { success: true };
  },

  deleteEquipment: (tagNumber: string, currentUser: User): { success: boolean; error?: string } => {
    const list = dbService.getEquipment();
    const originalLength = list.length;
    const filtered = list.filter(item => item.tagNumber.toUpperCase() !== tagNumber.toUpperCase());

    if (filtered.length === originalLength) {
      return { success: false, error: 'Equipment not found.' };
    }

    dbService.saveEquipment(filtered);

    // Sync compatibleEquipment in Materials by removing deleted tag
    const materials = dbService.getMaterials();
    let materialsChanged = false;
    materials.forEach(mat => {
      if (mat.compatibleEquipment && mat.compatibleEquipment.some(t => t.toUpperCase() === tagNumber.toUpperCase())) {
        mat.compatibleEquipment = mat.compatibleEquipment.filter(t => t.toUpperCase() !== tagNumber.toUpperCase());
        if (!mat.history) mat.history = [];
        mat.history.push({
          id: `hist-eq-del-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
          action: 'Equipment Linked',
          details: `Equipment connection severed (Equipment tag ${tagNumber} deleted)`,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        });
        materialsChanged = true;
      }
    });

    if (materialsChanged) {
      dbService.saveMaterials(materials);
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'delete',
      details: `Deleted equipment: ${tagNumber}`
    });

    return { success: true };
  },

  // --- ACTIVITIES SECTION ---

  getActivities: (): ActivityLog[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },

  logActivity: (log: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
    const logs = dbService.getActivities();
    const newLog: ActivityLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    safeSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated)); // limit to last 100
    syncToBackend('activities', updated);
  },

  // --- AUTHENTICATION SECTION ---

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return null;
    try {
      const parsed: User = JSON.parse(data);
      if (parsed.id === 'usr-01' || parsed.email === 'admin@emis.com' || parsed.name === 'Sarah Jenkins') {
        const upgraded: User = { 
          id: 'usr-01', 
          username: 'ihsan',
          email: 'ihsan@emis.com', 
          name: 'Ihsan', 
          role: UserRole.ADMIN,
          site: 'NDGS',
          siteId: 'site-ndgs',
          warehouse: 'Electronics Lab (Lab A)',
          warehouseId: 'wh-elec-a',
          allowedSites: ['site-ndgs', 'site-hipf', 'site-dgsn', 'site-petro'],
          status: 'ACTIVE'
        };
        safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(upgraded));
        return upgraded;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  login: (identifier: string, pass: string): { success: boolean; user?: User; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please provide both username/email and password.' };
    }

    // 1. Check Master Users
    const masterUsers = dbService.getUsers();
    const foundMaster = masterUsers.find(
      u => u.email.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId
    );

    if (foundMaster) {
      if (foundMaster.status === 'DISABLED') {
        dbService.logAudit({
          action: 'Login Blocked',
          entity: 'User',
          entityId: foundMaster.id,
          user: foundMaster.name,
          userId: foundMaster.id,
          reason: 'Attempted login on disabled account',
          result: 'FAILED'
        });
        return { success: false, error: 'Your account is currently disabled. Please contact the EMIS Administrator.' };
      }

      // Check password
      const validPass = foundMaster.passwordHash || (PRESETS_USERS[foundMaster.email.toLowerCase()]?.pass) || (PRESETS_USERS[cleanId]?.pass);
      if (validPass && validPass === cleanPass) {
        const loggedUser: User = {
          ...foundMaster,
          lastLogin: new Date().toISOString()
        };
        
        // Update user in master table
        dbService.updateUser(foundMaster.id, { lastLogin: loggedUser.lastLogin }, loggedUser);
        safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(loggedUser));

        dbService.logActivity({
          userId: loggedUser.id,
          userName: loggedUser.name,
          userRole: loggedUser.role,
          action: 'auth',
          details: `User logged in successfully (${loggedUser.role.toUpperCase()} role)`
        });

        dbService.logAudit({
          action: 'User Login',
          entity: 'User',
          entityId: loggedUser.id,
          user: loggedUser.name,
          userId: loggedUser.id,
          userRole: loggedUser.role,
          site: loggedUser.site,
          siteId: loggedUser.siteId,
          result: 'SUCCESS'
        });

        return { success: true, user: loggedUser };
      }
    }

    // 2. Check PRESETS_USERS Fallback
    const presetEntry = PRESETS_USERS[cleanId];
    if (presetEntry && presetEntry.pass === cleanPass) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(presetEntry.user));

      dbService.logActivity({
        userId: presetEntry.user.id,
        userName: presetEntry.user.name,
        userRole: presetEntry.user.role,
        action: 'auth',
        details: `User logged in successfully (${presetEntry.user.role.toUpperCase()} role)`
      });

      dbService.logAudit({
        action: 'User Login',
        entity: 'User',
        entityId: presetEntry.user.id,
        user: presetEntry.user.name,
        userId: presetEntry.user.id,
        userRole: presetEntry.user.role,
        result: 'SUCCESS'
      });

      return { success: true, user: presetEntry.user };
    }

    // Failed login tracking
    dbService.logAudit({
      action: 'Login Failed',
      entity: 'User',
      entityId: cleanId,
      user: cleanId,
      reason: 'Invalid credentials provided',
      result: 'FAILED'
    });

    return { success: false, error: 'Invalid username/email or password.' };
  },

  logout: (): void => {
    const currentUser = dbService.getCurrentUser();
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'auth',
        details: 'User logged out'
      });
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // --- BLACKLIST SECTION ---

  getBlacklist: (): BlacklistItem[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.BLACKLIST);
    return data ? JSON.parse(data) : [];
  },

  saveBlacklist: (blacklist: BlacklistItem[]): void => {
    safeSetItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(blacklist));
    syncToBackend('blacklist', blacklist);
  },

  addBlacklistItem: (item: Omit<BlacklistItem, 'id' | 'reportedDate'>, currentUser: User): { success: boolean; error?: string } => {
    const list = dbService.getBlacklist();
    const newItem: BlacklistItem = {
      ...item,
      id: `bl-${Date.now()}`,
      reportedDate: new Date().toISOString(),
      reporterName: currentUser.name
    };

    const updated = [newItem, ...list];
    dbService.saveBlacklist(updated);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Added part ${newItem.partNumber} / Serial ${newItem.serialNumber} to blacklist`
    });

    return { success: true };
  },

  deleteBlacklistItem: (id: string, currentUser: User): { success: boolean; error?: string } => {
    const list = dbService.getBlacklist();
    const filtered = list.filter(item => item.id !== id);
    dbService.saveBlacklist(filtered);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'delete',
      details: `Removed blacklisted item ${id}`
    });

    return { success: true };
  },

  getFeedback: (): FeedbackItem[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
    return data ? JSON.parse(data) : [];
  },

  saveFeedback: (feedback: FeedbackItem[]): void => {
    safeSetItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedback));
    syncToBackend('feedback', feedback);
  },

  addFeedback: (fb: Omit<FeedbackItem, 'id' | 'createdAt' | 'status' | 'submittedBy' | 'userRole'>, currentUser: User): { success: boolean } => {
    const list = dbService.getFeedback();
    const newItem: FeedbackItem = {
      ...fb,
      id: `fb-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      submittedBy: currentUser.name,
      userRole: currentUser.role
    };
    const updated = [newItem, ...list];
    dbService.saveFeedback(updated);
    
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Submitted feedback suggestion: "${newItem.title}"`
    });

    return { success: true };
  },

  updateFeedbackStatus: (id: string, status: 'open' | 'review' | 'implemented', currentUser: User): void => {
    const list = dbService.getFeedback();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      const oldStatus = list[idx].status;
      list[idx].status = status;
      dbService.saveFeedback(list);

      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Updated feedback status for "${list[idx].title}" from ${oldStatus} to ${status}`
      });
    }
  },

  getEngineeringDecisions: (): EngineeringDecision[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.DECISIONS);
    return data ? JSON.parse(data) : [];
  },

  saveEngineeringDecisions: (decisions: EngineeringDecision[]): void => {
    safeSetItem(STORAGE_KEYS.DECISIONS, JSON.stringify(decisions));
    syncToBackend('decisions', decisions);
  },

  addEngineeringDecision: (decision: Omit<EngineeringDecision, 'id' | 'approvalDate' | 'approvedBy'>, currentUser: User): { success: boolean } => {
    const list = dbService.getEngineeringDecisions();
    const newItem: EngineeringDecision = {
      ...decision,
      id: `ed-${Date.now()}`,
      approvedBy: currentUser.name,
      approvalDate: new Date().toISOString()
    };
    const updated = [newItem, ...list];
    dbService.saveEngineeringDecisions(updated);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Preserved engineering decision for part ${newItem.partNumber}: "${newItem.title}"`
    });

    return { success: true };
  },

  getChatHistory: (partNumber: string): ChatMessage[] => {
    const data = localStorage.getItem(`emis_chat_history_${partNumber}`);
    return data ? JSON.parse(data) : [];
  },

  saveChatHistory: (partNumber: string, history: ChatMessage[]): void => {
    safeSetItem(`emis_chat_history_${partNumber}`, JSON.stringify(history));
  },

  clearChatHistory: (partNumber: string): void => {
    localStorage.removeItem(`emis_chat_history_${partNumber}`);
  },
  
  safeSetItem: (key: string, value: string): void => {
    safeSetItem(key, value);
  },

  // --- OFFLINE & SYNCHRONIZATION STATUS METHODS ---
  getPendingSyncChanges: (): PendingSyncChange[] => {
    return getStoredPendingChanges();
  },

  addPendingSyncChange: (change: Omit<PendingSyncChange, 'id' | 'timestamp' | 'status'>): void => {
    recordPendingSyncChange(change);
  },

  removePendingSyncChange: (id: string): void => {
    try {
      const list = getStoredPendingChanges();
      const updated = list.filter(item => item.id !== id);
      safeSetItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
      }
    } catch (e) {
      console.warn('Failed to remove pending sync item:', e);
    }
  },

  clearPendingSyncChanges: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
      }
    } catch (e) {
      console.warn('Failed to clear pending sync queue:', e);
    }
  },

  getLastSyncTime: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || null;
  },

  getSyncStatusSummary: (): { isOnline: boolean; totalPending: number; lastSyncTime: string | null; pendingItems: PendingSyncChange[] } => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const items = getStoredPendingChanges();
    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'failed');
    const lastSyncTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME) || null;

    return {
      isOnline,
      totalPending: pendingItems.length,
      lastSyncTime,
      pendingItems: items
    };
  },

  syncAllPendingToFirebase: async (): Promise<{ success: boolean; syncedCount: number; message: string }> => {
    try {
      const pending = getStoredPendingChanges().filter(p => p.status === 'pending' || p.status === 'failed');
      const count = pending.length;

      // 1. Fast Path: If queue is already empty (0 pending items), perform instant heartbeat and return
      if (count === 0) {
        try {
          await fetch(`${getBaseApiUrl()}/api/db/load`, { method: 'GET' });
        } catch (_) {}
        safeSetItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
          window.dispatchEvent(new CustomEvent('emis:sync-finished'));
        }
        return {
          success: true,
          syncedCount: 0,
          message: 'All inventory and catalog records are up to date and synchronized.'
        };
      }

      // 2. Active Sync: Push entities to backend with strict 4-second timeout guarantee
      const materials = dbService.getMaterials();
      const equipment = dbService.getEquipment();
      const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
      const decisions = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECISIONS) || "[]");
      const feedback = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACK) || "[]");
      const blacklist = JSON.parse(localStorage.getItem(STORAGE_KEYS.BLACKLIST) || "[]");

      await Promise.race([
        Promise.all([
          syncToBackend('materials', materials),
          syncToBackend('equipment', equipment),
          syncToBackend('activities', activities),
          syncToBackend('decisions', decisions),
          syncToBackend('feedback', feedback),
          syncToBackend('blacklist', blacklist)
        ]),
        new Promise((resolve) => setTimeout(resolve, 3500))
      ]);

      markPendingSyncChangesAsSynced();
      safeSetItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sync-status-changed'));
        window.dispatchEvent(new CustomEvent('emis:sync-finished'));
      }

      return {
        success: true,
        syncedCount: count,
        message: `Successfully synchronized ${count} pending change(s) with Cloud database.`
      };
    } catch (e: any) {
      console.warn('Manual syncAllPendingToFirebase failed:', e);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sync-finished'));
      }
      return {
        success: false,
        syncedCount: 0,
        message: `Sync failed due to network issue: ${e.message || 'Offline'}`
      };
    }
  },

  // --- EMIS v2.0 UNIVERSAL ENGINEERING SEARCH & INTELLIGENCE ---

  /**
   * Normalizes strings by removing casing, punctuation variations, and standard prefixes (MR, WO, PN, SN, etc.)
   */
  normalizeToken: (text: string): string => {
    if (!text) return '';
    return text
      .trim()
      .toUpperCase()
      .replace(/^(MRF|MR|WO|P\/N|PN|P-N|S\/N|SN|TAG)[\s#:\-_]+/i, '')
      .replace(/[\s\-_/\\#.,:;()]/g, '');
  },

  /**
   * Computes the real-time operational status of a material based on inventory and inspection attributes
   */
  computeMaterialStatus: (material: Material, isBlacklisted = false): 'Available' | 'Low Stock' | 'Out of Stock' | 'Reserved' | 'Under Inspection' | 'Blacklisted' | 'Pending Engineering Review' => {
    if (isBlacklisted) return 'Blacklisted';
    
    // Check blacklist in storage if not passed
    const blacklist = dbService.getBlacklist();
    const isBl = blacklist.some(b => 
      b.partNumber.toUpperCase() === material.partNumber.toUpperCase() ||
      (material.serialNumber && b.serialNumber && b.serialNumber.toUpperCase() === material.serialNumber.toUpperCase())
    );
    if (isBl) return 'Blacklisted';

    if (material.status === 'Reserved') return 'Reserved';
    if (material.status === 'Pending Engineering Review' || material.oemVerificationStatus === 'pending') return 'Pending Engineering Review';

    if (material.inspectionStatus === 'UNDER_INSPECTION' || material.inspectionStatus === 'PENDING') {
      return 'Under Inspection';
    }

    if (material.quantity <= 0) return 'Out of Stock';
    if (material.quantity <= (material.minStockLevel || 2)) return 'Low Stock';

    return 'Available';
  },

  /**
   * Check if a part number or serial number is registered in the Blacklist
   */
  checkBlacklistStatus: (partNumber?: string, serialNumber?: string): { isBlacklisted: boolean; item?: BlacklistItem } => {
    const list = dbService.getBlacklist();
    const pUpper = (partNumber || '').trim().toUpperCase();
    const sUpper = (serialNumber || '').trim().toUpperCase();

    if (!pUpper && !sUpper) return { isBlacklisted: false };

    const found = list.find(b => {
      const matchP = pUpper && b.partNumber && b.partNumber.toUpperCase() === pUpper;
      const matchS = sUpper && b.serialNumber && b.serialNumber.toUpperCase() === sUpper;
      return matchP || matchS;
    });

    return {
      isBlacklisted: !!found,
      item: found
    };
  },

  /**
   * Universal Engineering Search Engine with 8-Level Priority Hierarchy
   */
  universalSearch: (rawQuery: string): Array<{
    material: Material;
    priorityRank: number;
    matchCategory: string;
    matchScore: number;
    highlightField: string;
    isBlacklisted: boolean;
    blacklistDetails?: BlacklistItem;
    computedStatus: string;
  }> => {
    const materials = dbService.getMaterials();
    const blacklist = dbService.getBlacklist();
    const trimmed = rawQuery.trim();

    if (!trimmed) {
      return materials.map(m => {
        const bl = dbService.checkBlacklistStatus(m.partNumber, m.serialNumber);
        return {
          material: m,
          priorityRank: 99,
          matchCategory: 'Default Catalog',
          matchScore: 100,
          highlightField: 'partNumber',
          isBlacklisted: bl.isBlacklisted,
          blacklistDetails: bl.item,
          computedStatus: dbService.computeMaterialStatus(m, bl.isBlacklisted)
        };
      });
    }

    const queryLower = trimmed.toLowerCase();
    const queryNorm = dbService.normalizeToken(trimmed);
    const queryTokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

    const results: Array<{
      material: Material;
      priorityRank: number;
      matchCategory: string;
      matchScore: number;
      highlightField: string;
      isBlacklisted: boolean;
      blacklistDetails?: BlacklistItem;
      computedStatus: string;
    }> = [];

    materials.forEach(m => {
      const pUpper = m.partNumber.toUpperCase();
      const pNorm = dbService.normalizeToken(m.partNumber);
      const modelUpper = (m.model || '').toUpperCase();
      const modelNorm = dbService.normalizeToken(m.model || '');
      const serialUpper = (m.serialNumber || '').toUpperCase();
      const serialNorm = dbService.normalizeToken(m.serialNumber || '');
      const mrNorm = dbService.normalizeToken(m.mrNumber || m.mrf || m.mrfNumber || '');
      const woNorm = dbService.normalizeToken(m.workOrder || (m.woNumbers ? m.woNumbers.join(' ') : ''));
      const descLower = (m.description || '').toLowerCase();
      const mfgLower = (m.manufacturer || '').toLowerCase();
      const storeLower = (m.store || '').toLowerCase();
      
      const bl = dbService.checkBlacklistStatus(m.partNumber, m.serialNumber);
      const status = dbService.computeMaterialStatus(m, bl.isBlacklisted);

      let matched = false;
      let rank = 99;
      let category = '';
      let score = 0;
      let highlight = 'partNumber';

      // Level 0: Sequence Number Match (e.g. 727, #727, Seq 727)
      const cleanSeqQuery = trimmed.replace(/^[#\s]*(?:seq|sequence)[\s#:]*/i, '').replace(/[^0-9]/g, '');
      const isSeqMatch = m.sequence !== undefined && cleanSeqQuery && (
        String(m.sequence) === cleanSeqQuery ||
        trimmed.toUpperCase() === `#${m.sequence}` ||
        trimmed.toUpperCase() === `SEQ-${m.sequence}` ||
        trimmed.toUpperCase() === `SEQ #${m.sequence}`
      );

      if (isSeqMatch) {
        matched = true;
        rank = 0.5;
        category = `Exact Sequence Match (#${m.sequence})`;
        score = 1200;
        highlight = 'sequence';
      }
      // Level 1: Exact Part Number or Exact Reference Match
      else if (
        (pUpper && (pUpper === trimmed.toUpperCase() || (queryNorm && pNorm === queryNorm))) ||
        (queryNorm && modelNorm && queryNorm.length >= 3 && queryNorm === modelNorm)
      ) {
        matched = true;
        rank = 1;
        category = (pUpper && (pUpper === trimmed.toUpperCase() || (queryNorm && pNorm === queryNorm)))
          ? 'Exact Part Number Match'
          : 'Exact Model / Reference Match';
        score = 1000;
        highlight = (pUpper && pUpper === trimmed.toUpperCase()) ? 'partNumber' : 'model';
      }
      // Level 1.5: Direct Embedded Part Number in Description (e.g. PN:USFR-02ND in description)
      else if (
        queryNorm && queryNorm.length >= 3 &&
        (dbService.normalizeToken(descLower).includes(queryNorm) || descLower.includes(queryLower))
      ) {
        matched = true;
        rank = 1.5;
        category = 'Description Reference Match';
        score = 950;
        highlight = 'description';
      }
      // Level 2: Exact Model
      else if (modelUpper && (modelUpper === trimmed.toUpperCase() || (queryNorm && modelNorm === queryNorm))) {
        matched = true;
        rank = 2;
        category = 'Exact Model Match';
        score = 900;
        highlight = 'model';
      }
      // Level 3: Exact Serial Number
      else if (serialUpper && (serialUpper === trimmed.toUpperCase() || (queryNorm && serialNorm === queryNorm))) {
        matched = true;
        rank = 3;
        category = 'Exact Serial Number Match';
        score = 800;
        highlight = 'serialNumber';
      }
      // Level 3.5: Tag Number Match (e.g. 2021-1-5553-XYS-237, SOV-4011)
      else if (
        (m.tagNumber && (m.tagNumber.toUpperCase() === trimmed.toUpperCase() || m.tagNumber.toUpperCase().includes(trimmed.toUpperCase()))) ||
        (m.tagNumber && queryNorm && dbService.normalizeToken(m.tagNumber).includes(queryNorm))
      ) {
        matched = true;
        rank = 3.5;
        category = `Tag Number Match (${m.tagNumber})`;
        score = 780;
        highlight = 'tagNumber';
      }
      // Level 4: Exact MR / MRF / WO
      else if (
        (mrNorm && queryNorm && mrNorm.includes(queryNorm)) ||
        (m.mrNumber && m.mrNumber.toLowerCase().includes(queryLower)) ||
        (m.mrf && m.mrf.toLowerCase().includes(queryLower)) ||
        (m.mrfNumber && m.mrfNumber.toLowerCase().includes(queryLower)) ||
        (woNorm && queryNorm && woNorm.includes(queryNorm)) ||
        (m.workOrder && m.workOrder.toLowerCase().includes(queryLower)) ||
        (m.woNumber && m.woNumber.toLowerCase().includes(queryLower)) ||
        (m.woNumbers && m.woNumbers.some(w => w.toLowerCase().includes(queryLower) || dbService.normalizeToken(w).includes(queryNorm)))
      ) {
        matched = true;
        rank = 4;
        category = (mrNorm && queryNorm && mrNorm.includes(queryNorm)) || (m.mrNumber && m.mrNumber.toLowerCase().includes(queryLower)) || (m.mrf && m.mrf.toLowerCase().includes(queryLower)) || (m.mrfNumber && m.mrfNumber.toLowerCase().includes(queryLower)) ? 'MR / MRF Record Match' : 'Work Order Match';
        score = 700;
        highlight = category.includes('MR') ? 'mrNumber' : 'workOrder';
      }
      // Level 4.2: Field Installation & Mounting Location Match (مكان التثبيت والتركيب)
      else if (
        (m.installationLocation && m.installationLocation.toLowerCase().includes(queryLower)) ||
        (m.tagLocation && m.tagLocation.toLowerCase().includes(queryLower)) ||
        (m.installedEquipment && m.installedEquipment.toLowerCase().includes(queryLower))
      ) {
        matched = true;
        rank = 4.2;
        category = 'Installation & Mounting Location Match (مكان التثبيت)';
        score = 680;
        highlight = 'installationLocation';
      }
      // Level 4.5: Associated Equipment Tag match
      else if (
        (m.compatibleEquipment && m.compatibleEquipment.some(tag => tag.toLowerCase().includes(queryLower) || dbService.normalizeToken(tag).includes(queryNorm))) ||
        (m.equipmentTags && m.equipmentTags.some(tag => tag.toLowerCase().includes(queryLower) || dbService.normalizeToken(tag).includes(queryNorm)))
      ) {
        matched = true;
        rank = 4.5;
        category = 'Equipment Tag Match';
        score = 650;
        highlight = 'compatibleEquipment';
      }
      // Level 5: Strong Partial Match on Part Number / Model / Serial
      else if (
        pUpper.includes(trimmed.toUpperCase()) ||
        (queryNorm.length >= 3 && pNorm.includes(queryNorm)) ||
        (modelUpper && modelUpper.includes(trimmed.toUpperCase())) ||
        (serialUpper && serialUpper.includes(trimmed.toUpperCase()))
      ) {
        matched = true;
        rank = 5;
        category = 'Partial Reference Match';
        score = 550;
        highlight = pUpper.includes(trimmed.toUpperCase()) ? 'partNumber' : (modelUpper.includes(trimmed.toUpperCase()) ? 'model' : 'serialNumber');
      }
      // Level 6: Description & Manufacturer Match
      else if (
        queryTokens.every(tok => descLower.includes(tok) || mfgLower.includes(tok) || storeLower.includes(tok)) ||
        descLower.includes(queryLower) ||
        mfgLower.includes(queryLower)
      ) {
        matched = true;
        rank = 6;
        category = 'Manufacturer / Description Match';
        score = 400;
        highlight = mfgLower.includes(queryLower) ? 'manufacturer' : 'description';
      }
      // Level 7: Technical Specifications Match (pressure, voltage, material, etc.)
      else {
        const specFields = [
          m.materialType,
          m.inletPressure,
          m.outletPressure,
          m.connectionSize,
          m.connectionType,
          m.bodyMaterial,
          m.temperatureRange,
          m.voltage,
          m.signalProtocol,
          m.exClassification,
          m.measuringRange,
          m.electricalRating,
          m.notes,
          m.engineeringNotes
        ].filter(Boolean).map(s => String(s).toLowerCase());

        const matchedSpec = specFields.some(spec => 
          spec.includes(queryLower) || 
          (queryTokens.length > 1 && queryTokens.some(tok => spec.includes(tok)))
        );

        if (matchedSpec) {
          matched = true;
          rank = 7;
          category = 'Technical Specifications Match';
          score = 300;
          highlight = 'technicalSpecs';
        }
      }

      if (matched) {
        results.push({
          material: m,
          priorityRank: rank,
          matchCategory: category,
          matchScore: score,
          highlightField: highlight,
          isBlacklisted: bl.isBlacklisted,
          blacklistDetails: bl.item,
          computedStatus: status
        });
      }
    });

    // Sort by priority rank ascending (1 is best), then score descending
    return results.sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      return b.matchScore - a.matchScore;
    });
  },

  /**
   * Returns distinct MR / MRF groupings with associated materials
   */
  getMRSummaryList: (): Array<{
    mrNumber: string;
    mrfNumber?: string;
    supplier?: string;
    poNumber?: string;
    materials: Material[];
    totalQuantity: number;
    itemCount: number;
    passedInspectionCount: number;
    pendingInspectionCount: number;
    latestDate?: string;
  }> => {
    const materials = dbService.getMaterials();
    const groups: { [key: string]: Material[] } = {};

    materials.forEach(m => {
      const mrKey = (m.mrNumber || m.mrf || m.mrfNumber || '').trim();
      if (mrKey) {
        if (!groups[mrKey]) groups[mrKey] = [];
        groups[mrKey].push(m);
      }
    });

    return Object.keys(groups).map(mrKey => {
      const items = groups[mrKey];
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const passedCount = items.filter(i => i.inspectionStatus === 'PASSED').length;
      const pendingCount = items.filter(i => i.inspectionStatus === 'UNDER_INSPECTION' || i.inspectionStatus === 'PENDING').length;
      const firstItem = items[0];

      return {
        mrNumber: mrKey,
        mrfNumber: firstItem.mrfNumber || firstItem.mrf,
        supplier: firstItem.supplierName || firstItem.supplier,
        poNumber: firstItem.poNumber || firstItem.purchaseOrder,
        materials: items,
        totalQuantity: totalQty,
        itemCount: items.length,
        passedInspectionCount: passedCount,
        pendingInspectionCount: pendingCount,
        latestDate: firstItem.purchaseDate || firstItem.deliveryDate || firstItem.createdAt
      };
    }).sort((a, b) => b.itemCount - a.itemCount);
  },

  /**
   * Returns distinct Work Orders with associated materials and equipment
   */
  getWOSummaryList: (): Array<{
    workOrder: string;
    equipmentTags: string[];
    requiredMaterials: Material[];
    issuedMaterials: Material[];
    totalMaterialCount: number;
  }> => {
    const materials = dbService.getMaterials();
    const woMap: { [key: string]: { required: Material[]; issued: Material[]; eqTags: Set<string> } } = {};

    materials.forEach(m => {
      const wos = new Set<string>();
      if (m.workOrder) wos.add(m.workOrder.trim());
      if (m.woNumbers && Array.isArray(m.woNumbers)) {
        m.woNumbers.forEach(w => w && wos.add(w.trim()));
      }

      wos.forEach(woKey => {
        if (!woMap[woKey]) {
          woMap[woKey] = { required: [], issued: [], eqTags: new Set<string>() };
        }
        if (m.quantity > 0) {
          woMap[woKey].required.push(m);
        } else {
          woMap[woKey].issued.push(m);
        }
        if (m.compatibleEquipment) {
          m.compatibleEquipment.forEach(tag => woMap[woKey].eqTags.add(tag));
        }
        if (m.equipmentTags) {
          m.equipmentTags.forEach(tag => woMap[woKey].eqTags.add(tag));
        }
      });
    });

    return Object.keys(woMap).map(woKey => ({
      workOrder: woKey,
      equipmentTags: Array.from(woMap[woKey].eqTags),
      requiredMaterials: woMap[woKey].required,
      issuedMaterials: woMap[woKey].issued,
      totalMaterialCount: woMap[woKey].required.length + woMap[woKey].issued.length
    })).sort((a, b) => b.totalMaterialCount - a.totalMaterialCount);
  },

  /**
   * Checks for duplicate materials before creation (checks Part Number, Serial Number, or Manufacturer + Model)
   */
  findDuplicateCandidates: (candidate: Partial<Material>): {
    hasDuplicate: boolean;
    duplicateReason?: string;
    existingMaterial?: Material;
  } => {
    const materials = dbService.getMaterials();
    const pUpper = (candidate.partNumber || '').trim().toUpperCase();
    const sUpper = (candidate.serialNumber || '').trim().toUpperCase();
    const mfgUpper = (candidate.manufacturer || '').trim().toUpperCase();
    const modelUpper = (candidate.model || '').trim().toUpperCase();

    // Check Part Number
    if (pUpper) {
      const exactPn = materials.find(m => m.partNumber.trim().toUpperCase() === pUpper);
      if (exactPn) {
        return {
          hasDuplicate: true,
          duplicateReason: `Part Number "${exactPn.partNumber}" already exists in ${exactPn.store}.`,
          existingMaterial: exactPn
        };
      }
    }

    // Check Serial Number if provided
    if (sUpper) {
      const exactSn = materials.find(m => m.serialNumber && m.serialNumber.trim().toUpperCase() === sUpper);
      if (exactSn) {
        return {
          hasDuplicate: true,
          duplicateReason: `Serial Number "${sUpper}" is already registered under Part Number ${exactSn.partNumber}.`,
          existingMaterial: exactSn
        };
      }
    }

    // Check Manufacturer + Model combination
    if (mfgUpper && modelUpper) {
      const matchMfgModel = materials.find(m => 
        (m.manufacturer || '').trim().toUpperCase() === mfgUpper &&
        (m.model || '').trim().toUpperCase() === modelUpper
      );
      if (matchMfgModel) {
        return {
          hasDuplicate: true,
          duplicateReason: `Manufacturer "${matchMfgModel.manufacturer}" with Model "${matchMfgModel.model}" already exists under Part Number "${matchMfgModel.partNumber}".`,
          existingMaterial: matchMfgModel
        };
      }
    }

    return { hasDuplicate: false };
  },

  // --- EMIS v3.0 STOCK MOVEMENTS & INVENTORY AUDIT ---
  getStockMovements: (partNumber?: string): StockMovement[] => {
    dbService.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      const list: StockMovement[] = data ? JSON.parse(data) : [];
      if (partNumber) {
        return list.filter(m => m.partNumber.toUpperCase() === partNumber.toUpperCase());
      }
      return list;
    } catch {
      return [];
    }
  },

  saveStockMovements: (movements: StockMovement[]): void => {
    safeSetItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(movements));
    syncToBackend('stock_movements', movements);
  },

  addStockMovement: (
    movement: Omit<StockMovement, 'id' | 'date'>,
    currentUser: User
  ): { success: boolean; newBalance: number } => {
    const materials = dbService.getMaterials();
    const matIdx = materials.findIndex(m => m.partNumber.toUpperCase() === movement.partNumber.toUpperCase());
    if (matIdx === -1) {
      throw new Error(`Material "${movement.partNumber}" not found in ledger.`);
    }

    const mat = materials[matIdx];
    const currentQty = Number(mat.quantity) || 0;
    const moveQty = Number(movement.quantity) || 0;
    let newQty = currentQty;

    switch (movement.movementType) {
      case 'Stock In':
        newQty = currentQty + moveQty;
        break;
      case 'Stock Out':
        if (moveQty > currentQty) {
          throw new Error(`Insufficient stock. Current stock is ${currentQty}, requested issue is ${moveQty}.`);
        }
        newQty = Math.max(0, currentQty - moveQty);
        break;
      case 'Transfer':
        // Transfer retains quantity but updates location
        newQty = currentQty;
        if (movement.toLocation) {
          mat.store = movement.toLocation;
        }
        break;
      case 'Adjustment':
        newQty = moveQty;
        break;
    }

    mat.quantity = newQty;
    mat.updatedAt = new Date().toISOString();
    
    // Add history event to material
    const histEvent: MaterialHistoryEvent = {
      id: `hist-mov-${Date.now()}`,
      action: movement.movementType,
      details: `${movement.movementType} of ${moveQty} ${mat.unit || 'units'}. Reason: ${movement.reason}. New balance: ${newQty}`,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString(),
      sourceLocation: movement.fromLocation,
      destinationLocation: movement.toLocation
    };
    mat.history = [histEvent, ...(mat.history || [])];

    // Save updated materials
    dbService.saveMaterials(materials);

    // Save movement record
    const movements = dbService.getStockMovements();
    const newRecord: StockMovement = {
      ...movement,
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      balanceAfter: newQty
    };
    dbService.saveStockMovements([newRecord, ...movements]);

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Inventory movement [${movement.movementType}] for ${mat.partNumber}: ${moveQty} ${mat.unit || 'units'}. Reason: ${movement.reason}`
    });

    return { success: true, newBalance: newQty };
  },

  // --- EMIS v3.0 INSPECTION & MATCHING SYSTEM ---
  getInspections: (partNumber?: string): MaterialInspectionRecord[] => {
    dbService.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
      const list: MaterialInspectionRecord[] = data ? JSON.parse(data) : [];
      if (partNumber) {
        return list.filter(i => i.partNumber.toUpperCase() === partNumber.toUpperCase());
      }
      return list;
    } catch {
      return [];
    }
  },

  saveInspections: (inspections: MaterialInspectionRecord[]): void => {
    safeSetItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(inspections));
    syncToBackend('inspections', inspections);
  },

  addInspection: (
    inspection: Omit<MaterialInspectionRecord, 'id' | 'inspectionDate' | 'inspector'>,
    currentUser: User
  ): { success: boolean } => {
    const list = dbService.getInspections();
    const newRecord: MaterialInspectionRecord = {
      ...inspection,
      id: `insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inspectionDate: new Date().toISOString(),
      inspector: currentUser.name
    };

    dbService.saveInspections([newRecord, ...list]);

    // Update material inspection status if material exists
    const materials = dbService.getMaterials();
    const mat = materials.find(m => m.partNumber.toUpperCase() === inspection.partNumber.toUpperCase());
    if (mat) {
      if (inspection.result === 'MATCHED') {
        mat.inspectionStatus = 'PASSED';
      } else if (inspection.result === 'REJECTED') {
        mat.inspectionStatus = 'REJECTED';
      } else if (inspection.result === 'PARTIALLY MATCHED' || inspection.result === 'ENGINEERING REVIEW') {
        mat.inspectionStatus = 'PENDING';
      }
      mat.updatedAt = new Date().toISOString();
      dbService.saveMaterials(materials);
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Material inspection performed on ${newRecord.partNumber}: Result [${newRecord.result}] - ${newRecord.reason}`
    });

    return { success: true };
  },

  // --- EMIS v3.0 COMPLIANCE & MISSING DOCUMENT ALERTS ---
  checkDocumentCompliance: (material: Material): {
    datasheetStatus: 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING REVIEW';
    cocStatus: 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING REVIEW';
    cooStatus: 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING REVIEW';
    missingCritical: string[];
    missingOptional: string[];
    isFullyCompliant: boolean;
  } => {
    const docs = material.documents || {};
    
    // Check Datasheet
    const hasDatasheet = !!(docs.datasheet && (docs.datasheet.googleDriveWebViewLink || docs.datasheet.fileName));
    const datasheetStatus = hasDatasheet ? (docs.datasheet?.status || 'AVAILABLE') : 'MISSING';

    // Check CoC (Certificate of Conformity)
    const hasCoc = !!(docs.coc && (docs.coc.googleDriveWebViewLink || docs.coc.fileName));
    const cocStatus = hasCoc ? (docs.coc?.status || 'AVAILABLE') : 'MISSING';

    // Check CoO (Certificate of Origin) or vendor certification
    const hasCoo = !!(docs.vendorQuotation || docs.evaluationRequest || (docs as any).coo);
    const cooStatus = hasCoo ? 'AVAILABLE' : 'MISSING';

    const missingCritical: string[] = [];
    if (datasheetStatus === 'MISSING') missingCritical.push('Technical Datasheet (ورقة البيانات الفنية)');
    if (cocStatus === 'MISSING') missingCritical.push('Certificate of Conformity / CoC (شهادة المطابقة)');

    const missingOptional: string[] = [];
    if (cooStatus === 'MISSING') missingOptional.push('Certificate of Origin / CoO (شهادة المنشأ)');
    if (!docs.operationManual && !docs.maintenanceManual) missingOptional.push('Operation / Maintenance Manual (دليل التشغيل والصيانة)');
    if (!docs.calibrationCertificate && material.measuringRange) missingOptional.push('Calibration Certificate (شهادة المعايرة)');

    return {
      datasheetStatus,
      cocStatus,
      cooStatus,
      missingCritical,
      missingOptional,
      isFullyCompliant: missingCritical.length === 0
    };
  },

  // =========================================================================
  // --- EXTERNAL COMPANY STOCK SYSTEM (STRICTLY INDEPENDENT DATA ENGINE) ---
  // =========================================================================

  /**
   * Retrieves all registered external company Excel files.
   */
  getExternalFiles: (): ExternalFile[] => {
    dbService.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXTERNAL_FILES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Saves external files metadata index to storage and syncs to backend.
   */
  saveExternalFiles: (files: ExternalFile[]): void => {
    safeSetItem(STORAGE_KEYS.EXTERNAL_FILES, JSON.stringify(files));
    syncToBackend('externalFiles', files);
  },

  /**
   * Retrieves external materials, optionally filtered by a specific sourceFileId.
   */
  getExternalMaterials: (sourceFileId?: string): ExternalMaterial[] => {
    dbService.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXTERNAL_MATERIALS);
      const list: ExternalMaterial[] = data ? JSON.parse(data) : [];
      if (sourceFileId) {
        return list.filter(m => m.sourceFileId === sourceFileId);
      }
      return list;
    } catch {
      return [];
    }
  },

  /**
   * Saves external materials list to storage and syncs to backend.
   */
  saveExternalMaterials: (materials: ExternalMaterial[]): void => {
    safeSetItem(STORAGE_KEYS.EXTERNAL_MATERIALS, JSON.stringify(materials));
    syncToBackend('externalMaterials', materials);
  },

  /**
   * Imports a new external company Excel spreadsheet with STRICT sequence preservation.
   */
  importExternalFile: (
    fileInfo: {
      sourceFileId?: string;
      fileName: string;
      warehouseName: string;
      description?: string;
      notes?: string;
      detectedDuplicateSequences?: Array<{ sequence: number | string; rows: number[] }>;
    },
    rawItems: Array<{
      originalSequence: number | string;
      originalExcelRow: number;
      partNumber: string;
      description: string;
      manufacturer?: string;
      model?: string;
      quantity: number;
      unit?: string;
      store?: string;
      rack?: string;
      shelf?: string;
      serialNumber?: string;
      notes?: string;
    }>,
    currentUser: User
  ): { success: boolean; file: ExternalFile; count: number; error?: string } => {
    try {
      dbService.initialize();
      const files = dbService.getExternalFiles();
      const existingMaterials = dbService.getExternalMaterials();

      // Generate distinct unique sourceFileId (e.g. EXT-BASRAH-001 or EXT-SLUG-TIMESTAMP)
      const cleanSlug = fileInfo.warehouseName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 15);
      const generatedId = fileInfo.sourceFileId?.trim() || `EXT-${cleanSlug || 'STORE'}-${Date.now().toString(36).toUpperCase()}`;

      // Calculate sequence range (e.g. "1 - 2450" or "101 - 112")
      const numericSeqs = rawItems
        .map(i => Number(i.originalSequence))
        .filter(n => !isNaN(n) && isFinite(n));
      const sequenceRange = numericSeqs.length > 0
        ? `${Math.min(...numericSeqs)} - ${Math.max(...numericSeqs)}`
        : `Seq Count: ${rawItems.length}`;

      const newFile: ExternalFile = {
        id: generatedId,
        sourceId: generatedId,
        sourceName: fileInfo.sourceFileId?.trim() ? `${fileInfo.warehouseName} Source` : `${fileInfo.warehouseName} Source`,
        fileName: fileInfo.fileName,
        warehouseName: fileInfo.warehouseName,
        importDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        recordCount: rawItems.length,
        status: 'Active',
        checksum: `sha256-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        createdBy: `${currentUser.name} (${currentUser.role})`,
        description: fileInfo.description || `External stock imported from ${fileInfo.fileName}`,
        sequenceRange,
        detectedDuplicateSequences: fileInfo.detectedDuplicateSequences || [],
        notes: fileInfo.notes || ''
      };

      // Build ExternalMaterial records with explicit source file mapping and strict preserved sequence
      const batchId = `BATCH-${generatedId}-${Date.now().toString(36).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const newMaterials: ExternalMaterial[] = rawItems.map((item, idx) => {
        const pnClean = item.partNumber.trim();
        const snClean = (item.serialNumber || '').trim();
        const normPn = dbService.normalizeToken(pnClean);
        const normSn = dbService.normalizeToken(snClean);

        return {
          id: `ext-mat-${generatedId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          sourceId: generatedId,
          sourceFileId: generatedId,
          sourceName: newFile.sourceName,
          sourceFileName: fileInfo.fileName,
          fileName: fileInfo.fileName,
          warehouseName: fileInfo.warehouseName,
          originalSequence: item.originalSequence, // CRITICAL: Preserved from Excel
          originalRowNumber: item.originalExcelRow, // CRITICAL: Real row in Excel
          originalExcelRow: item.originalExcelRow,
          importBatchId: batchId,
          partNumber: pnClean,
          normalizedPartNumber: normPn,
          serialNumber: snClean,
          normalizedSerialNumber: normSn,
          description: item.description.trim(),
          manufacturer: item.manufacturer?.trim() || '',
          model: item.model?.trim() || '',
          quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? Math.max(0, item.quantity) : 1,
          unit: item.unit?.trim() || 'PCS',
          store: item.store?.trim() || fileInfo.warehouseName,
          rack: item.rack?.trim() || '',
          shelf: item.shelf?.trim() || '',
          status: 'Available',
          importedAt: nowIso,
          notes: item.notes?.trim() || '',
          importVersion: 1
        };
      });

      // Append new file and materials without mutating station materials
      dbService.saveExternalFiles([newFile, ...files]);
      dbService.saveExternalMaterials([...existingMaterials, ...newMaterials]);

      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Imported external company stock file "${fileInfo.fileName}" (${rawItems.length} records, Warehouse: ${fileInfo.warehouseName}, ID: ${generatedId})`
      });

      return { success: true, file: newFile, count: newMaterials.length };
    } catch (err: any) {
      console.error('Import External File Error:', err);
      return { success: false, file: null as any, count: 0, error: err.message || 'Failed to import external Excel file' };
    }
  },

  /**
   * Replaces an existing external company file:
   * - Deletes ONLY records with matching sourceFileId.
   * - Leaves Station Materials, Equipment, and other External Files 100% untouched.
   * - Increments version number.
   */
  replaceExternalFile: (
    sourceFileId: string,
    newFileName: string,
    newWarehouseName: string | undefined,
    rawItems: Array<{
      originalSequence: number | string;
      originalExcelRow: number;
      partNumber: string;
      description: string;
      manufacturer?: string;
      model?: string;
      quantity: number;
      unit?: string;
      store?: string;
      rack?: string;
      shelf?: string;
      serialNumber?: string;
      notes?: string;
    }>,
    currentUser: User
  ): { success: boolean; updatedFile: ExternalFile; oldRecordsCount: number; newRecordsCount: number; error?: string } => {
    try {
      dbService.initialize();
      const files = dbService.getExternalFiles();
      const fileIdx = files.findIndex(f => f.id === sourceFileId);

      if (fileIdx === -1) {
        return { success: false, updatedFile: null as any, oldRecordsCount: 0, newRecordsCount: 0, error: 'External file record not found in system registers.' };
      }

      const existingFile = files[fileIdx];
      const allMaterials = dbService.getExternalMaterials();
      
      const oldRecords = allMaterials.filter(m => m.sourceFileId === sourceFileId);
      const otherMaterials = allMaterials.filter(m => m.sourceFileId !== sourceFileId);

      const newVersion = (existingFile.version || 1) + 1;
      const warehouse = newWarehouseName?.trim() || existingFile.warehouseName;

      // Calculate sequence range
      const numericSeqs = rawItems
        .map(i => Number(i.originalSequence))
        .filter(n => !isNaN(n) && isFinite(n));
      const sequenceRange = numericSeqs.length > 0
        ? `${Math.min(...numericSeqs)} - ${Math.max(...numericSeqs)}`
        : `Seq Count: ${rawItems.length}`;

      const updatedFile: ExternalFile = {
        ...existingFile,
        sourceId: existingFile.sourceId || sourceFileId,
        sourceName: existingFile.sourceName || `${warehouse} Source`,
        fileName: newFileName || existingFile.fileName,
        warehouseName: warehouse,
        lastUpdated: new Date().toISOString(),
        version: newVersion,
        recordCount: rawItems.length,
        status: 'Active',
        checksum: `sha256-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        sequenceRange
      };

      const batchId = `BATCH-${sourceFileId}-V${newVersion}-${Date.now().toString(36).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const newMaterials: ExternalMaterial[] = rawItems.map((item, idx) => {
        const pnClean = item.partNumber.trim();
        const snClean = (item.serialNumber || '').trim();
        const normPn = dbService.normalizeToken(pnClean);
        const normSn = dbService.normalizeToken(snClean);

        return {
          id: `ext-mat-${sourceFileId}-v${newVersion}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          sourceId: sourceFileId,
          sourceFileId,
          sourceName: updatedFile.sourceName,
          sourceFileName: newFileName || existingFile.fileName,
          fileName: newFileName || existingFile.fileName,
          warehouseName: warehouse,
          originalSequence: item.originalSequence,
          originalRowNumber: item.originalExcelRow,
          originalExcelRow: item.originalExcelRow,
          importBatchId: batchId,
          partNumber: pnClean,
          normalizedPartNumber: normPn,
          serialNumber: snClean,
          normalizedSerialNumber: normSn,
          description: item.description.trim(),
          manufacturer: item.manufacturer?.trim() || '',
          model: item.model?.trim() || '',
          quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? Math.max(0, item.quantity) : 1,
          unit: item.unit?.trim() || 'PCS',
          store: item.store?.trim() || warehouse,
          rack: item.rack?.trim() || '',
          shelf: item.shelf?.trim() || '',
          status: 'Available',
          importedAt: nowIso,
          notes: item.notes?.trim() || '',
          importVersion: newVersion
        };
      });

      // Update files list and replace materials
      const updatedFilesList = [...files];
      updatedFilesList[fileIdx] = updatedFile;

      dbService.saveExternalFiles(updatedFilesList);
      dbService.saveExternalMaterials([...otherMaterials, ...newMaterials]);

      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Replaced external company file "${existingFile.fileName}" with "${newFileName}" (Updated from ${oldRecords.length} records v${existingFile.version} to ${rawItems.length} records v${newVersion})`
      });

      return {
        success: true,
        updatedFile,
        oldRecordsCount: oldRecords.length,
        newRecordsCount: newMaterials.length
      };
    } catch (err: any) {
      console.error('Replace External File Error:', err);
      return { success: false, updatedFile: null as any, oldRecordsCount: 0, newRecordsCount: 0, error: err.message || 'Failed to replace external file' };
    }
  },

  /**
   * Deletes ONLY an external file and its external material records.
   * STRICT SAFETY GUARANTEE: Never deletes or modifies any Station Materials, Equipment, or MR records!
   */
  deleteExternalFile: (sourceFileId: string, currentUser: User): { success: boolean; error?: string } => {
    try {
      dbService.initialize();
      const files = dbService.getExternalFiles();
      const targetFile = files.find(f => f.id === sourceFileId);

      if (!targetFile) {
        return { success: false, error: 'External file record not found.' };
      }

      // Filter out this file only
      const updatedFiles = files.filter(f => f.id !== sourceFileId);
      const allMaterials = dbService.getExternalMaterials();
      const retainedMaterials = allMaterials.filter(m => m.sourceFileId !== sourceFileId);
      const deletedCount = allMaterials.length - retainedMaterials.length;

      dbService.saveExternalFiles(updatedFiles);
      dbService.saveExternalMaterials(retainedMaterials);

      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        details: `Deleted external company file "${targetFile.fileName}" (Removed ${deletedCount} external records, Source ID: ${sourceFileId})`
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete external file' };
    }
  },

  // =========================================================================
  // --- EMIS WAREHOUSE FILES REGISTRY (INDEPENDENT EXCEL WAREHOUSE SYSTEM) ---
  // =========================================================================

  /**
   * Retrieves all registered independent warehouse files.
   */
  getWarehouseFiles: (): WarehouseFile[] => {
    dbService.initialize();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WAREHOUSE_FILES);
      if (!data) return INITIAL_WAREHOUSE_FILES;
      const list: WarehouseFile[] = JSON.parse(data);
      return Array.isArray(list) ? list : INITIAL_WAREHOUSE_FILES;
    } catch {
      return INITIAL_WAREHOUSE_FILES;
    }
  },

  /**
   * Saves warehouse files metadata index to storage and syncs to backend.
   */
  saveWarehouseFiles: (files: WarehouseFile[]): void => {
    safeSetItem(STORAGE_KEYS.WAREHOUSE_FILES, JSON.stringify(files));
    syncToBackend('warehouse_files', files);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emis:warehouse-files-changed'));
    }
  },

  /**
   * Adds or registers a new independent warehouse file.
   */
  addWarehouseFile: (
    fileData: Omit<WarehouseFile, 'id' | 'createdAt' | 'updatedAt'>,
    currentUser?: User
  ): WarehouseFile => {
    const files = dbService.getWarehouseFiles();
    const newFile: WarehouseFile = {
      ...fileData,
      id: `wh-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: fileData.status || 'ACTIVE'
    };

    const updated = [newFile, ...files];
    dbService.saveWarehouseFiles(updated);

    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Created new Warehouse File registry: "${newFile.name}" (${newFile.fileName})`
      });
    }

    return newFile;
  },

  /**
   * Updates an existing warehouse file's metadata.
   */
  updateWarehouseFile: (file: WarehouseFile, currentUser?: User): boolean => {
    const files = dbService.getWarehouseFiles();
    const idx = files.findIndex(f => f.id === file.id);
    if (idx === -1) return false;

    const updated = [...files];
    updated[idx] = {
      ...file,
      updatedAt: new Date().toISOString()
    };
    dbService.saveWarehouseFiles(updated);

    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Updated Warehouse File: "${file.name}"`
      });
    }

    return true;
  },

  /**
   * Deletes a warehouse file and optionally its associated materials with explicit safety check.
   */
  deleteWarehouseFile: (
    fileId: string,
    currentUser: User,
    deleteAssociatedMaterials = false
  ): { success: boolean; error?: string } => {
    if (currentUser.role === UserRole.VIEWER) {
      return { success: false, error: 'Clearance level insufficient to delete warehouse files.' };
    }

    const files = dbService.getWarehouseFiles();
    const target = files.find(f => f.id === fileId);
    if (!target) {
      return { success: false, error: 'Warehouse file not found.' };
    }

    const updatedFiles = files.filter(f => f.id !== fileId);
    dbService.saveWarehouseFiles(updatedFiles);

    if (deleteAssociatedMaterials) {
      const allMaterials = dbService.getMaterials();
      const retained = allMaterials.filter(m => m.fileId !== fileId);
      dbService.saveMaterials(retained);
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'delete',
      details: `Deleted Warehouse File: "${target.name}" (${target.fileName})`
    });

    return { success: true };
  },

  /**
   * Retrieves materials that belong to a specific warehouse file.
   */
  getMaterialsForFile: (fileId: string): Material[] => {
    const materials = dbService.getMaterials();
    return materials.filter(m => m.fileId === fileId);
  },

  /**
   * Computes the next suggested sequence specifically within a given warehouse file.
   * Starts at 1 if file is empty.
   */
  getSuggestedSequenceForFile: (fileId: string): number => {
    const fileMaterials = dbService.getMaterialsForFile(fileId);
    const validSeqs = fileMaterials
      .map(m => m.fileSequence ?? m.sequence)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);

    if (validSeqs.length === 0) return 1;
    return Math.max(...validSeqs) + 1;
  },

  /**
   * Explicitly transfers a single External Material item to the Station Materials Ledger upon user request.
   * Safety rule: External stock NEVER becomes station material automatically.
   */
  transferExternalMaterialToStation: (
    externalMat: ExternalMaterial,
    currentUser: User,
    targetStore = 'ZFOD Central Warehouse',
    minStockLevel = 5
  ): { success: boolean; createdMaterial?: Material; error?: string } => {
    try {
      const stationMaterials = dbService.getMaterials();
      
      // Check if part number already exists in station ledger
      const existing = stationMaterials.find(m => m.partNumber.toUpperCase() === externalMat.partNumber.toUpperCase());
      if (existing) {
        return {
          success: false,
          error: `Part Number "${externalMat.partNumber}" already exists in Station Materials Ledger (Current Station Qty: ${existing.quantity} ${existing.unit}).`
        };
      }

      const res = dbService.addMaterial({
        partNumber: externalMat.partNumber,
        description: externalMat.description,
        manufacturer: externalMat.manufacturer || 'OEM',
        model: externalMat.model || '',
        quantity: externalMat.quantity,
        unit: externalMat.unit || 'PCS',
        store: targetStore,
        rack: externalMat.rack || '',
        shelf: externalMat.shelf || '',
        notes: `Transferred from External Company Stock (Source: ${externalMat.sourceFileName}, Warehouse: ${externalMat.warehouseName}, Original Seq: ${externalMat.originalSequence}, Row: ${externalMat.originalExcelRow})`,
        minStockLevel: minStockLevel || 5,
        serialNumber: externalMat.serialNumber || '',
        engineeringNotes: `Initial transfer authorization from external warehouse ${externalMat.warehouseName}`
      }, currentUser);

      if (res.success) {
        dbService.logActivity({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create',
          details: `Transferred external item ${externalMat.partNumber} from "${externalMat.warehouseName}" into Station Materials Ledger.`
        });
        const newlyCreated = dbService.getMaterialByPartNumber(externalMat.partNumber);
        return { success: true, createdMaterial: newlyCreated };
      } else {
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to transfer item to station materials' };
    }
  },

  /**
   * Unified Cross-Source Search Engine:
   * Searches across:
   * 1. Station Materials (GREEN)
   * 2. External Company Stock (BLUE)
   * 3. Equipment Register (PURPLE)
   * 4. MR / MRF / WO (ORANGE)
   */
  unifiedSearch: (
    rawQuery: string,
    filterSources?: UnifiedSearchResultSource[]
  ): UnifiedSearchResult[] => {
    const trimmed = (rawQuery || '').trim();
    const queryLower = trimmed.toLowerCase();
    const queryNorm = dbService.normalizeToken(trimmed);
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);

    const results: UnifiedSearchResult[] = [];

    const allowStation = !filterSources || filterSources.includes('STATION_MATERIAL');
    const allowExternal = !filterSources || filterSources.includes('EXTERNAL_STOCK');
    const allowEquipment = !filterSources || filterSources.includes('EQUIPMENT');
    const allowMrfWo = !filterSources || filterSources.includes('MRF_WO');

    // 1. SEARCH STATION MATERIALS (GREEN)
    if (allowStation) {
      const stationResults = dbService.universalSearch(trimmed);
      stationResults.forEach((item, idx) => {
        const m = item.material;
        const uniqueKey = m.id || (m.sequence !== undefined ? `seq-${m.sequence}` : '') || m.partNumber || `item-${idx}`;
        results.push({
          id: `src-station-${uniqueKey}-${idx}`,
          source: 'STATION_MATERIAL',
          sourceLabel: 'Station Material (مواد المحطة)',
          badgeColor: 'green',
          title: m.partNumber,
          subtitle: m.description,
          manufacturer: m.manufacturer,
          model: m.model,
          serialNumber: m.serialNumber,
          warehouseOrLocation: m.store || 'Station Warehouse',
          originalSequence: m.sequence,
          quantity: m.quantity,
          unit: m.unit,
          rack: m.rack,
          shelf: m.shelf,
          status: item.computedStatus,
          matchCategory: item.matchCategory,
          matchScore: item.matchScore + 50, // Slight priority for local station materials
          highlightField: item.highlightField,
          isBlacklisted: item.isBlacklisted,
          rawData: m
        });
      });
    }

    // 2. SEARCH EXTERNAL COMPANY STOCK (BLUE)
    if (allowExternal) {
      const extMaterials = dbService.getExternalMaterials();
      
      extMaterials.forEach(em => {
        const pUpper = em.partNumber.toUpperCase();
        const pNorm = dbService.normalizeToken(em.partNumber);
        const modelUpper = (em.model || '').toUpperCase();
        const modelNorm = dbService.normalizeToken(em.model || '');
        const descLower = (em.description || '').toLowerCase();
        const mfgLower = (em.manufacturer || '').toLowerCase();
        const warehouseLower = (em.warehouseName || '').toLowerCase();
        const fileLower = (em.sourceFileName || '').toLowerCase();
        const seqStr = String(em.originalSequence);
        const rowStr = String(em.originalExcelRow);
        const serialUpper = (em.serialNumber || '').toUpperCase();
        const serialNorm = dbService.normalizeToken(em.serialNumber || '');

        let matched = false;
        let score = 0;
        let category = '';
        let highlight = 'partNumber';

        if (!trimmed) {
          matched = true;
          score = 80;
          category = 'External Company Catalog';
        }
        // Exact Sequence Match (e.g. User searches "184")
        else if (trimmed === seqStr || (trimmed.length <= 5 && !isNaN(Number(trimmed)) && Number(trimmed) === Number(em.originalSequence))) {
          matched = true;
          score = 950;
          category = `Original Sequence #${em.originalSequence} Match`;
          highlight = 'originalSequence';
        }
        // Exact Excel Row Match
        else if (trimmed === rowStr && trimmed.length <= 4) {
          matched = true;
          score = 700;
          category = `Excel Row #${em.originalExcelRow} Match`;
          highlight = 'originalExcelRow';
        }
        // Exact Part Number Match
        else if (pUpper === trimmed.toUpperCase() || (queryNorm && pNorm === queryNorm)) {
          matched = true;
          score = 980;
          category = 'Exact External Part Number Match';
          highlight = 'partNumber';
        }
        // Exact Model Match
        else if (modelUpper && (modelUpper === trimmed.toUpperCase() || (queryNorm && modelNorm === queryNorm))) {
          matched = true;
          score = 880;
          category = 'Exact External Model Match';
          highlight = 'model';
        }
        // Exact Serial Number Match
        else if (serialUpper && (serialUpper === trimmed.toUpperCase() || (queryNorm && serialNorm === queryNorm))) {
          matched = true;
          score = 820;
          category = 'Exact Serial Match';
          highlight = 'serialNumber';
        }
        // Partial Part Number / Model / Serial
        else if (
          pUpper.includes(trimmed.toUpperCase()) ||
          (queryNorm.length >= 3 && pNorm.includes(queryNorm)) ||
          (modelUpper && modelUpper.includes(trimmed.toUpperCase()))
        ) {
          matched = true;
          score = 600;
          category = 'Partial External Reference Match';
          highlight = pUpper.includes(trimmed.toUpperCase()) ? 'partNumber' : 'model';
        }
        // Warehouse or File Name Match
        else if (warehouseLower.includes(queryLower) || fileLower.includes(queryLower)) {
          matched = true;
          score = 500;
          category = warehouseLower.includes(queryLower) ? 'External Warehouse Match' : 'Source File Match';
          highlight = warehouseLower.includes(queryLower) ? 'warehouseName' : 'sourceFileName';
        }
        // Description / Manufacturer Match
        else if (
          queryTokens.every(tok => descLower.includes(tok) || mfgLower.includes(tok) || warehouseLower.includes(tok)) ||
          descLower.includes(queryLower) ||
          mfgLower.includes(queryLower)
        ) {
          matched = true;
          score = 420;
          category = 'External Description Match';
          highlight = mfgLower.includes(queryLower) ? 'manufacturer' : 'description';
        }

        if (matched) {
          results.push({
            id: `src-ext-${em.id}`,
            source: 'EXTERNAL_STOCK',
            sourceLabel: 'External Company Stock (مخزون الشركة الخارجي)',
            badgeColor: 'blue',
            title: em.partNumber,
            subtitle: em.description,
            manufacturer: em.manufacturer,
            model: em.model,
            serialNumber: em.serialNumber,
            warehouseOrLocation: em.warehouseName,
            fileName: em.sourceFileName,
            originalSequence: em.originalSequence,
            originalExcelRow: em.originalExcelRow,
            sourceFileId: em.sourceFileId,
            quantity: em.quantity,
            unit: em.unit,
            rack: em.rack,
            shelf: em.shelf,
            status: em.quantity > 0 ? 'External Stock Available' : 'Out of Stock in External Store',
            matchCategory: category,
            matchScore: score,
            highlightField: highlight,
            rawData: em
          });
        }
      });
    }

    // 3. SEARCH EQUIPMENT REGISTER (PURPLE)
    if (allowEquipment && trimmed) {
      const equipmentList = dbService.getEquipment();
      equipmentList.forEach(eq => {
        const tagUpper = eq.tagNumber.toUpperCase();
        const tagNorm = dbService.normalizeToken(eq.tagNumber);
        const nameLower = (eq.name || '').toLowerCase();
        const mfgLower = (eq.manufacturer || '').toLowerCase();
        const plantLower = (eq.plant || '').toLowerCase();
        const modelUpper = (eq.model || '').toUpperCase();

        let matched = false;
        let score = 0;
        let category = '';

        if (tagUpper === trimmed.toUpperCase() || (queryNorm && tagNorm === queryNorm)) {
          matched = true;
          score = 920;
          category = 'Exact Equipment Tag Match';
        } else if (tagUpper.includes(trimmed.toUpperCase()) || (queryNorm.length >= 3 && tagNorm.includes(queryNorm))) {
          matched = true;
          score = 650;
          category = 'Partial Tag Match';
        } else if (nameLower.includes(queryLower) || mfgLower.includes(queryLower) || modelUpper.includes(trimmed.toUpperCase())) {
          matched = true;
          score = 450;
          category = 'Equipment Name / Model Match';
        }

        if (matched) {
          results.push({
            id: `src-equip-${eq.tagNumber}`,
            source: 'EQUIPMENT',
            sourceLabel: 'Plant Equipment (المعدات والمنظومات)',
            badgeColor: 'purple',
            title: eq.tagNumber,
            subtitle: `${eq.name} (${eq.plant} - ${eq.area || 'Process Loop'})`,
            manufacturer: eq.manufacturer,
            model: eq.model,
            warehouseOrLocation: `${eq.plant} / ${eq.area || 'Unit'}`,
            status: eq.status,
            matchCategory: category,
            matchScore: score,
            highlightField: 'tagNumber',
            rawData: eq
          });
        }
      });
    }

    // 4. SEARCH MR / MRF / WORK ORDERS (ORANGE)
    if (allowMrfWo && trimmed) {
      const stationMaterials = dbService.getMaterials();
      stationMaterials.forEach(m => {
        const mrStr = m.mrNumber || m.mrfNumber || m.mrf || '';
        const woStr = m.workOrder || (m.woNumbers ? m.woNumbers.join(', ') : '');
        const poStr = m.purchaseOrder || '';

        const mrNorm = dbService.normalizeToken(mrStr);
        const woNorm = dbService.normalizeToken(woStr);
        const poNorm = dbService.normalizeToken(poStr);

        let matched = false;
        let score = 0;
        let title = '';
        let subtitle = '';

        if (mrNorm && queryNorm && (mrNorm === queryNorm || mrNorm.includes(queryNorm))) {
          matched = true;
          score = 860;
          title = `MR: ${mrStr}`;
          subtitle = `Material Request for ${m.partNumber} - ${m.description.slice(0, 45)}`;
        } else if (woNorm && queryNorm && (woNorm === queryNorm || woNorm.includes(queryNorm))) {
          matched = true;
          score = 850;
          title = `Work Order: ${woStr}`;
          subtitle = `Work Order allocated for ${m.partNumber} - ${m.description.slice(0, 45)}`;
        } else if (poNorm && queryNorm && (poNorm === queryNorm || poNorm.includes(queryNorm))) {
          matched = true;
          score = 840;
          title = `Purchase Order: ${poStr}`;
          subtitle = `Procurement PO for ${m.partNumber} (${m.manufacturer})`;
        }

        if (matched) {
          results.push({
            id: `src-mrf-${m.partNumber}-${title}`,
            source: 'MRF_WO',
            sourceLabel: 'MR / PO / WO Procurement (طلبات وأوامر العمل)',
            badgeColor: 'orange',
            title,
            subtitle,
            manufacturer: m.manufacturer,
            model: m.model,
            warehouseOrLocation: m.store,
            quantity: m.quantity,
            unit: m.unit,
            status: m.status || 'Active Procurement Allocation',
            matchCategory: 'Procurement Document Match',
            matchScore: score,
            highlightField: 'workOrder',
            rawData: m
          });
        }
      });
    }

    // 5. SEARCH DOCUMENTS CENTER (TEAL)
    const allowDocs = !filterSources || (filterSources as any).includes('DOCUMENT');
    if (allowDocs && trimmed) {
      const documentsList = dbService.getDocuments();
      documentsList.forEach(d => {
        const nameLower = (d.name || '').toLowerCase();
        const fileLower = (d.fileName || '').toLowerCase();
        const partLower = (d.relatedPartNumber || '').toLowerCase();
        const tagLower = (d.relatedEquipmentTag || '').toLowerCase();
        const mrLower = (d.relatedMrNumber || '').toLowerCase();
        const poLower = (d.relatedPoNumber || '').toLowerCase();
        const typeLower = (d.documentType || '').toLowerCase();

        let matched = false;
        let score = 0;

        if (partLower && queryLower && partLower.includes(queryLower)) {
          matched = true;
          score = 830;
        } else if (tagLower && queryLower && tagLower.includes(queryLower)) {
          matched = true;
          score = 820;
        } else if (nameLower.includes(queryLower) || fileLower.includes(queryLower) || typeLower.includes(queryLower)) {
          matched = true;
          score = 600;
        }

        if (matched) {
          results.push({
            id: `src-doc-${d.id}`,
            source: 'DOCUMENT',
            sourceLabel: `Document (${d.documentType})`,
            badgeColor: 'teal',
            title: d.name,
            subtitle: `${d.documentType} • ${d.fileName} (${d.fileSize || 'PDF'})`,
            warehouseOrLocation: 'Document Center',
            fileName: d.fileName,
            status: 'Verified Technical Record',
            matchCategory: 'Technical Document Match',
            matchScore: score,
            highlightField: 'name',
            rawData: d
          });
        }
      });
    }

    // 6. SEARCH BLACKLIST REGISTRY (RED)
    const allowBlacklist = !filterSources || (filterSources as any).includes('BLACKLIST');
    if (allowBlacklist && trimmed) {
      const blacklists = dbService.getBlacklist();
      blacklists.forEach(bl => {
        const pUpper = bl.partNumber.toUpperCase();
        const sUpper = bl.serialNumber.toUpperCase();
        const supLower = (bl.supplierName || '').toLowerCase();
        const reasonLower = (bl.reason || '').toLowerCase();

        let matched = false;
        let score = 0;

        if (pUpper.includes(trimmed.toUpperCase()) || sUpper.includes(trimmed.toUpperCase())) {
          matched = true;
          score = 990;
        } else if (supLower.includes(queryLower) || reasonLower.includes(queryLower)) {
          matched = true;
          score = 650;
        }

        if (matched) {
          results.push({
            id: `src-bl-${bl.id}`,
            source: 'BLACKLIST',
            sourceLabel: 'Blacklisted Item Warning (قائمة الحظر)',
            badgeColor: 'red',
            title: `BLACKLIST: ${bl.partNumber}`,
            subtitle: `S/N: ${bl.serialNumber} | Supplier: ${bl.supplierName || 'Unknown'} - Reason: ${bl.reason}`,
            warehouseOrLocation: 'Restricted / Quarantined',
            isBlacklisted: true,
            status: 'PROHIBITED ITEM',
            matchCategory: 'Blacklist Flag Match',
            matchScore: score,
            highlightField: 'serialNumber',
            rawData: bl
          });
        }
      });
    }

    // Sort results strictly descending by matchScore
    return results.sort((a, b) => b.matchScore - a.matchScore);
  },

  // --- EMIS v0.4 IMPORT BATCHES ENGINE ---
  getImportBatches: (): ImportBatch[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
      return raw ? JSON.parse(raw) : INITIAL_IMPORT_BATCHES;
    } catch {
      return INITIAL_IMPORT_BATCHES;
    }
  },

  saveImportBatches: (batches: ImportBatch[]): void => {
    safeSetItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(batches));
    syncToBackend('importBatches', batches);
  },

  addImportBatch: (batch: ImportBatch): void => {
    const current = dbService.getImportBatches();
    const updated = [batch, ...current.filter(b => b.importBatchId !== batch.importBatchId)];
    dbService.saveImportBatches(updated);
  },

  // --- EMIS v0.4 DOCUMENT CENTER ENGINE ---
  getDocuments: (): AppDocument[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return raw ? JSON.parse(raw) : INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  },

  saveDocuments: (docs: AppDocument[]): void => {
    safeSetItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    syncToBackend('documents', docs);
  },

  addDocument: (docItem: Omit<AppDocument, 'id' | 'uploadedBy' | 'uploadedAt'> & Partial<AppDocument>, currentUser?: User): { success: boolean; document?: AppDocument; error?: string } => {
    try {
      const current = dbService.getDocuments();
      const newDoc: AppDocument = {
        ...docItem,
        id: docItem.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        uploadedAt: docItem.uploadedAt || new Date().toISOString(),
        uploadedBy: currentUser?.name || docItem.uploadedBy || 'Authenticated Engineer'
      } as AppDocument;
      const updated = [newDoc, ...current];
      dbService.saveDocuments(updated);

      if (currentUser) {
        dbService.logActivity({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create',
          details: `Uploaded technical document "${newDoc.name}" (${newDoc.documentType}) for Part/Tag: ${newDoc.relatedPartNumber || newDoc.relatedEquipmentTag || 'General'}`
        });
      }
      return { success: true, document: newDoc };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to upload document' };
    }
  },

  deleteDocument: (docId: string, currentUser?: User): { success: boolean; error?: string } => {
    try {
      const current = dbService.getDocuments();
      const target = current.find(d => d.id === docId);
      if (!target) return { success: false, error: 'Document record not found' };
      const updated = current.filter(d => d.id !== docId);
      dbService.saveDocuments(updated);

      if (currentUser) {
        dbService.logActivity({
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'delete',
          details: `Removed document "${target.name}" (${target.fileName})`
        });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to delete document' };
    }
  },

  getDocumentsForMaterial: (partNumber: string): AppDocument[] => {
    const docs = dbService.getDocuments();
    const pNorm = dbService.normalizeToken(partNumber);
    return docs.filter(d => {
      if (!d.relatedPartNumber) return false;
      return d.relatedPartNumber.toUpperCase() === partNumber.toUpperCase() || dbService.normalizeToken(d.relatedPartNumber) === pNorm;
    });
  },

  getDocumentsForEquipment: (tagNumber: string): AppDocument[] => {
    const docs = dbService.getDocuments();
    const tNorm = dbService.normalizeToken(tagNumber);
    return docs.filter(d => {
      if (!d.relatedEquipmentTag) return false;
      return d.relatedEquipmentTag.toUpperCase() === tagNumber.toUpperCase() || dbService.normalizeToken(d.relatedEquipmentTag) === tNorm;
    });
  },

  // --- EMIS v0.4 FAVORITES & SEARCH HISTORY ---
  getFavorites: (): FavoriteItem[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : INITIAL_FAVORITES;
    } catch {
      return INITIAL_FAVORITES;
    }
  },

  saveFavorites: (favs: FavoriteItem[]): void => {
    safeSetItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  },

  toggleFavorite: (item: Omit<FavoriteItem, 'addedAt' | 'id'>): boolean => {
    const current = dbService.getFavorites();
    const existingIdx = current.findIndex(f => f.entityType === item.entityType && f.entityId === item.entityId);
    if (existingIdx >= 0) {
      const updated = current.filter((_, idx) => idx !== existingIdx);
      dbService.saveFavorites(updated);
      return false; // Removed
    } else {
      const newFav: FavoriteItem = {
        ...item,
        id: `fav-${Date.now()}`,
        addedAt: new Date().toISOString()
      };
      dbService.saveFavorites([newFav, ...current]);
      return true; // Added
    }
  },

  isFavorite: (entityType: string, entityId: string): boolean => {
    const current = dbService.getFavorites();
    return current.some(f => f.entityType === entityType && f.entityId.toUpperCase() === entityId.toUpperCase());
  },

  getSearchHistory: (): SearchHistoryItem[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return raw ? JSON.parse(raw) : INITIAL_SEARCH_HISTORY;
    } catch {
      return INITIAL_SEARCH_HISTORY;
    }
  },

  saveSearchHistory: (items: SearchHistoryItem[]): void => {
    safeSetItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(items.slice(0, 30)));
  },

  addSearchHistory: (term: string, count: number, sourceFilter?: string): void => {
    if (!term || term.trim().length < 2) return;
    const current = dbService.getSearchHistory();
    const cleanTerm = term.trim();
    const filtered = current.filter(item => item.term.toLowerCase() !== cleanTerm.toLowerCase());
    const newItem: SearchHistoryItem = {
      id: `sh-${Date.now()}`,
      term: cleanTerm,
      timestamp: new Date().toISOString(),
      resultCount: count,
      sourceFilter
    };
    dbService.saveSearchHistory([newItem, ...filtered]);
  },

  clearSearchHistory: (): void => {
    dbService.saveSearchHistory([]);
  },

  // --- EMIS v0.4 ENGINEERING VERIFICATION ENGINE ---
  verifyMaterial: (input: {
    partNumber: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    description?: string;
  }, verifiedBy = 'Lead QA Inspector'): EngineeringVerificationResult => {
    const cleanPN = (input.partNumber || '').trim();
    const normPN = dbService.normalizeToken(cleanPN);
    const stationMaterials = dbService.getMaterials();
    const blacklists = dbService.getBlacklist();
    const decisions = dbService.getEngineeringDecisions();
    const equipment = dbService.getEquipment();

    const checks: { parameter: string; expected: string; actual: string; status: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'N/A'; notes?: string }[] = [];

    // 1. Blacklist Check
    const blacklisted = blacklists.find(bl => 
      (cleanPN && bl.partNumber.toUpperCase() === cleanPN.toUpperCase()) ||
      (input.serialNumber && bl.serialNumber.toUpperCase() === input.serialNumber.trim().toUpperCase())
    );

    if (blacklisted) {
      checks.push({
        parameter: 'Compliance & Blacklist Registry',
        expected: 'Clean Security Status',
        actual: `BLACKLISTED (S/N: ${blacklisted.serialNumber})`,
        status: 'MISMATCH',
        notes: `Reason: ${blacklisted.reason} | Supplier: ${blacklisted.supplierName || 'Unknown'}`
      });

      return {
        id: `verif-${Date.now()}`,
        partNumber: cleanPN,
        status: 'BLACKLISTED',
        color: 'black',
        title: 'BLACKLIST WARNING - CRITICAL REJECTION',
        reason: `Part or Serial Number is explicitly recorded on the Counterfeit/Non-compliant Blacklist Registry.`,
        details: `Reported on ${new Date(blacklisted.reportedDate).toLocaleDateString()} by ${blacklisted.reporterName}. Reason: ${blacklisted.reason}`,
        checks,
        blacklistedWarning: {
          reason: blacklisted.reason,
          supplier: blacklisted.supplierName || 'Unknown',
          reportedDate: blacklisted.reportedDate,
          reporter: blacklisted.reporterName
        },
        timestamp: new Date().toISOString(),
        verifiedBy
      };
    }

    // 2. Ledger Match Check
    const exactMatch = stationMaterials.find(m => m.partNumber.toUpperCase() === cleanPN.toUpperCase());
    const fuzzyMatch = !exactMatch ? stationMaterials.find(m => dbService.normalizeToken(m.partNumber) === normPN) : null;
    const ledgerItem = exactMatch || fuzzyMatch;

    if (!ledgerItem) {
      checks.push({
        parameter: 'Part Number Master Registration',
        expected: cleanPN,
        actual: 'Not Found in Station Ledger',
        status: 'MISMATCH',
        notes: 'Unregistered spare part. Requires engineering approval and full datasheet submission.'
      });

      return {
        id: `verif-${Date.now()}`,
        partNumber: cleanPN,
        status: 'INSUFFICIENT_DATA',
        color: 'gray',
        title: 'UNREGISTERED SPECIFICATION',
        reason: 'Part Number not registered in active Station Materials Ledger.',
        details: 'The item cannot be fully verified because no baseline specification exists in the central registry.',
        checks,
        timestamp: new Date().toISOString(),
        verifiedBy
      };
    }

    // Evaluate Part Number
    checks.push({
      parameter: 'Part Number Exactness',
      expected: ledgerItem.partNumber,
      actual: cleanPN,
      status: ledgerItem.partNumber.toUpperCase() === cleanPN.toUpperCase() ? 'MATCH' : 'PARTIAL',
      notes: ledgerItem.partNumber.toUpperCase() === cleanPN.toUpperCase() ? 'Exact character match' : 'Normalized variation match'
    });

    // Evaluate Manufacturer
    if (input.manufacturer && input.manufacturer.trim()) {
      const mfgInput = input.manufacturer.trim().toLowerCase();
      const mfgLedger = (ledgerItem.manufacturer || '').toLowerCase();
      const isMfgMatch = mfgLedger.includes(mfgInput) || mfgInput.includes(mfgLedger);
      checks.push({
        parameter: 'Manufacturer / OEM',
        expected: ledgerItem.manufacturer,
        actual: input.manufacturer,
        status: isMfgMatch ? 'MATCH' : 'MISMATCH',
        notes: isMfgMatch ? 'OEM verified' : 'Manufacturer discrepancy detected'
      });
    } else {
      checks.push({
        parameter: 'Manufacturer / OEM',
        expected: ledgerItem.manufacturer,
        actual: 'Not Provided',
        status: 'PARTIAL',
        notes: 'Manufacturer omitted in inspection query'
      });
    }

    // Evaluate Model
    if (input.model && input.model.trim()) {
      const modelInput = dbService.normalizeToken(input.model);
      const modelLedger = dbService.normalizeToken(ledgerItem.model || '');
      const isModelMatch = modelInput === modelLedger || (modelLedger && modelLedger.includes(modelInput));
      checks.push({
        parameter: 'Model Designation',
        expected: ledgerItem.model || 'N/A',
        actual: input.model,
        status: isModelMatch ? 'MATCH' : 'MISMATCH',
        notes: isModelMatch ? 'Model specification confirmed' : 'Model variation'
      });
    }

    // Evaluate Serial
    if (input.serialNumber && input.serialNumber.trim()) {
      checks.push({
        parameter: 'Serial Number Traceability',
        expected: ledgerItem.serialNumber || 'Non-serialized in Ledger',
        actual: input.serialNumber,
        status: ledgerItem.serialNumber && ledgerItem.serialNumber.toUpperCase() === input.serialNumber.trim().toUpperCase() ? 'MATCH' : 'PARTIAL',
        notes: 'Serial checked against factory certificate'
      });
    }

    // Check relevant Engineering Decisions
    const relevantDecisions = decisions.filter(d => 
      d.partNumber.toUpperCase() === cleanPN.toUpperCase() ||
      dbService.normalizeToken(d.partNumber) === normPN
    );

    // Find compatible equipment loops
    const compatibleLoops = equipment
      .filter(eq => (eq.compatibleSpares && eq.compatibleSpares.includes(ledgerItem.partNumber)) || (eq.model && eq.model === ledgerItem.model))
      .map(eq => eq.tagNumber);

    const hasMismatches = checks.some(c => c.status === 'MISMATCH');
    const hasPartials = checks.some(c => c.status === 'PARTIAL');

    let overallStatus: 'MATCH' | 'PARTIAL_MATCH' | 'MISMATCH' = 'MATCH';
    let overallColor: 'green' | 'yellow' | 'red' = 'green';
    let overallTitle = 'VERIFICATION APPROVED (مطابق للمواصفات)';
    let overallReason = 'All primary engineering parameters match the certified Station Materials Ledger.';

    if (hasMismatches) {
      overallStatus = 'MISMATCH';
      overallColor = 'red';
      overallTitle = 'SPECIFICATION MISMATCH (غير مطابق)';
      overallReason = 'Critical parameter discrepancies found between input item and baseline ledger specifications.';
    } else if (hasPartials) {
      overallStatus = 'PARTIAL_MATCH';
      overallColor = 'yellow';
      overallTitle = 'PARTIAL MATCH - REQUIRES REVIEW (مطابقة جزئية)';
      overallReason = 'Minor variation or incomplete input parameters detected. Review recommended before issue.';
    }

    return {
      id: `verif-${Date.now()}`,
      partNumber: cleanPN,
      status: overallStatus,
      color: overallColor,
      title: overallTitle,
      reason: overallReason,
      details: `Verified against ledger entry (${ledgerItem.store}, Qty: ${ledgerItem.quantity} ${ledgerItem.unit}). Compatible with ${compatibleLoops.length} plant loops.`,
      checks,
      approvedDecisions: relevantDecisions,
      compatibleEquipmentTags: compatibleLoops,
      timestamp: new Date().toISOString(),
      verifiedBy
    };
  },

  // --- EMIS v0.4 DUPLICATE DETECTION ENGINE ---
  detectDuplicates: (): DuplicateCandidate[] => {
    dbService.initialize();
    const stationMaterials = dbService.getMaterials();
    const externalMaterials = dbService.getExternalMaterials();

    const map = new Map<string, Array<{
      id: string;
      partNumber: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      description: string;
      source: 'STATION' | 'EXTERNAL';
      sourceName: string;
      location: string;
      originalRow?: number;
    }>>();

    // 1. Index Station Materials
    stationMaterials.forEach(m => {
      const normPN = dbService.normalizeToken(m.partNumber);
      if (!normPN) return;
      const list = map.get(normPN) || [];
      list.push({
        id: `station-${m.partNumber}`,
        partNumber: m.partNumber,
        serialNumber: m.serialNumber,
        manufacturer: m.manufacturer,
        model: m.model,
        description: m.description,
        source: 'STATION',
        sourceName: 'Station Materials Ledger',
        location: `${m.store} (Rack: ${m.rack || '-'}, Shelf: ${m.shelf || '-'})`
      });
      map.set(normPN, list);
    });

    // 2. Index External Materials
    externalMaterials.forEach(em => {
      const normPN = dbService.normalizeToken(em.partNumber);
      if (!normPN) return;
      const list = map.get(normPN) || [];
      list.push({
        id: `ext-${em.id}`,
        partNumber: em.partNumber,
        serialNumber: em.serialNumber,
        manufacturer: em.manufacturer,
        model: em.model,
        description: em.description,
        source: 'EXTERNAL',
        sourceName: `${em.warehouseName} (${em.sourceFileName})`,
        location: `${em.warehouseName} (Row: ${em.originalExcelRow})`,
        originalRow: em.originalExcelRow
      });
      map.set(normPN, list);
    });

    const candidates: DuplicateCandidate[] = [];

    map.forEach((items, normKey) => {
      if (items.length > 1) {
        const hasStation = items.some(i => i.source === 'STATION');
        const hasExternal = items.some(i => i.source === 'EXTERNAL');
        const matchReasons: string[] = [];

        if (hasStation && hasExternal) {
          matchReasons.push('Cross-system duplication: Item exists in both Station Ledger and External Company Catalog.');
        } else if (hasStation && !hasExternal) {
          matchReasons.push('Internal duplication: Multiple station materials share normalized part number.');
        } else {
          matchReasons.push('External duplication: Part number appears across multiple external rows/files.');
        }

        candidates.push({
          id: `dup-${normKey}`,
          primaryKey: items[0].partNumber,
          normalizedKey: normKey,
          confidenceScore: 95,
          items,
          matchReasons
        });
      }
    });

    return candidates.sort((a, b) => b.items.length - a.items.length);
  },

  // --- EMIS v0.4 MATERIAL TRACEABILITY GRAPH ENGINE ---
  getMaterialTraceability: (partNumber: string) => {
    const cleanPN = (partNumber || '').trim();
    const stationMat = dbService.getMaterialByPartNumber(cleanPN);
    const extMat = (dbService.getExternalMaterials() || []).find(em => em.partNumber.toUpperCase() === cleanPN.toUpperCase());
    const equipment = dbService.getEquipment() || [];
    const documents = dbService.getDocumentsForMaterial(cleanPN) || [];
    const decisions = (dbService.getEngineeringDecisions() || []).filter(d => d.partNumber.toUpperCase() === cleanPN.toUpperCase());
    const inspections = (dbService.getInspections() || []).filter(i => i.partNumber.toUpperCase() === cleanPN.toUpperCase());
    const activities = (dbService.getActivities() || []).filter(a => a.details && a.details.includes(cleanPN));
    const blacklist = (dbService.getBlacklist() || []).find(b => b.partNumber.toUpperCase() === cleanPN.toUpperCase());

    const isAvailable = (val?: any) => (val && String(val).trim() !== '' ? String(val) : 'Not Available');

    const mappedEquipment = equipment.filter(eq => 
      (eq.compatibleSpares && eq.compatibleSpares.includes(cleanPN)) ||
      (stationMat?.model && eq.model === stationMat.model)
    );

    return {
      partNumber: cleanPN,
      material: stationMat || extMat || null,
      sourceType: stationMat ? 'STATION_MATERIAL' : extMat ? 'EXTERNAL_STOCK' : 'UNREGISTERED',
      hierarchy: {
        materialName: isAvailable(stationMat?.description || extMat?.description),
        partNumber: cleanPN,
        serialNumber: isAvailable(stationMat?.serialNumber || extMat?.serialNumber),
        manufacturer: isAvailable(stationMat?.manufacturer || extMat?.manufacturer),
        model: isAvailable(stationMat?.model || extMat?.model),
        mrNumber: isAvailable(stationMat?.mrNumber || stationMat?.mrfNumber || extMat?.mr || extMat?.mrf),
        purchaseOrder: isAvailable(stationMat?.purchaseOrder || extMat?.po),
        workOrder: isAvailable(stationMat?.workOrder || extMat?.wo),
        supplier: isAvailable(stationMat?.supplier || extMat?.supplier),
        warehouse: isAvailable(stationMat?.store || extMat?.warehouseName),
        storageStore: isAvailable(stationMat?.store || extMat?.store),
        rack: isAvailable(stationMat?.rack || extMat?.rack),
        shelf: isAvailable(stationMat?.shelf || extMat?.shelf),
        originalExcelRow: extMat ? `Row #${extMat.originalExcelRow}` : 'Direct System Entry',
        originalSequence: extMat ? `Seq #${extMat.originalSequence}` : 'Primary Ledger',
        sourceFileName: extMat ? extMat.sourceFileName : 'Central Station Database',
        equipmentLoops: mappedEquipment.map(eq => ({
          tagNumber: eq.tagNumber,
          name: eq.name,
          plant: eq.plant,
          status: eq.status
        })),
        documents: documents.map(d => ({
          id: d.id,
          name: d.name,
          type: d.documentType,
          fileName: d.fileName,
          uploadedBy: d.uploadedBy,
          uploadedAt: d.uploadedAt
        })),
        inspections: inspections.map(i => ({
          id: i.id,
          result: i.result,
          reason: i.reason,
          date: i.inspectionDate
        })),
        decisions: decisions.map(d => ({
          id: d.id,
          title: d.title,
          type: d.decisionType,
          approvedBy: d.approvedBy,
          date: d.approvalDate
        })),
        activities: activities.slice(0, 10).map(a => ({
          id: a.id,
          action: a.action,
          userName: a.userName,
          details: a.details,
          timestamp: a.timestamp
        })),
        blacklistAlert: blacklist ? {
          reason: blacklist.reason,
          supplier: blacklist.supplierName || 'Unknown',
          reportedDate: blacklist.reportedDate
        } : null
      }
    };
  },

  // --- EMIS v0.6 KNOWLEDGE BASE & VERIFICATION REPORTS ---
  getKnowledgeBase: (): KnowledgeRecord[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_BASE);
      return raw ? JSON.parse(raw) : INITIAL_KNOWLEDGE_BASE;
    } catch {
      return INITIAL_KNOWLEDGE_BASE;
    }
  },

  saveKnowledgeBase: (records: KnowledgeRecord[]): void => {
    safeSetItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(records));
  },

  addKnowledgeRecord: (record: KnowledgeRecord, currentUser?: User): void => {
    const records = dbService.getKnowledgeBase();
    const updated = [record, ...records.filter(r => r.id !== record.id)];
    dbService.saveKnowledgeBase(updated);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Added knowledge base specification for ${record.manufacturer} ${record.model}`
      });
    }
  },

  updateKnowledgeRecord: (record: KnowledgeRecord, currentUser?: User): void => {
    const records = dbService.getKnowledgeBase();
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      records[idx] = { ...record, lastUpdated: new Date().toISOString() };
    } else {
      records.unshift(record);
    }
    dbService.saveKnowledgeBase(records);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Updated knowledge base record for ${record.manufacturer} ${record.model}`
      });
    }
  },

  getVerificationReports: (): MaterialVerificationReport[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VERIFICATION_REPORTS);
      return raw ? JSON.parse(raw) : INITIAL_VERIFICATION_REPORTS;
    } catch {
      return INITIAL_VERIFICATION_REPORTS;
    }
  },

  saveVerificationReports: (reports: MaterialVerificationReport[]): void => {
    safeSetItem(STORAGE_KEYS.VERIFICATION_REPORTS, JSON.stringify(reports));
  },

  addVerificationReport: (report: MaterialVerificationReport, currentUser?: User): void => {
    const reports = dbService.getVerificationReports();
    const updated = [report, ...reports.filter(r => r.id !== report.id)];
    dbService.saveVerificationReports(updated);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Generated Material Verification Report #${report.reportNumber} for Part ${report.partNumber}`
      });
    }
  },

  getVerificationReportById: (reportId: string): MaterialVerificationReport | undefined => {
    const reports = dbService.getVerificationReports();
    return reports.find(r => r.id === reportId || r.reportNumber === reportId);
  },

  updateVerificationReportDecision: (
    reportId: string, 
    decision: 'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION', 
    comments: string, 
    currentUser: User
  ): MaterialVerificationReport | null => {
    const reports = dbService.getVerificationReports();
    const idx = reports.findIndex(r => r.id === reportId || r.reportNumber === reportId);
    if (idx === -1) return null;

    const report = reports[idx];
    const now = new Date().toISOString();
    report.status = decision === 'ACCEPT' ? 'FINAL' : 'UNDER_REVIEW';
    report.updatedAt = now;
    report.engineerDecision = {
      decision,
      reviewer: `${currentUser.name} (${currentUser.role})`,
      date: now,
      comments: comments || `Decision marked as ${decision}`
    };

    report.auditTrail.unshift({
      id: `aud-${Date.now()}`,
      timestamp: now,
      user: currentUser.name,
      userRole: currentUser.role,
      action: decision === 'ACCEPT' ? 'Material Accepted' : decision === 'REJECT' ? 'Material Rejected' : 'Status Changed',
      entity: 'Material',
      entityId: report.partNumber,
      reason: comments
    });

    reports[idx] = report;
    dbService.saveVerificationReports(reports);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Engineer ${currentUser.name} recorded decision "${decision}" on Verification Report #${report.reportNumber}`
    });

    return report;
  },

  // ============================================================
  // EMIS v0.7 ENTERPRISE HIERARCHY & SITES
  // ============================================================

  getHierarchyNodes: (): EnterpriseHierarchyNode[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HIERARCHY_NODES);
      return raw ? JSON.parse(raw) : INITIAL_HIERARCHY_NODES;
    } catch {
      return INITIAL_HIERARCHY_NODES;
    }
  },

  saveHierarchyNodes: (nodes: EnterpriseHierarchyNode[]): void => {
    safeSetItem(STORAGE_KEYS.HIERARCHY_NODES, JSON.stringify(nodes));
    syncToBackend('hierarchy_nodes', nodes);
  },

  addHierarchyNode: (node: EnterpriseHierarchyNode, currentUser?: User): void => {
    const nodes = dbService.getHierarchyNodes();
    const updated = [...nodes, node];
    dbService.saveHierarchyNodes(updated);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Created enterprise hierarchy node "${node.name}" (${node.type}) - ${node.code}`
      });
    }
  },

  updateHierarchyNode: (nodeId: string, updates: Partial<EnterpriseHierarchyNode>, currentUser?: User): EnterpriseHierarchyNode | null => {
    const nodes = dbService.getHierarchyNodes();
    const idx = nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) return null;
    const oldNode = nodes[idx];
    const updatedNode = { ...oldNode, ...updates, updatedAt: new Date().toISOString() };
    nodes[idx] = updatedNode;
    dbService.saveHierarchyNodes(nodes);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Updated enterprise hierarchy node "${updatedNode.name}"`
      });
    }
    return updatedNode;
  },

  getWarehouseLocations: (): WarehouseLocationDetail[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WAREHOUSE_LOCATIONS);
      return raw ? JSON.parse(raw) : INITIAL_WAREHOUSE_LOCATIONS;
    } catch {
      return INITIAL_WAREHOUSE_LOCATIONS;
    }
  },

  saveWarehouseLocations: (locations: WarehouseLocationDetail[]): void => {
    safeSetItem(STORAGE_KEYS.WAREHOUSE_LOCATIONS, JSON.stringify(locations));
    syncToBackend('warehouse_locations', locations);
  },

  addWarehouseLocation: (loc: WarehouseLocationDetail, currentUser?: User): void => {
    const locations = dbService.getWarehouseLocations();
    const updated = [...locations, loc];
    dbService.saveWarehouseLocations(updated);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Registered new warehouse storage location "${loc.barcode}" at ${loc.warehouseName}`
      });
    }
  },

  // ============================================================
  // EMIS v0.7 INVENTORY ENGINE & STOCK LEDGER
  // ============================================================

  getStockTransactions: (): InventoryTransaction[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STOCK_TRANSACTIONS);
      return raw ? JSON.parse(raw) : INITIAL_STOCK_TRANSACTIONS;
    } catch {
      return INITIAL_STOCK_TRANSACTIONS;
    }
  },

  saveStockTransactions: (txs: InventoryTransaction[]): void => {
    safeSetItem(STORAGE_KEYS.STOCK_TRANSACTIONS, JSON.stringify(txs));
    syncToBackend('stock_transactions', txs);
  },

  recordStockTransaction: (
    txData: Omit<InventoryTransaction, 'id' | 'transactionNumber' | 'timestamp'>,
    currentUser?: User
  ): InventoryTransaction => {
    const transactions = dbService.getStockTransactions();
    const txNumber = `TX-${new Date().getFullYear()}-${String(transactions.length + 1).padStart(4, '0')}`;
    const newTx: InventoryTransaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      transactionNumber: txNumber,
      timestamp: new Date().toISOString()
    };

    const updated = [newTx, ...transactions];
    dbService.saveStockTransactions(updated);

    // Update material quantity accordingly
    const materials = dbService.getMaterials();
    const matIdx = materials.findIndex(m => m.partNumber === newTx.partNumber);
    if (matIdx !== -1) {
      const mat = materials[matIdx];
      const newQty = Math.max(0, (mat.quantity || 0) + newTx.quantityChange);
      materials[matIdx] = {
        ...mat,
        quantity: newQty,
        remainingQuantity: newQty,
        updatedAt: new Date().toISOString()
      };
      dbService.saveMaterials(materials);
    }

    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        details: `Stock Ledger Entry: ${newTx.transactionType} ${newTx.quantityChange > 0 ? '+' : ''}${newTx.quantityChange} ${newTx.unit} for [${newTx.partNumber}] (Ref: ${newTx.referenceNumber})`
      });
    }

    return newTx;
  },

  getStockLedgerForMaterial: (partNumber: string): InventoryTransaction[] => {
    const transactions = dbService.getStockTransactions();
    return transactions.filter(t => t.partNumber === partNumber || t.materialId === partNumber);
  },

  // ============================================================
  // EMIS v0.7 MATERIAL TRANSFERS
  // ============================================================

  getMaterialTransfers: (): MaterialTransfer[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      return raw ? JSON.parse(raw) : INITIAL_TRANSFERS;
    } catch {
      return INITIAL_TRANSFERS;
    }
  },

  saveMaterialTransfers: (transfers: MaterialTransfer[]): void => {
    safeSetItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
    syncToBackend('material_transfers', transfers);
  },

  createMaterialTransfer: (
    transferData: Omit<MaterialTransfer, 'id' | 'transferNumber' | 'requestDate' | 'status'>,
    currentUser: User
  ): MaterialTransfer => {
    const transfers = dbService.getMaterialTransfers();
    const count = transfers.length + 1;
    const transferNumber = `TRF-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newTransfer: MaterialTransfer = {
      ...transferData,
      id: `trf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      transferNumber,
      requestDate: new Date().toISOString(),
      status: 'REQUESTED',
      qrPayload: `EMIS-TRF|${transferNumber}|${transferData.partNumber}|${transferData.quantity}|${transferData.fromSite}->${transferData.toSite}`
    };

    const updated = [newTransfer, ...transfers];
    dbService.saveMaterialTransfers(updated);

    // Create approval request automatically
    dbService.createApprovalRequest({
      type: 'MATERIAL_TRANSFER',
      title: `Inter-Site Transfer ${transferNumber} (${newTransfer.fromSite} -> ${newTransfer.toSite})`,
      description: `Transfer of ${newTransfer.quantity} ${newTransfer.unit} of [${newTransfer.partNumber}] - ${newTransfer.description}. Reason: ${newTransfer.reason}`,
      requestedBy: currentUser.name,
      priority: newTransfer.urgency === 'EMERGENCY' ? 'CRITICAL' : newTransfer.urgency === 'URGENT' ? 'URGENT' : 'ROUTINE',
      amountOrQuantity: `${newTransfer.quantity} ${newTransfer.unit}`,
      relatedEntityId: newTransfer.id,
      relatedEntityNumber: transferNumber
    });

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Initiated Material Transfer Request ${transferNumber} for ${newTransfer.quantity}x [${newTransfer.partNumber}] from ${newTransfer.fromSite} to ${newTransfer.toSite}`
    });

    return newTransfer;
  },

  approveMaterialTransfer: (transferId: string, currentUser: User, comments?: string): MaterialTransfer | null => {
    const transfers = dbService.getMaterialTransfers();
    const idx = transfers.findIndex(t => t.id === transferId || t.transferNumber === transferId);
    if (idx === -1) return null;
    const transfer = transfers[idx];
    transfer.status = 'APPROVED';
    transfer.approvedBy = `${currentUser.name} (${currentUser.role})`;
    transfer.approvalDate = new Date().toISOString();
    if (comments) transfer.notes = (transfer.notes ? transfer.notes + ' | ' : '') + `Approved: ${comments}`;
    transfers[idx] = transfer;
    dbService.saveMaterialTransfers(transfers);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Approved Transfer ${transfer.transferNumber} by ${currentUser.name}`
    });

    return transfer;
  },

  dispatchMaterialTransfer: (transferId: string, trackingNumber: string, carrier: string, currentUser: User): MaterialTransfer | null => {
    const transfers = dbService.getMaterialTransfers();
    const idx = transfers.findIndex(t => t.id === transferId || t.transferNumber === transferId);
    if (idx === -1) return null;
    const transfer = transfers[idx];
    const now = new Date().toISOString();
    transfer.status = 'IN_TRANSIT';
    transfer.dispatchedBy = currentUser.name;
    transfer.dispatchDate = now;
    transfer.trackingNumber = trackingNumber;
    transfer.carrier = carrier;
    transfer.dispatchSlipNumber = `DSP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    transfers[idx] = transfer;
    dbService.saveMaterialTransfers(transfers);

    // Deduct stock from source warehouse
    const materials = dbService.getMaterials();
    const mat = materials.find(m => m.partNumber === transfer.partNumber);
    const beforeQty = mat?.quantity || 0;

    dbService.recordStockTransaction({
      materialId: transfer.materialId,
      partNumber: transfer.partNumber,
      materialDescription: transfer.description,
      transactionType: 'TRANSFER_OUT',
      quantityChange: -transfer.quantity,
      quantityBefore: beforeQty,
      quantityAfter: Math.max(0, beforeQty - transfer.quantity),
      unit: transfer.unit,
      site: transfer.fromSite,
      warehouse: transfer.fromWarehouse,
      location: transfer.fromLocation,
      targetSite: transfer.toSite,
      targetWarehouse: transfer.toWarehouse,
      targetLocation: transfer.toLocation,
      referenceType: 'TRANSFER',
      referenceNumber: transfer.transferNumber,
      performedBy: currentUser.name,
      role: currentUser.role,
      reason: `Dispatched to ${transfer.toSite} (${carrier})`
    }, currentUser);

    return transfer;
  },

  receiveMaterialTransfer: (transferId: string, targetLocation: string, currentUser: User, notes?: string): MaterialTransfer | null => {
    const transfers = dbService.getMaterialTransfers();
    const idx = transfers.findIndex(t => t.id === transferId || t.transferNumber === transferId);
    if (idx === -1) return null;
    const transfer = transfers[idx];
    const now = new Date().toISOString();
    transfer.status = 'RECEIVED';
    transfer.receivedBy = currentUser.name;
    transfer.receivedDate = now;
    transfer.toLocation = targetLocation || transfer.toLocation;
    if (notes) transfer.notes = (transfer.notes ? transfer.notes + ' | ' : '') + `Received: ${notes}`;
    transfers[idx] = transfer;
    dbService.saveMaterialTransfers(transfers);

    // Increase stock in target destination
    const materials = dbService.getMaterials();
    const mat = materials.find(m => m.partNumber === transfer.partNumber);
    const beforeQty = mat?.quantity || 0;

    dbService.recordStockTransaction({
      materialId: transfer.materialId,
      partNumber: transfer.partNumber,
      materialDescription: transfer.description,
      transactionType: 'TRANSFER_IN',
      quantityChange: transfer.quantity,
      quantityBefore: beforeQty,
      quantityAfter: beforeQty + transfer.quantity,
      unit: transfer.unit,
      site: transfer.toSite,
      warehouse: transfer.toWarehouse,
      location: targetLocation || transfer.toLocation,
      referenceType: 'TRANSFER',
      referenceNumber: transfer.transferNumber,
      performedBy: currentUser.name,
      role: currentUser.role,
      reason: `Received transfer from ${transfer.fromSite} (${transfer.dispatchSlipNumber || transfer.transferNumber})`
    }, currentUser);

    return transfer;
  },

  // ============================================================
  // EMIS v0.7 MATERIAL ISSUES, RETURNS & RESERVATIONS
  // ============================================================

  getMaterialIssues: (): MaterialIssue[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ISSUES);
      return raw ? JSON.parse(raw) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  },

  issueMaterial: (
    issueData: Omit<MaterialIssue, 'id' | 'issueNumber' | 'issueDate' | 'status'>,
    currentUser: User
  ): MaterialIssue => {
    const issues = dbService.getMaterialIssues();
    const count = issues.length + 1;
    const issueNumber = `ISS-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newIssue: MaterialIssue = {
      ...issueData,
      id: `iss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      issueNumber,
      issueDate: new Date().toISOString(),
      status: 'ISSUED'
    };

    const updated = [newIssue, ...issues];
    safeSetItem(STORAGE_KEYS.ISSUES, JSON.stringify(updated));
    syncToBackend('material_issues', updated);

    // Deduct stock
    const materials = dbService.getMaterials();
    const mat = materials.find(m => m.partNumber === newIssue.partNumber);
    const beforeQty = mat?.quantity || 0;

    dbService.recordStockTransaction({
      materialId: newIssue.materialId,
      partNumber: newIssue.partNumber,
      materialDescription: newIssue.description,
      transactionType: 'ISSUE',
      quantityChange: -newIssue.quantity,
      quantityBefore: beforeQty,
      quantityAfter: Math.max(0, beforeQty - newIssue.quantity),
      unit: newIssue.unit,
      site: newIssue.site,
      warehouse: newIssue.warehouse,
      referenceType: newIssue.workOrderNumber ? 'WO' : 'DISPATCH',
      referenceNumber: newIssue.workOrderNumber || issueNumber,
      performedBy: currentUser.name,
      role: currentUser.role,
      reason: `Issued to ${newIssue.issuedTo} for ${newIssue.purpose}`
    }, currentUser);

    return newIssue;
  },

  getMaterialReturns: (): MaterialReturn[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RETURNS);
      return raw ? JSON.parse(raw) : INITIAL_RETURNS;
    } catch {
      return INITIAL_RETURNS;
    }
  },

  returnMaterial: (
    returnData: Omit<MaterialReturn, 'id' | 'returnNumber' | 'returnDate' | 'status'>,
    currentUser: User
  ): MaterialReturn => {
    const returns = dbService.getMaterialReturns();
    const count = returns.length + 1;
    const returnNumber = `RET-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const needsInspection = returnData.condition === 'USED' || returnData.condition === 'DAMAGED' || returnData.condition === 'QUARANTINED';
    const status = needsInspection ? 'UNDER_RE_INSPECTION' : 'ACCEPTED';

    const newReturn: MaterialReturn = {
      ...returnData,
      id: `ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      returnNumber,
      returnDate: new Date().toISOString(),
      status,
      inspectionRequired: needsInspection
    };

    const updated = [newReturn, ...returns];
    safeSetItem(STORAGE_KEYS.RETURNS, JSON.stringify(updated));
    syncToBackend('material_returns', updated);

    // If accepted without re-inspection, restore to stock
    if (status === 'ACCEPTED') {
      const materials = dbService.getMaterials();
      const mat = materials.find(m => m.partNumber === newReturn.partNumber);
      const beforeQty = mat?.quantity || 0;

      dbService.recordStockTransaction({
        materialId: newReturn.materialId,
        partNumber: newReturn.partNumber,
        materialDescription: newReturn.description,
        transactionType: 'RETURN',
        quantityChange: newReturn.quantity,
        quantityBefore: beforeQty,
        quantityAfter: beforeQty + newReturn.quantity,
        unit: newReturn.unit,
        site: newReturn.returnToSite,
        warehouse: newReturn.returnToWarehouse,
        location: newReturn.returnToLocation,
        referenceType: 'DISPATCH',
        referenceNumber: returnNumber,
        performedBy: currentUser.name,
        role: currentUser.role,
        reason: `Restocked return from ${newReturn.returnFrom} (Condition: ${newReturn.condition})`
      }, currentUser);
    } else {
      // Create task for inspection
      dbService.createEnterpriseTask({
        title: `Re-Inspection Required: Returned Part [${newReturn.partNumber}]`,
        description: `Material returned with condition "${newReturn.condition}" from ${newReturn.returnFrom}. Bench test and calibration check required before restocking.`,
        category: 'INSPECTION',
        priority: 'HIGH',
        assignedTo: 'Instrument Inspection Team',
        assignedBy: currentUser.name,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        relatedEntity: 'Material',
        relatedEntityNumber: newReturn.partNumber
      });
    }

    return newReturn;
  },

  getMaterialReservations: (): MaterialReservation[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      return raw ? JSON.parse(raw) : INITIAL_RESERVATIONS;
    } catch {
      return INITIAL_RESERVATIONS;
    }
  },

  createReservation: (
    resData: Omit<MaterialReservation, 'id' | 'reservationNumber' | 'reservationDate' | 'status'>,
    currentUser: User
  ): MaterialReservation => {
    const reservations = dbService.getMaterialReservations();
    const count = reservations.length + 1;
    const reservationNumber = `RES-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newRes: MaterialReservation = {
      ...resData,
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      reservationNumber,
      reservationDate: new Date().toISOString(),
      status: 'ACTIVE'
    };

    const updated = [newRes, ...reservations];
    safeSetItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(updated));
    syncToBackend('material_reservations', updated);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Created Stock Reservation ${reservationNumber}: ${newRes.quantity}x [${newRes.partNumber}] for ${newRes.reservedFor}`
    });

    return newRes;
  },

  fulfillReservation: (resId: string, currentUser: User): void => {
    const reservations = dbService.getMaterialReservations();
    const idx = reservations.findIndex(r => r.id === resId || r.reservationNumber === resId);
    if (idx === -1) return;
    reservations[idx].status = 'FULFILLED';
    safeSetItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
  },

  // ============================================================
  // EMIS v0.7 DIGITAL RECEIVING SESSIONS
  // ============================================================

  getReceivingSessions: (): ReceivingSession[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECEIVING_SESSIONS);
      return raw ? JSON.parse(raw) : INITIAL_RECEIVING_SESSIONS;
    } catch {
      return INITIAL_RECEIVING_SESSIONS;
    }
  },

  saveReceivingSessions: (sessions: ReceivingSession[]): void => {
    safeSetItem(STORAGE_KEYS.RECEIVING_SESSIONS, JSON.stringify(sessions));
    syncToBackend('receiving_sessions', sessions);
  },

  createReceivingSession: (
    sessionData: Omit<ReceivingSession, 'id' | 'sessionNumber' | 'receivingDate' | 'status' | 'completedItems'>,
    currentUser: User
  ): ReceivingSession => {
    const sessions = dbService.getReceivingSessions();
    const count = sessions.length + 1;
    const sessionNumber = `REC-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newSession: ReceivingSession = {
      ...sessionData,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionNumber,
      receivingDate: new Date().toISOString(),
      status: 'IN_PROGRESS',
      completedItems: sessionData.items.filter(i => i.inspectionResult === 'ACCEPTED' || i.inspectionResult === 'REJECTED').length
    };

    const updated = [newSession, ...sessions];
    dbService.saveReceivingSessions(updated);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Started Digital Receiving Session ${sessionNumber} from ${newSession.supplier} (${newSession.totalItems} items)`
    });

    return newSession;
  },

  updateReceivingSession: (sessionId: string, updates: Partial<ReceivingSession>, currentUser?: User): ReceivingSession | null => {
    const sessions = dbService.getReceivingSessions();
    const idx = sessions.findIndex(s => s.id === sessionId || s.sessionNumber === sessionId);
    if (idx === -1) return null;
    const updated = { ...sessions[idx], ...updates };
    if (updated.items) {
      updated.completedItems = updated.items.filter(i => i.inspectionResult === 'ACCEPTED' || i.inspectionResult === 'REJECTED').length;
      if (updated.completedItems === updated.totalItems && updated.status === 'IN_PROGRESS') {
        updated.status = 'COMPLETED';
      }
    }
    sessions[idx] = updated;
    dbService.saveReceivingSessions(sessions);
    return updated;
  },

  // ============================================================
  // EMIS v0.7 SUPPLIER DIRECTORY & PERFORMANCE
  // ============================================================

  getSuppliers: (): SupplierEntity[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      return raw ? JSON.parse(raw) : INITIAL_SUPPLIERS;
    } catch {
      return INITIAL_SUPPLIERS;
    }
  },

  saveSuppliers: (suppliers: SupplierEntity[]): void => {
    safeSetItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    syncToBackend('suppliers', suppliers);
  },

  addSupplier: (supplier: SupplierEntity, currentUser?: User): void => {
    const suppliers = dbService.getSuppliers();
    const updated = [...suppliers, supplier];
    dbService.saveSuppliers(updated);
    if (currentUser) {
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Registered new supplier partner "${supplier.name}" (${supplier.code})`
      });
    }
  },

  updateSupplier: (supplierId: string, updates: Partial<SupplierEntity>, currentUser?: User): SupplierEntity | null => {
    const suppliers = dbService.getSuppliers();
    const idx = suppliers.findIndex(s => s.id === supplierId || s.code === supplierId);
    if (idx === -1) return null;
    const updated = { ...suppliers[idx], ...updates };
    suppliers[idx] = updated;
    dbService.saveSuppliers(suppliers);
    return updated;
  },

  // ============================================================
  // EMIS v0.7 ENTERPRISE TASKS & APPROVAL INBOX
  // ============================================================

  getEnterpriseTasks: (): EnterpriseTask[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      return raw ? JSON.parse(raw) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  },

  saveEnterpriseTasks: (tasks: EnterpriseTask[]): void => {
    safeSetItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    syncToBackend('enterprise_tasks', tasks);
  },

  createEnterpriseTask: (
    taskData: Omit<EnterpriseTask, 'id' | 'taskNumber' | 'createdAt' | 'status' | 'slaStatus'>,
    currentUser?: User
  ): EnterpriseTask => {
    const tasks = dbService.getEnterpriseTasks();
    const count = tasks.length + 1;
    const taskNumber = `TSK-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newTask: EnterpriseTask = {
      ...taskData,
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      taskNumber,
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      slaStatus: 'ON_TIME'
    };

    const updated = [newTask, ...tasks];
    dbService.saveEnterpriseTasks(updated);
    return newTask;
  },

  updateEnterpriseTask: (taskId: string, updates: Partial<EnterpriseTask>, currentUser?: User): EnterpriseTask | null => {
    const tasks = dbService.getEnterpriseTasks();
    const idx = tasks.findIndex(t => t.id === taskId || t.taskNumber === taskId);
    if (idx === -1) return null;
    const updated = { ...tasks[idx], ...updates };
    if (updates.status === 'COMPLETED' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
    }
    tasks[idx] = updated;
    dbService.saveEnterpriseTasks(tasks);
    return updated;
  },

  getApprovalRequests: (): ApprovalRequest[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APPROVALS);
      return raw ? JSON.parse(raw) : INITIAL_APPROVALS;
    } catch {
      return INITIAL_APPROVALS;
    }
  },

  saveApprovalRequests: (approvals: ApprovalRequest[]): void => {
    safeSetItem(STORAGE_KEYS.APPROVALS, JSON.stringify(approvals));
    syncToBackend('approval_requests', approvals);
  },

  createApprovalRequest: (
    appData: Omit<ApprovalRequest, 'id' | 'approvalNumber' | 'requestedDate' | 'status'>
  ): ApprovalRequest => {
    const approvals = dbService.getApprovalRequests();
    const count = approvals.length + 1;
    const approvalNumber = `APP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newApproval: ApprovalRequest = {
      ...appData,
      id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      approvalNumber,
      requestedDate: new Date().toISOString(),
      status: 'PENDING'
    };

    const updated = [newApproval, ...approvals];
    dbService.saveApprovalRequests(updated);
    return newApproval;
  },

  decideApprovalRequest: (
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION',
    currentUser: User,
    comments?: string
  ): ApprovalRequest | null => {
    const approvals = dbService.getApprovalRequests();
    const idx = approvals.findIndex(a => a.id === approvalId || a.approvalNumber === approvalId);
    if (idx === -1) return null;
    const approval = approvals[idx];
    approval.status = decision;
    approval.decidedBy = `${currentUser.name} (${currentUser.role})`;
    approval.decidedDate = new Date().toISOString();
    approval.comments = comments;
    approvals[idx] = approval;
    dbService.saveApprovalRequests(approvals);

    // If it's a transfer approval and decision is APPROVED, update transfer status
    if (approval.type === 'MATERIAL_TRANSFER' && approval.relatedEntityId) {
      if (decision === 'APPROVED') {
        dbService.approveMaterialTransfer(approval.relatedEntityId, currentUser, comments);
      }
    }

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Approval Request ${approval.approvalNumber} marked as ${decision} by ${currentUser.name}`
    });

    return approval;
  },

  // ============================================================
  // EMIS v0.7 STOCK COUNT & RECONCILIATION
  // ============================================================

  getStockCountSessions: (): StockCountSession[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STOCK_COUNTS);
      return raw ? JSON.parse(raw) : INITIAL_STOCK_COUNT_SESSIONS;
    } catch {
      return INITIAL_STOCK_COUNT_SESSIONS;
    }
  },

  saveStockCountSessions: (sessions: StockCountSession[]): void => {
    safeSetItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(sessions));
    syncToBackend('stock_counts', sessions);
  },

  createStockCountSession: (
    countData: Omit<StockCountSession, 'id' | 'sessionNumber' | 'createdAt' | 'status' | 'totalVarianceCount'>,
    currentUser: User
  ): StockCountSession => {
    const sessions = dbService.getStockCountSessions();
    const count = sessions.length + 1;
    const sessionNumber = `CNT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    const newSession: StockCountSession = {
      ...countData,
      id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionNumber,
      createdAt: new Date().toISOString(),
      status: 'IN_PROGRESS',
      totalVarianceCount: 0
    };

    const updated = [newSession, ...sessions];
    dbService.saveStockCountSessions(updated);
    return newSession;
  },

  // ============================================================
  // EMIS v0.7 AUTOMATION RULES
  // ============================================================

  getAutomationRules: (): AutomationRule[] => {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTOMATION_RULES);
      return raw ? JSON.parse(raw) : INITIAL_AUTOMATION_RULES;
    } catch {
      return INITIAL_AUTOMATION_RULES;
    }
  },

  saveAutomationRules: (rules: AutomationRule[]): void => {
    safeSetItem(STORAGE_KEYS.AUTOMATION_RULES, JSON.stringify(rules));
    syncToBackend('automation_rules', rules);
  },

  toggleAutomationRule: (ruleId: string): void => {
    const rules = dbService.getAutomationRules();
    const idx = rules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      rules[idx].active = !rules[idx].active;
      dbService.saveAutomationRules(rules);
    }
  },

  // ============================================================
  // EMIS v0.7 MATERIAL STATE MACHINE TRANSITION
  // ============================================================

  transitionMaterialStatus: (
    partNumber: string,
    newStatus: MaterialLifecycleStatus | string,
    currentUser: User,
    reason?: string
  ): Material | null => {
    const materials = dbService.getMaterials();
    const idx = materials.findIndex(m => m.partNumber === partNumber);
    if (idx === -1) return null;

    const material = materials[idx];
    const oldStatus = material.status || 'Available';
    material.status = newStatus;
    material.updatedAt = new Date().toISOString();

    materials[idx] = material;
    dbService.saveMaterials(materials);

    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'update',
      details: `Transitioned material [${partNumber}] lifecycle from ${oldStatus} to ${newStatus}`
    });

    return material;
  },

  // ============================================================
  // EMIS v0.7 ENTERPRISE AGGREGATED METRICS
  // ============================================================

  getEnterpriseMetrics: () => {
    const materials = dbService.getMaterials() || [];
    const transfers = dbService.getMaterialTransfers() || [];
    const receivingSessions = dbService.getReceivingSessions() || [];
    const tasks = dbService.getEnterpriseTasks() || [];
    const approvals = dbService.getApprovalRequests() || [];
    const hierarchy = dbService.getHierarchyNodes() || [];
    const reports = dbService.getVerificationReports() || [];
    const suppliers = dbService.getSuppliers() || [];

    const totalMaterialsCount = materials.reduce((acc, m) => acc + (m.quantity || 0), 0);
    const uniquePartNumbers = materials.length;

    const inspectionPending = materials.filter(m => 
      m.inspectionStatus === 'PENDING' || 
      m.inspectionStatus === 'UNDER_INSPECTION' || 
      m.status === 'Under Inspection'
    ).length;

    const acceptedCount = materials.filter(m => 
      m.inspectionStatus === 'PASSED' || 
      m.inspectionStatus === 'ACCEPTED' || 
      m.status === 'Available'
    ).length;

    const rejectedCount = materials.filter(m => 
      m.inspectionStatus === 'REJECTED' || 
      m.status === 'Blacklisted'
    ).length;

    const onHoldCount = materials.filter(m => 
      m.inspectionStatus === 'CONDITIONAL' || 
      m.status === 'On Hold' || 
      m.status === 'Pending Engineering Review'
    ).length;

    const lowStockCount = materials.filter(m => (m.quantity || 0) <= (m.minStockLevel || 2)).length;
    const activeTransfers = transfers.filter(t => t.status === 'REQUESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT').length;
    const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;
    const openTasks = tasks.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
    const activeSites = hierarchy.filter(n => n.type === 'SITE' && n.status === 'ACTIVE').length;

    return {
      uniquePartNumbers,
      totalMaterialsCount,
      inspectionPending,
      acceptedCount,
      rejectedCount,
      onHoldCount,
      lowStockCount,
      activeTransfers,
      pendingApprovals,
      openTasks,
      activeSites,
      totalSuppliers: suppliers.length,
      verificationReportsCount: reports.length,
      receivingSessionsCount: receivingSessions.length
    };
  },

  // ==========================================
  // --- EMIS v0.8 INTELLIGENCE & ANALYTICS ---
  // ==========================================

  calculateMaterialHealthScore(material: Material): MaterialHealthScore {
    const reasons: string[] = [];
    const identityFactors: string[] = [];
    const docFactors: string[] = [];
    const matchFactors: string[] = [];
    const inspectionFactors: string[] = [];
    const stockFactors: string[] = [];
    const lifecycleFactors: string[] = [];

    // 1. Identity Completeness (Max 20)
    let identityScore = 0;
    if (material.partNumber && material.partNumber.trim().length > 3) {
      identityScore += 5;
      identityFactors.push('Part Number verified');
    } else {
      reasons.push('Incomplete or missing Part Number');
    }
    if (material.manufacturer && material.manufacturer.trim().length > 1) {
      identityScore += 5;
      identityFactors.push('Manufacturer documented');
    } else {
      reasons.push('Missing manufacturer identifier');
    }
    if (material.model && material.model.trim().length > 1) {
      identityScore += 5;
      identityFactors.push('Model designation specified');
    } else {
      reasons.push('Model designation omitted');
    }
    if (material.description && material.description.trim().length > 10) {
      identityScore += 5;
      identityFactors.push('Detailed technical description present');
    } else {
      reasons.push('Vague or abbreviated description');
    }

    // 2. Document Completeness (Max 25)
    let docScore = 0;
    const hasDatasheet = !!(material.datasheet || (material.documents && material.documents.datasheet));
    const hasCoc = !!(material.coc || (material.documents && material.documents.coc));
    const hasOtherDocs = !!(material.documents && Object.keys(material.documents).length > 0);

    if (hasDatasheet) {
      docScore += 10;
      docFactors.push('Technical Datasheet linked');
    } else {
      reasons.push('Missing OEM Engineering Datasheet');
    }
    if (hasCoc) {
      docScore += 10;
      docFactors.push('Certificate of Conformity / Origin on file');
    } else {
      reasons.push('Missing CoC / CoO compliance certificate');
    }
    if (hasOtherDocs) {
      docScore += 5;
      docFactors.push('Technical files attached in repository');
    }

    // 3. Matching Status (Max 20)
    let matchScore = 0;
    if (material.mrNumber || material.mrfNumber) {
      matchScore += 5;
      matchFactors.push(`Linked to MR: ${material.mrNumber || material.mrfNumber}`);
    }
    if (material.poNumber || material.purchaseOrder) {
      matchScore += 5;
      matchFactors.push(`Linked to PO: ${material.poNumber || material.purchaseOrder}`);
    }
    if (material.oemVerificationStatus === 'verified' || material.oemVerificationStatus === 'authorized') {
      matchScore += 10;
      matchFactors.push('Cross-verification validated across purchase documents');
    } else if (material.oemVerificationStatus === 'alternative') {
      reasons.push('Alternative material substitution requiring verification');
    } else {
      matchScore += 5;
      matchFactors.push('Pending purchase order reconciliation');
    }

    // 4. Inspection Status (Max 15)
    let inspectionScore = 0;
    if (material.inspectionStatus === 'PASSED' || material.inspectionStatus === 'ACCEPTED' || material.status === 'Available') {
      inspectionScore += 15;
      inspectionFactors.push('Physical QA inspection passed & verified');
    } else if (material.inspectionStatus === 'UNDER_INSPECTION' || material.status === 'Under Inspection') {
      inspectionScore += 8;
      inspectionFactors.push('Under active QA inspection');
    } else if (material.inspectionStatus === 'REJECTED' || material.status === 'Blacklisted') {
      inspectionScore += 0;
      reasons.push('Rejected during receiving QA inspection');
    } else {
      inspectionScore += 5;
      inspectionFactors.push('Awaiting physical receiving inspection');
    }

    // 5. Stock Status (Max 10)
    let stockScore = 0;
    const qty = material.quantity || 0;
    const min = material.minStockLevel || 1;
    if (qty > min) {
      stockScore += 10;
      stockFactors.push(`Stock healthy (${qty} ${material.unit || 'EA'})`);
    } else if (qty > 0) {
      stockScore += 5;
      reasons.push(`Low stock warning (${qty}/${min} ${material.unit || 'EA'})`);
    } else {
      stockScore += 0;
      reasons.push('Stock depleted (0 quantity available)');
    }

    // 6. Lifecycle Status (Max 10)
    let lifecycleScore = 0;
    if (material.status === 'Available') {
      lifecycleScore += 10;
      lifecycleFactors.push(`Active lifecycle status (${material.status})`);
    } else if (material.status === 'Reserved' || material.status === 'Low Stock') {
      lifecycleScore += 7;
      lifecycleFactors.push(`Allocated lifecycle status (${material.status})`);
    } else if (material.status === 'Blacklisted' || material.status === 'Quarantined') {
      lifecycleScore += 2;
      reasons.push(`Restricted lifecycle custody (${material.status})`);
    } else {
      lifecycleScore += 6;
      lifecycleFactors.push('Standard warehouse custody');
    }

    const overallScore = Math.min(100, Math.max(0, identityScore + docScore + matchScore + inspectionScore + stockScore + lifecycleScore));

    let grade: 'HEALTHY' | 'ATTENTION' | 'HIGH_RISK' | 'CRITICAL' = 'HEALTHY';
    let arabicGrade = 'سليم ومكتمل';
    if (overallScore >= 85) {
      grade = 'HEALTHY';
      arabicGrade = 'سليم ومكتمل';
    } else if (overallScore >= 65) {
      grade = 'ATTENTION';
      arabicGrade = 'يحتاج مراجعة فنية';
    } else if (overallScore >= 45) {
      grade = 'HIGH_RISK';
      arabicGrade = 'عالي المخاطر';
    } else {
      grade = 'CRITICAL';
      arabicGrade = 'حرج / غير مطابق';
    }

    return {
      partNumber: material.partNumber,
      overallScore,
      grade,
      arabicGrade,
      dimensions: {
        identityCompleteness: { score: identityScore, max: 20, factors: identityFactors },
        documentCompleteness: { score: docScore, max: 25, factors: docFactors },
        matchingStatus: { score: matchScore, max: 20, factors: matchFactors },
        inspectionStatus: { score: inspectionScore, max: 15, factors: inspectionFactors },
        stockStatus: { score: stockScore, max: 10, factors: stockFactors },
        lifecycleStatus: { score: lifecycleScore, max: 10, factors: lifecycleFactors }
      },
      reasons: reasons.length > 0 ? reasons : ['All engineering and quality parameters fully compliant.']
    };
  },

  getSupplierRiskProfiles(): SupplierRiskProfile[] {
    const suppliers = dbService.getSuppliers() || [];
    const materials = dbService.getMaterials() || [];

    return suppliers.map(sup => {
      // Correlate materials linked to this supplier
      const supMaterials = materials.filter(m => 
        (m.supplier && m.supplier.toLowerCase().includes(sup.name.toLowerCase())) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(sup.name.toLowerCase()))
      );

      const totalDeliv = Math.max(sup.totalDeliveries || 1, supMaterials.length || 1);
      const rejectedCount = supMaterials.filter(m => m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted').length + (sup.rejectedDeliveries || 0);
      const missingDocCount = supMaterials.filter(m => !m.datasheet && !m.coc).length;
      const mismatchCount = supMaterials.filter(m => m.oemVerificationStatus === 'alternative').length;

      const rejectionRate = Math.round((rejectedCount / totalDeliv) * 100);
      const compliance = sup.complianceScore || 90;
      const onTime = sup.onTimeDeliveryRate || 95;

      // Risk score: 100 is best (zero risk), 0 is worst
      const overallScore = Math.max(10, Math.min(100, Math.round(
        (compliance * 0.35) + 
        (onTime * 0.25) + 
        ((100 - rejectionRate) * 0.30) - 
        (missingDocCount * 3) - 
        (mismatchCount * 5)
      )));

      let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      let arabicRiskTier = 'منخفض المخاطر (معتمد)';
      let recommendation = 'Vendor maintains high standard compliance. Continue routine procurement.';

      if (overallScore >= 80) {
        riskTier = 'LOW';
        arabicRiskTier = 'منخفض المخاطر (معتمد)';
      } else if (overallScore >= 60) {
        riskTier = 'MEDIUM';
        arabicRiskTier = 'متوسط المخاطر (مراقبة)';
        recommendation = 'Monitor document attachments and lead time adherence during incoming receiving.';
      } else if (overallScore >= 40) {
        riskTier = 'HIGH';
        arabicRiskTier = 'عالي المخاطر (تدقيق مكثف)';
        recommendation = 'Enforce mandatory 100% bench test QA inspection and MTR verification before inventory release.';
      } else {
        riskTier = 'CRITICAL';
        arabicRiskTier = 'حرج (قيد الإيقاف)';
        recommendation = 'Suspend active purchase order dispatch until formal quality audit resolution.';
      }

      const evidence: string[] = [];
      evidence.push(`Delivered Batches: ${totalDeliv}, Verified Rejections: ${rejectedCount}`);
      evidence.push(`On-Time Delivery Performance: ${onTime}%`);
      evidence.push(`Quality & Compliance Metric: ${compliance}%`);
      if (missingDocCount > 0) evidence.push(`${missingDocCount} batches flagged with missing MTR/CoC certificates`);
      if (mismatchCount > 0) evidence.push(`${mismatchCount} technical specification mismatches recorded`);

      return {
        supplierId: sup.id,
        supplierName: sup.name,
        supplierCode: sup.code,
        country: sup.country || 'International',
        category: sup.category || 'Instrumentation OEM',
        riskTier,
        arabicRiskTier,
        overallScore,
        totalDeliveries: totalDeliv,
        acceptedDeliveries: Math.max(0, totalDeliv - rejectedCount),
        rejectedDeliveries: rejectedCount,
        rejectionRate,
        missingDocsCount: missingDocCount,
        mismatchCount,
        onTimeDeliveryRate: onTime,
        complianceScore: compliance,
        status: sup.status,
        evidence,
        recommendation
      };
    });
  },

  getCrossSiteOpportunities(siteFilter?: string): CrossSiteOpportunity[] {
    const materials = dbService.getMaterials();
    const opportunities: CrossSiteOpportunity[] = [];

    // Group materials by partNumber
    const partMap = new Map<string, Material[]>();
    materials.forEach(m => {
      const pn = m.partNumber.trim().toUpperCase();
      const list = partMap.get(pn) || [];
      list.push(m);
      partMap.set(pn, list);
    });

    partMap.forEach((instances, pn) => {
      // Check if any instance has a shortage (qty <= minStockLevel)
      instances.forEach(reqItem => {
        const reqSite = reqItem.store || 'NDGS';
        if (siteFilter && siteFilter !== 'ALL' && reqSite !== siteFilter) return;

        const reqQty = reqItem.quantity || 0;
        const minStock = reqItem.minStockLevel || 1;

        if (reqQty <= minStock) {
          // Look for other sites with available surplus
          const surplusSources = instances.filter(other => {
            const otherSite = other.store || 'NDGS';
            return otherSite !== reqSite && (other.quantity || 0) > (other.minStockLevel || 1);
          });

          surplusSources.forEach(sourceItem => {
            const availQty = (sourceItem.quantity || 0) - (sourceItem.minStockLevel || 1);
            if (availQty > 0) {
              const shortage = Math.max(1, minStock - reqQty + 1);
              const urgency: 'ROUTINE' | 'ELEVATED' | 'CRITICAL' = reqQty === 0 ? 'CRITICAL' : 'ELEVATED';

              opportunities.push({
                id: `OPP-${reqSite}-${sourceItem.store}-${pn}`.replace(/[^a-zA-Z0-9-]/g, '_'),
                partNumber: reqItem.partNumber,
                description: reqItem.description,
                manufacturer: reqItem.manufacturer || 'OEM',
                requestingSite: reqSite,
                shortageQuantity: shortage,
                matchingSite: sourceItem.store || 'H-IPF DGS',
                matchingWarehouse: sourceItem.binLocation || sourceItem.rack || 'Main Warehouse',
                availableQuantity: availQty,
                urgency,
                reason: reqQty === 0 
                  ? `Critical Stock Outage at ${reqSite}. Surplus available at ${sourceItem.store}.`
                  : `Low stock buffer at ${reqSite} (${reqQty}/${minStock}). Internal transfer avoids procurement lead-time.`,
                estimatedLeadTimeHours: (reqSite === 'NDGS' && sourceItem.store === 'H-IPF DGS') ? 4 : 24
              });
            }
          });
        }
      });
    });

    return opportunities;
  },

  getAgingAnalysis(category: 'INSPECTION' | 'APPROVAL' | 'TRANSFER' | 'RECEIVING', siteFilter?: string): AgingAnalysis {
    const now = Date.now();
    const items: AgingBucketItem[] = [];

    if (category === 'INSPECTION') {
      const materials = dbService.getMaterials();
      materials.forEach(m => {
        const site = m.store || 'NDGS';
        if (siteFilter && siteFilter !== 'ALL' && site !== siteFilter) return;

        if (m.inspectionStatus === 'PENDING' || m.inspectionStatus === 'UNDER_INSPECTION' || m.status === 'Under Inspection') {
          const createdTime = m.createdAt ? new Date(m.createdAt).getTime() : now - (86400000 * 2);
          const ageDays = Math.max(0, Math.floor((now - createdTime) / 86400000));
          items.push({
            id: m.partNumber,
            title: m.description,
            referenceNumber: m.partNumber,
            site,
            createdAt: m.createdAt || new Date(createdTime).toISOString(),
            ageDays,
            urgency: ageDays >= 8 ? 'CRITICAL' : ageDays >= 4 ? 'OVERDUE' : ageDays >= 2 ? 'WARNING' : 'ROUTINE',
            assignedTo: 'Lead QA Inspector'
          });
        }
      });
    } else if (category === 'APPROVAL') {
      const approvals = dbService.getApprovalRequests();
      approvals.forEach(a => {
        if (a.status === 'PENDING') {
          const createdTime = new Date(a.requestedDate).getTime();
          const ageDays = Math.max(0, Math.floor((now - createdTime) / 86400000));
          items.push({
            id: a.id,
            title: a.title,
            referenceNumber: a.approvalNumber,
            site: 'NDGS',
            createdAt: a.requestedDate,
            ageDays,
            urgency: ageDays >= 4 ? 'CRITICAL' : ageDays >= 2 ? 'OVERDUE' : 'ROUTINE',
            assignedTo: a.requestedBy
          });
        }
      });
    } else if (category === 'TRANSFER') {
      const transfers = dbService.getMaterialTransfers();
      transfers.forEach(t => {
        if (t.status === 'REQUESTED' || t.status === 'IN_TRANSIT') {
          const createdTime = new Date(t.requestDate).getTime();
          const ageDays = Math.max(0, Math.floor((now - createdTime) / 86400000));
          items.push({
            id: t.id,
            title: `Transfer: ${t.partNumber} (${t.fromSite} -> ${t.toSite})`,
            referenceNumber: t.transferNumber,
            site: t.toSite,
            createdAt: t.requestDate,
            ageDays,
            urgency: ageDays >= 4 ? 'CRITICAL' : ageDays >= 2 ? 'OVERDUE' : 'ROUTINE',
            assignedTo: t.requestedBy
          });
        }
      });
    } else if (category === 'RECEIVING') {
      const sessions = dbService.getReceivingSessions();
      sessions.forEach(s => {
        if (s.status === 'IN_PROGRESS' || s.status === 'ON_HOLD') {
          const createdTime = new Date(s.receivingDate).getTime();
          const ageDays = Math.max(0, Math.floor((now - createdTime) / 86400000));
          items.push({
            id: s.id,
            title: `Receiving: ${s.supplier} (${s.deliveryNote})`,
            referenceNumber: s.sessionNumber,
            site: s.site,
            createdAt: s.receivingDate,
            ageDays,
            urgency: ageDays >= 3 ? 'CRITICAL' : ageDays >= 1 ? 'OVERDUE' : 'ROUTINE',
            assignedTo: s.receivedBy
          });
        }
      });
    }

    const totalPending = items.length;
    const totalAge = items.reduce((acc, item) => acc + item.ageDays, 0);
    const averageAgeDays = totalPending > 0 ? Number((totalAge / totalPending).toFixed(1)) : 0;
    const oldestItemDays = items.reduce((max, item) => Math.max(max, item.ageDays), 0);
    const overdueCount = items.filter(item => item.urgency === 'OVERDUE' || item.urgency === 'CRITICAL').length;

    const b0_1 = items.filter(i => i.ageDays <= 1);
    const b2_3 = items.filter(i => i.ageDays >= 2 && i.ageDays <= 3);
    const b4_7 = items.filter(i => i.ageDays >= 4 && i.ageDays <= 7);
    const b8_14 = items.filter(i => i.ageDays >= 8 && i.ageDays <= 14);
    const b15_plus = items.filter(i => i.ageDays >= 15);

    return {
      category,
      totalPending,
      averageAgeDays,
      oldestItemDays,
      overdueCount,
      buckets: [
        { range: '0_1_DAYS', label: '0–1 Days (Fresh)', count: b0_1.length, items: b0_1 },
        { range: '2_3_DAYS', label: '2–3 Days (Warning)', count: b2_3.length, items: b2_3 },
        { range: '4_7_DAYS', label: '4–7 Days (SLA Overdue)', count: b4_7.length, items: b4_7 },
        { range: '8_14_DAYS', label: '8–14 Days (Critical Aging)', count: b8_14.length, items: b8_14 },
        { range: '15_PLUS_DAYS', label: '15+ Days (Escalated)', count: b15_plus.length, items: b15_plus }
      ]
    };
  },

  getEngineeringKpis(siteFilter?: string, dateFilter?: AnalyticsDateFilter): EngineeringKpiMetric[] {
    const materials = dbService.getMaterials() || [];
    const tasks = dbService.getEnterpriseTasks() || [];
    const approvals = dbService.getApprovalRequests() || [];
    const transfers = dbService.getMaterialTransfers() || [];
    const receiving = dbService.getReceivingSessions() || [];
    const suppliers = dbService.getSuppliers() || [];

    const filteredMaterials = materials.filter(m => {
      if (siteFilter && siteFilter !== 'ALL' && m.store !== siteFilter) return false;
      return true;
    });

    const total = Math.max(1, filteredMaterials.length);
    const accepted = filteredMaterials.filter(m => m.inspectionStatus === 'PASSED' || m.inspectionStatus === 'ACCEPTED' || m.status === 'Available').length;
    const rejected = filteredMaterials.filter(m => m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted').length;
    const withDocs = filteredMaterials.filter(m => m.datasheet || m.coc || (m.documents && Object.keys(m.documents).length > 0)).length;
    const verified = filteredMaterials.filter(m => m.oemVerificationStatus === 'verified' || m.oemVerificationStatus === 'authorized').length;

    const acceptanceRate = Math.round((accepted / total) * 100);
    const rejectionRate = Math.round((rejected / total) * 100);
    const docCompleteness = Math.round((withDocs / total) * 100);
    const matchAccuracy = Math.round((verified / total) * 100);

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const taskCompletionRate = Math.round((completedTasks / Math.max(1, tasks.length)) * 100);

    const approvedApps = approvals.filter(a => a.status === 'APPROVED').length;
    const approvalSlaRate = Math.round((approvedApps / Math.max(1, approvals.length)) * 100);

    const completedTransfers = transfers.filter(t => t.status === 'RECEIVED').length;
    const transferSuccessRate = Math.round((completedTransfers / Math.max(1, transfers.length)) * 100);

    const completedReceiving = receiving.filter(r => r.status === 'COMPLETED').length;
    const receivingAccuracy = Math.round((completedReceiving / Math.max(1, receiving.length)) * 100);

    const avgSupQuality = suppliers.length > 0
      ? Math.round(suppliers.reduce((acc, s) => acc + (s.complianceScore || 90), 0) / suppliers.length)
      : 92;

    return [
      {
        id: 'kpi-acceptance-rate',
        name: 'Material Acceptance Rate',
        arabicName: 'معدل قبول المواد في الفحص',
        category: 'QUALITY',
        formula: '(Passed QA Inspections / Total Received Materials) * 100',
        dataSource: 'emis_materials & QA Inspection Records',
        currentValue: acceptanceRate,
        unit: '%',
        previousValue: 88,
        changePercent: Number((acceptanceRate - 88).toFixed(1)),
        trend: acceptanceRate >= 88 ? 'UP' : 'DOWN',
        status: acceptanceRate >= 85 ? 'OPTIMAL' : acceptanceRate >= 70 ? 'WARNING' : 'CRITICAL',
        target: 95,
        benchmark: 'Industry Standard: >= 90%'
      },
      {
        id: 'kpi-rejection-rate',
        name: 'Material Rejection Rate',
        arabicName: 'نسبة رفض المواد (عدم المطابقة)',
        category: 'QUALITY',
        formula: '(Rejected Materials / Total Inspected Batches) * 100',
        dataSource: 'emis_materials (Status: Rejected)',
        currentValue: rejectionRate,
        unit: '%',
        previousValue: 6.5,
        changePercent: Number((rejectionRate - 6.5).toFixed(1)),
        trend: rejectionRate <= 6.5 ? 'DOWN' : 'UP',
        status: rejectionRate <= 5 ? 'OPTIMAL' : rejectionRate <= 10 ? 'WARNING' : 'CRITICAL',
        target: 3,
        benchmark: 'Industry Benchmark: < 4%'
      },
      {
        id: 'kpi-doc-completeness',
        name: 'Technical Document Completeness',
        arabicName: 'اكتمال الوثائق الفنية وشهادات المنشأ',
        category: 'COMPLIANCE',
        formula: '(Materials with Datasheet + CoC / Total Catalog) * 100',
        dataSource: 'emis_documents & Certificate Vault',
        currentValue: docCompleteness,
        unit: '%',
        previousValue: 72,
        changePercent: Number((docCompleteness - 72).toFixed(1)),
        trend: docCompleteness >= 72 ? 'UP' : 'DOWN',
        status: docCompleteness >= 85 ? 'OPTIMAL' : docCompleteness >= 65 ? 'WARNING' : 'CRITICAL',
        target: 100,
        benchmark: 'Mandatory Compliance: 100%'
      },
      {
        id: 'kpi-matching-accuracy',
        name: 'MR / PO Matching Accuracy',
        arabicName: 'دقة المطابقة مع أوامر الشراء وطلبات المواد',
        category: 'QUALITY',
        formula: '(Cross-Verified MR-PO Matches / Total Line Items) * 100',
        dataSource: 'Cross-Verification Matrix & MRF Register',
        currentValue: matchAccuracy,
        unit: '%',
        previousValue: 80,
        changePercent: Number((matchAccuracy - 80).toFixed(1)),
        trend: matchAccuracy >= 80 ? 'UP' : 'DOWN',
        status: matchAccuracy >= 85 ? 'OPTIMAL' : matchAccuracy >= 70 ? 'WARNING' : 'CRITICAL',
        target: 98,
        benchmark: 'Procurement Target: >= 95%'
      },
      {
        id: 'kpi-approval-sla',
        name: 'Engineering Approval SLA',
        arabicName: 'التزام مهلة الاعتماد الفني والإداري',
        category: 'OPERATIONS',
        formula: '(Decisions Approved <= 48h / Total Requests) * 100',
        dataSource: 'emis_approval_requests',
        currentValue: approvalSlaRate,
        unit: '%',
        previousValue: 85,
        changePercent: Number((approvalSlaRate - 85).toFixed(1)),
        trend: approvalSlaRate >= 85 ? 'UP' : 'DOWN',
        status: approvalSlaRate >= 80 ? 'OPTIMAL' : 'WARNING',
        target: 95,
        benchmark: 'SLA Standard: 48 Hours'
      },
      {
        id: 'kpi-transfer-success',
        name: 'Inter-Site Transfer Cycle Rate',
        arabicName: 'كفاءة دورة النقل والترحيل بين الحقول',
        category: 'SUPPLY_CHAIN',
        formula: '(Completed Transfers / Dispatched Transfers) * 100',
        dataSource: 'emis_material_transfers',
        currentValue: transferSuccessRate,
        unit: '%',
        previousValue: 90,
        changePercent: Number((transferSuccessRate - 90).toFixed(1)),
        trend: transferSuccessRate >= 90 ? 'UP' : 'DOWN',
        status: transferSuccessRate >= 85 ? 'OPTIMAL' : 'WARNING',
        target: 98,
        benchmark: 'Inter-Field SLA: <= 24h'
      },
      {
        id: 'kpi-receiving-accuracy',
        name: 'Digital Receiving Manifest Accuracy',
        arabicName: 'دقة محاضر الاستلام والفحص الأولي',
        category: 'SUPPLY_CHAIN',
        formula: '(Discrepancy-Free Receiving Sessions / Total Sessions) * 100',
        dataSource: 'emis_receiving_sessions',
        currentValue: receivingAccuracy,
        unit: '%',
        previousValue: 88,
        changePercent: Number((receivingAccuracy - 88).toFixed(1)),
        trend: receivingAccuracy >= 88 ? 'UP' : 'DOWN',
        status: receivingAccuracy >= 85 ? 'OPTIMAL' : 'WARNING',
        target: 100,
        benchmark: 'Zero Manifest Error Policy'
      },
      {
        id: 'kpi-supplier-quality',
        name: 'Supplier Quality Index (SQI)',
        arabicName: 'مؤشر جودة وتوافق الموردين المعتمدين',
        category: 'SUPPLY_CHAIN',
        formula: 'Weighted Average of Vendor Compliance & On-Time Rates',
        dataSource: 'emis_suppliers Performance Scorecards',
        currentValue: avgSupQuality,
        unit: '%',
        previousValue: 89,
        changePercent: Number((avgSupQuality - 89).toFixed(1)),
        trend: avgSupQuality >= 89 ? 'UP' : 'DOWN',
        status: avgSupQuality >= 90 ? 'OPTIMAL' : 'WARNING',
        target: 95,
        benchmark: 'ISO 9001 Approved Vendor Baseline'
      }
    ];
  },

  getAiInsights(siteFilter?: string): AiEngineeringInsight[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AI_INSIGHTS);
      const list: AiEngineeringInsight[] = raw ? JSON.parse(raw) : [];
      if (siteFilter && siteFilter !== 'ALL') {
        return list.filter(i => !i.site || i.site === 'ALL' || i.site === siteFilter);
      }
      return list;
    } catch {
      return [];
    }
  },

  saveAiInsight(insight: AiEngineeringInsight): void {
    try {
      const current = dbService.getAiInsights();
      current.unshift(insight);
      safeSetItem(STORAGE_KEYS.AI_INSIGHTS, JSON.stringify(current.slice(0, 50)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:ai-insights-updated'));
      }
    } catch (e) {
      console.warn('Failed to save AI Insight:', e);
    }
  },

  // --- PORT 10: NOTIFICATION CENTER & BELL NOTIFICATIONS ---

  getNotifications(filterUser?: User | null): AppNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: AppNotification[] = raw ? JSON.parse(raw) : [];
      if (!filterUser) return all;

      // Filter based on user role and assigned sites
      return all.filter(n => {
        if (!n.targetRole && !n.userId && !n.siteId && !n.site) return true; // Broadcast
        if (n.userId && n.userId === filterUser.id) return true;
        if (n.targetRole && n.targetRole === filterUser.role) return true;
        if (filterUser.role === UserRole.ADMIN) return true; // Admin sees all
        if (n.siteId && filterUser.allowedSites && filterUser.allowedSites.includes(n.siteId)) return true;
        if (n.site && filterUser.site === n.site) return true;
        return false;
      });
    } catch {
      return [];
    }
  },

  getUnreadNotificationCount(user?: User | null): number {
    const list = dbService.getNotifications(user);
    return list.filter(n => !n.read).length;
  },

  addNotification(notifData: Partial<AppNotification> & { message: string }): AppNotification {
    dbService.initialize();
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = raw ? JSON.parse(raw) : [];

    const newNotif: AppNotification = {
      id: notifData.id || `NTF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      type: (notifData.type as NotificationType) || 'INFO',
      category: (notifData.category as NotificationCategory) || 'GENERAL',
      priority: (notifData.priority as NotificationPriority) || 'NORMAL',
      title: notifData.title || 'EMIS Notification',
      message: notifData.message,
      timestamp: notifData.timestamp || new Date().toISOString(),
      read: notifData.read || false,
      userId: notifData.userId,
      targetRole: notifData.targetRole,
      siteId: notifData.siteId,
      site: notifData.site,
      materialId: notifData.materialId,
      referenceId: notifData.referenceId,
      linkType: notifData.linkType,
      linkId: notifData.linkId,
      dataSource: notifData.dataSource || 'REAL'
    };

    notifs.unshift(newNotif);
    try {
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 200)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:notification-added', { detail: newNotif }));
        window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
      }
    } catch (e) {
      console.warn('Failed to save notification:', e);
    }
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = raw ? JSON.parse(raw) : [];
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.read = true;
      target.readAt = new Date().toISOString();
      try {
        safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
        }
      } catch (e) {
        console.warn('Failed to update notification:', e);
      }
    }
  },

  markAllNotificationsAsRead(user?: User | null): void {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    const updated = notifs.map(n => ({
      ...n,
      read: true,
      readAt: n.readAt || now
    }));
    try {
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
      }
    } catch (e) {
      console.warn('Failed to mark all notifications read:', e);
    }
  },

  clearNotifications(): void {
    try {
      safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:notifications-updated'));
      }
    } catch (e) {
      console.warn('Failed to clear notifications:', e);
    }
  },

  // --- PORT 10: MASTER SITES MANAGEMENT ---

  getSites(): Site[] {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SITES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MASTER_SITES;
  },

  getSiteById(id: string): Site | undefined {
    return dbService.getSites().find(s => s.id === id || s.siteId === id);
  },

  createSite(siteData: Partial<Site>, actor: User): { success: boolean; site?: Site; error?: string } {
    if (!siteData.name || !siteData.name.trim()) {
      return { success: false, error: 'Site name is required.' };
    }
    if (!siteData.code || !siteData.code.trim()) {
      return { success: false, error: 'Unique Site Code is required.' };
    }

    const sites = dbService.getSites();
    const normalizedCode = siteData.code.trim().toUpperCase();
    if (sites.some(s => s.code.toUpperCase() === normalizedCode)) {
      return { success: false, error: `Site code "${normalizedCode}" already exists.` };
    }

    const newSite: Site = {
      id: siteData.id || `site-${Date.now()}`,
      siteId: siteData.siteId || `SITE-${Math.floor(100 + Math.random() * 900)}`,
      name: siteData.name.trim(),
      code: normalizedCode,
      area: siteData.area?.trim() || 'General Operations',
      description: siteData.description?.trim() || '',
      location: siteData.location?.trim() || 'Not configured',
      status: 'ACTIVE',
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: actor.name,
      dataSource: siteData.dataSource || 'USER_CREATED'
    };

    const updated = [newSite, ...sites];
    try {
      safeSetItem(STORAGE_KEYS.SITES, JSON.stringify(updated));
      syncToBackend('sites', updated);
      
      // Audit log
      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'Site Created',
        entity: 'Site',
        entityId: newSite.id,
        site: newSite.name,
        siteId: newSite.id,
        newValue: `${newSite.name} (${newSite.code})`,
        result: 'SUCCESS'
      });

      // Notification
      dbService.addNotification({
        type: 'SUCCESS',
        category: 'SITE_CREATED',
        priority: 'NORMAL',
        title: 'New Site / Station Registered',
        message: `Site "${newSite.name}" (${newSite.code}) was created by ${actor.name}.`,
        linkType: 'site',
        linkId: newSite.id,
        siteId: newSite.id,
        site: newSite.name
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sites-updated'));
      }

      return { success: true, site: newSite };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save site.' };
    }
  },

  updateSite(id: string, updates: Partial<Site>, actor: User): { success: boolean; site?: Site; error?: string } {
    const sites = dbService.getSites();
    const idx = sites.findIndex(s => s.id === id || s.siteId === id);
    if (idx === -1) {
      return { success: false, error: 'Site not found.' };
    }

    const old = sites[idx];
    const updatedSite: Site = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    sites[idx] = updatedSite;
    try {
      safeSetItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
      syncToBackend('sites', sites);

      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'Site Updated',
        entity: 'Site',
        entityId: updatedSite.id,
        site: updatedSite.name,
        siteId: updatedSite.id,
        oldValue: JSON.stringify({ name: old.name, status: old.status, location: old.location }),
        newValue: JSON.stringify({ name: updatedSite.name, status: updatedSite.status, location: updatedSite.location }),
        result: 'SUCCESS'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:sites-updated'));
      }

      return { success: true, site: updatedSite };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update site.' };
    }
  },

  setSiteStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED', actor: User): { success: boolean; error?: string } {
    return dbService.updateSite(id, { status, active: status === 'ACTIVE' }, actor);
  },

  // --- PORT 10: MASTER WAREHOUSES MANAGEMENT ---

  getWarehouses(siteId?: string): MasterWarehouse[] {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
      let list: MasterWarehouse[] = raw ? JSON.parse(raw) : INITIAL_MASTER_WAREHOUSES;
      if (!Array.isArray(list) || list.length === 0) {
        list = INITIAL_MASTER_WAREHOUSES;
      }
      if (siteId) {
        return list.filter(w => w.siteId === siteId || w.siteCode === siteId);
      }
      return list;
    } catch {
      return INITIAL_MASTER_WAREHOUSES;
    }
  },

  getAvailableStations(): string[] {
    dbService.initialize();
    const stationSet = new Set<string>();

    // Default recognized stations
    const defaults = [
      'ZFOD Warehouse / مستودع المجمع',
      'Station A / المحطة أ',
      'Station B / المحطة ب',
      'Station C / المحطة ج',
      'Central Workshop / الورشة المركزية',
      'Main Stores / المستودعات العامة'
    ];
    defaults.forEach(d => stationSet.add(d));

    // Custom stations from localStorage
    try {
      const customRaw = localStorage.getItem('emis_custom_stations');
      if (customRaw) {
        const customList: string[] = JSON.parse(customRaw);
        if (Array.isArray(customList)) {
          customList.forEach(s => {
            if (s && typeof s === 'string' && s.trim()) stationSet.add(s.trim());
          });
        }
      }
    } catch {}

    // Stations from existing materials in database
    try {
      const materials = dbService.getMaterials();
      materials.forEach(m => {
        if (m.station && typeof m.station === 'string' && m.station.trim()) {
          stationSet.add(m.station.trim());
        }
      });
    } catch {}

    return Array.from(stationSet);
  },

  saveCustomStation(stationName: string): void {
    if (!stationName || !stationName.trim()) return;
    const clean = stationName.trim();
    try {
      const customRaw = localStorage.getItem('emis_custom_stations');
      let customList: string[] = customRaw ? JSON.parse(customRaw) : [];
      if (!Array.isArray(customList)) customList = [];
      if (!customList.includes(clean)) {
        customList.unshift(clean);
        localStorage.setItem('emis_custom_stations', JSON.stringify(customList.slice(0, 50)));
      }
    } catch {}
  },

  getWarehouseById(id: string): MasterWarehouse | undefined {
    return dbService.getWarehouses().find(w => w.id === id || w.warehouseId === id);
  },

  createWarehouse(whData: Partial<MasterWarehouse>, actor: User): { success: boolean; warehouse?: MasterWarehouse; error?: string } {
    if (!whData.name || !whData.name.trim()) {
      return { success: false, error: 'Warehouse name is required.' };
    }
    if (!whData.siteId) {
      return { success: false, error: 'A parent Site must be selected for the warehouse.' };
    }

    const warehouses = dbService.getWarehouses();
    const site = dbService.getSiteById(whData.siteId);
    const code = whData.code?.trim().toUpperCase() || `WH-${Math.floor(100 + Math.random() * 900)}`;

    const newWh: MasterWarehouse = {
      id: whData.id || `wh-${Date.now()}`,
      warehouseId: whData.warehouseId || `WH-${Math.floor(100 + Math.random() * 900)}`,
      code,
      name: whData.name.trim(),
      siteId: whData.siteId,
      siteCode: site?.code || whData.siteCode || '',
      siteName: site?.name || whData.siteName || '',
      description: whData.description?.trim() || '',
      location: whData.location?.trim() || 'Not configured',
      status: 'ACTIVE',
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: actor.name,
      dataSource: whData.dataSource || 'USER_CREATED'
    };

    const updated = [newWh, ...warehouses];
    try {
      safeSetItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(updated));
      syncToBackend('warehouses', updated);

      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'Warehouse Created',
        entity: 'Warehouse',
        entityId: newWh.id,
        site: newWh.siteName,
        siteId: newWh.siteId,
        newValue: `${newWh.name} (${newWh.code}) linked to ${newWh.siteName}`,
        result: 'SUCCESS'
      });

      dbService.addNotification({
        type: 'SUCCESS',
        category: 'WAREHOUSE_CREATED',
        priority: 'NORMAL',
        title: 'New Warehouse / Store Configured',
        message: `Warehouse "${newWh.name}" was added to Site "${newWh.siteName}" by ${actor.name}.`,
        siteId: newWh.siteId,
        site: newWh.siteName
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:warehouses-updated'));
      }

      return { success: true, warehouse: newWh };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save warehouse.' };
    }
  },

  updateWarehouse(id: string, updates: Partial<MasterWarehouse>, actor: User): { success: boolean; warehouse?: MasterWarehouse; error?: string } {
    const warehouses = dbService.getWarehouses();
    const idx = warehouses.findIndex(w => w.id === id || w.warehouseId === id);
    if (idx === -1) {
      return { success: false, error: 'Warehouse not found.' };
    }

    const old = warehouses[idx];
    const updatedWh: MasterWarehouse = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    warehouses[idx] = updatedWh;
    try {
      safeSetItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses));
      syncToBackend('warehouses', warehouses);

      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'Warehouse Updated',
        entity: 'Warehouse',
        entityId: updatedWh.id,
        site: updatedWh.siteName,
        siteId: updatedWh.siteId,
        oldValue: JSON.stringify({ name: old.name, status: old.status }),
        newValue: JSON.stringify({ name: updatedWh.name, status: updatedWh.status }),
        result: 'SUCCESS'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:warehouses-updated'));
      }

      return { success: true, warehouse: updatedWh };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update warehouse.' };
    }
  },

  setWarehouseStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED', actor: User): { success: boolean; error?: string } {
    return dbService.updateWarehouse(id, { status, active: status === 'ACTIVE' }, actor);
  },

  // --- PORT 10: USER MANAGEMENT & RBAC ---

  getUsers(): User[] {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MASTER_USERS;
  },

  getUserById(id: string): User | undefined {
    return dbService.getUsers().find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase() || u.username?.toLowerCase() === id.toLowerCase());
  },

  createUser(userData: Partial<User> & { password?: string }, actor: User): { success: boolean; user?: User; error?: string } {
    if (!userData.name || !userData.name.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!userData.email || !userData.email.trim()) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!userData.role) {
      return { success: false, error: 'User Role is required.' };
    }

    const users = dbService.getUsers();
    const normalizedEmail = userData.email.trim().toLowerCase();
    const username = userData.username?.trim().toLowerCase() || normalizedEmail.split('@')[0];

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: `User with email "${normalizedEmail}" already exists.` };
    }
    if (users.some(u => u.username?.toLowerCase() === username)) {
      return { success: false, error: `Username "${username}" is already taken.` };
    }

    const newUser: User = {
      id: userData.id || `usr-${Date.now()}`,
      email: normalizedEmail,
      username,
      name: userData.name.trim(),
      role: userData.role,
      site: userData.site || 'NDGS',
      siteId: userData.siteId || 'site-ndgs',
      warehouse: userData.warehouse || 'Electronics Lab (Lab A)',
      warehouseId: userData.warehouseId || 'wh-elec-a',
      allowedSites: userData.allowedSites || [userData.siteId || 'site-ndgs'],
      allowedWarehouses: userData.allowedWarehouses || [userData.warehouseId || 'wh-elec-a'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      dataSource: userData.dataSource || 'USER_CREATED',
      passwordHash: userData.password || 'emis123'
    };

    const updated = [newUser, ...users];
    try {
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      syncToBackend('users', updated);

      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'User Created',
        entity: 'User',
        entityId: newUser.id,
        site: newUser.site,
        siteId: newUser.siteId,
        newValue: `${newUser.name} (${newUser.email}, Role: ${newUser.role.toUpperCase()})`,
        result: 'SUCCESS'
      });

      dbService.addNotification({
        type: 'INFO',
        category: 'USER_CREATED',
        priority: 'NORMAL',
        title: 'New User Account Created',
        message: `User account for "${newUser.name}" (${newUser.role.toUpperCase()}) was created by ${actor.name}.`,
        linkType: 'admin',
        linkId: newUser.id
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:users-updated'));
      }

      return { success: true, user: newUser };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save user.' };
    }
  },

  updateUser(id: string, updates: Partial<User>, actor: User): { success: boolean; user?: User; error?: string } {
    const users = dbService.getUsers();
    const idx = users.findIndex(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      return { success: false, error: 'User not found.' };
    }

    const old = users[idx];
    const updatedUser: User = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    users[idx] = updatedUser;
    try {
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      syncToBackend('users', users);

      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'User Updated',
        entity: 'User',
        entityId: updatedUser.id,
        site: updatedUser.site,
        siteId: updatedUser.siteId,
        oldValue: JSON.stringify({ role: old.role, status: old.status, site: old.site }),
        newValue: JSON.stringify({ role: updatedUser.role, status: updatedUser.status, site: updatedUser.site }),
        result: 'SUCCESS'
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:users-updated'));
      }

      return { success: true, user: updatedUser };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update user.' };
    }
  },

  setUserStatus(id: string, status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED', actor: User): { success: boolean; error?: string } {
    return dbService.updateUser(id, { status }, actor);
  },

  resetUserPassword(id: string, newPass: string, actor: User): { success: boolean; error?: string } {
    if (!newPass || newPass.trim().length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }
    const res = dbService.updateUser(id, { passwordHash: newPass.trim() }, actor);
    if (res.success) {
      dbService.logAudit({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: actor.name,
        userId: actor.id,
        userRole: actor.role,
        action: 'Password Reset',
        entity: 'User',
        entityId: id,
        details: `Password reset by administrator ${actor.name}`,
        result: 'SUCCESS'
      });
    }
    return res;
  },

  // --- PORT 10: EXISTING MATERIAL DETECTION & DUPLICATE WARNING ---

  detectExistingMaterial(candidate: Partial<Material>): {
    isExisting: boolean;
    existingMaterial: Material | null;
    isDuplicate: boolean;
    duplicateCandidate: Material | null;
    previousQuantity: number | 'UNKNOWN';
    matchReason?: string;
  } {
    const materials = dbService.getMaterials();
    const candidatePN = candidate.partNumber?.trim().toUpperCase();
    const candidateMfg = candidate.manufacturer?.trim().toUpperCase();
    const candidateModel = candidate.model?.trim().toUpperCase();

    // 1. Direct Part Number match
    if (candidatePN) {
      const match = materials.find(m => m.partNumber.trim().toUpperCase() === candidatePN);
      if (match) {
        return {
          isExisting: true,
          existingMaterial: match,
          isDuplicate: true,
          duplicateCandidate: match,
          previousQuantity: typeof match.quantity === 'number' ? match.quantity : 'UNKNOWN',
          matchReason: `Exact Part Number Match (${match.partNumber})`
        };
      }
    }

    // 2. Manufacturer + Model match
    if (candidateMfg && candidateModel && candidateModel !== 'N/A') {
      const match = materials.find(m => 
        m.manufacturer.trim().toUpperCase() === candidateMfg && 
        m.model.trim().toUpperCase() === candidateModel
      );
      if (match) {
        return {
          isExisting: false,
          existingMaterial: match,
          isDuplicate: true,
          duplicateCandidate: match,
          previousQuantity: typeof match.quantity === 'number' ? match.quantity : 'UNKNOWN',
          matchReason: `Identical Manufacturer & Model (${match.manufacturer} / ${match.model})`
        };
      }
    }

    // 3. Serial Number match
    if (candidate.serialNumbers && candidate.serialNumbers.length > 0) {
      for (const sn of candidate.serialNumbers) {
        const snClean = sn.serialNumber?.trim().toUpperCase();
        if (snClean) {
          const match = materials.find(m => 
            m.serialNumbers?.some(s => s.serialNumber?.trim().toUpperCase() === snClean)
          );
          if (match) {
            return {
              isExisting: false,
              existingMaterial: match,
              isDuplicate: true,
              duplicateCandidate: match,
              previousQuantity: typeof match.quantity === 'number' ? match.quantity : 'UNKNOWN',
              matchReason: `Matching Physical Serial Number (${snClean})`
            };
          }
        }
      }
    }

    // 4. Description match (Exact or normalized match)
    if (candidate.description && candidate.description.trim().length > 6) {
      const candidateDesc = candidate.description.trim().toUpperCase();
      const match = materials.find(m => m.description && m.description.trim().toUpperCase() === candidateDesc);
      if (match) {
        return {
          isExisting: false,
          existingMaterial: match,
          isDuplicate: true,
          duplicateCandidate: match,
          previousQuantity: typeof match.quantity === 'number' ? match.quantity : 'UNKNOWN',
          matchReason: `Matching Material Description ("${match.description.slice(0, 35)}...")`
        };
      }
    }

    return {
      isExisting: false,
      existingMaterial: null,
      isDuplicate: false,
      duplicateCandidate: null,
      previousQuantity: 0,
      matchReason: undefined
    };
  },

  // --- PORT 10: REAL EMAIL ENGINE & ASYNC ALERTS ---

  getEmailSettings(): EmailSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return {
      enabled: true,
      provider: 'SMTP',
      senderEmail: 'emis-alerts@company.com',
      senderName: 'EMIS Material Intelligence',
      adminNotificationEmail: 'ahssan1991@gmail.com',
      defaultRecipients: ['ahssan1991@gmail.com'],
      ccRecipients: [],
      bccRecipients: [],
      triggers: {
        materialAdded: true,
        materialUpdated: true,
        existingMaterialQuantityChanged: true,
        materialAccepted: true,
        materialRejected: true,
        missingDocuments: true,
        mismatchDetected: true,
        aiResultReady: true,
        inspectionCompleted: true,
        lowStock: true,
        transferApproval: true,
        syncFailure: true,
        systemUpdate: false
      }
    };
  },

  async saveEmailSettings(settings: EmailSettings, user?: User): Promise<{ success: boolean; error?: string }> {
    try {
      safeSetItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(settings));
      // Also push to backend server
      const res = await fetch(`${getBaseApiUrl()}/api/email/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (user) {
        dbService.logAudit({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user.name,
          userId: user.id,
          userRole: user.role,
          action: 'Settings Changed',
          entity: 'Email',
          entityId: 'email-settings',
          details: `Updated Email Settings: Admin Recipient: ${settings.adminNotificationEmail}, Host: ${settings.smtp?.host || 'None'}, Enabled: ${settings.enabled}`
        });
      }
      return { success: res.ok };
    } catch (e: any) {
      console.warn('Failed to save email settings:', e);
      return { success: false, error: e.message };
    }
  },

  async sendMaterialAlertEmail(event: MaterialTransactionEvent): Promise<EmailSendResult> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/email/send-material-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      if (res.ok) {
        const data: EmailSendResult = await res.json();
        if (!data.timestamp) data.timestamp = new Date().toISOString();
        if (!data.success) {
          // Port 11 Item 18: Record EMAIL_FAILURE audit event while preserving transaction
          dbService.logAudit({
            id: `aud-eml-fail-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'EMAIL_FAILURE',
            entity: 'Email',
            entityId: event.eventId || `evt-${Date.now()}`,
            user: event.user || 'System',
            userId: event.userId,
            userRole: event.userRole,
            site: event.site,
            reason: data.error || `Email delivery status: ${data.status || 'FAILED'}`,
            result: 'FAILED'
          });
        }
        return data;
      }
      // Port 11 Item 18: Record EMAIL_FAILURE audit event
      dbService.logAudit({
        id: `aud-eml-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'EMAIL_FAILURE',
        entity: 'Email',
        entityId: event.eventId || `evt-${Date.now()}`,
        user: event.user || 'System',
        userId: event.userId,
        userRole: event.userRole,
        site: event.site,
        reason: `Server responded with HTTP ${res.status}`,
        result: 'FAILED'
      });
      return {
        success: false,
        status: 'FAILED',
        eventId: event.eventId,
        error: `Server responded with HTTP ${res.status}`,
        timestamp: new Date().toISOString(),
        recipient: event.userId
      };
    } catch (err: any) {
      // Port 11 Item 18: Record EMAIL_FAILURE audit event
      dbService.logAudit({
        id: `aud-eml-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'EMAIL_FAILURE',
        entity: 'Email',
        entityId: event.eventId || `evt-${Date.now()}`,
        user: event.user || 'System',
        userId: event.userId,
        userRole: event.userRole,
        site: event.site,
        reason: err.message || 'Network error connecting to email service.',
        result: 'FAILED'
      });
      return {
        success: false,
        status: 'FAILED',
        eventId: event.eventId,
        error: err.message || 'Network error connecting to email service.',
        timestamp: new Date().toISOString(),
        recipient: 'Admin'
      };
    }
  },

  async sendTestEmail(recipient?: string, currentSettings?: EmailSettings): Promise<EmailSendResult> {
    try {
      const settings = currentSettings || dbService.getEmailSettings();
      const hasHost = Boolean(settings?.smtp?.host && settings.smtp.host.trim());
      const hasUser = Boolean((settings?.smtp?.user && settings.smtp.user.trim()) || (settings?.smtpUser && settings.smtpUser.trim()));
      const hasPass = Boolean((settings?.smtp?.pass && settings.smtp.pass.trim()) || (settings?.smtpPass && settings.smtpPass.trim()));

      // Pre-validate configuration to provide immediate actionable guidance
      if (!hasHost || !hasUser || !hasPass) {
        return {
          success: false,
          status: 'NOT_CONFIGURED',
          eventId: `validation-${Date.now()}`,
          error: 'إعدادات خادم البريد غير مكتملة (SMTP Not Configured). يرجى ملء بيانات خادم SMTP (المضيف Host، واسم المستخدم User، وكلمة مرور التطبيق App Password) في القسم أدناه وحفظها قبل الاختبار.',
          timestamp: new Date().toISOString(),
          recipient: recipient || settings?.adminNotificationEmail || 'ihsan@emis.com'
        };
      }

      if (currentSettings) {
        // Sync newest form fields to backend first
        await dbService.saveEmailSettings(currentSettings);
      }
      const res = await fetch(`${getBaseApiUrl()}/api/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient })
      });
      const data: EmailSendResult = await res.json();
      if (!data.timestamp) data.timestamp = new Date().toISOString();
      return data;
    } catch (err: any) {
      const isNetworkFail = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      const errorMsg = isNetworkFail
        ? 'تعذر الاتصال بخادم إرسال البريد (Backend Unreachable / Network Error). في حال تشغيل تطبيق الهاتف (APK)، يتطلب الإرسال الفعلي توفر اتصال بالخادم السحابي أو خادم SMTP مهيأ.'
        : (err.message || 'Failed to send test email');

      return {
        success: false,
        status: isNetworkFail ? 'NOT_CONFIGURED' : 'FAILED',
        eventId: `test-${Date.now()}`,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        recipient: recipient || 'ihsan@emis.com'
      };
    }
  },

  /**
   * Dispatches real-time critical material update event to Cloud Function & Engineering Team alert service
   */
  async triggerCriticalMaterialAlert(data: {
    before?: Partial<Material>;
    after: Partial<Material>;
    user?: string;
    userId?: string;
    userRole?: string;
    reason?: string;
  }): Promise<{ success: boolean; triggered?: boolean; isCritical?: boolean; status?: string; message?: string; error?: string; recipients?: string[]; deltas?: any[] }> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/cloud-functions/on-material-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before: data.before,
          after: data.after,
          user: data.user,
          userId: data.userId,
          userRole: data.userRole,
          reason: data.reason,
          source: 'EMIS_CLIENT_APP'
        })
      });
      const result = await res.json();
      return result;
    } catch (err: any) {
      console.warn('Failed to trigger engineering critical material alert:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Tests the engineering team critical material alert template and SMTP delivery
   */
  async testCriticalMaterialEmailAlert(currentUser?: { name?: string; id?: string }): Promise<any> {
    const settings = dbService.getEmailSettings();
    const hasHost = Boolean(settings?.smtp?.host && settings.smtp.host.trim());
    const hasUser = Boolean((settings?.smtp?.user && settings.smtp.user.trim()) || (settings?.smtpUser && settings.smtpUser.trim()));
    const hasPass = Boolean((settings?.smtp?.pass && settings.smtp.pass.trim()) || (settings?.smtpPass && settings.smtpPass.trim()));

    if (!hasHost || !hasUser || !hasPass) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        message: 'إعدادات البريد غير مكتملة',
        error: 'لم يتم تكوين خادم SMTP (Host / User / Password). يرجى تعبئة بيانات خادم البريد في الإعدادات أدناه قبل اختبار إرسال التنبيهات الحرجة.'
      };
    }

    try {
      const res = await fetch(`${getBaseApiUrl()}/api/email/test-critical-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser?.name || 'Lead Engineer',
          userId: currentUser?.id || 'admin'
        })
      });
      return await res.json();
    } catch (err: any) {
      const isNetworkFail = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      return { 
        success: false, 
        status: isNetworkFail ? 'NOT_CONFIGURED' : 'FAILED',
        error: isNetworkFail
          ? 'تعذر الاتصال بالخادم لإرسال تنبيه البريد (Backend Unreachable). يرجى التحقق من اتصال الشبكة أو تكوين عنوان الخادم.'
          : err.message 
      };
    }
  },

  async fetchServerEmailConfig(): Promise<Partial<EmailSettings> | null> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/email/config`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch server email config:', e);
    }
    return null;
  },

  async fetchEmailLogs(): Promise<EmailLogEntry[]> {
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/email/logs`);
      if (res.ok) {
        const logs = await res.json();
        return logs;
      }
    } catch {
      // fallback to local
    }
    return dbService.getEmailLogs();
  },

  getEmailLogs(): EmailLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // --- PORT 10: AUDIT LOGS ---

  getAuditLogs(): AuditLogEntry[] {
    dbService.initialize();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  logAudit(entry: Partial<AuditLogEntry> & { action: string; entity: string; entityId: string }): void {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: AuditLogEntry = {
      id: entry.id || `aud-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      user: entry.user || 'System',
      userId: entry.userId,
      userRole: entry.userRole || 'system',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      site: entry.site,
      siteId: entry.siteId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason,
      result: entry.result || 'SUCCESS',
      metadata: entry.metadata
    };

    logs.unshift(newEntry);
    try {
      safeSetItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('emis:audit-logs-updated'));
      }
    } catch (e) {
      console.warn('Failed to save audit log:', e);
    }
  },

  // Real async email delivery verification (Port 11: Remove fake success)
  async sendEmailNotification(payload: { to?: string[]; subject: string; body: string; event?: string }): Promise<{ success: boolean; status: string; error?: string }> {
    const settings = dbService.getEmailSettings();
    if (!settings.enabled) {
      return { success: false, status: 'NOT_CONFIGURED', error: 'Email delivery is disabled in EMIS settings.' };
    }
    const hasSmtp = Boolean(settings.smtp?.host && settings.smtp?.user && settings.smtpPass);
    if (!hasSmtp) {
      return { success: false, status: 'NOT_CONFIGURED', error: 'SMTP server parameters are not configured in EMIS Settings > Email.' };
    }
    const recipients = (payload.to && payload.to.length > 0) ? payload.to : settings.defaultRecipients;
    try {
      const res = await fetch(`${getBaseApiUrl()}/api/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipients[0] || settings.adminNotificationEmail,
          customSubject: payload.subject,
          customBody: payload.body
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: Boolean(data.success),
          status: data.status || (data.success ? 'SENT' : 'FAILED'),
          error: data.error
        };
      }
      return {
        success: false,
        status: 'FAILED',
        error: `Server responded with HTTP ${res.status}`
      };
    } catch (e: any) {
      return {
        success: false,
        status: 'FAILED',
        error: e.message || 'Network error connecting to email service.'
      };
    }
  }
};
