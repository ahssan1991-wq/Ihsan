/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  Cpu, 
  User, 
  ShieldCheck,
  Zap,
  Info,
  Warehouse,
  Database,
  Cloud
} from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserType;
  onLogout: () => void;
}

export default function Navigation({ activeTab, setActiveTab, currentUser, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAiTeaser, setShowAiTeaser] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] },
    { id: 'materials', name: 'Materials Ledger', icon: Layers, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] },
    { id: 'equipment', name: 'Equipment', icon: Warehouse, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] },
    { id: 'add-material', name: 'Add Material', icon: PlusCircle, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER] },
    { id: 'search', name: 'Multi-Field Search', icon: Search, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] },
    { id: 'governance', name: 'Governance & Training', icon: ShieldCheck, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] },
    { id: 'backup-sync', name: 'Backup & Sync Center', icon: Database, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER] },
    { id: 'google-drive', name: 'Google Drive Vault', icon: Cloud, roles: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENGINEER, UserRole.WAREHOUSE, UserRole.READONLY, UserRole.VIEWER] }
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case UserRole.SUPERVISOR:
      case UserRole.ENGINEER:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case UserRole.WAREHOUSE:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case UserRole.READONLY:
      case UserRole.VIEWER:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-industrial-500/10 text-industrial-400 border-industrial-500/20';
    }
  };

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="lg:hidden h-16 bg-industrial-900 border-b border-industrial-800 px-4 flex items-center justify-between sticky top-0 z-40 text-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-600/20 border border-brand-500/30 rounded-lg">
            <Cpu className="h-5 w-5 text-brand-500" />
          </div>
          <span className="font-bold tracking-tight heading-display text-base">EMIS v1.0</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor(currentUser.role)}`}>
            {currentUser.role}
          </span>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-industrial-800 text-industrial-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-x-0 top-16 bg-industrial-900 border-b border-industrial-800 shadow-2xl z-30 p-5 space-y-5 text-white"
          >
            {/* User Profile Summary */}
            <div className="bg-industrial-800 p-4 rounded-xl border border-industrial-700/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-600/10 border border-brand-500/30 flex items-center justify-center text-brand-500">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-industrial-400 truncate font-mono">{currentUser.email}</p>
              </div>
            </div>

            {/* Menu Links */}
            <nav className="space-y-1">
              {allowedMenuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-950/40' 
                        : 'text-industrial-400 hover:text-white hover:bg-industrial-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Future AI Placeholder */}
            <div className="pt-3 border-t border-industrial-800">
              <button
                onClick={() => handleTabClick('ai-copilot')}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-industrial-850 to-industrial-800 hover:from-brand-950/20 hover:to-brand-900/10 border border-industrial-700 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  activeTab === 'ai-copilot'
                    ? 'text-white border-brand-500 bg-brand-950/20'
                    : 'text-brand-400 font-semibold'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  <span>AI Co-Pilot (v0.2)</span>
                </span>
                <span className="bg-brand-500/15 text-brand-400 border border-brand-500/30 text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                  Active
                </span>
              </button>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect Session</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-industrial-900 border-r border-industrial-800 h-screen sticky top-0 shrink-0 text-white select-none">
        {/* Top Logo */}
        <div className="p-6 border-b border-industrial-800 flex items-center gap-2.5">
          <div className="p-2 bg-brand-600/10 border border-brand-500/30 rounded-xl shadow-inner">
            <Cpu className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg heading-display text-white">EMIS LEDGER</h1>
            <p className="text-[10px] text-brand-500 font-mono tracking-widest uppercase">Release v1.0</p>
          </div>
        </div>

        {/* User Identity Panel */}
        <div className="p-4 mx-4 my-5 bg-industrial-850/80 border border-industrial-800/80 rounded-2xl flex flex-col items-center text-center shadow-lg">
          <div className="h-12 w-12 rounded-xl bg-linear-to-b from-brand-600 to-brand-700/60 flex items-center justify-center text-white font-bold text-lg shadow-md mb-2 border border-brand-500/25">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <p className="font-semibold text-sm truncate w-full text-white">{currentUser.name}</p>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase mt-1.5 font-medium ${getRoleBadgeColor(currentUser.role)}`}>
            {currentUser.role}
          </span>
          <p className="text-[10px] text-industrial-500 font-mono mt-2 truncate w-full">{currentUser.email}</p>
        </div>

        {/* Sidebar Links */}
        <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <span className="px-3 text-[10px] text-industrial-500 uppercase tracking-widest font-mono font-medium block mb-2.5">
            OPERATIONAL MENUS
          </span>
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-950/40 hover:bg-brand-500 translate-x-1' 
                    : 'text-industrial-400 hover:text-white hover:bg-industrial-850'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}

          {/* Locked AI Feature */}
          <div className="pt-6 mt-4 border-t border-industrial-850">
            <span className="px-3 text-[10px] text-industrial-500 uppercase tracking-widest font-mono font-medium block mb-2">
              AUTOMATION MODULES
            </span>
            <button
              onClick={() => setActiveTab('ai-copilot')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-industrial-950 to-industrial-850 hover:from-brand-950/20 hover:to-brand-900/15 border border-industrial-800 rounded-xl text-xs font-mono transition-all duration-150 cursor-pointer ${
                activeTab === 'ai-copilot'
                  ? 'text-white border-brand-500 bg-brand-950/30 font-bold'
                  : 'text-industrial-400 hover:text-brand-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-500 animate-pulse shrink-0" />
                <span>AI Co-Pilot</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] uppercase px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                ACTIVE
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-industrial-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-950/10 hover:bg-red-950/30 border border-red-500/10 hover:border-red-500/20 text-red-400 text-xs font-medium rounded-xl transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect Session</span>
          </button>
        </div>
      </aside>

      {/* AI Placeholder Modal */}
      <AnimatePresence>
        {showAiTeaser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-industrial-850 border border-industrial-700 p-6 rounded-2xl shadow-2xl text-white relative"
            >
              <button 
                onClick={() => setShowAiTeaser(false)}
                className="absolute top-4 right-4 text-industrial-400 hover:text-white p-1 rounded-lg hover:bg-industrial-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/25 rounded-xl text-brand-400">
                  <Zap className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg heading-display">AI Automation Engine</h3>
                  <p className="text-[10px] text-brand-500 font-mono tracking-widest uppercase">EMIS v0.2 ROADMAP</p>
                </div>
              </div>
              <div className="space-y-3.5 text-xs text-industrial-300 font-sans border-t border-industrial-800 pt-4">
                <p>The AI Suite is currently deactivated for **Version 0.1 (Base Foundation)**.</p>
                <p>In upcoming releases, the intelligent co-pilot will enable:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-1 font-mono text-[11px] text-brand-300">
                  <li>Automatic PDF delivery note ingestion</li>
                  <li>Optical Character Recognition (OCR) for parts scanning</li>
                  <li>Dynamic multi-document schematics comparison</li>
                  <li>Intelligent predictive restock forecasting</li>
                </ul>
                <div className="p-3 bg-industrial-900 border border-industrial-800 rounded-xl flex items-start gap-2.5 mt-2">
                  <Info className="h-4.5 w-4.5 text-brand-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-industrial-400 leading-normal">
                    This placeholder has been designed as an architectural gate for secure LLM proxy routing in Version 0.2. No active connections are made at this time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiTeaser(false)}
                className="w-full mt-5 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Acknowledge and Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
