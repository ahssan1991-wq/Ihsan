/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Info, 
  Search, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles, 
  Globe, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';

// ============================================================================
// 1. EMIS BUTTON
// ============================================================================

export interface EMISButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'brand';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon | React.ComponentType<any>;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e?: any) => void;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  title?: string;
}

export function EMISButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}: EMISButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.98]';

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs rounded-md gap-1.5 min-h-[30px]',
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-2 min-h-[36px]',
    md: 'px-4 py-2 text-sm rounded-xl gap-2 min-h-[44px]',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5 min-h-[48px]'
  };

  const variantClasses = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm border border-brand-500/30 active:bg-brand-700',
    brand: 'bg-linear-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md border border-brand-400/30',
    secondary: 'bg-industrial-800 hover:bg-industrial-750 text-industrial-100 border border-industrial-700 active:bg-industrial-850',
    outline: 'bg-transparent hover:bg-industrial-800 text-industrial-200 border border-industrial-700 hover:text-white',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm border border-rose-500/30 active:bg-rose-700',
    ghost: 'bg-transparent hover:bg-industrial-800/60 text-industrial-300 hover:text-white border-transparent'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && <Icon className="h-4 w-4 shrink-0" />}
    </button>
  );
}

// ============================================================================
// 2. EMIS CARD
// ============================================================================

export interface EMISCardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  id?: string;
}

export function EMISCard({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  id
}: EMISCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7'
  };

  const variantClasses = {
    default: 'bg-industrial-900 border border-industrial-800 rounded-2xl shadow-xs',
    elevated: 'bg-industrial-900/90 backdrop-blur-md border border-industrial-750/80 rounded-2xl shadow-xl',
    bordered: 'bg-industrial-850/50 border border-industrial-700/60 rounded-2xl',
    interactive: 'bg-industrial-900 border border-industrial-800 hover:border-brand-500/40 rounded-2xl shadow-xs hover:shadow-lg transition-all cursor-pointer hover:translate-y-[-1px]'
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 3. EMIS BADGE
// ============================================================================

export interface EMISBadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'purple';
  size?: 'xs' | 'sm' | 'md';
  icon?: LucideIcon;
  className?: string;
  id?: string;
}

export function EMISBadge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon: Icon,
  className = '',
  id
}: EMISBadgeProps) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-semibold'
  };

  const variantClasses = {
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    neutral: 'bg-industrial-800 text-industrial-300 border border-industrial-700',
    brand: 'bg-brand-500/15 text-brand-300 border border-brand-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

// ============================================================================
// 4. EMIS STATUS (AI TRUST LAYER - MANDATORY PORT 14)
// ============================================================================

export type EMISDataOrigin = 
  | 'INTERNAL_VERIFIED' 
  | 'AI_SUGGESTION' 
  | 'EXTERNAL_INFO' 
  | 'NOT_AVAILABLE';

export interface EMISStatusProps {
  origin: EMISDataOrigin;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export function EMISStatus({
  origin,
  label,
  className = '',
  showIcon = true
}: EMISStatusProps) {
  switch (origin) {
    case 'INTERNAL_VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs ${className}`}>
          {showIcon && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
          <span>{label || '🟢 INTERNAL VERIFIED'}</span>
        </span>
      );
    case 'AI_SUGGESTION':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs ${className}`}>
          {showIcon && <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
          <span>{label || '🟡 AI SUGGESTION'}</span>
        </span>
      );
    case 'EXTERNAL_INFO':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-xs ${className}`}>
          {showIcon && <Globe className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
          <span>{label || '🔵 EXTERNAL INFO'}</span>
        </span>
      );
    case 'NOT_AVAILABLE':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-industrial-800 text-industrial-400 border border-industrial-700/80 ${className}`}>
          {showIcon && <HelpCircle className="h-3.5 w-3.5 text-industrial-500 shrink-0" />}
          <span>{label || '⚪ NOT AVAILABLE'}</span>
        </span>
      );
  }
}

// ============================================================================
// 5. EMIS LOADING STATE
// ============================================================================

export interface EMISLoadingProps {
  message?: string;
  subMessage?: string;
  className?: string;
}

export function EMISLoading({
  message = 'Loading data...',
  subMessage,
  className = ''
}: EMISLoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-semibold text-industrial-200">{message}</p>
      {subMessage && (
        <p className="text-xs text-industrial-400 mt-1 max-w-sm">{subMessage}</p>
      )}
    </div>
  );
}

// ============================================================================
// 6. EMIS EMPTY STATE
// ============================================================================

export interface EMISEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EMISEmptyState({
  icon: Icon = Info,
  title,
  description,
  action,
  className = ''
}: EMISEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-industrial-750 bg-industrial-900/40 ${className}`}>
      <div className="p-4 rounded-2xl bg-industrial-800/80 border border-industrial-700/70 text-industrial-400 mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
      <p className="text-xs text-industrial-300 max-w-md leading-relaxed mb-5">{description}</p>
      {action && (
        <EMISButton
          variant="primary"
          size="sm"
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </EMISButton>
      )}
    </div>
  );
}

