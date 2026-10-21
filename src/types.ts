/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  ENGINEER = 'engineer',
  INSPECTOR = 'inspector',
  STOREKEEPER = 'storekeeper',
  VIEWER = 'viewer',

  // Backward compatibility aliases for existing views & sessions
  SUPERVISOR = 'engineer',
  WAREHOUSE = 'storekeeper',
  READONLY = 'viewer'
}

// --- PORT 10 DATA GOVERNANCE & SOURCE TYPES ---
export type DataSourceType = 'REAL' | 'USER_CREATED' | 'IMPORTED' | 'CONFIGURED' | 'DEMO';

// --- EMIS MULTI-SITE MASTER DATA MODEL ---
export interface Site {
  id: string;
  siteId?: string; // Port 10 identifier alias
  name: string; // Real or configured site name
  code: string; // Unique site code, e.g. "SITE-01"
  area?: string; // e.g. "Instrumentation", "Mechanical", "Electrical"
  description?: string;
  location?: string; // "Not configured" if none
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  active: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  dataSource?: DataSourceType;
}

// --- EMIS MASTER WAREHOUSE MODEL ---
export interface MasterWarehouse {
  id: string;
  warehouseId?: string;
  code: string; // Unique warehouse code
  name: string; // Warehouse name
  siteId: string; // Linked Site ID
  siteCode?: string;
  siteName?: string;
  description?: string;
  location?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  dataSource?: DataSourceType;
}

// --- EMIS IMMUTABLE AUDIT LOG ---
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userId?: string;
  userRole?: UserRole | string;
  action: 
    | 'Material Added'
    | 'Material Updated'
    | 'Status Changed'
    | 'Material Accepted'
    | 'Material Rejected'
    | 'Document Added'
    | 'Document Removed'
    | 'AI Suggestion Created'
    | 'AI Suggestion Accepted'
    | 'AI Suggestion Rejected'
    | 'Web Search'
    | 'User Login'
    | 'User Logout'
    | 'User Created'
    | 'User Updated'
    | 'User Disabled'
    | 'User Enabled'
    | 'Role Changed'
    | 'Password Reset'
    | 'Settings Changed'
    | 'Email Sent'
    | 'Email Failed'
    | 'Site Created'
    | 'Site Updated'
    | 'Warehouse Created'
    | 'Warehouse Updated'
    | 'Sync Conflict Resolved'
    | string;
  entity: 'Material' | 'MR' | 'PO' | 'WO' | 'Document' | 'AI' | 'Settings' | 'Site' | 'Warehouse' | 'User' | 'Email' | 'Security' | string;
  entityId: string;
  siteId?: string;
  site?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  details?: string;
  result?: 'SUCCESS' | 'FAILED' | 'WARNING';
  metadata?: Record<string, any>;
}

// --- EMIS PORT 10 NOTIFICATION CENTER & BELL ---
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type NotificationCategory = 
  | 'NEW_MATERIAL'
  | 'MATERIAL_UPDATED'
  | 'DUPLICATE_MATERIAL'
  | 'MISSING_DOCUMENT'
  | 'MATERIAL_MISMATCH'
  | 'ENGINEERING_REVIEW'
  | 'APPROVAL_REQUIRED'
  | 'TRANSFER_CREATED'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_RECEIVED'
  | 'STOCK_LOW'
  | 'STOCK_ADJUSTMENT'
  | 'SYNC_CONFLICT'
  | 'SYNC_FAILURE'
  | 'BACKUP_FAILURE'
  | 'AI_FAILURE'
  | 'OCR_FAILURE'
  | 'EMAIL_FAILURE'
  | 'USER_CREATED'
  | 'USER_DISABLED'
  | 'SITE_CREATED'
  | 'WAREHOUSE_CREATED'
  | 'SECURITY_ALERT'
  | 'GENERAL';

export interface AppNotification {
  id: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  userId?: string;
  targetRole?: UserRole;
  siteId?: string;
  site?: string;
  materialId?: string;
  referenceId?: string;
  linkType?: 'material' | 'mr' | 'po' | 'document' | 'ai' | 'site' | 'reports' | 'admin' | 'transfers';
  linkId?: string;
  dataSource?: DataSourceType;
}

// --- EMIS EMAIL ENGINE & SETTINGS ---
export type EmailDeliveryStatus = 'CONFIGURED' | 'NOT_CONFIGURED' | 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'RETRY_PENDING';

export interface EmailSettings {
  enabled: boolean;
  provider: 'SMTP' | 'SendGrid' | 'Mailgun' | 'Simulation';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtp?: {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    secure?: boolean;
  };
  senderEmail: string;
  senderName: string;
  adminNotificationEmail: string; // Configurable Admin recipient email
  defaultRecipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  engineeringTeamEmail?: string;
  engineeringRecipients?: string[];
  criticalMaterialAlertsEnabled?: boolean;
  triggers: {
    materialAdded: boolean;
    materialUpdated: boolean;
    existingMaterialQuantityChanged: boolean;
    criticalMaterialUpdated?: boolean;
    criticalStockBreached?: boolean;
    materialAccepted: boolean;
    materialRejected: boolean;
    missingDocuments: boolean;
    mismatchDetected: boolean;
    aiResultReady: boolean;
    inspectionCompleted: boolean;
    lowStock: boolean;
    transferApproval: boolean;
    syncFailure: boolean;
    systemUpdate: boolean;
  };
}

export interface CriticalMaterialChangeDelta {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  severity: 'CRITICAL' | 'MAJOR' | 'INFO';
}

export interface CriticalMaterialUpdateEvent {
  eventId: string;
  timestamp: string;
  materialId: string;
  partNumber: string;
  description: string;
  manufacturer: string;
  model?: string;
  criticality: 'Critical' | 'Major' | 'Minor' | 'Non-Critical' | string;
  isCritical: boolean;
  site?: string;
  warehouse?: string;
  location?: string;
  user: string;
  userId: string;
  userRole?: string;
  previousQuantity?: number;
  currentQuantity: number;
  minStockLevel?: number;
  deltas: CriticalMaterialChangeDelta[];
  reason?: string;
  source?: 'CLIENT_WEB' | 'CLIENT_APK' | 'FIRESTORE_TRIGGER' | 'CLOUD_FUNCTION' | string;
  engineeringNotes?: string;
}

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  event: string;
  subject: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'NOT_CONFIGURED';
  error?: string;
  messageId?: string;
  relatedEntityId?: string;
}

export interface EmailSendResult {
  success: boolean;
  status: EmailDeliveryStatus;
  eventId: string;
  messageId?: string;
  error?: string;
  timestamp: string;
  recipient: string;
}

// --- EMIS MATERIAL TRANSACTION EVENT FOR AUDIT & NOTIFICATIONS ---
export interface MaterialTransactionEvent {
  eventId: string;
  materialId: string;
  eventType?: 'NEW_MATERIAL' | 'EXISTING_MATERIAL_UPDATED' | 'QUANTITY_ADJUSTED' | string;
  transactionType?: 'NEW_MATERIAL' | 'EXISTING_MATERIAL_QUANTITY_CHANGED' | 'MATERIAL_UPDATED' | 'QUANTITY_ADJUSTED' | string;
  previousQuantity: number | 'UNKNOWN';
  addedQuantity?: number;
  quantityAdded?: number;
  currentQuantity: number;
  existingMaterial?: boolean;
  isDuplicateCandidate?: boolean;
  duplicateMatchReason?: string;
  materialName?: string;
  description?: string;
  partNumber: string;
  manufacturer: string;
  model?: string;
  serialNumber?: string;
  unit: string;
  siteName?: string;
  siteId?: string;
  site?: string;
  warehouseName?: string;
  warehouseId?: string;
  warehouse?: string;
  location?: string;
  mr?: string;
  po?: string;
  wo?: string;
  createdBy?: string;
  user?: string;
  userId: string;
  userRole?: string;
  notes?: string;
  timestamp: string;
}

// --- EMIS v0.5 AI PROVIDER ABSTRACTION ---
export type AIProviderType = 'gemini' | 'openai' | 'automatic' | 'disabled';

export interface AIProviderConfig {
  activeProvider: AIProviderType;
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  temperature?: number;
  maxTokens?: number;
}

// --- EMIS v0.5 WEB SEARCH & UNKNOWN MATERIAL IDENTIFICATION ---
export interface WebSearchSource {
  source: string; // e.g. "Yokogawa Official Website"
  title: string;
  url: string;
  website: string;
  date?: string;
  relevance: number; // 0 - 100
  isOfficialManufacturer?: boolean;
}

