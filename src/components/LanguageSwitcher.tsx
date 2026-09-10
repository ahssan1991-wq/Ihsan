/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
  variant?: 'header' | 'sidebar' | 'pill';
}

export default function LanguageSwitcher({ 
  compact = false, 
  className = '', 
  variant = 'header' 
}: LanguageSwitcherProps) {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = SUPPORTED_LANGUAGES;

  const currentLang = languages.find(l => l.code === language) || languages[0];

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 bg-industrial-800/80 border border-industrial-700/80 rounded-xl ${className}`}>
        {languages.map(item => {
          const isSelected = language === item.code;
          return (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected 
                  ? 'bg-brand-600 text-white shadow-xs font-bold' 
                  : 'text-industrial-400 hover:text-white hover:bg-industrial-700/50'
              }`}
            >
              <span>{item.flag}</span>
              <span>{item.native}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between p-2 bg-industrial-850 border border-industrial-750/80 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-industrial-300">
            <Globe className="h-4 w-4 text-brand-400" />
            <span className="font-medium">{t('language')}:</span>
          </div>
          <div className="flex items-center gap-1">
            {languages.map(item => (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`px-2 py-0.8 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  language === item.code
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-750'
                }`}
              >
                {item.native}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Header dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-industrial-800 hover:bg-industrial-750 border border-industrial-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
        aria-label="Select Language"
        title="Switch Language / تغيير اللغة"
      >
        <Globe className="h-3.5 w-3.5 text-brand-400 shrink-0" />
        <span className="font-semibold">{currentLang.native}</span>
        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
          {currentLang.dir}
        </span>
        <ChevronDown className="h-3 w-3 text-industrial-400 shrink-0" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-full mt-1.5 ${isRTL ? 'left-0' : 'right-0'} w-44 bg-industrial-900 border border-industrial-750 rounded-xl shadow-2xl p-1.5 z-50 text-white select-none`}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-industrial-400 border-b border-industrial-800 mb-1">
                {t('switchLanguage')}
              </div>
              {languages.map(item => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-600/25 text-brand-300 font-bold border border-brand-500/30' 
                        : 'text-industrial-300 hover:text-white hover:bg-industrial-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.flag}</span>
                      <div className="text-left">
                        <p className="leading-tight">{item.native}</p>
                        <p className="text-[10px] text-industrial-400 font-normal">{item.label}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-400" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
