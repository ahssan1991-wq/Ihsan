/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Material,
  User,
  UserRole,
  ActionCenterItem,
  ActionCenterSeverity,
  DataQualityIssue,
  DataQualitySeverity,
  AppVersionInfo,
  AppDocument,
  Equipment,
  ExternalMaterial
} from '../types';
import { dbService } from './dbService';
import { getRecycleBinItems, getMaterialVersionHistory } from './port13Service';

// ============================================================================
// 1. ACTION CENTER ENGINE (PORT 14 REQUIREMENT 9)
// ============================================================================

export function getActionCenterItems(currentUser: User): ActionCenterItem[] {
  const items: ActionCenterItem[] = [];
  const materials = dbService.getMaterials() || [];
  const documents = dbService.getDocuments() || [];
  const blacklist = dbService.getBlacklist() || [];
  const recycleItems = getRecycleBinItems() || [];
  const syncSummary = dbService.getSyncStatusSummary();

  // 1. CRITICAL: Zero or critically low stock
  materials.forEach(mat => {
    if (mat.quantity === 0) {
      items.push({
        id: `act-zero-stock-${mat.partNumber}`,
        title: `Out of Stock: ${mat.name || mat.partNumber}`,
        description: `Material ${mat.partNumber} (${mat.manufacturer}) has reached 0 ${mat.unit} in ${mat.warehouse || 'Warehouse'}. Immediate reorder required.`,
        source: 'Inventory Monitoring',
        date: new Date().toISOString(),
        severity: 'CRITICAL',
        responsibleRole: UserRole.WAREHOUSE,
        relatedRecordId: mat.partNumber,
        relatedRecordType: 'MATERIAL',
        actionLabel: 'View Material Passport',
        actionTab: 'materials',
        actionPayload: { partNumber: mat.partNumber }
      });
    } else if (mat.minStockLevel && mat.quantity <= mat.minStockLevel) {
      items.push({
        id: `act-low-stock-${mat.partNumber}`,
        title: `Low Stock Alert: ${mat.name || mat.partNumber}`,
        description: `Current quantity (${mat.quantity} ${mat.unit}) is below minimum safe threshold (${mat.minStockLevel} ${mat.unit}).`,
        source: 'Inventory Monitoring',
        date: new Date().toISOString(),
        severity: 'WARNING',
        responsibleRole: UserRole.WAREHOUSE,
        relatedRecordId: mat.partNumber,
        relatedRecordType: 'MATERIAL',
        actionLabel: 'Check Stock',
        actionTab: 'materials',
        actionPayload: { partNumber: mat.partNumber }
      });
    }
  });

  // 2. CRITICAL: Blacklisted or Quarantined Materials detected in active storage
  blacklist.forEach(b => {
    const matched = materials.filter(
      m => m.partNumber.toUpperCase() === b.partNumber.toUpperCase() ||
           (b.serialNumber && m.serialNumber && m.serialNumber.toUpperCase() === b.serialNumber.toUpperCase())
    );
    if (matched.length > 0) {
      items.push({
        id: `act-blacklist-${b.id}`,
        title: `Quarantined Item Detected: ${b.partNumber}`,
        description: `Item matching blacklist rule #${b.id} (${b.reason}) is active in stock. Immediate quarantine required.`,
        source: 'Security & Quality Compliance',
        date: b.reportedDate || new Date().toISOString(),
        severity: 'CRITICAL',
        responsibleRole: UserRole.ENGINEER,
        relatedRecordId: b.partNumber,
        relatedRecordType: 'MATERIAL',
        actionLabel: 'Quarantine Action',
        actionTab: 'blacklist',
        actionPayload: { partNumber: b.partNumber }
      });
    }
  });

  // 3. PENDING: Pending Inspection materials
  materials.forEach(mat => {
    if (mat.inspectionStatus === 'pending' || mat.inspectionStatus === 'underInspection') {
      items.push({
        id: `act-insp-${mat.partNumber}`,
        title: `Pending QA Inspection: ${mat.partNumber}`,
        description: `Material received at ${mat.site || 'Site'} (${mat.warehouse}) requires physical & technical inspection sign-off.`,
        source: 'QA & Receiving Operations',
        date: mat.inspectionDate || new Date().toISOString(),
        severity: 'PENDING',
        responsibleRole: UserRole.INSPECTOR || UserRole.ENGINEER,
        relatedRecordId: mat.partNumber,
        relatedRecordType: 'INSPECTION',
        actionLabel: 'Complete Inspection',
        actionTab: 'mrf-management',
        actionPayload: { partNumber: mat.partNumber }
      });
    }
  });

  // 4. WARNING: Data Quality defects (Missing PN, Missing Manufacturer)
  materials.forEach(mat => {
    if (!mat.partNumber || mat.partNumber.trim().length < 2) {
      items.push({
        id: `act-missing-pn-${mat.id || Math.random()}`,
        title: `Missing Part Number: ${mat.name || 'Unnamed Material'}`,
        description: `Catalog item lacks an authoritative Part Number (PN). Technical traceability compromised.`,
        source: 'Data Quality Engine',
        date: new Date().toISOString(),
        severity: 'WARNING',
        responsibleRole: UserRole.ENGINEER,
        relatedRecordId: mat.partNumber,
        relatedRecordType: 'MATERIAL',
        actionLabel: 'Resolve in Quality Center',
        actionTab: 'data-quality',
        actionPayload: { material: mat }
      });
    }
    if (!mat.manufacturer || mat.manufacturer.trim().length < 2) {
      items.push({
        id: `act-missing-mfr-${mat.partNumber}`,
        title: `Missing Manufacturer: ${mat.partNumber}`,
        description: `No OEM/Manufacturer registered for part ${mat.partNumber}.`,
        source: 'Data Quality Engine',
        date: new Date().toISOString(),
        severity: 'WARNING',
        responsibleRole: UserRole.ENGINEER,
        relatedRecordId: mat.partNumber,
        relatedRecordType: 'MATERIAL',
        actionLabel: 'Update Record',
        actionTab: 'materials',
        actionPayload: { partNumber: mat.partNumber }
      });
    }
  });

  // 5. CRITICAL/WARNING: Expired or Expiring Recycle Bin Items
  recycleItems.forEach(item => {
    if (item.status === 'EXPIRED') {
      items.push({
        id: `act-recycle-expired-${item.id}`,
        title: `Recycle Bin Retention Expired: ${item.recordTitle}`,
        description: `Record ${item.recordId} (${item.recordType}) has exceeded the retention period and is queued for permanent purge.`,
        source: 'Recycle Bin & Data Safety',
        date: item.deletedAt,
        severity: 'CRITICAL',
        responsibleRole: UserRole.ADMIN,
        relatedRecordId: item.recordId,
        relatedRecordType: 'RECYCLE_BIN',
        actionLabel: 'Review Recycle Bin',
        actionTab: 'recycle-bin'
      });
    }
  });

  // 6. WARNING: Offline Sync Queue Conflicts or Pending Changes
  if (syncSummary.totalPending > 0) {
    items.push({
      id: `act-sync-pending`,
      title: `${syncSummary.totalPending} Offline Changes Pending Sync`,
      description: `Local transactions recorded while disconnected are waiting to sync with Cloud Firestore.`,
      source: 'Cloud Synchronization Service',
      date: new Date().toISOString(),
      severity: syncSummary.isOnline ? 'PENDING' : 'WARNING',
      responsibleRole: 'ALL',
      actionLabel: 'Trigger Cloud Sync',
      actionTab: 'backup-sync'
    });
  }

  // 7. INFO: Expiring Documents / Calibration Certificates
  documents.forEach(doc => {
    if (doc.uploadedAt) {
      // Flag documents older than 365 days that may need recalibration or renewal
      const docAgeDays = Math.floor((Date.now() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (docAgeDays > 330) {
        items.push({
          id: `act-doc-expiry-${doc.id}`,
          title: `Document Recalibration Review Due: ${doc.name || doc.fileName}`,
          description: `Compliance document ${doc.fileName} (${doc.documentType || 'General'}) was uploaded ${docAgeDays} days ago and requires renewal.`,
          source: 'Document Center',
          date: doc.uploadedAt,
          severity: 'INFO',
          responsibleRole: UserRole.ENGINEER,
          relatedRecordId: doc.id,
          relatedRecordType: 'DOCUMENT',
          actionLabel: 'View Document',
          actionTab: 'documents'
        });
      }
    }
  });

  // Filter based on user role permissions if not ADMIN
  return items.filter(item => {
    if (currentUser.role === UserRole.ADMIN) return true;
    if (item.responsibleRole === 'ALL') return true;
    return item.responsibleRole === currentUser.role;
  });
}

// ============================================================================
// 2. DATA QUALITY ENGINE (PORT 14 REQUIREMENTS 58, 59, 60)
// ============================================================================

export function scanDataQualityIssues(materials: Material[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const partNumberMap = new Map<string, Material[]>();

  materials.forEach(mat => {
    const cleanPn = mat.partNumber?.trim().toUpperCase();

    // 1. Missing Part Number
    if (!cleanPn || cleanPn.length < 2) {
      issues.push({
        id: `dqi-pn-${mat.id || Math.random()}`,
        type: 'MISSING_PART_NUMBER',
        severity: 'CRITICAL',
        recordId: mat.partNumber || mat.id || 'UNKNOWN',
        recordTitle: mat.name || mat.description || 'Unnamed Material',
        reason: 'Material record has no valid Part Number (PN). Critical for catalog uniqueness.',
        suggestedFix: 'Assign authoritative OEM part number or standard internal tag.',
        suggestedValue: mat.model || 'PN-REQUIRED',
        field: 'partNumber',
        status: 'OPEN',
        detectedAt: new Date().toISOString()
      });
      return;
    }

    // Accumulate for duplicate check
    if (!partNumberMap.has(cleanPn)) {
      partNumberMap.set(cleanPn, []);
    }
    partNumberMap.get(cleanPn)!.push(mat);

    // 2. Missing Manufacturer
    if (!mat.manufacturer || mat.manufacturer.trim().length < 2) {
      issues.push({
        id: `dqi-mfr-${mat.partNumber}`,
        type: 'MISSING_MANUFACTURER',
        severity: 'HIGH',
        recordId: mat.partNumber,
        recordTitle: mat.name || mat.partNumber,
        reason: 'OEM Manufacturer field is blank or unspecified.',
        suggestedFix: 'Specify manufacturer or brand based on physical nameplate or datasheet.',
        suggestedValue: 'Standard Industrial OEM',
        field: 'manufacturer',
        status: 'OPEN',
        detectedAt: new Date().toISOString()
      });
    }

    // 3. Invalid or Negative Quantity
    if (mat.quantity < 0 || isNaN(mat.quantity)) {
      issues.push({
        id: `dqi-qty-${mat.partNumber}`,
        type: 'INVALID_QUANTITY',
        severity: 'CRITICAL',
        recordId: mat.partNumber,
        recordTitle: mat.name || mat.partNumber,
        reason: `Recorded stock quantity (${mat.quantity}) is invalid or negative.`,
        suggestedFix: 'Reset quantity to 0 or adjust to physical stock audit count.',
        suggestedValue: 0,
        field: 'quantity',
        status: 'OPEN',
        detectedAt: new Date().toISOString()
      });
    }

    // 4. Missing Warehouse Location
    if (!mat.warehouse || mat.warehouse.trim().length === 0) {
      issues.push({
        id: `dqi-loc-${mat.partNumber}`,
        type: 'INVALID_LOCATION',
        severity: 'MEDIUM',
        recordId: mat.partNumber,
        recordTitle: mat.name || mat.partNumber,
        reason: 'Material has no assigned storage warehouse or bay.',
        suggestedFix: 'Assign warehouse location from approved master warehouse directory.',
        suggestedValue: 'Main Central Warehouse',
        field: 'warehouse',
        status: 'OPEN',
        detectedAt: new Date().toISOString()
      });
    }
  });

  // 5. DUPLICATES: Identify duplicate Part Numbers in active inventory
  partNumberMap.forEach((mats, pn) => {
    if (mats.length > 1) {
      issues.push({
        id: `dqi-dup-${pn}`,
        type: 'DUPLICATE_MATERIAL',
        severity: 'CRITICAL',
        recordId: pn,
        recordTitle: `Part Number: ${pn} (${mats.length} duplicate entries)`,
        reason: `Multiple records (${mats.length}) share the exact same Part Number in the catalog across warehouses.`,
        suggestedFix: 'Consolidate quantities and retire duplicate entries into the Recycle Bin.',
        status: 'OPEN',
        detectedAt: new Date().toISOString()
      });
    }
  });

  return issues;
}

// ============================================================================
// 3. GLOBAL SEARCH ENGINE (PORT 14 REQUIREMENTS 11, 12, 13)
// ============================================================================

export interface GlobalSearchResultItem {
  id: string;
  type: 'EXACT_MATERIAL' | 'MATERIAL' | 'DOCUMENT' | 'EQUIPMENT' | 'EXTERNAL' | 'AI_SUGGESTION';
  title: string;
  subtitle: string;
  partNumber?: string;
  location?: string;
  quantity?: number;
  unit?: string;
  badge?: string;
  matchField?: string;
  rawItem?: any;
}

export interface GlobalSearchResults {
  query: string;
  totalCount: number;
  exactMatches: GlobalSearchResultItem[];
  materials: GlobalSearchResultItem[];
  documents: GlobalSearchResultItem[];
  equipment: GlobalSearchResultItem[];
  externalStock: GlobalSearchResultItem[];
  aiSuggestions: {
    title: string;
    description: string;
    suggestedParameters: Record<string, string>;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}

export function performGlobalSearch(query: string): GlobalSearchResults {
  const cleanQuery = query.trim().toLowerCase();
  const results: GlobalSearchResults = {
    query,
    totalCount: 0,
    exactMatches: [],
    materials: [],
    documents: [],
    equipment: [],
    externalStock: [],
    aiSuggestions: []
  };

  if (!cleanQuery || cleanQuery.length < 2) {
    return results;
  }

  const materials = dbService.getMaterials() || [];
  const documents = dbService.getDocuments() || [];
  const equipment = dbService.getEquipment() || [];
  const external = dbService.getExternalMaterials() || [];

  // Search Materials
  materials.forEach(m => {
    const pn = (m.partNumber || '').toLowerCase();
    const sn = (m.serialNumber || '').toLowerCase();
    const name = (m.name || '').toLowerCase();
    const desc = (m.description || '').toLowerCase();
    const arDesc = (m.arabicDescription || '').toLowerCase();
    const mfr = (m.manufacturer || '').toLowerCase();
    const model = (m.model || '').toLowerCase();
    const site = (m.site || '').toLowerCase();
    const wh = (m.warehouse || '').toLowerCase();

    const isExactPn = pn === cleanQuery;
    const isExactModel = model === cleanQuery;
    const isExactSn = sn === cleanQuery;

    if (isExactPn || isExactModel || isExactSn) {
      results.exactMatches.push({
        id: m.partNumber,
        type: 'EXACT_MATERIAL',
        title: m.name || m.partNumber,
        subtitle: `${m.manufacturer} • ${m.model} (${m.site || 'Site'} - ${m.warehouse || 'Store'})`,
        partNumber: m.partNumber,
        location: `${m.site || 'Site'} / ${m.warehouse || 'Warehouse'}`,
        quantity: m.quantity,
        unit: m.unit,
        badge: 'EXACT MATCH',
        matchField: isExactPn ? 'Part Number' : (isExactSn ? 'Serial Number' : 'Model'),
        rawItem: m
      });
    } else if (
      pn.includes(cleanQuery) || 
      name.includes(cleanQuery) || 
      desc.includes(cleanQuery) || 
      arDesc.includes(cleanQuery) ||
      mfr.includes(cleanQuery) || 
      model.includes(cleanQuery) ||
      site.includes(cleanQuery) ||
      wh.includes(cleanQuery)
    ) {
      results.materials.push({
        id: m.partNumber,
        type: 'MATERIAL',
        title: m.name || m.partNumber,
        subtitle: `${m.manufacturer} • PN: ${m.partNumber}`,
        partNumber: m.partNumber,
        location: `${m.warehouse || 'Warehouse'} (Rack: ${m.rack || 'N/A'})`,
        quantity: m.quantity,
        unit: m.unit,
        badge: `${m.quantity} ${m.unit}`,
        rawItem: m
      });
    }
  });

  // Search Documents
  documents.forEach(d => {
    const title = (d.name || d.fileName || '').toLowerCase();
    const docNo = (d.relatedPartNumber || d.relatedEquipmentTag || '').toLowerCase();
    const type = (d.documentType || '').toLowerCase();
    if (title.includes(cleanQuery) || docNo.includes(cleanQuery) || type.includes(cleanQuery)) {
      results.documents.push({
        id: d.id,
        type: 'DOCUMENT',
        title: d.name || d.fileName,
        subtitle: `${d.documentType || 'Doc'} • Ref: ${d.relatedPartNumber || d.relatedEquipmentTag || d.id}`,
        badge: d.documentType || 'DOCUMENT',
        rawItem: d
      });
    }
  });

  // Search Equipment
  equipment.forEach(e => {
    const tag = (e.tagNumber || '').toLowerCase();
    const name = (e.name || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    if (tag.includes(cleanQuery) || name.includes(cleanQuery) || desc.includes(cleanQuery)) {
      results.equipment.push({
        id: e.tagNumber,
        type: 'EQUIPMENT',
        title: `${e.tagNumber} - ${e.name}`,
        subtitle: `${e.area || 'Plant Area'} • Status: ${e.status || 'Active'}`,
        badge: 'EQUIPMENT',
        rawItem: e
      });
    }
  });

  // Search External Stores
  external.forEach(ext => {
    const pn = (ext.partNumber || '').toLowerCase();
    const desc = (ext.description || '').toLowerCase();
    const loc = (ext.warehouseName || '').toLowerCase();
    if (pn.includes(cleanQuery) || desc.includes(cleanQuery) || loc.includes(cleanQuery)) {
      results.externalStock.push({
        id: ext.partNumber,
        type: 'EXTERNAL',
        title: ext.partNumber,
        subtitle: `${ext.description} (${ext.warehouseName})`,
        quantity: ext.quantity,
        unit: ext.unit,
        badge: 'EXTERNAL STORE',
        rawItem: ext
      });
    }
  });

  // AI Suggestions if engineering query
  if (results.exactMatches.length === 0) {
    if (cleanQuery.includes('transmitter') || cleanQuery.includes('pressure') || cleanQuery.includes('bar')) {
      results.aiSuggestions.push({
        title: 'Pressure Instrumentation Guidance',
        description: 'Transmitters rated 0-10 bar with 4-20mA HART are standard stock items. Check Yokogawa EJX or Rosemount 3051 series.',
        suggestedParameters: {
          'Operating Range': '0–10 bar (145 psi)',
          'Output': '4-20mA HART',
          'Process Connection': '1/2" NPT-F'
        },
        confidence: 'HIGH'
      });
    } else if (cleanQuery.includes('valve') || cleanQuery.includes('flow') || cleanQuery.includes('flange')) {
      results.aiSuggestions.push({
        title: 'Control Valve Process Standard',
        description: 'Verify ANSI Class 150/300 flange rating and trim material compatibility with process fluid temperature.',
        suggestedParameters: {
          'Body Material': 'ASTM A216 WCB / SS316',
          'Leakage Class': 'Class IV / VI',
          'Trim': 'Stellite 6'
        },
        confidence: 'MEDIUM'
      });
    }
  }

  results.totalCount = 
    results.exactMatches.length + 
    results.materials.length + 
    results.documents.length + 
    results.equipment.length + 
    results.externalStock.length;

  return results;
}

// ============================================================================
// 4. EMIS PORT 14 RELEASE & APPLICATION UPDATE INFO (REQUIREMENT 26, 27)
// ============================================================================

export function getPort14ReleaseInfo(): AppVersionInfo {
  return {
    currentVersion: '3.1.0-port14',
    latestVersion: '3.1.0-port14',
    minimumSupportedVersion: '3.0.0',
    isUpdateAvailable: false,
    isMandatory: false,
    releaseDate: '2026-09-04',
    releaseNotes: [
      'Centralized EMIS Enterprise Design System for unified visual and ergonomic consistency.',
      'EMIS Command Center dashboard providing real-time answers to "What requires my attention right now?".',
      'Action Center aggregating Critical, Pending, Warning, and Info tasks with direct action buttons.',
      'Persistent Global Header Search with instant categorized grouping (Exact, Stock, Docs, AI).',
      'Material Passport 2.0 with Real Historical Activity Timeline and Version Comparison.',
      'Data Quality Center detecting duplicates, missing Part Numbers, and data anomalies.',
      'Strict AI Trust Layer enforcing 🟢 Verified Data, 🟡 AI Suggestion, and 🔵 External Info badges.',
      'Single-source centralized language management with verified 🇮🇶 العربية and English switching.'
    ],
    securityChanges: [
      'Strict role-based navigation and action authorization for VIEWER, INSPECTOR, STOREKEEPER, and ADMIN.',
      'Time-limited revocable sharing tokens with sanitized read-only payloads.',
      'Anti-hallucination guardrails preventing automated promotion of unverified AI suggestions.'
    ],
    featureChanges: [
      'Unified Grouped Global Navigation (Dashboard, Materials, Search, Operations, Documents, Reports, Admin).',
      'Excel Import duplicate intelligence workflow.',
      'Recycle Bin soft-delete retention safeguards with automated purge warnings.'
    ],
    distributionUrl: 'https://emis-industrial.system.internal/updates/v3.1.0-port14.apk'
  };
}
