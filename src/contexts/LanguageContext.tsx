/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppLanguage } from '../types';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  native: string;
  displayLabel: string;
  flag: string;
  dir: 'LTR' | 'RTL';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    native: 'English',
    displayLabel: 'English',
    flag: '🇬🇧',
    dir: 'LTR'
  },
  {
    code: 'ar',
    label: 'Arabic',
    native: 'العربية',
    displayLabel: '🇮🇶 العربية',
    flag: '🇮🇶',
    dir: 'RTL'
  }
];

export interface TranslationDictionary {
  // Navigation & Core Modules
  appTitle: string;
  appSubtitle: string;
  systemModules: string;
  dashboard: string;
  intelligence: string;
  enterprise: string;
  materials: string;
  search: string;
  externalStock: string;
  excelImport: string;
  traceability: string;
  verification: string;
  documents: string;
  equipment: string;
  mrfManagement: string;
  addMaterial: string;
  aiCopilot: string;
  decisions: string;
  blacklist: string;
  reports: string;
  backupSync: string;
  governance: string;
  googleDrive: string;
  aiDiagnostics: string;
  disconnectSession: string;
  actionCenter: string;
  dataQuality: string;
  adminGovernance: string;
  recycleBin: string;
  barcodeStudio: string;
  cycleCount: string;
  reorderHub: string;
  groupCommandCenter: string;
  groupMaterials: string;
  groupSearch: string;
  groupOps: string;
  groupDocs: string;
  groupReports: string;
  groupAdmin: string;
  quickSwitcher: string;
  searchMenus: string;
  recentPages: string;
  collapseAll: string;
  expandAll: string;
  navBack: string;
  navForward: string;

  // Language & Theming
  language: string;
  english: string;
  arabic: string;
  darkMode: string;
  lightMode: string;
  toggleTheme: string;
  activeLanguage: string;
  switchLanguage: string;

  // Material Properties & Terminology
  material: string;
  materialsCount: string;
  materialNumber: string;
  description: string;
  arabicDescription: string;
  originalDescription: string;
  translatedDescription: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  serialNumber: string;
  tagNumber: string;
  specification: string;
  datasheet: string;
  certificateOfConformity: string;
  certificateOfOrigin: string;
  millTestReport: string;
  quantity: string;
  unit: string;
  warehouse: string;
  store: string;
  location: string;
  category: string;
  supplier: string;
  condition: string;
  heatNumber: string;
  shelfLife: string;
  stock: string;
  minLevel: string;
  reorderQty: string;

  // Material Actions & Intelligence (Port 9)
  translate: string;
  translateMaterial: string;
  translating: string;
  translationSaved: string;
  refreshTranslation: string;
  saveTranslation: string;
  technicalMeaning: string;
  materialIntelligence: string;
  analyzingMaterial: string;
  webEvidence: string;
  imagesGallery: string;
  findDatasheet: string;
  findManufacturer: string;
  askAi: string;
  searchWeb: string;
  searchImages: string;
  exactPnSearch: string;
  officialSource: string;
  sourceConfidence: string;
  evidenceLevel: string;
  referenceImage: string;
  possibleMatch: string;
  unknownMaterial: string;
  unknownMaterialDesc: string;
  conflictsDetected: string;
  noConflicts: string;
  searchHistory: string;
  repeatSearch: string;
  clearHistory: string;
  evidenceSummary: string;
  verified: string;
  likely: string;
  possible: string;
  unknown: string;

  // Inspection & Lifecycle Statuses
  inspection: string;
  inspectionStatus: string;
  approved: string;
  rejected: string;
  pending: string;
  underInspection: string;
  quarantined: string;
  inService: string;
  disposed: string;
  engineeringReview: string;
  pass: string;
  fail: string;
  deviation: string;

  // Enterprise Operations (Port 7)
  stockLedger: string;
  receiving: string;
  transfers: string;
  issuance: string;
  returns: string;
  reservations: string;
  suppliers: string;
  approvals: string;
  stockCount: string;
  hierarchy: string;

