/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KnowledgeRecord, MaterialVerificationReport } from '../types';

export const INITIAL_KNOWLEDGE_BASE: KnowledgeRecord[] = [
  {
    id: 'kb-rosemount-3051s',
    manufacturer: 'Emerson / Rosemount',
    productFamily: '3051S Scalable Series',
    model: '3051S2TG4A2B11A1AB4',
    productType: 'Pressure Transmitter',
    description: 'Scalable In-Line Coplanar Gage Pressure Transmitter, HART 4-20mA, Stainless Steel Process Isolator, 0-4000 psig',
    knownSpecs: {
      'Signal Output': '4-20 mA HART',
      'Power Supply': '10.5 to 42.4 VDC',
      'Process Connection': '1/2-14 NPT Female',
      'Wetted Material': '316L SST',
      'Enclosure Rating': 'IP66 / IP68 / NEMA 4X',
      'Hazardous Approval': 'ATEX Ex ia IIC T4 Ga / IECEx',
      'Measurement Range': '0 to 4000 psig (0 to 275.8 bar)'
    },
    sourceUrls: [
      'https://www.emerson.com/en-us/catalog/rosemount-3051s-coplanar-pressure-transmitter',
      'https://www.emerson.com/documents/automation/product-data-sheet-rosemount-3051s-scalable-pressure-transmitter-en-74526.pdf'
    ],
    status: 'ENGINEER_VERIFIED',
    verifiedBy: 'Lead Instrumentation Engineer',
    verifiedDate: '2025-01-15T08:30:00Z',
    verificationNotes: 'Baseline verified against Emerson official technical catalog rev 2024.',
    lastUpdated: '2025-01-15T08:30:00Z'
  },
  {
    id: 'kb-yokogawa-ejx110a',
    manufacturer: 'Yokogawa',
    productFamily: 'DPharp EJX-A Series',
    model: 'EJX110A-EMS4G-917EB',
    productType: 'Differential Pressure Transmitter',
    description: 'High Performance Differential Pressure Transmitter, DPharp Resonant Silicon Sensor, Multi-sensing HART 7',
    knownSpecs: {
      'Signal Output': '4-20 mA with digital communication (HART 7 protocol)',
      'Reference Accuracy': '±0.04% of Span',
      'Working Pressure Limit': '16 MPa (2300 psi)',
      'Capsule Material': 'Hastelloy C-276 / 316L SST',
      'Hazardous Rating': 'ATEX Flameproof Ex d IIC T6',
      'Ambient Temperature': '-40 to +85°C'
    },
    sourceUrls: [
      'https://www.yokogawa.com/solutions/products-platforms/field-instruments/pressure-transmitters/differential-pressure-transmitters/ejx110a/'
    ],
    status: 'ENGINEER_VERIFIED',
    verifiedBy: 'Senior QA Inspector',
    verifiedDate: '2025-02-10T11:00:00Z',
    verificationNotes: 'Yokogawa official factory datasheet cross-referenced with calibration certificates.',
    lastUpdated: '2025-02-10T11:00:00Z'
  },
  {
    id: 'kb-eh-promag50p',
    manufacturer: 'Endress+Hauser',
    productFamily: 'Proline Promag 50P',
    model: '50P50-EA0A1AA0AAAW',
    productType: 'Electromagnetic Flowmeter',
    description: 'High Temperature Industrial Electromagnetic Flowmeter for conductive liquids, PTFE liner, Hastelloy electrodes',
    knownSpecs: {
      'Nominal Diameter': 'DN 50 (2 inch)',
      'Lining': 'PTFE (-40 to +180°C)',
      'Process Pressure': 'PN40 / Class 300',
      'Electrodes': '1.4435 / 316L / Alloy C22',
      'Output': '4-20mA HART, Pulse / Frequency / Status Output',
      'Ingress Protection': 'IP67 / NEMA 4X'
    },
    sourceUrls: [
      'https://www.endress.com/en/field-instruments-overview/flow-measurement-product-overview/electromagnetic-flowmeter-promag-50P'
    ],
    status: 'SOURCE_VERIFIED',
    verifiedBy: 'System Auto-Crawler',
    verifiedDate: '2025-02-18T14:20:00Z',
    verificationNotes: 'Source verified via Endress+Hauser official technical portal.',
    lastUpdated: '2025-02-18T14:20:00Z'
  },
  {
    id: 'kb-siemens-sitrans-p320',
    manufacturer: 'Siemens',
    productFamily: 'SITRANS P320 / P420',
    model: '7MF0340-1TD01-5AF2-Z',
    productType: 'Digital Gauge Pressure Transmitter',
    description: 'SITRANS P320 Pressure transmitter for gauge pressure, HART communication, SIL 2/3 certified according to IEC 61508',
    knownSpecs: {
      'Measuring Range': '0.16 to 16 bar (2.32 to 232 psi)',
      'Measuring Cell': 'Silicone oil filling, diaphragm 316L SST',
      'SIL Level': 'SIL 2 / SIL 3',
      'Protection Class': 'IP66 / IP68',
      'Certification': 'ATEX Ex ia/db IIC T4/T6'
    },
    sourceUrls: [
      'https://www.siemens.com/global/en/products/automation/process-instrumentation/pressure-measurement/sitrans-p320.html'
    ],
    status: 'ENGINEER_VERIFIED',
    verifiedBy: 'Instrument Engineer',
    verifiedDate: '2025-02-22T09:15:00Z',
    verificationNotes: 'Siemens SITRANS documentation approved for plant deployment.',
    lastUpdated: '2025-02-22T09:15:00Z'
  }
];