export interface WebSearchResult {
  query: string;
  timestamp: string;
  manufacturer?: string;
  model?: string;
  productType?: string;
  suggestedDescription: string;
  datasheetUrl?: string;
  technicalSpecs?: Record<string, string>;
  sources: WebSearchSource[];
  confidence: number; // 0 - 100
  status: 'FOUND' | 'PARTIAL' | 'NOT_FOUND' | 'UNAVAILABLE';
}

export type ConfidenceTier = 'Very High' | 'High' | 'Medium' | 'Low';
export type FactCertainty = 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN';

export interface AIIdentificationResult {
  manufacturer: string;
  productFamily?: string;
  model: string;
  productType: string;
  measurementType?: string;
  application?: string;
  technicalDescription: string;
  suggestedDescription: string;
  possiblePartNumber?: string;
  confidence: number; // 0-100
  confidenceTier: ConfidenceTier;
  certainty: FactCertainty;
  reasoningSummary: string;
  confidenceBreakdown: {
    manufacturerMatch: number;
    modelMatch: number;
    serialMatch: number;
    descriptionMatch: number;
    datasheetMatch: number;
  };
  sources: WebSearchSource[];
  candidateAlternatives?: string[];
  extractedSpecs?: Record<string, string>;
  isApprovedByUser?: boolean;
  approvalStatus?: 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED';
}

// --- EMIS v0.5 MATERIAL MATCHING & VERIFICATION ENGINE ---
export type MatchingVerdict = 'MATCH' | 'PARTIAL MATCH' | 'MISMATCH' | 'INSUFFICIENT DATA';

export interface MaterialComparisonField {
  fieldName: 'Manufacturer' | 'Model' | 'Part Number' | 'Serial Number' | 'Description' | 'Quantity' | 'Unit' | 'Technical Specs' | string;
  expectedValue: string;
  actualValue: string;
  verdict: 'MATCH' | 'PARTIAL MATCH' | 'MISMATCH' | 'INSUFFICIENT DATA';
  notes?: string;
}

export interface MaterialMatchingAnalysis {
  materialId: string;
  partNumber: string;
  overallVerdict: MatchingVerdict;
  overallScore: number; // 0-100
  fields: MaterialComparisonField[];
  mrReference?: string;
  poReference?: string;
  deliveryNoteReference?: string;
  datasheetReference?: string;
  missingRequiredDocs: string[];
  recommendations: string;
  inspectedAt: string;
  inspectedBy: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  site?: string;
  siteId?: string;
  warehouse?: string;
  warehouseId?: string;
  allowedSites?: string[];
  allowedWarehouses?: string[];
  status?: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  passwordHash?: string;
  dataSource?: DataSourceType;
  permissions?: string[];
}

export interface MaterialHistoryEvent {
  id: string;
  action: string;
  details: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;

  // EMIS v1.0 Additional Audit Fields
  sequence?: number;
  operationType?: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'TRANSFER' | 'EDIT' | 'QUANTITY_CHANGE' | 'SCAN';
  voucherRef?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  operatorId?: string;
  delta?: string;
}

export interface MaterialAlternatives {
  primary?: string;
  secondary?: string;
  notes?: string;
  reason?: string;
}

export interface MaterialDocument {
  name: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize?: string;
  googleDriveFileId?: string;
  googleDriveWebViewLink?: string;
  status?: 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING REVIEW';
  expiryDate?: string;
  documentType?: 'Datasheet' | 'CoC' | 'CoO' | 'Manual' | 'Delivery Note' | 'Inspection Report' | 'Calibration Certificate' | 'ATEX Certificate' | 'Other';
}

export type DocumentComplianceStatus = 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING REVIEW';

export interface StockMovement {
  id: string;
  partNumber: string;
  movementType: 'Stock In' | 'Stock Out' | 'Transfer' | 'Adjustment';
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  user: string;
  date: string;
  reason: string;
  notes?: string;
  balanceAfter?: number;
}

export interface MaterialInspectionRecord {
  id: string;
  partNumber: string;
  model?: string;
  suppliedModel?: string;
  serialNumber?: string;
  suppliedSerial?: string;
  manufacturer?: string;
  suppliedManufacturer?: string;
  mrNumber?: string;
  poNumber?: string;
  woNumber?: string;
  inspectionDate: string;
  inspector: string;
  result: 'MATCHED' | 'PARTIALLY MATCHED' | 'REJECTED' | 'ON HOLD' | 'ENGINEERING REVIEW';
  reason: string;
  notes?: string;
  technicalNotes?: string;
  status?: string;
  specificationMatchDetails?: {
    parameter: string;
    expected: string;
    actual: string;
    isMatch: boolean;
  }[];
  attachments?: string[];
}

export type MatchTier = 'EXACT MATCH' | 'HIGH MATCH' | 'POSSIBLE ALTERNATIVE' | 'ENGINEERING REVIEW REQUIRED' | 'NOT SUITABLE';

export interface MaterialPhotoLibrary {
  nameplate: string[];
  installation: string[];
  warehouse: string[];
  other: string[];
  identifiers?: string[];
}

export interface SerialNumberMaintenanceEvent {
  id: string;
  type: 'maintenance' | 'calibration' | 'inspection' | 'system';
  details: string;
  performedBy: string;
  date: string;
}

export interface MaterialSerialNumber {
  serialNumber: string; // The serial number value
  status: 'Available' | 'Installed' | 'Reserved' | 'Damaged';
  equipmentLocation?: string; // e.g. "EQ-PMP-101"
  installationDate?: string;
  maintenanceHistory?: SerialNumberMaintenanceEvent[];
  calibrationHistory?: SerialNumberMaintenanceEvent[];
  photos?: string[]; // Array of image URLs/data-URLs
}

export function isTemporaryPartNumber(partNumber?: string | null): boolean {
  if (!partNumber) return true;
  const trimmed = partNumber.trim().toUpperCase();
  return (
    trimmed.startsWith('TEMP-PN-') ||
    trimmed.startsWith('TEMP_PN_') ||
    trimmed.startsWith('TEMP-') ||
    trimmed.startsWith('AUTOPN-') ||
    trimmed === 'N/A' ||
    trimmed === 'NONE' ||
    trimmed === 'NULL' ||
    trimmed === 'UNDEFINED'
  );
}

export function formatPartNumberDisplay(partNumber?: string | null, fallback: string = '—'): string {
  if (!partNumber || isTemporaryPartNumber(partNumber)) {
    return fallback;
  }
  return partNumber;
}

export interface Material {
  id?: string;
  name?: string; // Material title / name alias
  partNumber: string; // Unique primary identifier
  description: string;
  arabicDescription?: string; // Port 9: Multilingual Arabic technical translation
  technicalMeaningArabic?: string; // Port 9: Detailed Arabic industrial explanation
  category?: string; // Equipment category / discipline
  manufacturer: string;
  model: string;
  pressureRating?: string;
  quantity: number;
  unit: string;
  store: string;
  rack: string;
  shelf: string;
  location?: string; // Rack / shelf / bin storage location
  notes: string;
  minStockLevel: number; // For low stock alerts
  createdAt: string;
  updatedAt: string;

  // ZFOD Enterprise Instrument Department & EMIS v2.0 Procurement Fields
  tagNumber?: string; // Equipment Tag # e.g. "2021-1-5553-XYS-237"
  tagLocation?: string; // Plant / Facility location e.g. "N DGS", "Station 1"
  installationLocation?: string; // Field Installation & Mounting Location مكان التثبيت والتركيب الفعلي للمادة أو السلينويد e.g. "Turbine Skid-A, Solenoid Manifold #3"
  installedEquipment?: string; // Linked Equipment name/description المعدة المثبت عليها الصنف e.g. "Main Compressor K-101"
  functionalLocation?: string; // Functional Location e.g. "FL-PLANT-01-GAS-COMP"
  mrReference?: string; // Material Request Reference e.g. "0226-14344-00-00-1"
  mrfReference?: string; // Material Requisition Form Reference e.g. "MRF-2024-001" or "0226-14344-00-00-1"
  contractor?: string; // Contractor / Vendor e.g. "PETROMAINT"
  quotationType?: string; // e.g. "OPEN"
  deliveryTerms?: string; // Delivery Terms e.g. "DDP ZUBAIR WAREHOUSE"
  offerPrice?: number; // Commercial offer price
  totalOfferCost?: number; // Total cost from commercial evaluation
  barcode?: string; // 1D Barcode code string
  qrCode?: string; // 2D QR Code data payload
  brand?: string;
  serialNumber?: string;
  measuringRange?: string;
  originalQuantity?: number;
  remainingQuantity?: number;
  binLocation?: string;
  workOrder?: string;
  woNumber?: string; // Work Order # alias e.g. "WO-2024-8841"
  woNumbers?: string[]; // Multiple associated Work Orders e.g. ["WO-12345", "WO-99882"]
  mrf?: string;
  mrfNumber?: string; // Standard MRF identifier
  mrNumber?: string; // Material Request e.g. "1225-14237"
  purchaseOrder?: string;
  poNumber?: string;
  supplier?: string;
  supplierName?: string;
  purchaseDate?: string;
  deliveryNote?: string;
  deliveryDate?: string;
  calibrationCertificate?: string;
  datasheet?: string;
  coc?: string;
  manuals?: string;
  
