/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  WAREHOUSE = 'warehouse',
  READONLY = 'readonly',

  // Backward compatibility aliases for existing views
  ENGINEER = 'supervisor',
  VIEWER = 'readonly'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
}

export interface MaterialPhotoLibrary {
  nameplate: string[];
  installation: string[];
  warehouse: string[];
  other: string[];
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

export interface Material {
  partNumber: string; // Unique primary identifier
  description: string;
  manufacturer: string;
  model: string;
  quantity: number;
  unit: string;
  store: string;
  rack: string;
  shelf: string;
  notes: string;
  minStockLevel: number; // For low stock alerts
  createdAt: string;
  updatedAt: string;

  // ZFOD Enterprise Instrument Department Fields
  brand?: string;
  serialNumber?: string;
  measuringRange?: string;
  originalQuantity?: number;
  remainingQuantity?: number;
  binLocation?: string;
  workOrder?: string;
  mrf?: string;
  purchaseOrder?: string;
  supplier?: string;
  purchaseDate?: string;
  calibrationCertificate?: string;
  datasheet?: string;
  coc?: string;
  manuals?: string;
  
  // Import metadata
  sequence?: number; // Sequence number exactly as stored
  station?: string; // Station/Plant location name
  internalId?: string; // Internal unique ID for ERP matching
  importedAt?: string; // Date imported
  importedBy?: string; // Username of importer
  originalFilename?: string; // Original spreadsheet filename
  isIncomplete?: boolean; // Whether any mandatory fields are missing
  materialCode?: string; // Material Code from Excel
  engineeringComments?: string; // Engineering Comments from Excel
  additionalFields?: { [key: string]: any }; // Dynamic additional Excel columns

  // Technical Specifications
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

