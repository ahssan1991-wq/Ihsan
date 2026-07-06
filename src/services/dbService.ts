/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Material, ActivityLog, User, UserRole, Equipment, MaterialHistoryEvent, MaterialDocument, BlacklistItem, ChatMessage, FeedbackItem, EngineeringDecision } from '../types';
import { INITIAL_MATERIALS } from '../data/mockMaterials';
import { INITIAL_EQUIPMENT } from '../data/mockEquipment';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Lazy initialize standard Firebase & Firestore
let firestoreDb: any = null;
try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'remixed-api-key') {
    const app = initializeApp(firebaseConfig);
    if (firebaseConfig.firestoreDatabaseId) {
      firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

// Background sync to server-side JSON store AND standard Firebase Firestore SDK with automatic retry-backoff
async function syncToBackend(collectionName: string, data: any[], attempt = 1) {
  try {
    const res = await fetch(`/api/db/sync/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`[Sync Attempt ${attempt}] Warning for ${collectionName}: server returned status ${res.status}`);
      if (attempt < 3) {
        const delay = attempt * 1000;
        setTimeout(() => syncToBackend(collectionName, data, attempt + 1), delay);
      }
    }
  } catch (err) {
    console.warn(`[Sync Attempt ${attempt}] Failed to connect to server for ${collectionName}:`, err);
    if (attempt < 3) {
      const delay = attempt * 1500;
      setTimeout(() => syncToBackend(collectionName, data, attempt + 1), delay);
    } else {
      console.info(`[Sync Offline Fallback] ${collectionName} successfully persisted in local IndexedDB/localStorage storage.`);
    }
  }

  // Also write directly to standard Firebase Firestore SDK as requested
  if (firestoreDb && Array.isArray(data)) {
    try {
      for (const item of data) {
        // Generate a valid Document ID based on natural keys
        const docId = item.partNumber || item.tagNumber || item.id || `doc-${Date.now()}`;
        const cleanDocId = encodeURIComponent(docId).replace(/\./g, '_');
        const docRef = doc(firestoreDb, collectionName, cleanDocId);
        await setDoc(docRef, item, { merge: true });
      }
    } catch (fireErr) {
      console.warn(`Firebase Firestore SDK direct setDoc error for collection ${collectionName}:`, fireErr);
    }
  }
}

// Predefined users
export const PRESETS_USERS: { [email: string]: { user: User; pass: string } } = {
  'admin@emis.com': {
    user: { id: 'usr-01', email: 'admin@emis.com', name: 'Sarah Jenkins', role: UserRole.ADMIN },
    pass: 'admin123'
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

const STORAGE_KEYS = {
  MATERIALS: 'emis_materials',
  EQUIPMENT: 'emis_equipment',
  ACTIVITIES: 'emis_activities',
  CURRENT_USER: 'emis_current_user',
  BLACKLIST: 'emis_blacklist',
  FEEDBACK: 'emis_feedback',
  DECISIONS: 'emis_decisions'
};

export const dbService = {
  /**
   * Initializes the database with mock data if empty.
   */
  initialize: (): void => {
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
  },

  /**
   * Synchronizes and loads entire database from the persistent server-side JSON/Firestore store.
   */
  initializeAsync: async (): Promise<void> => {
    try {
      const res = await fetch("/api/db/load");
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

  getMaterials: (): Material[] => {
    dbService.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (!data) return [];
    const parsed: Material[] = JSON.parse(data);
    return parsed.map(m => {
      // Create initial history if not present
      const defaultHistory: MaterialHistoryEvent[] = [
        {
          id: `hist-init-${m.partNumber}`,
          action: 'Material Created',
          details: `Material record initialized with quantity ${m.quantity} ${m.unit}`,
          userName: 'Sarah Jenkins',
          userRole: UserRole.ADMIN,
          timestamp: m.createdAt || new Date().toISOString()
        }
      ];

      return {
        ...m,
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
  },

  saveMaterials: (materials: Material[]): void => {
    safeSetItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
    syncToBackend('materials', materials);
    dbService.triggerAutomaticBackup();
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

  addMaterial: (material: Omit<Material, 'createdAt' | 'updatedAt'>, currentUser: User): { success: boolean; error?: string } => {
    const materials = dbService.getMaterials();
    const normalizedPartNumber = material.partNumber.trim();

    if (!normalizedPartNumber) {
      return { success: false, error: 'Part Number is required' };
    }

    const exists = materials.some(
      m => m.partNumber.trim().toUpperCase() === normalizedPartNumber.toUpperCase()
    );

    if (exists) {
      return { success: false, error: `Part Number "${normalizedPartNumber}" already exists in the system.` };
    }

    const newMaterial: Material = {
      ...material,
      partNumber: normalizedPartNumber,
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
          details: `Added new material: ${normalizedPartNumber}`,
          userName: currentUser.name,
          userRole: currentUser.role,
          timestamp: new Date().toISOString()
        }
      ],
      engineeringNotes: material.engineeringNotes || ''
    };

    const updated = [newMaterial, ...materials];
    dbService.saveMaterials(updated);

    // Log Activity
    dbService.logActivity({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'create',
      details: `Added new material: ${newMaterial.partNumber} (${newMaterial.description.slice(0, 30)}${newMaterial.description.length > 30 ? '...' : ''})`
    });

    return { success: true };
  },

  updateMaterial: (material: Material, currentUser: User): { success: boolean; error?: string } => {
    const materials = dbService.getMaterials();
    const idx = materials.findIndex(m => m.partNumber.toUpperCase() === material.partNumber.toUpperCase());

    if (idx === -1) {
      return { success: false, error: 'Material not found.' };
    }

    const oldMaterial = materials[idx];
    const updatedHistory = [...(oldMaterial.history || [])];

    // Detect quantity changes for History
    if (oldMaterial.quantity !== material.quantity) {
      updatedHistory.push({
        id: `hist-qty-${Date.now()}`,
        action: 'Quantity Changed',
        details: `Stock level adjusted from ${oldMaterial.quantity} to ${material.quantity} ${material.unit}`,
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

    return { success: true };
  },

  updateMaterialWithPartNumberChange: (oldPartNumber: string, material: Material, currentUser: User): { success: boolean; error?: string } => {
    const materials = dbService.getMaterials();
    const idx = materials.findIndex(m => m.partNumber.toUpperCase() === oldPartNumber.toUpperCase());

    if (idx === -1) {
      return { success: false, error: 'Material not found.' };
    }

    const cleanedNewPartNumber = material.partNumber.trim();
    if (!cleanedNewPartNumber) {
      return { success: false, error: 'Part Number is required' };
    }

    // Check if new part number is different and already exists
    if (oldPartNumber.toUpperCase() !== cleanedNewPartNumber.toUpperCase()) {
      const exists = materials.some(
        m => m.partNumber.trim().toUpperCase() === cleanedNewPartNumber.toUpperCase()
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

    return { success: true };
  },

  deleteMaterial: (partNumber: string, currentUser: User): { success: boolean; error?: string } => {
    const materials = dbService.getMaterials();
    const originalLength = materials.length;
    const filtered = materials.filter(m => m.partNumber.toUpperCase() !== partNumber.toUpperCase());

    if (filtered.length === originalLength) {
      return { success: false, error: 'Material not found.' };
    }

    dbService.saveMaterials(filtered);

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
    return data ? JSON.parse(data) : null;
  },

  login: (email: string, pass: string): { success: boolean; user?: User; error?: string } => {
    const entry = PRESETS_USERS[email.toLowerCase().trim()];
    if (!entry || entry.pass !== pass) {
      return { success: false, error: 'Invalid email or password.' };
    }
    
    safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(entry.user));

    // Log auth
    dbService.logActivity({
      userId: entry.user.id,
      userName: entry.user.name,
      userRole: entry.user.role,
      action: 'auth',
      details: `User logged in successfully (${entry.user.role.toUpperCase()} role)`
    });

    return { success: true, user: entry.user };
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
  }
};