  // Inspection & Lifecycle
  inspectionStatus?: 'PASSED' | 'PENDING' | 'REJECTED' | 'CONDITIONAL' | 'UNDER_INSPECTION' | string;
  inspectionDate?: string;
  inspector?: string;
  remarks?: string;
  status?: 'Available' | 'Low Stock' | 'Out of Stock' | 'Reserved' | 'Under Inspection' | 'Blacklisted' | 'Pending Engineering Review' | string;
  equipmentTags?: string[]; // Alias for compatibleEquipment
  
  // Import metadata
  sequence?: number; // Sequence number exactly as stored
  station?: string; // Station/Plant location name
  site?: string; // Port 10/11: Multi-facility site name
  siteId?: string; // Port 10/11: Multi-facility site identifier
  warehouse?: string; // Port 10/11: Warehouse location
  warehouseId?: string; // Port 10/11: Warehouse identifier
  internalId?: string; // Internal unique ID for ERP matching
  importedAt?: string; // Date imported
  importedBy?: string; // Username of importer
  originalFilename?: string; // Original spreadsheet filename
  isIncomplete?: boolean; // Whether any mandatory fields are missing
  isPartNumberAutoGenerated?: boolean; // True if Part Number was omitted/blank and an internal temporary ID was assigned
  materialCode?: string; // Material Code from Excel
  engineeringComments?: string; // Engineering Comments from Excel
  additionalFields?: { [key: string]: any }; // Dynamic additional Excel columns

  // Technical Specifications & Engineering Ratings
  materialType?: string; // e.g. "Pressure Regulator", "Transmitter", "Control Valve", "Solenoid Valve", "Bearing", "Cable", "Sensor", "Pump"
  inletPressure?: string; // e.g. "10 bar", "150 PSI", "250 bar"
  outletPressure?: string; // e.g. "4 bar", "0-50 PSI", "1.5-6 bar"
  connectionSize?: string; // e.g. "1/2 inch", "1/4 inch", "1 inch", "DN50", "DN25"
  connectionType?: string; // e.g. "NPT-F", "Flanged ANSI 150# RF", "BSP Threaded", "Tri-Clamp"
  bodyMaterial?: string; // e.g. "SS316L", "Brass", "Carbon Steel A105", "Cast Iron"
  temperatureRange?: string; // e.g. "-20°C to +120°C", "-40°C to +85°C"
  flowRate?: string; // e.g. "50 m3/h", "100 GPM", "Cv = 4.2"
  voltage?: string; // e.g. "24 VDC", "220 VAC", "110 VAC", "3-Phase 380V"
  signalProtocol?: string; // e.g. "4-20 mA HART", "Modbus RS485", "Foundation Fieldbus", "Profibus PA"
  exClassification?: string; // e.g. "ATEX Zone 1 Ex d IIC T4", "Zone 0 Ex ia IIC T6", "Class 1 Div 1"
  technicalSpecs?: Record<string, string | number | boolean>; // Dynamic custom key-value specifications

  physicalDimensions?: string;
  weight?: string;
  electricalRating?: string;
  outputProtocol?: string;
  hazardousClassification?: string;
  ipRating?: string;
  silRating?: string;
  materialOfConstruction?: string;
  processConnection?: string;
  fluidService?: string;
  temperatureLimits?: string;
  pressureLimits?: string;
  accuracy?: string;
  enclosureType?: string;
  powerSupply?: string;
  calibrationInterval?: string;
  criticality?: 'Critical' | 'Major' | 'Minor' | 'Non-Critical';
  isCritical?: boolean;

  // Extended Engineering Fields
  compatibleEquipment?: string[]; // Equipment tag numbers
  serialNumbers?: MaterialSerialNumber[]; // Multiple serial numbers support
  healthScore?: number; // AI calculated health score (0-100)
  alternatives?: MaterialAlternatives;
  documents?: {
    datasheet?: MaterialDocument;
    coc?: MaterialDocument;
    materialRequest?: MaterialDocument;
    evaluationRequest?: MaterialDocument;
    inspectionReport?: MaterialDocument;
    technicalDrawing?: MaterialDocument;
    operationManual?: MaterialDocument;
    maintenanceManual?: MaterialDocument;
    originalExcel?: MaterialDocument;
    calibrationCertificate?: MaterialDocument;
    vendorQuotation?: MaterialDocument;
    purchaseOrder?: MaterialDocument;
    other?: MaterialDocument;
  };
  photos?: MaterialPhotoLibrary;
  photo?: string;
  nameplatePhoto?: string;
  primaryIdentifierPhoto?: string;
  history?: MaterialHistoryEvent[];
  engineeringNotes?: string;
  oemVerified?: boolean;
  oemVerificationStatus?: 'verified' | 'authorized' | 'alternative' | 'pending';
  oemCertificateId?: string;
  oemVerifiedBy?: string;
  oemVerificationDate?: string;
  oemVerificationNotes?: string;
}

export interface Equipment {
  tagNumber: string; // Unique tag e.g. EQ-PMP-101
  name: string;
  manufacturer: string;
  model: string;
  plant: string;
  area: string;
  unit: string;
  description: string;
  photoUrl?: string;
  installationDate: string;
  status: 'operational' | 'maintenance' | 'offline' | 'standby';
  compatibleSpares: string[]; // List of Material part numbers
  materialsList?: string[]; // Alias for compatibleSpares
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'create' | 'update' | 'delete' | 'auth';
  details: string;
  timestamp: string;
}

export interface TechnicalDifference {
  feature: string;
  requested: string;
  candidate: string;
  impact: 'low' | 'medium' | 'critical' | 'favorable';
}

export interface NearestSubstitute {
  material: Material;
  matchScore: number; // 0 to 100
  nearestModel: string;
  nearestPartNumber: string;
  compatibilityReason: string;
  availableStock: number;
  stockUnit: string;
  storeLocation: string;
  rackLocation: string;
  differences: TechnicalDifference[];
  differencesSummary: string;
  engineeringAdvisory: string;
  approvalStatus: 'needs_review' | 'approved_in_decisions' | 'blacklisted' | 'pre_qualified';
  matchingParameters: string[];
  differentParameters?: string[];
  missingParameters?: string[];
  riskNotes?: string;
  matchTier?: MatchTier;
  decisionReference?: string;

  // New EMIS Engineering Intelligence Attributes
  previouslyApproved?: boolean;
  approvedDecision?: {
    id: string;
    title: string;
    details?: string;
    rationale?: string;
    approvedBy: string;
    approvalDate: string;
    decisionType?: 'approval' | 'rejection' | 'lesson';
  };
  similarityBreakdown?: {
    typeMatch: 'Match' | 'Different' | 'Compatible' | 'N/A';
    pressureMatch: 'Match' | 'Different' | 'Compatible' | 'N/A';
    connectionMatch: 'Match' | 'Different' | 'Compatible' | 'N/A';
    manufacturerMatch: 'Match' | 'Different' | 'Compatible' | 'N/A';
    voltageMatch?: 'Match' | 'Different' | 'Compatible' | 'N/A';
    materialMatch?: 'Match' | 'Different' | 'Compatible' | 'N/A';
    overallScore: number;
  };
  isOfflineFallback?: boolean;
}

export interface AiDiagnosticTelemetry {
  id: string;
  timestamp: string;
  type: 'search' | 'ocr' | 'chat' | 'datasheet' | 'sync' | 'connectivity';
  endpoint: string;
  method: string;
  requestPayload?: any;
  responseStatus?: number;
  responseBody?: any;
  durationMs?: number;
  isSuccess: boolean;
  rawErrorMessage?: string;
  errorDetails?: {
    code?: string;
    message?: string;
    stack?: string;
    isNetworkError?: boolean;
    isCorsError?: boolean;
    isApiKeyError?: boolean;
  };
}