  // Common UI Actions
  save: string;
  saving: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  view: string;
  viewDetails: string;
  submit: string;
  filter: string;
  all: string;
  actions: string;
  status: string;
  date: string;
  user: string;
  role: string;
  loading: string;
  refresh: string;
  retry: string;
  clear: string;
  export: string;
  import: string;
  download: string;
  upload: string;
  scan: string;
  back: string;
  next: string;
  confirm: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  critical: string;
  noData: string;
  notFound: string;
  searchPlaceholder: string;
  networkOffline: string;
  networkOnline: string;
  internetRequired: string;
  searchFailed: string;
  aiUnavailable: string;
  noImageResults: string;
  serialNumberWarning: string;

  // Port 10 & 11 Final Integration & UX
  profileSettings: string;
  systemAuthentication: string;
  personnelUsername: string;
  securityPassword: string;
  initializeConnection: string;
  quickAccessCredentials: string;
  previousQuantity: string;
  addedQuantity: string;
  currentQuantity: string;
  existingMaterial: string;
  newMaterial: string;
  possibleDuplicate: string;
  adminControlCenter: string;
  notificationCenter: string;
  assignedSite: string;
  assignedWarehouse: string;
}

const enTranslations: TranslationDictionary = {
  // Navigation & Core Modules
  appTitle: 'EMIS',
  appSubtitle: 'Engineering Material Intelligence System',
  systemModules: 'SYSTEM MODULES',
  dashboard: 'Dashboard',
  intelligence: 'Intelligence & Insights',
  enterprise: 'Enterprise Operations',
  materials: 'Materials Ledger',
  search: 'Global Smart Search',
  externalStock: 'External Stores Manager',
  excelImport: 'Excel Import Center',
  traceability: 'Material Traceability',
  verification: 'Engineering Verification',
  documents: 'Document Center',
  equipment: 'Equipment Register',
  mrfManagement: 'MR, PO, WO & Inspection',
  addMaterial: 'Add Material',
  aiCopilot: 'AI Co-Pilot',
  decisions: 'Engineering Decisions',
  blacklist: 'Blacklist & Quarantine',
  reports: 'Reports & Analytics',
  backupSync: 'Backup & Cloud Sync',
  governance: 'Governance & SOPs',
  googleDrive: 'Google Drive Vault',
  aiDiagnostics: 'Diagnostics & Settings',
  disconnectSession: 'Disconnect Session',
  actionCenter: 'Action Center',
  dataQuality: 'Data Quality Center',
  adminGovernance: 'Admin Control & Sites',
  recycleBin: 'Recycle Bin & Data Safety',
  barcodeStudio: 'Barcode & Shelf Label Studio',
  cycleCount: 'Cycle Counting & Physical Inventory',
  reorderHub: 'Automated Reorder & Requisitions',
  groupCommandCenter: 'Command Center',
  groupMaterials: 'Materials Management',
  groupSearch: 'Search & Intelligence',
  groupOps: 'Operations & Engineering',
  groupDocs: 'Documents & Import',
  groupReports: 'Reports & Quality',
  groupAdmin: 'Administration & Governance',
  quickSwitcher: 'Quick Switch (Ctrl+K)',
  searchMenus: 'Filter menus...',
  recentPages: 'Recent',
  collapseAll: 'Collapse All',
  expandAll: 'Expand All',
  navBack: 'Back',
  navForward: 'Forward',

  // Language & Theming
  language: 'Language',
  english: 'English',
  arabic: 'العربية',
  darkMode: 'Dark Mode',
  lightMode: 'Industrial Light',
  toggleTheme: 'Toggle Theme',
  activeLanguage: 'Active Language',
  switchLanguage: 'Switch Language',

  // Material Properties & Terminology
  material: 'Material',
  materialsCount: 'Materials',
  materialNumber: 'Material Number',
  description: 'Description',
  arabicDescription: 'Arabic Description',
  originalDescription: 'Original Description',
  translatedDescription: 'Translated Description',
  manufacturer: 'Manufacturer',
  model: 'Model',
  partNumber: 'Part Number (PN)',
  serialNumber: 'Serial Number (SN)',
  tagNumber: 'Tag Number',
  specification: 'Specification',
  datasheet: 'Datasheet',
  certificateOfConformity: 'Certificate of Conformity (CoC)',
  certificateOfOrigin: 'Certificate of Origin (CoO)',
  millTestReport: 'Mill Test Report (MTR)',
  quantity: 'Quantity',
  unit: 'Unit',
  warehouse: 'Warehouse',
  store: 'Store',
  location: 'Location',
  category: 'Category',
  supplier: 'Supplier',
  condition: 'Condition',
  heatNumber: 'Heat Number',
  shelfLife: 'Shelf Life',
  stock: 'Stock',
  minLevel: 'Min Level',
  reorderQty: 'Reorder Qty',

  // Material Actions & Intelligence (Port 9)
  translate: 'Translate',
  translateMaterial: 'Translate Material',
  translating: 'Translating...',
  translationSaved: 'Translation saved to material record.',
  refreshTranslation: 'Refresh Translation',
  saveTranslation: 'Save Translation',
  technicalMeaning: 'Technical Meaning',
  materialIntelligence: 'Material Intelligence',
  analyzingMaterial: 'Analyzing Material...',
  webEvidence: 'Web Evidence',
  imagesGallery: 'Reference Images',
  findDatasheet: 'Find Datasheet',
  findManufacturer: 'Manufacturer Info',
  askAi: 'Ask AI Assistant',
  searchWeb: 'Search Web',
  searchImages: 'Search Images',
  exactPnSearch: 'Exact PN Search',
  officialSource: 'Official Manufacturer Source',
  sourceConfidence: 'Source Confidence',
  evidenceLevel: 'Evidence Level',
  referenceImage: 'Reference Image',
  possibleMatch: 'Possible Match',
  unknownMaterial: 'Material meaning could not be confidently determined.',
  unknownMaterialDesc: 'The term was not found with high confidence in the verified industrial dictionary. Use the intelligence tools below to search official manufacturer documentation.',
  conflictsDetected: 'Conflicts Detected',
  noConflicts: 'All verified sources match database record.',
  searchHistory: 'Search History',
  repeatSearch: 'Repeat Search',
  clearHistory: 'Clear History',
  evidenceSummary: 'Evidence Summary',
  verified: 'Verified',
  likely: 'Likely',
  possible: 'Possible',
  unknown: 'Unknown',

  // Inspection & Lifecycle Statuses
  inspection: 'Inspection',
  inspectionStatus: 'Inspection Status',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
  underInspection: 'Under Inspection',
  quarantined: 'Quarantined',
  inService: 'In Service',
  disposed: 'Disposed',
  engineeringReview: 'Engineering Review',
  pass: 'Pass',
  fail: 'Fail',
  deviation: 'Deviation',

  // Enterprise Operations (Port 7)
  stockLedger: 'Stock Ledger',
  receiving: 'Receiving',
  transfers: 'Transfers',
  issuance: 'Issuance',
  returns: 'Returns',
  reservations: 'Reservations',
  suppliers: 'Suppliers',
  approvals: 'Approvals',
  stockCount: 'Stock Count',
  hierarchy: 'Site Hierarchy',

  // Common UI Actions
  save: 'Save',
  saving: 'Saving...',
  cancel: 'Cancel',
  close: 'Close',
  delete: 'Delete',
  edit: 'Edit',
  view: 'View',
  viewDetails: 'View Details',
  submit: 'Submit',
  filter: 'Filter',
  all: 'All',
  actions: 'Actions',
  status: 'Status',
  date: 'Date',
  user: 'User',
  role: 'Role',
  loading: 'Loading...',
  refresh: 'Refresh',
  retry: 'Retry',
  clear: 'Clear',
  export: 'Export',
  import: 'Import',
  download: 'Download',
  upload: 'Upload',
  scan: 'Scan',
  back: 'Back',
  next: 'Next',
  confirm: 'Confirm',
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  critical: 'Critical',
  noData: 'No data available',
  notFound: 'Item not found',
  searchPlaceholder: 'Search materials, PN, tag, description...',
  networkOffline: 'Offline Mode (Local Storage Active)',
  networkOnline: 'Cloud Connected',
  internetRequired: 'Internet connection required for live web search.',
  searchFailed: 'Search failed. Check your network connection and try again.',
  aiUnavailable: 'AI analysis service temporarily unavailable.',
  noImageResults: 'No reference images found.',
  serialNumberWarning: 'Serial number search may expose sensitive equipment information. Only proceed if necessary.',

  // Port 10 & 11 Final Integration & UX
  profileSettings: 'User Profile & Settings',
  systemAuthentication: 'System Authentication',
  personnelUsername: 'Personnel Username / Email',
  securityPassword: 'Security Password / PIN',
  initializeConnection: 'Initialize Connection',
  quickAccessCredentials: 'Quick-Access Credentials',
  previousQuantity: 'Previous Quantity',
  addedQuantity: 'Added Quantity',
  currentQuantity: 'Current Quantity',
  existingMaterial: 'Existing Material',
  newMaterial: 'New Material',
  possibleDuplicate: 'Possible Duplicate',
  adminControlCenter: 'Admin Control & Governance',
  notificationCenter: 'Notification Center',
  assignedSite: 'Assigned Site',
  assignedWarehouse: 'Assigned Warehouse'
};

