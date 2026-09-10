/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Server, Shield, User, ArrowRight, AlertTriangle, Cpu, Sun, Moon, Globe } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { dbService, PRESETS_USERS } from '../services/dbService';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(language === 'ar' ? 'يرجى إدخال اسم المستخدم ورمز الأمان.' : 'Please provide both email and security password.');
      return;
    }

    setIsLoading(true);

    // Artificial tiny delay for premium responsive feel
    setTimeout(() => {
      const result = dbService.login(email, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || (language === 'ar' ? 'بيانات الاعتماد غير صحيحة. تم رفض الدخول.' : 'Invalid credentials. Access Denied.'));
      }
    }, 600);
  };

  const handleSelectPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div id="login-container" className="min-h-screen bg-industrial-900 flex flex-col justify-between relative overflow-hidden text-industrial-100 font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Dynamic decorative structural background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-35" />
      
      {/* Top Bar Accent */}
      <div className="h-1 w-full bg-linear-to-r from-brand-600 via-brand-500 to-industrial-500 relative z-10" />

      {/* Top Right Controls (Theme Toggle) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 bg-industrial-800/90 hover:bg-industrial-750 border border-industrial-700/80 rounded-xl text-xs font-medium text-industrial-300 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
          title={isDark ? "Switch to Industrial Light" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-indigo-300" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center mb-6"
        >
          {/* Logo Badge */}
          <div className="inline-flex items-center justify-center p-3 bg-industrial-800 border border-industrial-700 rounded-xl mb-4 shadow-xl">
            <Cpu className="h-8 w-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight heading-display text-white">
            EMIS <span className="text-brand-500 text-lg font-mono font-normal font-bold">v3.0</span>
          </h1>
          <p className="text-xs text-industrial-400 mt-1 uppercase tracking-widest font-mono">
            {t('appSubtitle')}
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md bg-industrial-800/90 border border-industrial-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white tracking-tight">{t('systemAuthentication')}</h2>
            <p className="text-sm text-industrial-400 mt-1">
              {language === 'ar' ? 'يرجى تسجيل الدخول للوصول إلى المخزون والعمليات الهندسية.' : 'Please log in to query or modify material inventories.'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-950/50 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-200 text-sm"
              id="login-error-message"
            >
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-input" className="block text-xs font-medium text-industrial-300 uppercase tracking-wider mb-1.5">
                {t('personnelUsername')}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} pointer-events-none flex items-center`}>
                  <Mail className="h-4.5 w-4.5 text-industrial-500" />
                </div>
                <input
                  id="email-input"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihsan or ihsan@emis.com"
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-industrial-900 border border-industrial-700 rounded-xl text-white placeholder-industrial-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm`}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password-input" className="block text-xs font-medium text-industrial-300 uppercase tracking-wider">
                  {t('securityPassword')}
                </label>
                <span className="text-[11px] text-industrial-500 font-mono">SHA-256 Encrypted</span>
              </div>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-4.5 w-4.5 text-industrial-500" />
                </div>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-industrial-900 border border-industrial-700 rounded-xl text-white placeholder-industrial-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm`}
                  required
                />
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-industrial-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-6 shadow-lg shadow-brand-900/40 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{language === 'ar' ? 'جارٍ التحقق من الهوية...' : 'Verifying credentials...'}</span>
                </>
              ) : (
                <>
                  <span>{t('initializeConnection')}</span>
                  <ArrowRight className={`h-4.5 w-4.5 ${isRTL ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
          </form>

          {/* Presets / Quick Credentials Grid */}
          <div className="mt-8 border-t border-industrial-700/60 pt-6">
            <h3 className="text-xs font-semibold text-industrial-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-brand-500" /> {t('quickAccessCredentials')}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {Object.keys(PRESETS_USERS)
                .filter((key) => key.includes('@') && key !== 'admin@emis.com')
                .map((key) => {
                  const item = PRESETS_USERS[key];
                  const isSelected = email.toLowerCase() === item.user.email.toLowerCase() || email.toLowerCase() === key.toLowerCase();
                  let roleColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                  if (item.user.role === UserRole.ADMIN) roleColor = 'bg-red-500/15 text-red-300 border-red-500/30';
                  else if (item.user.role === UserRole.ENGINEER) roleColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  else if (item.user.role === UserRole.INSPECTOR) roleColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                  else if (item.user.role === UserRole.STOREKEEPER) roleColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  else if (item.user.role === UserRole.VIEWER) roleColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                  return (
                    <button
                      key={item.user.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.user.email, item.pass)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer hover:scale-[1.01] ${
                        isSelected
                          ? 'bg-brand-950/40 border-brand-500/60 shadow-md shadow-brand-950/50'
                          : 'bg-industrial-900/50 border-industrial-700 hover:border-industrial-600 hover:bg-industrial-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{item.user.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${roleColor} uppercase font-medium`}>
                            {item.user.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-industrial-400 font-mono mt-0.5 block">{item.user.email}</span>
                      </div>
                      <div className="text-[10px] font-mono text-industrial-300 bg-industrial-900 border border-industrial-700 px-2 py-1 rounded select-none shrink-0 self-end sm:self-center font-semibold">
                        PIN: {item.pass}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer Accent */}
      <footer className="py-4 text-center text-[11px] text-industrial-500 border-t border-industrial-800/80 bg-industrial-950/20 relative z-10">
        <p className="font-mono">EMIS | Standard Industrial Control Network System Interface v3.0</p>
        <p className="text-industrial-600 mt-0.5">
          {language === 'ar' ? 'مخصص للكوادر الهندسية المصرح لها فقط. جميع عمليات الوصول والمصادقة مسجلة ومحمية.' : 'Authorized engineering personnel only. All access connections are actively logged.'}
        </p>
      </footer>
    </div>
  );
}
