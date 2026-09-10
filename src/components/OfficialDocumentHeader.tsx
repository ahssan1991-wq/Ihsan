/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { organizationProfileService } from '../services/organizationProfileService';
import { OrganizationSettings } from '../types';

interface OfficialDocumentHeaderProps {
  titleEn: string;
  titleAr: string;
  documentNumber: string;
  documentDate?: string;
  statusBadge?: string;
  facilityOverride?: string;
  qrPayload?: string;
  className?: string;
}

export const OfficialDocumentHeader: React.FC<OfficialDocumentHeaderProps> = ({
  titleEn,
  titleAr,
  documentNumber,
  documentDate = new Date().toISOString().split('T')[0],
  statusBadge = 'OFFICIAL / معتمد',
  facilityOverride,
  qrPayload,
  className = ''
}) => {
  const [profile, setProfile] = useState<OrganizationSettings>(() => organizationProfileService.getSettings());

  useEffect(() => {
    setProfile(organizationProfileService.getSettings());
  }, []);

  const verificationUrl = qrPayload || `EMIS-DOC:${documentNumber}|CR:${profile.crNumber}|DATE:${documentDate}`;

  return (
    <div className={`border-b-2 border-industrial-700 pb-4 mb-6 ${className}`}>
      {/* Top Bar: Company details & Document Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Company Identity */}
        <div className="flex items-center gap-3.5">
          {profile.logoUrl ? (
            <img 
              src={profile.logoUrl} 
              alt="Company Logo" 
              className="w-14 h-14 object-contain rounded-lg border border-industrial-700 bg-white p-1"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-600 to-industrial-800 flex items-center justify-center border border-brand-500/40 shadow-inner">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}

          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{profile.companyNameEn}</span>
            </h1>
            <h2 className="text-sm font-semibold text-industrial-300 font-sans" dir="rtl">
              {profile.companyNameAr}
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono text-industrial-400 mt-0.5">
              <span>CR: <strong className="text-industrial-200">{profile.crNumber}</strong></span>
              <span>•</span>
              <span>VAT: <strong className="text-industrial-200">{profile.taxVatNumber}</strong></span>
              <span>•</span>
              <span className="text-industrial-300">{facilityOverride || profile.facilityNameEn}</span>
            </div>
          </div>
        </div>

        {/* Document Identifier & QR Stamp */}
        <div className="flex items-center gap-3 sm:text-right w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-industrial-800">
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-1">
              {statusBadge}
            </div>
            <div className="text-xs font-mono font-bold text-brand-400">
              DOC #: {documentNumber}
            </div>
            <div className="text-[11px] font-mono text-industrial-400">
              DATE: {documentDate}
            </div>
          </div>

          <div className="p-1.5 bg-white rounded-lg border border-industrial-700 shadow-sm flex items-center justify-center">
            <QRCodeSVG value={verificationUrl} size={48} level="M" />
          </div>
        </div>
      </div>

      {/* Document Subtitle Banner */}
      <div className="mt-4 pt-3 border-t border-industrial-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            {titleEn}
          </h3>
          <p className="text-xs font-medium text-brand-300" dir="rtl">
            {titleAr}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-industrial-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>EMIS Quality Verification Protocol</span>
        </div>
      </div>
    </div>
  );
};

export const OfficialDocumentFooter: React.FC<{
  preparedBy?: string;
  approvedBy?: string;
  date?: string;
}> = ({
  preparedBy = 'System User',
  approvedBy,
  date = new Date().toISOString().split('T')[0]
}) => {
  const profile = organizationProfileService.getSettings();

  return (
    <div className="mt-8 pt-4 border-t-2 border-industrial-700 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
        <div className="p-3 bg-industrial-900/60 rounded-xl border border-industrial-800">
          <span className="text-[10px] font-mono uppercase text-industrial-400 block mb-1">Prepared By / إعداد المعاملة</span>
          <div className="font-semibold text-white">{preparedBy}</div>
          <div className="text-[11px] font-mono text-industrial-400">{date}</div>
        </div>

        <div className="p-3 bg-industrial-900/60 rounded-xl border border-industrial-800">
          <span className="text-[10px] font-mono uppercase text-industrial-400 block mb-1">Authorized Inspection Authority / الاعتماد الرسمي</span>
          <div className="font-semibold text-white">{approvedBy || profile.officialSignatoryEn}</div>
          <div className="text-[11px] font-mono text-brand-400">{profile.signatoryTitleEn} ({profile.signatoryTitleAr})</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-industrial-400 gap-2 border-t border-industrial-800 pt-3">
        <span>{profile.footerNotesEn}</span>
        <span dir="rtl">{profile.footerNotesAr}</span>
      </div>
    </div>
  );
};