export interface Statistics {
  totalMaterials: number;
  lowStockCount: number;
  totalQuantity: number;
}

export interface BlacklistItem {
  id: string;
  partNumber: string;
  serialNumber: string;
  supplierName: string;
  reportedDate: string;
  reason: string; // e.g. "counterfeit" | "non-compliant" | "failed-verification"
  reporterName: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface FeedbackItem {
  id: string;
  category: 'bug' | 'feature' | 'suggestion' | 'ui';
  title: string;
  description: string;
  submittedBy: string;
  userRole: UserRole;
  status: 'open' | 'review' | 'implemented';
  createdAt: string;
}

export interface PendingSyncChange {
  id: string;
  entityType: 'material' | 'equipment' | 'activity' | 'feedback' | 'decision' | 'history';
  action: 'create' | 'update' | 'delete' | 'quantity_change';
  itemKey: string;
  itemTitle: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
  payload?: any;
}

export interface EngineeringDecision {
  id: string;
  partNumber: string;
  title: string;
  decisionType: 'approval' | 'rejection' | 'lesson' | 'maintenance';
  details: string;
  approvedBy: string;
  approvalDate: string;
  rationale: string;
}



export interface FieldWithConfidence {
  value: string | null;
  confidence: number;
}

export interface ExtractedData {
  manufacturer?: FieldWithConfidence;
  brand?: FieldWithConfidence;
  model?: FieldWithConfidence;
  partNumber?: FieldWithConfidence;
  serialNumber?: FieldWithConfidence;
  voltage?: FieldWithConfidence;
  current?: FieldWithConfidence;
  power?: FieldWithConfidence;
  output?: FieldWithConfidence;
  input?: FieldWithConfidence;
  frequency?: FieldWithConfidence;
  revision?: FieldWithConfidence;
  manufactureDate?: FieldWithConfidence;
  countryOfOrigin?: FieldWithConfidence;
  certificationMarks?: FieldWithConfidence;
  barcode?: FieldWithConfidence;
  qrCode?: FieldWithConfidence;
  additionalSpecs?: { [key: string]: FieldWithConfidence };
}

// --- EXTERNAL COMPANY STOCK SYSTEM (INDEPENDENT DATA ENGINE) ---

// 1. External Source Model
export interface ExternalSource {
  sourceId: string;           // مثال: "EXT-CENTRAL-01"
  sourceName: string;         // اسم الجهة أو المخزن
  warehouseName: string;      // اسم الموقع أو المستودع
  fileName: string;           // اسم ملف الـ Excel الحالي
  description: string;        // وصف إضافي
  importDate: string;         // تاريخ أول استيراد
  lastUpdated: string;        // تاريخ آخر تحديث أو استبدال
  recordCount: number;        // إجمالي عدد السجلات
  version: number;            // رقم الإصدار للنسخة
  status: 'Active' | 'Archived' | 'Updating' | 'ACTIVE' | 'ARCHIVED' | 'UPDATED' | 'REPLACED' | string;
  checksum: string;           // بصمة الملف لمنع التكرار
  createdBy: string;

  // Compatibility & Extended Properties
  id?: string;                // Compatibility alias for sourceId
  active?: boolean;
  sequenceRange?: string;     // e.g. "1 - 2450"
  detectedDuplicateSequences?: Array<{ sequence: number | string; rows: number[] }>;
  notes?: string;
  fileSize?: number;
}

// Backward compatibility alias
export type ExternalFile = ExternalSource & {
  id: string; // Alias for sourceId
};

// 2. External Material Model (مع الحفاظ على الصف الأصلي)
export interface ExternalMaterial {
  id: string;                 // معرف فريد للسجل
  sourceId: string;           // مرتبط بمجموعة externalSources
  sourceName: string;
  warehouseName: string;
  fileName: string;
  originalRowNumber: number;  // 🔴 الرقم الحقيقي للصف في ملف الـ Excel (لا يتغير أبداً بالفرز)
  importBatchId: string;      // معرف دفعة الاستيراد
  partNumber: string;
  serialNumber?: string;
  description: string;
  manufacturer?: string;
  model?: string;
  supplier?: string;
  quantity?: number;
  unit?: string;
  store?: string;
  rack?: string;
  shelf?: string;
  mr?: string;
  mrf?: string;
  mrfNumber?: string;
  po?: string;
  wo?: string;
  woNumber?: string;
  tagNumber?: string;
  installationLocation?: string;
  tagLocation?: string;
  status: string;
  normalizedPartNumber: string; // للبحث السريع بدون رموز
  normalizedSerialNumber: string;
  importedAt: string;

