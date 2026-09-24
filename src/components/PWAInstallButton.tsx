import React, { useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';
import DeviceInstallModal from './DeviceInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner' | 'compact';
  className?: string;
  onOpenModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
  onOpenModal
}) => {
  const { language } = useLanguage();
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleClick = async () => {
    if (onOpenModal) {
      onOpenModal();
      return;
    }

    if (isInstallable) {
      setInstalling(true);
      try {
        const accepted = await install();
        if (!accepted) {
          setIsModalOpen(true);
        }
      } catch {
        setIsModalOpen(true);
      } finally {
        setInstalling(false);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  // If already installed and variant is header, show subtle badge or button to open device modal
  if (isInstalled && variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${className}`}
          title={language === 'ar' ? 'التطبيق مثبت على جهازك' : 'Installed on your device'}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'ar' ? 'تطبيق مثبت' : 'App Installed'}</span>
        </button>

        <DeviceInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          className={`p-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 transition-colors cursor-pointer shadow-2xs ${className}`}
          title={language === 'ar' ? 'تثبيت على جهازك' : 'Install on device'}
        >
          <Download className="w-4 h-4 animate-pulse" />
        </button>
        <DeviceInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-brand-600/10 to-indigo-600/10 hover:from-brand-600/20 hover:to-indigo-600/20 border border-brand-300/40 dark:border-brand-700/50 text-brand-700 dark:text-brand-300 text-xs font-bold transition-all shadow-2xs group cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-3.5 h-3.5 group-hover:animate-bounce" />
            </div>
            <span>{language === 'ar' ? 'تثبيت على جهازي' : 'Install on Device'}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-600/20 text-brand-700 dark:text-brand-300 font-mono">
            PWA
          </span>
        </button>
        <DeviceInstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // Default 'header' variant
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={installing}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:from-brand-700 active:to-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/25 hover:shadow-brand-500/35 cursor-pointer group ${className}`}
        title={language === 'ar' ? 'تثبيت التطبيق على جهاز الكمبيوتر أو الهاتف' : 'Install application directly on PC or phone'}
      >
        <Download className="h-3.5 w-3.5 text-brand-100 group-hover:scale-110 transition-transform" />
        <span>{language === 'ar' ? 'تثبيت على جهازي' : 'Install App'}</span>
      </button>

      <DeviceInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default PWAInstallButton;
