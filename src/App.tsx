/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Material, ActivityLog, Equipment } from './types';
import { dbService } from './services/dbService';

// View Imports
import LoginView from './components/LoginView';
import Navigation from './components/Navigation';
import DashboardView from './components/DashboardView';
import MaterialsView from './components/MaterialsView';
import EquipmentView from './components/EquipmentView';
import AddMaterialView from './components/AddMaterialView';
import SearchView from './components/SearchView';
import AiCopilotView from './components/AiCopilotView';
import GovernanceView from './components/GovernanceView';
import BackupSyncView from './components/BackupSyncView';
import GoogleDriveView from './components/GoogleDriveView';

import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Ledger state synchronized across components
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Search passing state
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>('');

  // Global Toast / Notification banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize DB and load session on mount
  useEffect(() => {
    // Initial optimistic load from local storage
    dbService.initialize();
    setMaterials(dbService.getMaterials());
    setActivities(dbService.getActivities());
    setEquipment(dbService.getEquipment());

    const initDb = async () => {
      await dbService.initializeAsync();
      setMaterials(dbService.getMaterials());
      setActivities(dbService.getActivities());
      setEquipment(dbService.getEquipment());
    };
    initDb();
    
    // Read cached login sessions
    const sessionUser = dbService.getCurrentUser();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
  }, []);

  // Listen for deep link part number parameter from scanned QR code tags
  useEffect(() => {
    if (currentUser && materials.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const partParam = params.get('part');
      if (partParam) {
        // Clear the URL parameter from the browser address bar so it doesn't repeat on reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        setInitialSearchQuery(partParam);
        setActiveTab('materials');
        triggerToast('success', `Deep linked to asset file: ${partParam}`);
      }
    }
  }, [currentUser, materials]);

  const triggerToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Reload databases
    setMaterials(dbService.getMaterials());
    setActivities(dbService.getActivities());
    setEquipment(dbService.getEquipment());
    setActiveTab('dashboard');
    triggerToast('success', `Security connection established as ${user.name}`);
  };

  const handleLogout = () => {
    dbService.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
    triggerToast('success', 'Security connection terminated successfully.');
  };

  const handleUpdateMaterial = (updatedMaterial: Material, oldPartNumber?: string) => {
    if (!currentUser) return;
    const res = oldPartNumber && oldPartNumber.toUpperCase() !== updatedMaterial.partNumber.toUpperCase()
      ? dbService.updateMaterialWithPartNumberChange(oldPartNumber, updatedMaterial, currentUser)
      : dbService.updateMaterial(updatedMaterial, currentUser);
    if (res.success) {
      setMaterials(dbService.getMaterials());
      setActivities(dbService.getActivities());
      setEquipment(dbService.getEquipment());
      triggerToast('success', `Successfully updated material ${updatedMaterial.partNumber}`);
    } else {
      triggerToast('error', res.error || 'Failed to update material');
    }
  };

  const handleDeleteMaterial = (partNumber: string) => {
    if (!currentUser) return;
    const res = dbService.deleteMaterial(partNumber, currentUser);
    if (res.success) {
      setMaterials(dbService.getMaterials());
      setActivities(dbService.getActivities());
      setEquipment(dbService.getEquipment());
      triggerToast('success', `Deleted record for part number: ${partNumber}`);
    } else {
      triggerToast('error', res.error || 'Failed to delete material');
    }
  };

  const handleUpdateEquipment = () => {
    setEquipment(dbService.getEquipment());
    setActivities(dbService.getActivities());
  };

  const handleAddMaterialSuccess = () => {
    setMaterials(dbService.getMaterials());
    setActivities(dbService.getActivities());
    triggerToast('success', 'Successfully registered new material in ledger');
    setActiveTab('materials');
    setInitialSearchQuery('');
  };

  const handleNavigateWithSearch = (tabId: string, query: string = '') => {
    setInitialSearchQuery(query);
    setActiveTab(tabId);
  };

  const handleInspectMaterialFromSearch = (material: Material) => {
    // Navigate to Materials tab, search specifically for that part number
    setInitialSearchQuery(material.partNumber);
    setActiveTab('materials');
  };

  // Render correct view based on active tab
  const renderActiveView = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            materials={materials}
            activities={activities}
            currentUser={currentUser}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'materials':
        return (
          <MaterialsView
            materials={materials}
            currentUser={currentUser}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            initialSearchQuery={initialSearchQuery}
            onNavigateToTab={(tabId) => handleNavigateWithSearch(tabId, '')}
            onImportSuccess={() => {
              setMaterials(dbService.getMaterials());
              setActivities(dbService.getActivities());
              setEquipment(dbService.getEquipment());
            }}
          />
        );
      case 'equipment':
        return (
          <EquipmentView
            equipment={equipment}
            materials={materials}
            currentUser={currentUser}
            onUpdateEquipment={handleUpdateEquipment}
            onNavigateToTab={handleNavigateWithSearch}
            triggerToast={triggerToast}
          />
        );
      case 'add-material':
        return (
          <AddMaterialView
            materials={materials}
            currentUser={currentUser}
            onAddMaterialSuccess={handleAddMaterialSuccess}
          />
        );
      case 'search':
        return (
          <SearchView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={handleInspectMaterialFromSearch}
          />
        );
      case 'ai-copilot':
        return (
          <AiCopilotView
            materials={materials}
            currentUser={currentUser}
          />
        );
      case 'governance':
        return (
          <GovernanceView
            currentUser={currentUser}
          />
        );
      case 'backup-sync':
        return (
          <BackupSyncView
            currentUser={currentUser}
            onRefreshData={() => {
              setMaterials(dbService.getMaterials());
              setActivities(dbService.getActivities());
              setEquipment(dbService.getEquipment());
            }}
          />
        );
      case 'google-drive':
        return (
          <GoogleDriveView
            currentUser={currentUser}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-sm font-mono text-industrial-500">
            Navigation Link Fault: Tab code '{activeTab}' does not match system registers.
          </div>
        );
    }
  };

  // If unauthorized, redirect to login page immediately
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {/* Render persistent toast notifications during login if needed */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 bg-industrial-900 border border-industrial-700 rounded-xl shadow-2xl text-white font-sans text-xs"
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-industrial-50 flex flex-col lg:flex-row relative font-sans" id="app-wrapper">
      
      {/* Sidebar/Header Navigation Menu */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Operating Panel */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full max-w-7xl mx-auto pb-12"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast Notification Stream */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl shadow-xl text-xs border max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-950 border-emerald-500/30 text-emerald-200' 
                : 'bg-red-950 border-red-500/30 text-red-200'
            }`}
            id="global-toast-notification"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 animate-bounce" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{toast.type === 'success' ? 'System Acknowledged' : 'Operational Fault'}</p>
              <p className="text-[11px] text-industrial-300 mt-0.5">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-industrial-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
