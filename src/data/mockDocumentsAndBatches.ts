/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDocument, ImportBatch, FavoriteItem, SearchHistoryItem } from '../types';

export const INITIAL_DOCUMENTS: AppDocument[] = [
  {
    id: 'doc-001',
    name: 'Yokogawa EJA530E Technical Datasheet & Dimensional Spec',
    fileName: 'EJA530E_Yokogawa_Datasheet_Rev4.pdf',
    fileType: 'application/pdf',
    fileSize: '2.4 MB',
    documentType: 'Datasheet',
    uploadedBy: 'Eng. Ahmed Al-Mansoor',
    uploadedAt: '2026-02-10T09:30:00.000Z',
    relatedPartNumber: 'EJA530E-JAS4N-012EL',
    relatedEquipmentTag: '10-PT-101',
    relatedMrNumber: 'MR-2026-042',
    relatedPoNumber: 'PO-99420-YOK',
    notes: 'OEM official product specification sheet with ambient temperature derating curves.'
  },
  {
    id: 'doc-002',
    name: 'Certificate of Conformance (CoC) - Rosemount 3051CD',
    fileName: 'Rosemount_3051CD_CoC_Certificate.pdf',
    fileType: 'application/pdf',
    fileSize: '1.1 MB',
    documentType: 'CoC',
    uploadedBy: 'Quality Insp. Mustafa',
    uploadedAt: '2026-02-14T11:15:00.000Z',
    relatedPartNumber: '3051CD2A22A1AB4M5',
    relatedEquipmentTag: '10-FT-201',
    relatedPoNumber: 'PO-88120-EMR',
    relatedSerial: 'ROS-984421',
    notes: 'Factory calibration certificate & Material compliance EN 10204 3.1.'
  },
  {
    id: 'doc-003',
    name: 'Fisher FIELDVUE DVC6200 Instruction Manual',
    fileName: 'Fisher_DVC6200_Instruction_Manual_D103422X012.pdf',
    fileType: 'application/pdf',
    fileSize: '5.8 MB',
    documentType: 'Manual',
    uploadedBy: 'Eng. Ahmed Al-Mansoor',
    uploadedAt: '2026-02-05T14:20:00.000Z',
    relatedPartNumber: 'DVC6200-HC',
    relatedEquipmentTag: '10-FV-201',
    relatedWoNumber: 'WO-2026-088',
    notes: 'Wiring diagrams, HART command interface & actuator mounting instructions.'
  },
  {
    id: 'doc-004',
    name: 'Calibration Certificate - Yokogawa YTA710',
    fileName: 'Yokogawa_YTA710_Calib_Cert_2026.pdf',
    fileType: 'application/pdf',
    fileSize: '840 KB',
    documentType: 'Calibration Certificate',
    uploadedBy: 'Inspector Ali Tariq',
    uploadedAt: '2026-02-19T08:45:00.000Z',
    relatedPartNumber: 'YTA710-EA4DB/KU2',
    relatedEquipmentTag: '10-TT-301',
    relatedMrNumber: 'MR-2026-089',
    notes: '5-point NIST traceable temperature sensor calibration verification.'
  },
  {
    id: 'doc-005',
    name: 'ATEX / IECEx Explosion-proof Certificate - MTL5541',
    fileName: 'MTL5541_ATEX_IECEx_Certificate.pdf',
    fileType: 'application/pdf',
    fileSize: '1.6 MB',
    documentType: 'ATEX Certificate',
    uploadedBy: 'Lead Safety Eng. Salam',
    uploadedAt: '2026-01-28T16:00:00.000Z',
    relatedPartNumber: 'MTL5541',
    relatedEquipmentTag: '10-IS-401',
    notes: 'Intrinsically safe galvanic isolator zone 0/1 hazardous area certification.'
  },
  {
    id: 'doc-006',
    name: 'Warehouse Receipt & Tag Photo - Rosemount 8800D',
    fileName: 'Rosemount_8800D_Physical_Tag_Inspection.jpg',
    fileType: 'image/jpeg',
    fileSize: '3.2 MB',
    documentType: 'Photo',
    uploadedBy: 'Inspector Ali Tariq',
    uploadedAt: '2026-02-22T13:10:00.000Z',
    relatedPartNumber: '8800DF020SA1N1D1M5',
    relatedEquipmentTag: '10-FV-101',
    relatedSerial: 'ROS-FLW-44120',
    notes: 'High-resolution photo of stainless steel nameplate and flange face.'
  }
];

export const INITIAL_IMPORT_BATCHES: ImportBatch[] = [
  {
    importBatchId: 'BATCH-20260215-001',
    sourceId: 'EXT-BASRAH-001',
    sourceName: 'Basrah Central Store Source',
    fileName: 'Company_Basrah_Central_Stock.xlsx',
    date: '2026-02-15T08:30:00.000Z',
    user: 'Eng. Ahmed Al-Mansoor',
    recordsImported: 12,
    recordsFailed: 0,
    status: 'COMPLETED',
    notes: 'Southern regional warehouse stock master sync with exact row numbering preserved.'
  },
  {
    importBatchId: 'BATCH-20260218-002',
    sourceId: 'EXT-BAGHDAD-001',
    sourceName: 'Baghdad Central Store Source',
    fileName: 'Company_Baghdad_Main_Hub.xlsx',
    date: '2026-02-18T10:15:00.000Z',
    user: 'Superintendent Tariq',
    recordsImported: 10,
    recordsFailed: 0,
    status: 'COMPLETED',
    notes: 'Baghdad regional operations logistics catalog.'
  }
];

export const INITIAL_FAVORITES: FavoriteItem[] = [
  {
    id: 'fav-1',
    entityType: 'material',
    entityId: 'EJA530E-JAS4N-012EL',
    title: 'EJA530E-JAS4N-012EL',
    subtitle: 'Gauge Pressure Transmitter 0-50 bar (Yokogawa)',
    sourceLabel: 'Station Material',
    addedAt: '2026-02-20T10:00:00.000Z'
  },
  {
    id: 'fav-2',
    entityType: 'material',
    entityId: '3051CD2A22A1AB4M5',
    title: '3051CD2A22A1AB4M5',
    subtitle: 'Differential Pressure Transmitter (Emerson Rosemount)',
    sourceLabel: 'Station Material',
    addedAt: '2026-02-21T12:30:00.000Z'
  },
  {
    id: 'fav-3',
    entityType: 'equipment',
    entityId: '10-PT-101',
    title: '10-PT-101',
    subtitle: 'Feed Surge Vessel Overhead Pressure Transmitter',
    sourceLabel: 'Equipment Register',
    addedAt: '2026-02-22T08:15:00.000Z'
  }
];

export const INITIAL_SEARCH_HISTORY: SearchHistoryItem[] = [
  {
    id: 'sh-1',
    term: 'Yokogawa Pressure Transmitter',
    timestamp: '2026-02-24T14:10:00.000Z',
    resultCount: 8
  },
  {
    id: 'sh-2',
    term: '3051CD',
    timestamp: '2026-02-24T11:05:00.000Z',
    resultCount: 4
  },
  {
    id: 'sh-3',
    term: '10-PT-101',
    timestamp: '2026-02-23T16:40:00.000Z',
    resultCount: 3
  }
];