  // Extended & Compatibility Properties
  sourceFileId?: string;        // Alias for sourceId
  sourceFileName?: string;      // Alias for fileName
  originalSequence?: number | string; // Sequence column from Excel
  originalExcelRow?: number;    // Alias for originalRowNumber
  importVersion?: number;
  notes?: string;
  brand?: string;
  measuringRange?: string;
  electricalRating?: string;
  outputProtocol?: string;
  category?: string;
  originalDataJson?: string;    // Serialized raw original Excel row
}

// --- EMIS v0.4 EXCEL IMPORT BATCH & HISTORY ---
export interface ImportBatch {
  importBatchId: string;
  sourceId: string;
  sourceName: string;
  fileName: string;
  date: string; // ISO timestamp
  user: string;
  recordsImported: number;
  recordsFailed: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'REPLACED';
  failedRows?: Array<{ rowNumber: number; reason: string; rawData?: any }>;
  notes?: string;
}

// --- EMIS v0.4 DOCUMENT CENTER ---
export type DocumentType = 
  | 'Datasheet' 
  | 'CoC' 
  | 'CoO' 
  | 'PO' 
  | 'MR' 
  | 'MRF' 
  | 'WO' 
  | 'Manual' 
  | 'Calibration Certificate' 
  | 'Inspection Report' 
  | 'Photo' 
  | 'ATEX Certificate'
  | 'Other'
  | 'DATASHEET'
  | 'CERTIFICATE_OF_CONFORMITY'
  | 'CERTIFICATE_OF_ORIGIN'
  | 'ATEX_CERTIFICATE'
  | 'CALIBRATION_CERTIFICATE'
  | 'INSPECTION_REPORT'
  | 'PURCHASE_ORDER'
  | 'MATERIAL_REQUEST'
  | 'WORK_ORDER'
  | 'USER_MANUAL';

export type AppDocumentType = DocumentType;

export interface AppDocument {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  documentType: DocumentType;
  uploadedBy: string;
  uploadedAt: string;
  relatedPartNumber?: string;
  relatedEquipmentTag?: string;
  relatedMrNumber?: string;
  relatedPoNumber?: string;
  relatedWoNumber?: string;
  relatedSerial?: string;
  dataUrl?: string; // Local base64 or stored data url
  url?: string; // External or cloud link
  googleDriveFileId?: string;
  notes?: string;
}

// --- EMIS v0.4 SEARCH HISTORY & FAVORITES ---
export interface SearchHistoryItem {
  id: string;
  term: string;
  timestamp: string;
  resultCount: number;
  sourceFilter?: string;
}

export interface FavoriteItem {
  id: string;
  entityType: 'material' | 'equipment' | 'external_source' | 'document';
  entityId: string;
  title: string;
  subtitle: string;
  sourceLabel?: string;
  addedAt: string;
}

// --- EMIS v0.4 ENGINEERING VERIFICATION ENGINE ---
export type VerificationStatusType = 'MATCH' | 'PARTIAL_MATCH' | 'MISMATCH' | 'BLACKLISTED' | 'INSUFFICIENT_DATA';

export interface VerificationCheckItem {
  parameter: string;
  expected: string;
  actual: string;
  status: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'N/A';
  notes?: string;
}

export interface EngineeringVerificationResult {
  id: string;
  partNumber: string;
  status: VerificationStatusType;
  color: 'green' | 'yellow' | 'red' | 'black' | 'gray';
  title: string;
  reason: string;
  details: string;
  checks: VerificationCheckItem[];
  blacklistedWarning?: {
    reason: string;
    supplier: string;
    reportedDate: string;
    reporter: string;
  };
  approvedDecisions?: EngineeringDecision[];
  compatibleEquipmentTags?: string[];
  timestamp: string;
  verifiedBy: string;
}

// --- EMIS v0.4 DUPLICATE DETECTION ---
export interface DuplicateCandidate {
  id: string;
  primaryKey: string;
  normalizedKey: string;
  confidenceScore: number; // 0 - 100
  items: Array<{
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
  }>;
  matchReasons: string[];
}

export type UnifiedSearchResultSource = 'STATION_MATERIAL' | 'EXTERNAL_STOCK' | 'EQUIPMENT' | 'MRF_WO' | 'DOCUMENT' | 'BLACKLIST';

export interface UnifiedSearchResult {
  id: string;
  source: UnifiedSearchResultSource;
  sourceLabel: string;
  badgeColor: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'teal';
  title: string; // Part Number / Tag Number / MR Number
  subtitle: string; // Description
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  warehouseOrLocation: string; // Station store or External Warehouse
  fileName?: string;
  originalSequence?: number | string;
  originalExcelRow?: number;
  originalRowNumber?: number;
  sourceFileId?: string;
  sourceId?: string;
  quantity?: number;
  unit?: string;
  rack?: string;
  shelf?: string;
  mr?: string;
  mrf?: string;
  po?: string;
  wo?: string;
  status?: string;
  matchCategory: string;
  matchScore: number;
  highlightField: string;
  isBlacklisted?: boolean;
  rawData: any;
}

// ==========================================
// --- EMIS v0.6 PORT 6: AI ENGINEERING INTELLIGENCE ---
// ==========================================

export enum AITaskType {
  MATERIAL_IDENTIFICATION = 'MATERIAL_IDENTIFICATION',
  DESCRIPTION_GENERATION = 'DESCRIPTION_GENERATION',
  DATASHEET_ANALYSIS = 'DATASHEET_ANALYSIS',
  DOCUMENT_ANALYSIS = 'DOCUMENT_ANALYSIS',
  MR_MATCHING = 'MR_MATCHING',
  PO_MATCHING = 'PO_MATCHING',
  NAMEPLATE_ANALYSIS = 'NAMEPLATE_ANALYSIS',
  TECHNICAL_COMPARISON = 'TECHNICAL_COMPARISON',
  MISMATCH_DETECTION = 'MISMATCH_DETECTION',
  MISSING_INFORMATION = 'MISSING_INFORMATION',
  WEB_RESEARCH = 'WEB_RESEARCH',
  INSPECTION_SUMMARY = 'INSPECTION_SUMMARY',
  INSPECTION_COMMENT = 'INSPECTION_COMMENT',
  REPORT_GENERATION = 'REPORT_GENERATION',
  MATERIAL_ALTERNATIVE_SEARCH = 'MATERIAL_ALTERNATIVE_SEARCH',
  EVIDENCE_SUMMARY = 'EVIDENCE_SUMMARY'
}

export enum SourceQualityLevel {
  LEVEL_1_OFFICIAL_WEBSITE = 1,
  LEVEL_2_OFFICIAL_DATASHEET = 2,
  LEVEL_3_OFFICIAL_MANUAL_CATALOG = 3,
  LEVEL_4_AUTHORIZED_DISTRIBUTOR = 4,
  LEVEL_5_TECHNICAL_THIRD_PARTY = 5,
  LEVEL_6_GENERAL_SEARCH = 6
}

export type ConflictSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFORMATIONAL';

export interface AIEvidenceItem {
  id: string;
  type: 'NAMEPLATE' | 'MR' | 'PO' | 'DATASHEET' | 'COC' | 'COO' | 'DELIVERY_NOTE' | 'MANUFACTURER_WEB' | 'INTERNAL_LEDGER' | 'ENGINEER_NOTE' | string;
  parameter: string;
  expectedValue?: string;
  actualValue: string;
  sourceTitle: string;
  sourceType: string;
  sourceQualityLevel: number; // 1-6
  sourceUrl?: string;
  confidence: number; // 0-100
  status: 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND' | 'UNCERTAIN';
  isVerifiedByEngineer?: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
  comment?: string;
}

export interface TechnicalConflict {
  id: string;
  field: string;
  severity: ConflictSeverity;
  expectedValue: string;
  expectedSource: string;
  actualValue: string;
  actualSource: string;
  impact: string;
  recommendedAction: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedDate?: string;
  resolutionNote?: string;
}

export interface CrossVerificationMatrixRow {
  field: string;
  mrValue?: string;
  poValue?: string;
  nameplateValue?: string;
  datasheetValue?: string;
  cocValue?: string;
  cooValue?: string;
  deliveryNoteValue?: string;
  result: 'MATCH' | 'PARTIAL' | 'MISMATCH' | 'INSUFFICIENT_DATA' | 'N/A';
  conflictSeverity?: ConflictSeverity;
  notes?: string;
}

export interface MaterialCandidate {
  id: string;
  manufacturer: string;
  productFamily?: string;
  model: string;
  productType: string;
  technicalDescription: string;
  possiblePartNumber?: string;
  confidence: number; // 0-100
  evidenceCount: number;
  evidence: AIEvidenceItem[];
  sources: WebSearchSource[];
  isSelected?: boolean;
}

export interface AIAnalysisVersion {
  id: string;
  version: number;
  timestamp: string;
  provider: string;
  taskType: AITaskType | string;
  confidenceScore: number;
  technicalMatchScore: number;
  ruleMatchScore: number;
  evidence: AIEvidenceItem[];
  conflicts: TechnicalConflict[];
  missingDocuments: string[];
  recommendation: 'RECOMMENDED_ACCEPT' | 'RECOMMENDED_HOLD' | 'RECOMMENDED_REJECT' | 'INSUFFICIENT_INFORMATION';
  recommendationSummary: string;
  engineerDecision?: 'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION' | 'EDIT';
  engineerComments?: string;
  engineerName?: string;
  engineerDecisionDate?: string;
  requestedInfoTypes?: string[];
}

export interface KnowledgeRecord {
  id: string;
  manufacturer: string;
  productFamily: string;
  model: string;
  description: string;
  productType: string;
  knownSpecs: Record<string, string>;
  sourceUrls: string[];
  status: 'AI_GENERATED' | 'AI_SUGGESTED' | 'SOURCE_VERIFIED' | 'ENGINEER_VERIFIED';
  verifiedBy?: string;
  verifiedDate?: string;
  verificationNotes?: string;
  lastUpdated: string;
}

export interface MaterialVerificationReport {
  id: string;
  reportNumber: string;
  partNumber: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'FINAL';
  createdAt: string;
  updatedAt: string;
  materialInfo: Partial<Material>;
  mrData?: {
    mrNumber?: string;
    itemDescription?: string;
    requestedModel?: string;
    requestedQty?: number;
    urgency?: string;
  };
  poData?: {
    poNumber?: string;
    supplier?: string;
    orderedModel?: string;
    unitPrice?: string;
    deliveryTerms?: string;
  };
  deliveryData?: {
    deliveryNoteNumber?: string;
    deliveryDate?: string;
    receivedQty?: number;
    carrier?: string;
  };
  nameplateData?: {
    scannedText?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    ratings?: string;
  };
  datasheetData?: {
    docName?: string;
    oemModel?: string;
    publishedSpecs?: Record<string, string>;
  };
  cocData?: {
    certificateNumber?: string;
    standard?: string;
    validUntil?: string;
    issuer?: string;
  };
  cooData?: {
    countryOfOrigin?: string;
    issuer?: string;
  };
  crossMatrix: CrossVerificationMatrixRow[];
  conflicts: TechnicalConflict[];
  missingDocuments: string[];
  aiAnalysis?: Partial<AIAnalysisVersion>;
  evidence: AIEvidenceItem[];
  sources: WebSearchSource[];
  recommendation: string;
  engineerDecision?: {
    decision: 'ACCEPT' | 'REJECT' | 'HOLD' | 'REQUEST_MORE_INFORMATION';
    reviewer: string;
    date: string;
    comments: string;
  };
  auditTrail: AuditLogEntry[];
  finalizedBy?: string;
  finalizedDate?: string;
}

// ==========================================
// EMIS v0.7 ENTERPRISE OPERATIONS & LIFECYCLE
// ==========================================

export enum MaterialLifecycleStatus {
  DRAFT = 'DRAFT',
  REQUESTED = 'REQUESTED',
  ORDERED = 'ORDERED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PENDING_INSPECTION = 'PENDING_INSPECTION',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
  MATCHED = 'MATCHED',
  PARTIAL_MATCH = 'PARTIAL_MATCH',
  MISMATCH = 'MISMATCH',
  DOCUMENT_PENDING = 'DOCUMENT_PENDING',
  ACCEPTED = 'ACCEPTED',
  ACCEPTED_WITH_COMMENT = 'ACCEPTED_WITH_COMMENT',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
  STORED = 'STORED',
  TRANSFERRED = 'TRANSFERRED',
  ISSUED = 'ISSUED',
  RETURNED = 'RETURNED',
  RE_INSPECTION = 'RE_INSPECTION',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

export type HierarchyNodeType = 'ORGANIZATION' | 'SITE' | 'AREA' | 'UNIT' | 'FACILITY' | 'WAREHOUSE' | 'LOCATION' | 'BIN';

export interface EnterpriseHierarchyNode {
  id: string;
  code: string;
  name: string;
  type: HierarchyNodeType;
  parentId?: string | null;
  siteId?: string; // Top site root
  path?: string; // e.g. "HQ > NDGS > Area-01 > Unit-B > Central Warehouse > Rack A"
  address?: string;
  manager?: string;
  contactEmail?: string;
  contactPhone?: string;
  capacityMax?: number;
  currentCount?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseLocationDetail {
  id: string;
  siteId: string;
  siteName: string;
  warehouseName: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  barcode: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  capacityMax: number;
  currentItemsCount: number;
  notes?: string;
}

export type StockTransactionType =
  | 'RECEIPT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ISSUE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'REJECTION'
  | 'DISPOSAL'
  | 'RESERVATION'
  | 'RELEASE'
  | 'CYCLE_COUNT_ADJUSTMENT';

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  materialId: string; // Part number or internal ID
  partNumber: string;
  materialDescription: string;
  transactionType: StockTransactionType;
  quantityChange: number; // positive or negative
  quantityBefore: number;
  quantityAfter: number;
  unit: string;
  site: string;
  warehouse?: string;
  location?: string;
  targetSite?: string;
  targetWarehouse?: string;
  targetLocation?: string;
  referenceType: 'MR' | 'PO' | 'WO' | 'TRANSFER' | 'DISPATCH' | 'ADJUSTMENT' | 'COUNT' | 'INSPECTION' | 'SCRAP' | 'INITIAL';
  referenceNumber: string;
  performedBy: string;
  role?: string;
  timestamp: string;
  reason?: string;
  notes?: string;
  batchNumber?: string;
}

export interface MaterialTransfer {
  id: string;
  transferNumber: string; // e.g. "TRF-2026-0042"
  materialId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  fromSite: string;
  fromWarehouse: string;
  fromLocation: string;
  toSite: string;
  toWarehouse: string;
  toLocation: string;
  reason: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  requestedBy: string;
  requestDate: string;
  approvedBy?: string;
  approvalDate?: string;
  dispatchedBy?: string;
  dispatchDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  status: 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED' | 'REJECTED';
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  dispatchSlipNumber?: string;
  qrPayload?: string;
}

export interface MaterialIssue {
  id: string;
  issueNumber: string; // e.g. "ISS-2026-0105"
  materialId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  site: string;
  warehouse: string;
  issuedTo: string; // Recipient technician / team
  department?: string;
  workOrderNumber?: string;
  project?: string;
  purpose: string;
  requestedBy: string;
  approvedBy?: string;
  issueDate: string;
  status: 'ISSUED' | 'CANCELLED';
  expectedReturnDate?: string;
  notes?: string;
}

export interface MaterialReturn {
  id: string;
  returnNumber: string; // e.g. "RET-2026-0018"
  materialId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  returnFrom: string;
  returnToSite: string;
  returnToWarehouse: string;
  returnToLocation?: string;
  reason: string;
  condition: 'NEW' | 'GOOD' | 'USED' | 'DAMAGED' | 'QUARANTINED' | 'UNKNOWN';
  returnedBy: string;
  returnDate: string;
  status: 'RECEIVED' | 'UNDER_RE_INSPECTION' | 'ACCEPTED' | 'SCRAPPED';
  inspectionRequired: boolean;
  inspectionRecordId?: string;
  notes?: string;
}

export interface MaterialReservation {
  id: string;
  reservationNumber: string; // e.g. "RES-2026-0034"
  materialId: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  site: string;
  reservedFor: string; // Work Order / Project / Tag
  reservedBy: string;
  reservationDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  purpose: string;
  notes?: string;
}

export interface ReceivingSessionItem {
  id: string;
  partNumber: string;
  description: string;
  expectedQty: number;
  receivedQty: number;
  unit: string;
  scannedBarcode?: string;
  nameplatePhoto?: string;
  ocrExtractedText?: string;
  aiVerificationStatus?: 'MATCH' | 'MISMATCH' | 'PENDING' | 'MANUAL_OVERRIDE';
  inspectionResult?: 'ACCEPTED' | 'REJECTED' | 'ON_HOLD' | 'PENDING';
  assignedLocation?: string;
  assignedWarehouse?: string;
  notes?: string;
}

export interface ReceivingSession {
  id: string;
  sessionNumber: string; // e.g. "REC-2026-0091"
  mrNumber?: string;
  poNumber?: string;
  supplier: string;
  deliveryNote: string;
  carrier?: string;
  site: string;
  warehouse: string;
  receivingDate: string;
  receivedBy: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  totalItems: number;
  completedItems: number;
  items: ReceivingSessionItem[];
  notes?: string;
}

export interface SupplierEntity {
  id: string;
  code: string;
  name: string;
  category: string; // e.g. "Instrumentation OEM", "Valves & Piping", "Electrical Systems"
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  rating: number; // 1.0 - 5.0
  status: 'ACTIVE' | 'APPROVED' | 'UNDER_REVIEW' | 'BLACKLISTED';
  totalDeliveries: number;
  acceptedDeliveries: number;
  rejectedDeliveries: number;
  onTimeDeliveryRate: number; // 0 - 100%
  complianceScore: number; // 0 - 100%
  notes: string;
  lastDeliveryDate?: string;
}

export interface EnterpriseTask {
  id: string;
  taskNumber: string; // e.g. "TSK-2026-0182"
  title: string;
  description: string;
  category: 'INSPECTION' | 'APPROVAL' | 'MISSING_DOCUMENT' | 'TRANSFER' | 'REORDER' | 'CYCLE_COUNT' | 'MISMATCH_REVIEW' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  relatedEntity: 'Material' | 'Transfer' | 'Receiving' | 'Adjustment' | 'Supplier' | 'MR' | 'PO';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  slaStatus: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE';
  notes?: string;
}

export interface ApprovalRequest {
  id: string;
  approvalNumber: string; // e.g. "APP-2026-0056"
  type: 'MATERIAL_ACCEPTANCE' | 'MATERIAL_TRANSFER' | 'INVENTORY_ADJUSTMENT' | 'SCRAP_DISPOSAL' | 'REORDER_REQUISITION';
  title: string;
  description: string;
  requestedBy: string;
  requestedDate: string;
  priority: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  amountOrQuantity?: string;
  relatedEntityId: string;
  relatedEntityNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION';
  decidedBy?: string;
  decidedDate?: string;
  comments?: string;
}

export interface StockCountItem {
  materialId: string;
  partNumber: string;
  description: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  unit: string;
  location: string;
  status: 'MATCH' | 'SHORTAGE' | 'SURPLUS' | 'UNCOUNTED';
  countedBy?: string;
  countedAt?: string;
  notes?: string;
}

export interface StockCountSession {
  id: string;
  sessionNumber: string; // e.g. "CNT-2026-0012"
  site: string;
  warehouse: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  items: StockCountItem[];
  totalVarianceCount: number;
  notes?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: 'ON_MATERIAL_REJECTED' | 'ON_STOCK_BELOW_MIN' | 'ON_MISSING_DOCS' | 'ON_TRANSFER_REQUESTED' | 'ON_RECEIPT_COMPLETED' | 'ON_EXPIRY_APPROACHING';
  conditions: { field: string; operator: 'EQUALS' | 'NOT_EQUALS' | 'LESS_THAN' | 'GREATER_THAN' | 'CONTAINS'; value: any }[];
  actions: { type: 'CREATE_TASK' | 'SEND_NOTIFICATION' | 'SEND_EMAIL' | 'CHANGE_STATUS' | 'TRIGGER_AI_AUDIT'; targetRoleOrUser?: string; template?: string }[];
  active: boolean;
  createdAt: string;
}

// ==========================================
// --- EMIS v0.8 INTELLIGENCE & ANALYTICS ---
// ==========================================

export type SmartAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type SmartAlertCategory = 'STOCK' | 'DOCUMENT' | 'INSPECTION' | 'APPROVAL' | 'MISMATCH' | 'TRANSFER' | 'SUPPLIER' | 'SYNC' | 'SECURITY' | 'AI' | 'SYSTEM';
export type SmartAlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface SmartAlert {
  id: string;
  fingerprint: string;
  category: SmartAlertCategory;
  severity: SmartAlertSeverity;
  title: string;
  arabicTitle?: string;
  description: string;
  site: string;
  materialId?: string;
  partNumber?: string;
  materialDescription?: string;
  relatedEntity?: 'Material' | 'Transfer' | 'Receiving' | 'Supplier' | 'Task' | 'Approval' | 'Document' | 'Sync' | 'Inspection';
  relatedEntityId?: string;
  relatedEntityNumber?: string;
  ruleCode: string;
  status: SmartAlertStatus;
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  emailSent?: boolean;
  emailRecipient?: string;
  emailTimestamp?: string;
  emailDeliveryStatus?: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED' | 'SIMULATION';
  emailError?: string;
}

export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  emailLevel: 'CRITICAL_ONLY' | 'HIGH_CRITICAL' | 'ALL' | 'DISABLED';
  inAppEnabled: boolean;
  siteSubscriptions: string[]; // empty means all
  categorySubscriptions: SmartAlertCategory[];
  dailySummary: boolean;
  recipientEmail: string;
  updatedAt: string;
}

export interface MaterialHealthScore {
  partNumber: string;
  overallScore: number; // 0 - 100
  grade: 'HEALTHY' | 'ATTENTION' | 'HIGH_RISK' | 'CRITICAL';
  arabicGrade: string;
  dimensions: {
    identityCompleteness: { score: number; max: 20; factors: string[] };
    documentCompleteness: { score: number; max: 25; factors: string[] };
    matchingStatus: { score: number; max: 20; factors: string[] };
    inspectionStatus: { score: number; max: 15; factors: string[] };
    stockStatus: { score: number; max: 10; factors: string[] };
    lifecycleStatus: { score: number; max: 10; factors: string[] };
  };
  reasons: string[];
}

export interface SupplierRiskProfile {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  country: string;
  category: string;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  arabicRiskTier: string;
  overallScore: number; // 0 - 100
  totalDeliveries: number;
  acceptedDeliveries: number;
  rejectedDeliveries: number;
  rejectionRate: number; // 0 - 100%
  missingDocsCount: number;
  mismatchCount: number;
  onTimeDeliveryRate: number;
  complianceScore: number;
  status: string;
  evidence: string[];
  recommendation: string;
}

export interface CrossSiteOpportunity {
  id: string;
  partNumber: string;
  description: string;
  manufacturer: string;
  requestingSite: string;
  shortageQuantity: number;
  matchingSite: string;
  matchingWarehouse: string;
  availableQuantity: number;
  urgency: 'ROUTINE' | 'ELEVATED' | 'CRITICAL';
  reason: string;
  estimatedLeadTimeHours: number;
}

export interface AgingBucketItem {
  id: string;
  title: string;
  referenceNumber: string;
  site: string;
  createdAt: string;
  ageDays: number;
  urgency: 'ROUTINE' | 'WARNING' | 'OVERDUE' | 'CRITICAL';
  assignedTo?: string;
}

export interface AgingAnalysis {
  category: 'INSPECTION' | 'APPROVAL' | 'TRANSFER' | 'RECEIVING';
  totalPending: number;
  averageAgeDays: number;
  oldestItemDays: number;
  overdueCount: number;
  buckets: {
    range: '0_1_DAYS' | '2_3_DAYS' | '4_7_DAYS' | '8_14_DAYS' | '15_PLUS_DAYS';
    label: string;
    count: number;
    items: AgingBucketItem[];
  }[];
}

export interface EngineeringKpiMetric {
  id: string;
  name: string;
  arabicName: string;
  category: 'QUALITY' | 'OPERATIONS' | 'SUPPLY_CHAIN' | 'COMPLIANCE' | 'AI';
  formula: string;
  dataSource: string;
  currentValue: number;
  unit: '%' | 'days' | 'count' | 'ratio';
  previousValue: number;
  changePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  target: number;
  benchmark: string;
}

export interface AiEngineeringInsight {
  id: string;
  generatedAt: string;
  site: string;
  dateRange: string;
  summary: string;
  arabicSummary?: string;
  risks: {
    title: string;
    severity: SmartAlertSeverity;
    details: string;
    affectedEntities: string[];
  }[];
  opportunities: {
    title: string;
    details: string;
    potentialGain: string;
  }[];
  recommendations: {
    title: string;
    actionType: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }[];
  evidence: {
    metric: string;
    value: string;
    source: string;
  }[];
  confidence: number;
  model: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export type AnalyticsDateFilter = 'TODAY' | '7_DAYS' | '30_DAYS' | '90_DAYS' | 'THIS_YEAR' | 'ALL_TIME';

// ============================================================================
// EMIS PORT 9: MULTILINGUAL MATERIAL INTELLIGENCE & WEB EVIDENCE MODELS
// ============================================================================

export type AppLanguage = 'en' | 'ar';

export type SourceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type SourceType = 
  | 'OFFICIAL_MANUFACTURER' 
  | 'MANUFACTURER_DATASHEET' 
  | 'MANUFACTURER_MANUAL' 
  | 'AUTHORIZED_DISTRIBUTOR' 
  | 'TECHNICAL_DOCUMENTATION' 
  | 'INDUSTRIAL_DATABASE' 
  | 'WEB_SEARCH';

export interface MaterialTranslation {
  id: string;
  materialId?: string;
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  translatedLanguage: string;
  technicalMeaning?: string;
  category?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  source: 'DICTIONARY' | 'AI_GEMINI' | 'OFFICIAL_DATASHEET' | 'MANUAL';
  provider: string;
  timestamp: string;
  savedByUser?: string;
}

export interface WebEvidenceSource {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  sourceType: SourceType;
  confidence: SourceConfidence;
  date?: string;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedFields?: string[];
  isOfficialDomain?: boolean;
}

export interface MaterialImageResult {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceUrl: string;
  sourceDomain: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matchType: 'EXACT_PRODUCT' | 'REFERENCE_IMAGE' | 'POSSIBLE_MATCH' | 'NAMEPLATE_EXAMPLE' | 'CATALOG_DIAGRAM';
  isReferenceOnly: true;
}

export interface DatasheetSearchResult {
  id: string;
  title: string;
  manufacturer: string;
  model?: string;
  partNumber?: string;
  url: string;
  domain: string;
  fileType: 'PDF' | 'DOC' | 'HTML';
  revision?: string;
  date?: string;
  confidence: SourceConfidence;
  isOfficial: boolean;
  summary?: string;
}

export interface ManufacturerIntelligence {
  name: string;
  normalizedName: string;
  officialWebsite?: string;
  headquarters?: string;
  supportPortalUrl?: string;
  productFamilies?: string[];
  knownCatalogUrls?: string[];
  isVerifiedDomain?: boolean;
  notes?: string;
}

export interface TechnicalConflictItem {
  field: string;
  dbValue: string;
  webValue: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface MaterialIntelligenceResult {
  materialId?: string;
  originalName: string;
  arabicName: string;
  arabicDescription?: string;
  technicalMeaningArabic: string;
  technicalMeaningEnglish?: string;
  category: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  application: string;
  industry: string;
  knownSpecifications: Record<string, string>;
  relatedEquipment: string[];
  possibleAlternatives: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  evidenceLevel: 'Verified' | 'Likely' | 'Possible' | 'Unknown';
  webSources: WebEvidenceSource[];
  datasheets: DatasheetSearchResult[];
  images: MaterialImageResult[];
  manufacturerInfo?: ManufacturerIntelligence;
  aiExplanation?: string;
  conflictsDetected?: TechnicalConflictItem[];
  searchHistoryId?: string;
  timestamp: string;
  isDeterminedConfident: boolean;
}

export interface MaterialSearchHistoryItem {
  id: string;
  query: string;
  materialId?: string;
  materialName?: string;
  timestamp: string;
  user: string;
  resultsCount: number;
  searchType: 'ALL' | 'WEB' | 'DATASHEET' | 'IMAGES' | 'AI_ANALYSIS' | 'TRANSLATION';
  topSources: string[];
}

export interface TechnicalAbbreviation {
  code: string;
  englishName: string;
  arabicName: string;
  category: 'INSTRUMENTATION' | 'VALVES' | 'AUTOMATION' | 'SAFETY' | 'ELECTRICAL' | 'DOCUMENTATION';
  descriptionEnglish: string;
  descriptionArabic: string;
}

// ============================================================================
// PORT 13: ENTERPRISE EVOLUTION, WEB ACCESS, DATA SAFETY & RECYCLE BIN TYPES
// ============================================================================

export type RecycleBinRecordType = 
  | 'Material' 
  | 'Site' 
  | 'Warehouse' 
  | 'Supplier' 
  | 'MR' 
  | 'PO' 
  | 'WO' 
  | 'Inspection' 
  | 'Document' 
  | 'Notification';

export type RecycleBinStatus = 
  | 'DELETED / RECOVERABLE' 
  | 'RESTORED' 
  | 'EXPIRED' 
  | 'PURGE_PENDING' 
  | 'PURGED' 
  | 'PURGE_FAILED';

export interface RecycleBinItem {
  id: string;
  recordType: RecycleBinRecordType;
  recordId: string;
  recordTitle: string;
  originalRecordId: string;
  originalSite?: string;
  originalWarehouse?: string;
  originalStatus?: string;
  deletedAt: string;
  deletedBy: string;
  deletedByRole?: UserRole | string;
  deletionReason: string;
  deletionSource: 'WEB' | 'ANDROID' | 'SYSTEM';
  deletionVersion?: number | string;
  retentionDays: number;
  restoreAvailableUntil: string;
  status: RecycleBinStatus;
  data: any; // Complete snapshot for 100% loss-free restoration
  restoredAt?: string;
  restoredBy?: string;
  purgedAt?: string;
  purgeError?: string;
}

export interface RecycleBinSettings {
  retentionDays: 7 | 14 | 30 | 60 | 90;
  autoPurgeEnabled: boolean;
  lastPurgeRun?: string;
}

export interface MaterialVersionEntry {
  id: string;
  version: number;
  partNumber: string;
  changedBy: string;
  changedByRole: UserRole | string;
  timestamp: string;
  field: string;
  previousValue: any;
  newValue: any;
  reason?: string;
}

export interface SharedMaterialToken {
  token: string;
  partNumber: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface SanitizedSharedMaterial {
  partNumber: string;
  name?: string;
  description: string;
  arabicDescription?: string;
  category?: string;
  manufacturer: string;
  model: string;
  quantity: number;
  unit: string;
  site?: string;
  warehouse?: string;
  rack?: string;
  shelf?: string;
  status?: string;
  specifications?: Record<string, string>;
  sharedAt: string;
  expiresAt: string;
  isReadonly: true;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  ipAddress: string;
  deviceType: 'Desktop' | 'Laptop' | 'Tablet' | 'Mobile Phone' | 'Unknown';
  browser: string;
  platform: string;
  loginTime: string;
  lastActiveTime: string;
  isRemote: boolean;
  isRevoked: boolean;
}

export interface RemoteAccessSettings {
  remoteAccessEnabled: boolean;
  allowEmergencyBypass: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  allowedIpRanges?: string[];
  emergencyContactEmail?: string;
}

export interface LoginAuditRecord {
  id: string;
  timestamp: string;
  username: string;
  userId?: string;
  userRole?: string;
  success: boolean;
  ipAddress: string;
  deviceType: string;
  browser: string;
  platform: string;
  sessionId?: string;
  isRemote: boolean;
  failureReason?: string;
}

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  isUpdateAvailable: boolean;
  isMandatory: boolean;
  releaseDate: string;
  releaseNotes: string[];
  securityChanges: string[];
  featureChanges: string[];
  distributionUrl?: string;
}

export type SubsystemHealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'NOT_CONFIGURED';

export interface SubsystemHealth {
  name: string;
  category: 
    | 'Backend' 
    | 'Database' 
    | 'Authentication' 
    | 'File Storage' 
    | 'Email' 
    | 'Notifications' 
    | 'Synchronization' 
    | 'AI' 
    | 'OCR' 
    | 'Backup' 
    | 'Web' 
    | 'API';
  status: SubsystemHealthState;
  latencyMs?: number;
  details: string;
  lastChecked: string;
}

export interface MaterialAnomalyAlert {
  id: string;
  type: 'UNUSUAL_QUANTITY_DROP' | 'UNUSUAL_QUANTITY_SURGE' | 'DUPLICATE_SUSPECT' | 'UNEXPECTED_TRANSFER' | 'STOCK_OUT_RISK';
  severity: 'WARNING' | 'CRITICAL';
  partNumber: string;
  materialName: string;
  message: string;
  detectedAt: string;
  details: {
    previousValue?: number | string;
    currentValue?: number | string;
    site?: string;
    warehouse?: string;
    operator?: string;
  };
}

// ============================================================================
// PORT 14: ACTION CENTER & DATA QUALITY ENGINE TYPES
// ============================================================================

export type ActionCenterSeverity = 'CRITICAL' | 'PENDING' | 'WARNING' | 'INFO';

export interface ActionCenterItem {
  id: string;
  title: string;
  description: string;
  source: string;
  date: string;
  severity: ActionCenterSeverity;
  responsibleRole: UserRole | 'ALL' | string;
  relatedRecordId?: string;
  relatedRecordType?: 'MATERIAL' | 'INSPECTION' | 'MRF' | 'DOCUMENT' | 'EQUIPMENT' | 'RECYCLE_BIN' | 'SYNC' | 'SECURITY';
  actionLabel: string;
  actionTab?: string;
  actionPayload?: any;
}

export type DataQualitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DataQualityIssueType = 
  | 'DUPLICATE_MATERIAL' 
  | 'MISSING_PART_NUMBER' 
  | 'MISSING_MANUFACTURER' 
  | 'MISSING_DOCUMENTS' 
  | 'INVALID_QUANTITY' 
  | 'INVALID_LOCATION'
  | 'EXPIRED_DOCUMENT'
  | 'INCONSISTENT_STATUS';

export interface DataQualityIssue {
  id: string;
  type: DataQualityIssueType;
  severity: DataQualitySeverity;
  recordId: string;
  recordTitle: string;
  reason: string;
  suggestedFix: string;
  suggestedValue?: any;
  field?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'IGNORED';
  detectedAt: string;
  reviewedBy?: string;
  resolvedAt?: string;
}

// -------------------------------------------------------------
// INDUSTRIAL EXTENSIONS: ORGANIZATION BRANDING & PROFILE
// -------------------------------------------------------------
export interface OrganizationSettings {
  companyNameEn: string;
  companyNameAr: string;
  facilityNameEn: string;
  facilityNameAr: string;
  crNumber: string;
  taxVatNumber: string;
  logoUrl?: string;
  addressEn: string;
  addressAr: string;
  contactEmail: string;
  contactPhone: string;
  poPrefix: string;
  prPrefix: string;
  grnPrefix: string;
  gisPrefix: string;
  officialSignatoryEn: string;
  officialSignatoryAr: string;
  signatoryTitleEn: string;
  signatoryTitleAr: string;
  digitalStampUrl?: string;
  footerNotesEn: string;
  footerNotesAr: string;
}

// -------------------------------------------------------------
// INDUSTRIAL EXTENSIONS: PREVENTIVE MAINTENANCE & PM KITS
// -------------------------------------------------------------
export interface PMKitItem {
  id: string;
  materialId?: string;
  partNumber: string;
  description: string;
  requiredQuantity: number;
  unit: string;
  isCritical: boolean;
  notes?: string;
}

export interface PreventiveMaintenancePlan {
  id: string;
  planNumber: string; // e.g. "PM-2026-0104"
  equipmentTag: string; // e.g. "PT-101", "FCV-204"
  equipmentName: string;
  facility: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'TURNAROUND';
  intervalDays: number;
  nextDueDate: string;
  lastPerformedDate?: string;
  status: 'UPCOMING' | 'DUE_NOW' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTeam: string;
  estimatedHours: number;
  kitItems: PMKitItem[];
  procedureNotes: string;
  safetyChecklist: string[];
  createdAt: string;
}

// -------------------------------------------------------------
// INDUSTRIAL EXTENSIONS: SHELF-LIFE & DEAD STOCK ANALYTICS
// -------------------------------------------------------------
export type StockMovementClass = 'ACTIVE' | 'SLOW_MOVING' | 'STAGNANT' | 'DEAD_STOCK';
export type ShelfLifeHealth = 'VALID' | 'NEAR_EXPIRY' | 'EXPIRED' | 'NOT_APPLICABLE';

export interface ShelfLifeRecord {
  materialId: string;
  partNumber: string;
  description: string;
  batchNumber?: string;
  lotNumber?: string;
  manufactureDate?: string;
  expiryDate?: string;
  shelfLifeMonths?: number;
  lastMovementDate: string;
  receiptDate: string;
  currentStock: number;
  unit: string;
  location: string;
  unitCost: number;
  totalValuation: number;
  daysSinceMovement: number;
  daysUntilExpiry?: number;
  movementClass: StockMovementClass;
  shelfLifeHealth: ShelfLifeHealth;
  isQuarantined?: boolean;
  recommendedAction?: string;
}