export const INITIAL_VERIFICATION_REPORTS: MaterialVerificationReport[] = [
  {
    id: 'rep-vr-2025-001',
    reportNumber: 'EMIS-VR-2025-001',
    partNumber: '3051S2TG4A2B11A1AB4',
    status: 'FINAL',
    createdAt: '2025-02-20T10:00:00Z',
    updatedAt: '2025-02-20T11:30:00Z',
    materialInfo: {
      partNumber: '3051S2TG4A2B11A1AB4',
      description: 'Rosemount Scalable Gage Pressure Transmitter 0-4000 psi',
      manufacturer: 'Emerson / Rosemount',
      model: '3051S',
      store: 'Instrumentation Workshop (Store B)',
      quantity: 4,
      unit: 'pcs'
    },
    mrData: {
      mrNumber: 'MR-1225-14237',
      itemDescription: 'Pressure Transmitter 0-4000 PSI 4-20mA HART',
      requestedModel: '3051S2TG4A2B11A1AB4',
      requestedQty: 4,
      urgency: 'HIGH'
    },
    poData: {
      poNumber: 'PO-2024-8891',
      supplier: 'PetroTech Instrumentation FZE',
      orderedModel: '3051S2TG4A2B11A1AB4',
      unitPrice: '$1,850.00',
      deliveryTerms: 'DDP Basrah Station'
    },
    deliveryData: {
      deliveryNoteNumber: 'DN-99412',
      deliveryDate: '2025-02-18',
      receivedQty: 4,
      carrier: 'DHL Global Forwarding'
    },
    nameplateData: {
      scannedText: 'ROSEMOUNT 3051S2TG4A2B11A1AB4 CAL: 0-4000 PSI 4-20mA HART EX IA IIC T4',
      manufacturer: 'Rosemount / Emerson',
      model: '3051S',
      serialNumber: 'SN-8842109',
      ratings: '24VDC, 4-20mA HART, 4000 PSI MAX'
    },
    datasheetData: {
      docName: 'Rosemount 3051S Technical Data Sheet Rev 12.pdf',
      oemModel: '3051S Series',
      publishedSpecs: {
        'Output': '4-20mA HART',
        'Pressure Range': '0 to 4000 psig',
        'Supply Voltage': '10.5 to 42.4 VDC'
      }
    },
    cocData: {
      certificateNumber: 'COC-EMERSON-2024-9982',
      standard: 'ISO 9001:2015 / ATEX Directive 2014/34/EU',
      validUntil: '2027-12-31',
      issuer: 'Emerson Process Management Factory Inspection'
    },
    cooData: {
      countryOfOrigin: 'United States',
      issuer: 'Chamber of Commerce Boulder CO'
    },
    crossMatrix: [
      { field: 'Manufacturer', mrValue: 'Rosemount', poValue: 'Emerson / Rosemount', nameplateValue: 'Rosemount / Emerson', datasheetValue: 'Emerson', cocValue: 'Emerson Process Management', result: 'MATCH', notes: 'OEM verified across all documentation' },
      { field: 'Model', mrValue: '3051S2TG4A2B11A1AB4', poValue: '3051S2TG4A2B11A1AB4', nameplateValue: '3051S2TG4A2B11A1AB4', datasheetValue: '3051S Series', cocValue: '3051S2TG4A2B11A1AB4', result: 'MATCH', notes: 'Exact part number match across MR, PO, Nameplate, and CoC' },
      { field: 'Pressure Range', mrValue: '0-4000 PSI', poValue: '0-4000 PSI', nameplateValue: '0-4000 PSI', datasheetValue: '0-4000 psig', cocValue: '0-4000 PSI', result: 'MATCH', notes: 'Range confirmed' },
      { field: 'Signal Output', mrValue: '4-20mA HART', poValue: '4-20mA HART', nameplateValue: '4-20mA HART', datasheetValue: '4-20mA HART', cocValue: 'HART Protocol', result: 'MATCH', notes: 'Protocol confirmed' },
      { field: 'Quantity', mrValue: '4', poValue: '4', deliveryNoteValue: '4', result: 'MATCH', notes: 'Delivered quantity matches PO' }
    ],
    conflicts: [],
    missingDocuments: [],
    aiAnalysis: {
      id: 'ai-an-001',
      version: 1,
      timestamp: '2025-02-20T10:05:00Z',
      provider: 'Gemini (Auto)',
      taskType: 'DOCUMENT_ANALYSIS',
      confidenceScore: 98,
      technicalMatchScore: 99,
      ruleMatchScore: 100,
      recommendation: 'RECOMMENDED_ACCEPT',
      recommendationSummary: 'All engineering parameters, certificates of conformity, serial number nameplate data, and PO terms are 100% consistent.'
    },
    evidence: [
      {
        id: 'ev-1',
        type: 'NAMEPLATE',
        parameter: 'Model & Part Number',
        actualValue: '3051S2TG4A2B11A1AB4',
        sourceTitle: 'High Resolution Nameplate Optical Scan',
        sourceType: 'Physical Nameplate Image',
        sourceQualityLevel: 1,
        confidence: 99,
        status: 'MATCH',
        isVerifiedByEngineer: true
      },
      {
        id: 'ev-2',
        type: 'COC',
        parameter: 'ATEX Compliance Certificate',
        actualValue: 'ATEX Ex ia IIC T4 Ga (Valid)',
        sourceTitle: 'Factory Certificate of Conformity',
        sourceType: 'Official OEM PDF Document',
        sourceQualityLevel: 2,
        confidence: 98,
        status: 'MATCH',
        isVerifiedByEngineer: true
      }
    ],
    sources: [
      {
        source: 'Emerson Official Catalog',
        title: 'Rosemount 3051S Technical Overview',
        url: 'https://www.emerson.com/rosemount-3051s',
        website: 'emerson.com',
        relevance: 99,
        isOfficialManufacturer: true
      }
    ],
    recommendation: 'Full technical compliance verified. Recommended for immediate installation into NDGS Plant Process Loop EQ-PMP-101.',
    engineerDecision: {
      decision: 'ACCEPT',
      reviewer: 'Eng. Tariq Al-Mansoor (Lead Instrument Specialist)',
      date: '2025-02-20T11:30:00Z',
      comments: 'Physical tag, calibration span (0-4000 PSI), and factory test certificates inspected and approved.'
    },
    auditTrail: [
      {
        id: 'aud-001',
        timestamp: '2025-02-20T10:00:00Z',
        user: 'Lead QA Inspector',
        action: 'Material Added',
        entity: 'Material',
        entityId: '3051S2TG4A2B11A1AB4'
      },
      {
        id: 'aud-002',
        timestamp: '2025-02-20T11:30:00Z',
        user: 'Eng. Tariq Al-Mansoor',
        action: 'Material Accepted',
        entity: 'Material',
        entityId: '3051S2TG4A2B11A1AB4',
        reason: 'Approved for NDGS Process Loop'
      }
    ],
    finalizedBy: 'Eng. Tariq Al-Mansoor',
    finalizedDate: '2025-02-20T11:30:00Z'
  }
];