const arTranslations: TranslationDictionary = {
  // Navigation & Core Modules
  appTitle: 'إيميس',
  appSubtitle: 'نظام الاستخبارات الفنية والمواد الهندسية',
  systemModules: 'وحدات النظام التشغيلية',
  dashboard: 'لوحة التحكم',
  intelligence: 'الاستخبارات والتحليلات الذكية',
  enterprise: 'العمليات المؤسسية',
  materials: 'سجل المواد والمخزون',
  search: 'البحث الذكي الشامل',
  externalStock: 'إدارة المخازن الخارجية',
  excelImport: 'مركز استيراد إكسل',
  traceability: 'تتبع مسار المواد',
  verification: 'المطابقة والتحقق الهندسي',
  documents: 'مركز الوثائق الفنية',
  equipment: 'سجل المعدات والأجهزة',
  mrfManagement: 'طلبات الشراء وفحص المواد',
  addMaterial: 'إضافة مادة جديدة',
  aiCopilot: 'المساعد الهندسي الذكي',
  decisions: 'القرارات الهندسية',
  blacklist: 'القائمة السوداء والحجر الفني',
  reports: 'التقارير والتحليلات',
  backupSync: 'النسخ الاحتياطي والمزامنة',
  governance: 'الحوكمة وإجراءات التشغيل القياسية',
  googleDrive: 'خزينة جوجل درايف',
  aiDiagnostics: 'التشخيص وإعدادات النظام',
  disconnectSession: 'إنهاء الجلسة',
  actionCenter: 'مركز الإجراءات والمهام',
  dataQuality: 'مركز جودة البيانات',
  adminGovernance: 'إدارة المواقع والحوكمة',
  recycleBin: 'سلة المحذوفات وأمان البيانات',
  barcodeStudio: 'استوديو طباعة ملصقات الباركود والرفوف',
  cycleCount: 'الجرد الدوري والتدقيق الميداني',
  reorderHub: 'مركز أتمتة إعادة الطلب والمشتريات',
  groupCommandCenter: 'مركز القيادة والتحكم',
  groupMaterials: 'إدارة المواد والمخزون',
  groupSearch: 'البحث والاستخبارات الذكية',
  groupOps: 'العمليات والهندسة',
  groupDocs: 'الوثائق والاستيراد',
  groupReports: 'التقارير والجودة',
  groupAdmin: 'الإدارة والحوكمة',
  quickSwitcher: 'التنقل السريع (Ctrl+K)',
  searchMenus: 'ابحث في القوائم...',
  recentPages: 'الأخيرة',
  collapseAll: 'طي الكل',
  expandAll: 'توسيع الكل',
  navBack: 'رجوع',
  navForward: 'تقدم',

  // Language & Theming
  language: 'اللغة',
  english: 'English',
  arabic: 'العربية',
  darkMode: 'الوضع الداكن',
  lightMode: 'الوضع الصناعي الفاتح',
  toggleTheme: 'تبديل المظهر',
  activeLanguage: 'اللغة الحالية',
  switchLanguage: 'تغيير اللغة',

  // Material Properties & Terminology
  material: 'المادة',
  materialsCount: 'المواد',
  materialNumber: 'رقم المادة',
  description: 'الوصف',
  arabicDescription: 'الوصف باللغة العربية',
  originalDescription: 'الوصف الأصلي',
  translatedDescription: 'الوصف المترجم',
  manufacturer: 'الشركة المصنعة',
  model: 'الطراز',
  partNumber: 'رقم الجزء (PN)',
  serialNumber: 'الرقم التسلسلي (SN)',
  tagNumber: 'رقم البطاقة التعريفية (Tag)',
  specification: 'المواصفات الفنية',
  datasheet: 'ورقة البيانات الفنية (Datasheet)',
  certificateOfConformity: 'شهادة المطابقة (CoC)',
  certificateOfOrigin: 'شهادة المنشأ (CoO)',
  millTestReport: 'تقرير اختبار المصنع (MTR)',
  quantity: 'الكمية',
  unit: 'الوحدة',
  warehouse: 'المستودع',
  store: 'المخزن',
  location: 'موقع التخزين',
  category: 'التصنيف',
  supplier: 'المورد',
  condition: 'الحالة الفنية',
  heatNumber: 'رقم الصهرة (Heat No)',
  shelfLife: 'فترة الصلاحية',
  stock: 'المخزون',
  minLevel: 'الحد الأدنى',
  reorderQty: 'كمية إعادة الطلب',

  // Material Actions & Intelligence (Port 9)
  translate: 'ترجمة',
  translateMaterial: 'ترجمة المادة',
  translating: 'جاري الترجمة...',
  translationSaved: 'تم حفظ الترجمة في سجل المادة بنجاح.',
  refreshTranslation: 'تحديث الترجمة',
  saveTranslation: 'حفظ الترجمة',
  technicalMeaning: 'المعنى الفني التخصصي',
  materialIntelligence: 'تحليل المادة واستخباراتها',
  analyzingMaterial: 'جاري تحليل المادة...',
  webEvidence: 'الأدلة والوثائق من الإنترنت',
  imagesGallery: 'الصور والرسومات المرجعية',
  findDatasheet: 'البحث عن ورقة البيانات (Datasheet)',
  findManufacturer: 'بيانات المصنع الرسمي',
  askAi: 'استشارة المساعد الذكي',
  searchWeb: 'بحث في الإنترنت',
  searchImages: 'البحث عن صور',
  exactPnSearch: 'بحث دقيق برقم الجزء (PN)',
  officialSource: 'المصدر الرسمي للشركة المصنعة',
  sourceConfidence: 'مستوى الثقة في المصدر',
  evidenceLevel: 'مستوى التثبت من الدليل',
  referenceImage: 'صورة مرجعية',
  possibleMatch: 'مطابقة محتملة',
  unknownMaterial: 'تعذر تحديد معنى المادة بثقة.',
  unknownMaterialDesc: 'لم يتم العثور على هذا المصطلح بمستوى موثوقية مرتفع في القاموس الصناعي المعتمد. يمكنك استخدام أدوات الاستخبارات أدناه للبحث في وثائق المصنع الرسمية.',
  conflictsDetected: 'تم اكتشاف تعارض في البيانات',
  noConflicts: 'جميع المصادر المعتمدة متطابقة تماماً مع سجل قاعدة البيانات.',
  searchHistory: 'سجل عمليات البحث',
  repeatSearch: 'إعادة البحث',
  clearHistory: 'مسح السجل',
  evidenceSummary: 'ملخص الأدلة والقرائن',
  verified: 'مؤكد ومعتمد',
  likely: 'مرجح بقوة',
  possible: 'محتمل',
  unknown: 'غير محدد',

  // Inspection & Lifecycle Statuses
  inspection: 'الفحص والاستلام',
  inspectionStatus: 'حالة الفحص',
  approved: 'مقبول',
  rejected: 'مرفوض',
  pending: 'قيد الانتظار',
  underInspection: 'قيد الفحص الفني',
  quarantined: 'محجور فنياً',
  inService: 'جاهز وفي الخدمة',
  disposed: 'تالف / مستبعد',
  engineeringReview: 'مراجعة هندسية متخصصة',
  pass: 'مطابق',
  fail: 'غير مطابق',
  deviation: 'انحراف فني',

  // Enterprise Operations (Port 7)
  stockLedger: 'سجل حركة المخزون',
  receiving: 'جلسات الاستلام',
  transfers: 'نقل المواد بين المواقع',
  issuance: 'صرف المواد لأوامر العمل',
  returns: 'إرجاع المواد للمخازن',
  reservations: 'حجز المواد للمشاريع',
  suppliers: 'سجل الموردين والمصنعين',
  approvals: 'الموافقات والاعتمادات',
  stockCount: 'الجرد الفعلي للمخازن',
  hierarchy: 'الهيكل التنظيمي للمواقع',

  // Common UI Actions
  save: 'حفظ',
  saving: 'جاري الحفظ...',
  cancel: 'إلغاء',
  close: 'إغلاق',
  delete: 'حذف',
  edit: 'تعديل',
  view: 'عرض',
  viewDetails: 'عرض التفاصيل',
  submit: 'إرسال / اعتماد',
  filter: 'تصفية',
  all: 'الكل',
  actions: 'الإجراءات',
  status: 'الحالة',
  date: 'التاريخ',
  user: 'المستخدم',
  role: 'الدور الوظيفي',
  loading: 'جاري التحميل...',
  refresh: 'تحديث البيانات',
  retry: 'إعادة المحاولة',
  clear: 'مسح',
  export: 'تصدير',
  import: 'استيراد',
  download: 'تحميل',
  upload: 'رفع ملف',
  scan: 'مسح ضوئي',
  back: 'رجوع',
  next: 'التالي',
  confirm: 'تأكيد',
  success: 'تمت العملية بنجاح',
  error: 'خطأ في العملية',
  warning: 'تنبيه',
  info: 'معلومات',
  critical: 'حرج جداً',
  noData: 'لا توجد بيانات متاحة',
  notFound: 'العنصر غير موجود',
  searchPlaceholder: 'ابحث عن المواد، رقم الجزء، الوصف، أو بطاقة التاج...',
  networkOffline: 'وضع العمل دون اتصال (التخزين المحلي نشط)',
  networkOnline: 'متصل بالسحابة وقاعدة البيانات',
  internetRequired: 'يتطلب البحث الحي في الإنترنت وجود اتصال نشط بالشبكة.',
  searchFailed: 'فشل البحث. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
  aiUnavailable: 'خدمة التحليل الذكي غير متاحة حالياً.',
  noImageResults: 'لم يتم العثور على صور مرجعية للمادة.',
  serialNumberWarning: 'قد يؤدي البحث عن الرقم التسلسلي في الإنترنت إلى كشف بيانات معدات حساسة. تابع فقط عند الضرورة الفنية القصوى.',

  // Port 10 & 11 Final Integration & UX
  profileSettings: 'إعدادات الحساب والنظام',
  systemAuthentication: 'المصادقة وتسجيل الدخول',
  personnelUsername: 'اسم المستخدم أو البريد الإلكتروني',
  securityPassword: 'رمز الأمان وكلمة المرور',
  initializeConnection: 'تسجيل الدخول وبدء الجلسة',
  quickAccessCredentials: 'حسابات الدخول السريع المعتمدة',
  previousQuantity: 'الكمية السابقة',
  addedQuantity: 'الكمية المضافة',
  currentQuantity: 'الكمية الحالية',
  existingMaterial: 'مادة مسجلة مسبقاً',
  newMaterial: 'مادة جديدة',
  possibleDuplicate: 'احتمال تكرار المادة',
  adminControlCenter: 'مركز التحكم والحوكمة الإدارية',
  notificationCenter: 'مركز الإشعارات والتنبيهات',
  assignedSite: 'الموقع المعين',
  assignedWarehouse: 'المستودع المعين'
};

interface LanguageContextType {
  language: AppLanguage;
  isRTL: boolean;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: keyof TranslationDictionary | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'emis_app_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
      // Check browser locale preference
      if (navigator.language && navigator.language.toLowerCase().startsWith('ar')) {
        return 'ar';
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const isRTL = language === 'ar';

  // Apply HTML dir and lang attributes on change
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.body.dir = isRTL ? 'rtl' : 'ltr';
      if (isRTL) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (e) {
      console.warn('Failed to update document lang/dir attributes:', e);
    }
  }, [language, isRTL]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key: keyof TranslationDictionary | string, fallback?: string): string => {
    const dict = language === 'ar' ? arTranslations : enTranslations;
    if (key in dict) {
      return (dict as any)[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
