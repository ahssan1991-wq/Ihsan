/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OrganizationSettings } from '../types';

const STORAGE_KEY = 'emis_organization_profile_v1';

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  companyNameEn: 'Remix Engineering & Industrial Solutions Ltd.',
  companyNameAr: 'شركة ريمكس للحلول الهندسية والصناعية المحدودة',
  facilityNameEn: 'Central Industrial Complex & Materials Warehouse',
  facilityNameAr: 'مجمع المستودعات المركزية ومحطة الفحص الفني',
  crNumber: 'CR-1010489221',
  taxVatNumber: 'VAT-310492819200003',
  logoUrl: '',
  addressEn: 'Industrial Area Phase 2, Logistics Blvd, Unit 14B',
  addressAr: 'المنطقة الصناعية - المرحلة الثانية، طريق الخدمات اللوجستية',
  contactEmail: 'materials.control@remix-eng.com',
  contactPhone: '+966 (0) 13 892 4400',
  poPrefix: 'PO-2026-',
  prPrefix: 'PR-2026-',
  grnPrefix: 'GRN-2026-',
  gisPrefix: 'GIS-2026-',
  officialSignatoryEn: 'Eng. H. Al-Mansoor',
  officialSignatoryAr: 'م. حسن المنصور',
  signatoryTitleEn: 'Head of Quality Assurance & Materials Engineering',
  signatoryTitleAr: 'رئيس قسم ضمان الجودة وهندسة المواد',
  digitalStampUrl: '',
  footerNotesEn: 'This is an official computer-generated document from EMIS Core ERP. Any tampering invalidates this record.',
  footerNotesAr: 'هذه وثيقة رسمية صادرة آلياً من نظام EMIS لإدارة المواد. أي كشط أو تعديل يدوي يلغي اعتمادها.'
};

export const organizationProfileService = {
  getSettings(): OrganizationSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_ORGANIZATION_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[OrganizationProfileService] Error loading settings:', e);
    }
    return DEFAULT_ORGANIZATION_SETTINGS;
  },

  saveSettings(settings: Partial<OrganizationSettings>): OrganizationSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[OrganizationProfileService] Error saving settings:', e);
    }
    return updated;
  }
};
