/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { organizationProfileService, DEFAULT_ORGANIZATION_SETTINGS } from '../services/organizationProfileService';
import { OrganizationSettings } from '../types';

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: OrganizationSettings) => void;
}

export const OrganizationSettingsModal: React.FC<OrganizationSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState<OrganizationSettings>(() => organizationProfileService.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(formData.logoUrl || '');

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Image size should be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoPreview(base64);
        setFormData(prev => ({ ...prev, logoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = organizationProfileService.saveSettings(formData);
    setSavedSuccess(true);
    if (onSaved) onSaved(updated);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset company profile and branding to system defaults? / هل تريد استعادة البيانات الافتراضية؟')) {
      setFormData(DEFAULT_ORGANIZATION_SETTINGS);
      setLogoPreview('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-industrial-900 border border-industrial-750 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-industrial-800 bg-industrial-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Organization & Official Branding Profile
              </h2>
              <p className="text-xs text-industrial-400" dir="rtl">
                إعدادات هوية المنشأة، الشعار، وترويسة المطبوعات الرسمية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully. All future reports will reflect this branding.</span>
            </div>
          )}

          {/* Logo & Visual Identity */}
          <div className="p-4 bg-industrial-850 rounded-xl border border-industrial-800 space-y-3">
            <span className="text-xs font-mono uppercase text-industrial-400 font-bold block">
              Official Company Logo / شعار المنشأة
            </span>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-industrial-700 bg-industrial-900 flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-industrial-600" />
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo (PNG / JPG)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setFormData(prev => ({ ...prev, logoUrl: '' }));
                    }}
                    className="block text-[11px] text-rose-400 hover:underline"
                  >
                    Remove Logo
                  </button>
                )}
                <p className="text-[11px] text-industrial-400">
                  Recommended: Transparent PNG or high contrast JPG (under 1MB).
                </p>
              </div>
            </div>
          </div>

          {/* Company Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300">
                Company Legal Name (English)
              </label>
              <input
                type="text"
                value={formData.companyNameEn}
                onChange={e => setFormData({ ...formData, companyNameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300 text-right block" dir="rtl">
                اسم المنشأة القانوني (بالعربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.companyNameAr}
                onChange={e => setFormData({ ...formData, companyNameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none text-right"
                required
              />
            </div>
          </div>

          {/* Facility Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300">
                Warehouse / Plant Facility Name (English)
              </label>
              <input
                type="text"
                value={formData.facilityNameEn}
                onChange={e => setFormData({ ...formData, facilityNameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300 text-right block" dir="rtl">
                اسم المستودع أو المحطة الفنية (بالعربية)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.facilityNameAr}
                onChange={e => setFormData({ ...formData, facilityNameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Legal / Tax Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300">
                Commercial Registration (CR #) / رقم السجل التجاري
              </label>
              <input
                type="text"
                value={formData.crNumber}
                onChange={e => setFormData({ ...formData, crNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300">
                Tax / VAT Identification Number / الرقم الضريبي
              </label>
              <input
                type="text"
                value={formData.taxVatNumber}
                onChange={e => setFormData({ ...formData, taxVatNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Official Signatory Authority */}
          <div className="p-4 bg-industrial-850 rounded-xl border border-industrial-800 space-y-3">
            <span className="text-xs font-mono uppercase text-industrial-400 font-bold block">
              Official Quality Signatory / المفوض بالاعتماد الفني
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-industrial-300">Signatory Name (En)</label>
                <input
                  type="text"
                  value={formData.officialSignatoryEn}
                  onChange={e => setFormData({ ...formData, officialSignatoryEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-industrial-300 text-right block" dir="rtl">اسم المفوض (عربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.officialSignatoryAr}
                  onChange={e => setFormData({ ...formData, officialSignatoryAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none text-right"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-industrial-300">Signatory Title (En)</label>
                <input
                  type="text"
                  value={formData.signatoryTitleEn}
                  onChange={e => setFormData({ ...formData, signatoryTitleEn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-industrial-300 text-right block" dir="rtl">المسمى الوظيفي (عربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.signatoryTitleAr}
                  onChange={e => setFormData({ ...formData, signatoryTitleAr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none text-right"
                />
              </div>
            </div>
          </div>

          {/* Footer Official Disclaimers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300">
                Document Footer Note (English)
              </label>
              <textarea
                rows={2}
                value={formData.footerNotesEn}
                onChange={e => setFormData({ ...formData, footerNotesEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-industrial-300 text-right block" dir="rtl">
                تذييل المستند الرسمي (بالعربية)
              </label>
              <textarea
                rows={2}
                dir="rtl"
                value={formData.footerNotesAr}
                onChange={e => setFormData({ ...formData, footerNotesAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-industrial-850 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none text-right resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-industrial-800">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-xs text-industrial-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-industrial-700 text-industrial-300 hover:text-white text-xs font-semibold hover:bg-industrial-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Organization Profile</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