// ============================================================================
// 7. EMIS ERROR STATE
// ============================================================================

export interface EMISErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function EMISErrorState({
  title = 'System Operation Notice',
  message,
  onRetry,
  className = ''
}: EMISErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-500/30 bg-rose-950/20 ${className}`}>
      <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
        <AlertOctagon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-rose-200 mb-1">{title}</h3>
      <p className="text-xs text-rose-300/80 max-w-md mb-4">{message}</p>
      {onRetry && (
        <EMISButton
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-500/40 text-rose-200 hover:bg-rose-900/40"
        >
          Retry Operation
        </EMISButton>
      )}
    </div>
  );
}

// ============================================================================
// 8. EMIS PAGE HEADER
// ============================================================================

export interface EMISPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  className?: string;
}

export function EMISPageHeader({
  title,
  subtitle,
  badge,
  icon: Icon,
  actions,
  breadcrumbs,
  className = ''
}: EMISPageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-industrial-800 ${className}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-industrial-400 mb-2">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-industrial-600" />}
                {crumb.onClick ? (
                  <button 
                    onClick={crumb.onClick}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-industrial-300 font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 shrink-0">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h1>
              {badge && (
                <EMISBadge variant="brand" size="xs">
                  {badge}
                </EMISBadge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs md:text-sm text-industrial-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 9. EMIS SEARCH BAR
// ============================================================================

export interface EMISSearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (val: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  id?: string;
}

export function EMISSearchBar({
  value,
  onChangeValue,
  placeholder = 'Search materials, parts, documents...',
  onClear,
  className = '',
  id = 'emis-search-bar',
  ...props
}: EMISSearchBarProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 h-4 w-4 text-industrial-400 pointer-events-none" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 bg-industrial-900 border border-industrial-750 hover:border-industrial-600 focus:border-brand-500 rounded-xl text-sm text-white placeholder-industrial-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500 transition-all"
        {...props}
      />
      {value && (
        <button
          onClick={() => {
            onChangeValue('');
            onClear?.();
          }}
          className="absolute right-3 p-1 rounded-md text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 10. EMIS MODAL / DIALOG
// ============================================================================

export interface EMISDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  actions?: ReactNode;
  id?: string;
}

export function EMISDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'xl',
  actions,
  id
}: EMISDialogProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  };

  return (
    <AnimatePresence>
      <div 
        id={id}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.15 }}
          className={`relative w-full ${maxWidthClasses[maxWidth]} bg-industrial-900 border border-industrial-750 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-industrial-800 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-industrial-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 text-industrial-200">
            {children}
          </div>

          {/* Footer Actions */}
          {actions && (
            <div className="px-6 py-4 border-t border-industrial-800 bg-industrial-950/40 flex items-center justify-end gap-3 shrink-0">
              {actions}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
