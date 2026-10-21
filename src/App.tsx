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
import MrfManagementView from './components/MrfManagementView';
import MaterialDetailsModal from './components/MaterialDetailsModal';
import AiCopilotView from './components/AiCopilotView';
import { AiDiagnosticView } from './components/AiDiagnosticView';
import GovernanceView from './components/GovernanceView';
import BackupSyncView from './components/BackupSyncView';
import GoogleDriveView from './components/GoogleDriveView';
import NameplateScanner from './components/NameplateScanner';
import EngineeringDecisionsView from './components/EngineeringDecisionsView';
import BlacklistView from './components/BlacklistView';
import ReportsView from './components/ReportsView';
import { ExternalStockView } from './components/ExternalStockView';
import { ExcelImportCenterView } from './components/ExcelImportCenterView';
import { MaterialTraceabilityView } from './components/MaterialTraceabilityView';
import { EngineeringVerificationView } from './components/EngineeringVerificationView';
import { DocumentCenterView } from './components/DocumentCenterView';
import { EnterpriseOperationsView, EnterpriseSubTab } from './components/EnterpriseOperationsView';
import IntelligenceDashboardView from './components/IntelligenceDashboardView';
import MaterialIntelligenceView from './components/MaterialIntelligenceView';
import MaterialIntelligenceModal from './components/MaterialIntelligenceModal';
import NetworkStatusIndicator from './components/NetworkStatusIndicator';
import AdminDashboard from './components/AdminDashboard';
import RecycleBinView from './components/RecycleBinView';
import MaterialPassportModal from './components/MaterialPassportModal';
import SystemHealthModal from './components/SystemHealthModal';
import RemoteAccessModal from './components/RemoteAccessModal';
import SmartUpdateModal from './components/SmartUpdateModal';
import AiEngineeringAssistantModal from './components/AiEngineeringAssistantModal';
import SharedPassportView from './components/SharedPassportView';
import ActionCenterView from './components/ActionCenterView';
import DataQualityCenterView from './components/DataQualityCenterView';
import WhatsNewModal from './components/WhatsNewModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import { BarcodeLabelStudioView } from './components/BarcodeLabelStudioView';
import { CycleCountAuditView } from './components/CycleCountAuditView';
import { ReorderAutomationView } from './components/ReorderAutomationView';
import { ShelfLifeAgingView } from './components/ShelfLifeAgingView';
import { PreventiveMaintenanceView } from './components/PreventiveMaintenanceView';
import { WorkflowApprovalsView } from './components/WorkflowApprovalsView';
import { LiveBarcodeScannerModal } from './components/LiveBarcodeScannerModal';
import { OrganizationSettingsModal } from './components/OrganizationSettingsModal';
import DeviceInstallModal from './components/DeviceInstallModal';
import SystemPresentationModal from './components/SystemPresentationModal';
import { softDeleteRecord } from './services/port13Service';

import { 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  Zap, 
  Search, 
  PlusCircle, 
  Camera, 
  Sparkles,
  ChevronUp,
  RefreshCw,
  Globe,
  Trash2,
  QrCode,
  Activity,
  Bot,
  Smartphone,
  Cpu,
  ArrowLeft,
  ArrowRight,
  Command,
  Building2,
  Download
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from './contexts/LanguageContext';
import QuickNavigationModal, { ALL_NAV_ITEMS } from './components/QuickNavigationModal';
import { getActionCenterItems } from './services/port14Service';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Ledger state synchronized across components
  const [materials, setMaterials] = useState<Material[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Search passing state
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>('');

  // Comprehensive Material Details Modal State
  const [inspectingMaterial, setInspectingMaterial] = useState<Material | null>(null);

  // Port 13: Material Digital Passport Modal State
  const [passportMaterial, setPassportMaterial] = useState<Material | null>(null);
  const [sharedPassportPartNo, setSharedPassportPartNo] = useState<string | null>(null);

  // Port 13: System Health, Remote Access, Smart Update & AI Assistant Modals
  const [isSystemHealthOpen, setIsSystemHealthOpen] = useState(false);
  const [isRemoteAccessOpen, setIsRemoteAccessOpen] = useState(false);
  const [isSmartUpdateOpen, setIsSmartUpdateOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isLiveScannerOpen, setIsLiveScannerOpen] = useState(false);
  const [isOrganizationSettingsOpen, setIsOrganizationSettingsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  // Material Intelligence Modal State (Port 9)
  const [intelligenceMaterial, setIntelligenceMaterial] = useState<Material | null>(null);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);

  // Prefilled Scanned Data for new material registration
  const [prefilledScanData, setPrefilledScanData] = useState<Record<string, string | null> | null>(null);

  // Global Toast / Notification banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Floating Speed Dial state
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Language and RTL
  const { language, t, isRTL } = useLanguage();

  // Navigation History & Ergonomics
  const [navHistory, setNavHistory] = useState<string[]>(['dashboard']);
  const [navHistoryIndex, setNavHistoryIndex] = useState<number>(0);
  const [recentTabs, setRecentTabs] = useState<string[]>(['dashboard', 'materials', 'search']);
  const [isQuickNavOpen, setIsQuickNavOpen] = useState<boolean>(false);

  const navigateToTab = (tabId: string, query: string = '', prefillData?: Record<string, string | null>) => {
    if (tabId === 'install-app') {
      setIsInstallModalOpen(true);
      return;
    }

    if (prefillData) {
      setPrefilledScanData(prefillData);
    }
    if (query !== undefined) {
      setInitialSearchQuery(query);
    }

    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setNavHistory(prev => {
        const next = prev.slice(0, navHistoryIndex + 1);
        return [...next, tabId];
      });
      setNavHistoryIndex(prev => prev + 1);
      setRecentTabs(prev => {
        const filtered = prev.filter(t => t !== tabId);
        return [tabId, ...filtered].slice(0, 6);
      });
    }
  };

  const handleGoBack = () => {
    if (navHistoryIndex > 0) {
      const prevIdx = navHistoryIndex - 1;
      setNavHistoryIndex(prevIdx);
      setActiveTab(navHistory[prevIdx]);
    }
  };

  const handleGoForward = () => {
    if (navHistoryIndex < navHistory.length - 1) {
      const nextIdx = navHistoryIndex + 1;
      setNavHistoryIndex(nextIdx);
      setActiveTab(navHistory[nextIdx]);
    }
  };

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

    // Listen for Service Worker background sync & online event restoration
    const handleSyncRestore = () => {
      console.log('[App] Network or background sync restored. Refreshing state...');
      initDb();
    };

    const handleMaterialUpdated = () => {
      setMaterials(dbService.getMaterials());
      setActivities(dbService.getActivities());
    };

    window.addEventListener('online', handleSyncRestore);
    window.addEventListener('emis:background-sync-restored', handleSyncRestore);
    window.addEventListener('emis:material-updated', handleMaterialUpdated);

    return () => {
      window.removeEventListener('online', handleSyncRestore);
      window.removeEventListener('emis:background-sync-restored', handleSyncRestore);
      window.removeEventListener('emis:material-updated', handleMaterialUpdated);
    };
  }, []);

  // Action Items Count for Mobile Bottom Bar Badge
  const [actionItemCount, setActionItemCount] = useState<number>(0);

  useEffect(() => {
    if (!currentUser) return;
    const updateActionCount = () => {
      const items = getActionCenterItems(currentUser);
      setActionItemCount(items.length);
    };
    updateActionCount();

    window.addEventListener('emis:notifications-updated', updateActionCount);
    window.addEventListener('emis:material-added', updateActionCount);
    window.addEventListener('emis:sync-status-changed', updateActionCount);

    return () => {
      window.removeEventListener('emis:notifications-updated', updateActionCount);
      window.removeEventListener('emis:material-added', updateActionCount);
      window.removeEventListener('emis:sync-status-changed', updateActionCount);
    };
  }, [currentUser]);

  // Listen for deep link part number or passport parameter from scanned QR code tags
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passParam = params.get('passport');
    if (passParam) {
      setSharedPassportPartNo(passParam);
    }

    if (currentUser && materials.length > 0) {
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
    navigateToTab('dashboard');
    triggerToast('success', `Security connection established as ${user.name}`);
  };

  const handleLogout = () => {
    dbService.logout();
    setCurrentUser(null);
    navigateToTab('dashboard');
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

  const handleDeleteMaterial = (partNumberOrId: string) => {
    if (!currentUser) return;
    // Port 13: Automatically preserve record in Recycle Bin with 90-day retention before ledger removal
    const targetMat = materials.find(m => 
      (m.id && m.id === partNumberOrId) ||
      (m.partNumber && m.partNumber.toUpperCase() === partNumberOrId.toUpperCase()) ||
      (m.sequence !== undefined && String(m.sequence) === partNumberOrId)
    );
    if (targetMat) {
      softDeleteRecord('Material', targetMat, currentUser, 'Soft deleted from materials catalog');
    }
    const res = dbService.deleteMaterial(targetMat?.id || partNumberOrId, currentUser);
    if (res.success) {
      setMaterials(dbService.getMaterials());
      setActivities(dbService.getActivities());
      setEquipment(dbService.getEquipment());
      triggerToast('success', `Moved to Recycle Bin (Recoverable for 90 days): ${targetMat?.partNumber || targetMat?.description?.slice(0, 30) || partNumberOrId}`);
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
    navigateToTab('materials');
    setInitialSearchQuery('');
  };

  const handleNavigateWithSearch = (tabId: string, query: string = '', prefillData?: Record<string, string | null>) => {
    navigateToTab(tabId, query, prefillData);
  };

  const handleInspectMaterialFromSearch = (material: Material) => {
    setInspectingMaterial(material);
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
            onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
          />
        );
      case 'action-center':
        return (
          <ActionCenterView
            currentUser={currentUser}
            onNavigateToTab={handleNavigateWithSearch}
            onInspectMaterialByPn={(pn) => {
              const found = materials.find(m => m.partNumber === pn);
              if (found) setPassportMaterial(found);
            }}
          />
        );
      case 'data-quality':
        return (
          <DataQualityCenterView
            materials={materials}
            currentUser={currentUser}
            onUpdateMaterial={handleUpdateMaterial}
            onInspectMaterial={(m) => setPassportMaterial(m)}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'admin-governance':
        return (
          <AdminDashboard
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'recycle-bin':
        return (
          <RecycleBinView
            currentUser={currentUser}
            onNavigateToTab={handleNavigateWithSearch}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
          />
        );
      case 'material-intelligence':
        return (
          <MaterialIntelligenceView
            materials={materials}
            currentUser={currentUser}
            onOpenMaterialModal={(m) => setInspectingMaterial(m)}
          />
        );
      case 'intelligence':
      case 'kpis':
      case 'smart-alerts':
      case 'ai-insights':
      case 'supplier-intelligence': {
        const intelTabMap: Record<string, string> = {
          'intelligence': 'overview',
          'kpis': 'kpis',
          'smart-alerts': 'alerts',
          'ai-insights': 'ai-insights',
          'supplier-intelligence': 'suppliers'
        };
        return (
          <IntelligenceDashboardView
            materials={materials}
            currentUser={currentUser}
            initialTab={intelTabMap[activeTab] || 'overview'}
            onOpenMaterialModal={(m) => setInspectingMaterial(m)}
          />
        );
      }
      case 'enterprise':
      case 'enterprise-operations':
      case 'hierarchy':
      case 'transfers':
      case 'stock-ledger':
      case 'receiving':
      case 'issuance':
      case 'suppliers':
      case 'approvals': {
        const subTabMap: Record<string, EnterpriseSubTab> = {
          'enterprise': 'OVERVIEW',
          'enterprise-operations': 'OVERVIEW',
          'hierarchy': 'HIERARCHY',
          'transfers': 'TRANSFERS',
          'stock-ledger': 'LEDGER',
          'receiving': 'RECEIVING',
          'issuance': 'ISSUANCE',
          'suppliers': 'SUPPLIERS',
          'approvals': 'APPROVALS'
        };
        const initialSubTab = subTabMap[activeTab] || 'OVERVIEW';
        return (
          <EnterpriseOperationsView
            currentUser={currentUser}
            initialSubTab={initialSubTab}
            onNavigateToTab={handleNavigateWithSearch}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
          />
        );
      }
      case 'materials':
        return (
          <MaterialsView
            materials={materials}
            currentUser={currentUser}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            initialSearchQuery={initialSearchQuery}
            onNavigateToTab={(tabId, q, data) => handleNavigateWithSearch(tabId, q || '', data)}
            onImportSuccess={() => {
              setMaterials(dbService.getMaterials());
              setActivities(dbService.getActivities());
              setEquipment(dbService.getEquipment());
            }}
          />
        );
      case 'mrf-management':
        return (
          <MrfManagementView
            currentUser={currentUser}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'barcode-studio':
        return (
          <BarcodeLabelStudioView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
          />
        );
      case 'cycle-count':
        return (
          <CycleCountAuditView
            materials={materials}
            currentUser={currentUser}
            onMaterialsUpdated={() => {
              setMaterials(dbService.getMaterials());
              setActivities(dbService.getActivities());
            }}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
          />
        );
      case 'reorder-hub':
        return (
          <ReorderAutomationView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
          />
        );
      case 'shelf-life':
      case 'aging':
        return (
          <ShelfLifeAgingView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'preventive-maintenance':
      case 'pm-kit':
        return (
          <PreventiveMaintenanceView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={(m) => setInspectingMaterial(m)}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'workflow-approvals':
        return (
          <WorkflowApprovalsView
            currentUser={currentUser}
            onNavigateToTab={handleNavigateWithSearch}
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
            initialPrefillData={prefilledScanData}
            onClearPrefill={() => setPrefilledScanData(null)}
          />
        );
      case 'external-stock':
        return (
          <ExternalStockView
            currentUser={currentUser}
            onNavigateToMaterial={(partNo) => {
              handleNavigateWithSearch('materials', partNo);
            }}
          />
        );
      case 'excel-import':
        return (
          <ExcelImportCenterView
            currentUser={currentUser}
            onImportSuccess={() => {
              setToast({
                type: 'success',
                message: 'Excel import batch processed and indexed successfully.'
              });
            }}
            onNavigateToExternalStores={() => setActiveTab('external-stock')}
          />
        );
      case 'traceability':
        return (
          <MaterialTraceabilityView
            currentUser={currentUser}
            initialPartNumber={initialSearchQuery || undefined}
            onNavigateToVerification={(pn) => {
              setInitialSearchQuery(pn);
              setActiveTab('verification');
            }}
            onNavigateToDocuments={(pn) => {
              setInitialSearchQuery(pn);
              setActiveTab('documents');
            }}
          />
        );
      case 'verification':
        return (
          <EngineeringVerificationView
            currentUser={currentUser}
            initialPartNumber={initialSearchQuery || undefined}
            onNavigateToTraceability={(pn) => {
              setInitialSearchQuery(pn);
              setActiveTab('traceability');
            }}
            onNavigateToDocuments={(pn) => {
              setInitialSearchQuery(pn);
              setActiveTab('documents');
            }}
          />
        );
      case 'documents':
        return (
          <DocumentCenterView
            currentUser={currentUser}
            initialPartFilter={initialSearchQuery || undefined}
            onNavigateToTraceability={(pn) => {
              setInitialSearchQuery(pn);
              setActiveTab('traceability');
            }}
          />
        );
      case 'search':
        return (
          <SearchView
            materials={materials}
            currentUser={currentUser}
            onInspectMaterial={handleInspectMaterialFromSearch}
            onNavigateToTab={handleNavigateWithSearch}
            initialQuery={initialSearchQuery || undefined}
          />
        );
      case 'ai-diagnostics':
        return (
          <AiDiagnosticView />
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
      case 'decisions':
        return (
          <EngineeringDecisionsView
            currentUser={currentUser}
            materials={materials}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'blacklist':
        return (
          <BlacklistView
            currentUser={currentUser}
            materials={materials}
            onNavigateToTab={handleNavigateWithSearch}
          />
        );
      case 'reports':
        return (
          <ReportsView
            materials={materials}
            equipment={equipment}
            currentUser={currentUser}
            onNavigateToTab={handleNavigateWithSearch}
            onOpenPresentation={() => setIsPresentationOpen(true)}
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

  // Check if public/shared digital passport is being viewed
  if (sharedPassportPartNo) {
    return (
      <SharedPassportView
        partNumber={sharedPassportPartNo}
        onClose={() => {
          setSharedPassportPartNo(null);
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }}
        onOpenMaterialDetails={currentUser ? (m) => {
          setSharedPassportPartNo(null);
          setInspectingMaterial(m);
        } : undefined}
      />
    );
  }

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
        setActiveTab={navigateToTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
        onSelectMaterial={(m) => setPassportMaterial(m)}
        recentTabs={recentTabs}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Operating Panel with Safe Scrolling Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto relative pb-32 lg:pb-8">
        {/* Desktop Top Header Bar with Connectivity, Quick Jump, Breadcrumbs & History */}
        <header className="hidden lg:flex flex-col gap-2.5 pb-3.5 mb-5 border-b border-industrial-200 dark:border-industrial-800 max-w-7xl mx-auto select-none">
          <div className="flex items-center justify-between">
            {/* Left: History navigation + Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs">
              {/* Back / Forward History Controls */}
              <div className="flex items-center gap-0.5 bg-white dark:bg-industrial-850 p-1 rounded-xl border border-industrial-200 dark:border-industrial-750 shadow-2xs">
                <button
                  type="button"
                  onClick={handleGoBack}
                  disabled={navHistoryIndex <= 0}
                  className="p-1 rounded-lg text-industrial-500 hover:text-industrial-900 dark:text-industrial-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title={language === 'ar' ? 'السابق (رجوع)' : 'Go Back'}
                >
                  <ArrowLeft className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleGoForward}
                  disabled={navHistoryIndex >= navHistory.length - 1}
                  className="p-1 rounded-lg text-industrial-500 hover:text-industrial-900 dark:text-industrial-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title={language === 'ar' ? 'التالي (تقدم)' : 'Go Forward'}
                >
                  <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Breadcrumb with Active Tab Icon and Localized Title */}
              <div className="flex items-center gap-1.5 ml-1">
                <span className="font-mono text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.8 rounded-lg border border-brand-500/20">
                  EMIS v3.1
                </span>
                <span className="text-industrial-300 dark:text-industrial-600">/</span>
                {(() => {
                  const currentNav = ALL_NAV_ITEMS.find(n => n.id === activeTab);
                  const NavIcon = currentNav?.icon || Activity;
                  const navTitle = language === 'ar'
                    ? (currentNav?.arabicName || activeTab.replace(/-/g, ' '))
                    : (t(currentNav?.nameKey as any) || currentNav?.fallbackName || activeTab.replace(/-/g, ' '));
                  return (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.8 bg-white dark:bg-industrial-850 rounded-lg border border-industrial-200 dark:border-industrial-750 text-industrial-800 dark:text-industrial-200 font-semibold shadow-2xs">
                      <NavIcon className="h-3.5 w-3.5 text-brand-500" />
                      <span>{navTitle}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Quick Jump (Ctrl+K) Trigger */}
              <button
                type="button"
                onClick={() => setIsQuickNavOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
                title="Open Quick Switcher (Ctrl+K)"
              >
                <Command className="h-3.5 w-3.5 text-brand-500 group-hover:scale-110 transition-transform" />
                <span>{language === 'ar' ? 'التنقل السريع' : 'Quick Jump'}</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-industrial-800 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-700 shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Quick Operational Shortcuts */}
            <div className="flex items-center gap-2">
              {/* Port 13: Specialized AI Assistant Button */}
              <button
                type="button"
                onClick={() => setIsAiAssistantOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="المساعد الهندسي الذكي المتخصص (Port 13)"
              >
                <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>المساعد الهندسي</span>
              </button>

              {/* Port 13: Remote Access & Field QR Button */}
              <button
                type="button"
                onClick={() => setIsRemoteAccessOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="نفق الاتصال الميداني عن بعد عبر QR (Port 13)"
              >
                <Smartphone className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>الاتصال الميداني</span>
              </button>

              {/* Port 13: Deep Diagnostics & System Health Button */}
              <button
                type="button"
                onClick={() => setIsSystemHealthOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="صحة النظام والتشخيصات المتقدمة (Port 13)"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>صحة النظام</span>
              </button>

              {/* Port 13: Smart Firmware & Updates Button */}
              <button
                type="button"
                onClick={() => setIsSmartUpdateOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="التحديثات الهندسية الذكية (Port 13)"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>التحديثات</span>
              </button>

              {/* Port 16: Live Camera Scanner */}
              <button
                type="button"
                onClick={() => setIsLiveScannerOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="مسح الكاميرا المباشر للباركود و QR (Port 16)"
              >
                <Camera className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>المسح بالكاميرا</span>
              </button>

              {/* Port 16: Organization Branding Profile */}
              <button
                type="button"
                onClick={() => setIsOrganizationSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="إعدادات وترويسة هوية المؤسسة (Port 16)"
              >
                <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>هوية المؤسسة</span>
              </button>

              {/* Direct PWA / Android APK Installation Button */}
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-600 hover:from-emerald-500 hover:to-brand-500 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                title={language === 'ar' ? 'تثبيت نظام EMIS بصيغة أندرويد APK أو على الجهاز' : 'Install EMIS as Android APK or Desktop App'}
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-100 group-hover:scale-110 transition-transform" />
                <span>{language === 'ar' ? 'تثبيت أندرويد APK' : 'Install Android APK'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToTab('search')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-industrial-850 hover:bg-industrial-100 dark:hover:bg-industrial-800 border border-industrial-200 dark:border-industrial-750 text-industrial-600 dark:text-industrial-300 text-xs transition-colors cursor-pointer shadow-2xs"
                title="Search materials, equipment, and specifications"
              >
                <Search className="h-3.5 w-3.5 text-industrial-400" />
                <span>Universal Search</span>
              </button>

              {/* Top Bar Real-Time Status Indicator */}
              <NetworkStatusIndicator
                idPrefix="desktop-top-header"
                onNavigateToSync={() => navigateToTab('backup-sync')}
              />
            </div>
          </div>

          {/* Bottom Row: Recent Tabs Quick Access Strip */}
          {recentTabs.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              <span className="text-[10px] font-mono uppercase text-industrial-400 shrink-0 font-bold">
                {language === 'ar' ? 'سجل التصفح الأخير:' : 'Recent:'}
              </span>
              {recentTabs.map(tabId => {
                const nav = ALL_NAV_ITEMS.find(n => n.id === tabId);
                if (!nav) return null;
                const isCur = tabId === activeTab;
                const Icon = nav.icon;
                const title = language === 'ar'
                  ? nav.arabicName
                  : (t(nav.nameKey as any) || nav.fallbackName);

                return (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => navigateToTab(tabId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                      isCur
                        ? 'bg-brand-600 text-white font-bold shadow-2xs'
                        : 'bg-white/80 dark:bg-industrial-850 hover:bg-white dark:hover:bg-industrial-800 border border-industrial-200 dark:border-industrial-750 text-industrial-600 dark:text-industrial-300'
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[130px]">{title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.08 }}
          className="w-full h-full max-w-7xl mx-auto pb-12"
        >
          {renderActiveView()}
        </motion.div>
      </main>

      {/* Global Material Details Inspection Modal */}
      {inspectingMaterial && (
        <MaterialDetailsModal
          material={inspectingMaterial}
          currentUser={currentUser}
          isOpen={!!inspectingMaterial}
          onClose={() => setInspectingMaterial(null)}
          onEditMaterial={(updated) => {
            handleUpdateMaterial(updated);
            setInspectingMaterial(updated);
          }}
          onFindSubstitutes={(partNo) => {
            setInspectingMaterial(null);
            handleNavigateWithSearch('search', partNo);
          }}
          onNavigateToEquipment={(tag) => {
            setInspectingMaterial(null);
            handleNavigateWithSearch('equipment', tag);
          }}
          onOpenIntelligence={(mat) => {
            setInspectingMaterial(null);
            setIntelligenceMaterial(mat);
            setIsIntelligenceOpen(true);
          }}
          onOpenPassport={(mat) => {
            setInspectingMaterial(null);
            setPassportMaterial(mat);
          }}
        />
      )}

      {/* Port 13: Material Digital Passport Modal */}
      {passportMaterial && (
        <MaterialPassportModal
          material={passportMaterial}
          isOpen={!!passportMaterial}
          onClose={() => setPassportMaterial(null)}
          currentUser={currentUser}
          onUpdateMaterial={handleUpdateMaterial}
          onInspectMaterial={(m) => {
            setPassportMaterial(null);
            setInspectingMaterial(m);
          }}
          onFindSubstitutes={(pn) => {
            setPassportMaterial(null);
            setInitialSearchQuery(pn);
            navigateToTab('search');
          }}
          onNavigateToEquipment={() => {
            setPassportMaterial(null);
            navigateToTab('equipment');
          }}
        />
      )}

      {/* Port 13: Deep System Health & Diagnostics Modal */}
      {isSystemHealthOpen && (
        <SystemHealthModal
          isOpen={isSystemHealthOpen}
          onClose={() => setIsSystemHealthOpen(false)}
        />
      )}

      {/* Port 13: Remote Access & Field QR Tunnel Modal */}
      {isRemoteAccessOpen && (
        <RemoteAccessModal
          isOpen={isRemoteAccessOpen}
          onClose={() => setIsRemoteAccessOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Port 13: Smart Updates & Firmware Modal */}
      {isSmartUpdateOpen && (
        <SmartUpdateModal
          isOpen={isSmartUpdateOpen}
          onClose={() => setIsSmartUpdateOpen(false)}
        />
      )}

      {/* Port 13: Specialized AI Engineering Assistant Modal */}
      {isAiAssistantOpen && (
        <AiEngineeringAssistantModal
          isOpen={isAiAssistantOpen}
          onClose={() => setIsAiAssistantOpen(false)}
          onSelectMaterial={(material) => {
            setPassportMaterial(material);
            setIsAiAssistantOpen(false);
          }}
        />
      )}

      {/* Port 14: What's New & Release Notes Modal */}
      {isWhatsNewOpen && (
        <WhatsNewModal
          isOpen={isWhatsNewOpen}
          onClose={() => setIsWhatsNewOpen(false)}
        />
      )}

      {/* Standalone Material Intelligence Modal (Port 9) */}
      {isIntelligenceOpen && (
        <MaterialIntelligenceModal
          material={intelligenceMaterial}
          isOpen={isIntelligenceOpen}
          onClose={() => {
            setIsIntelligenceOpen(false);
            setIntelligenceMaterial(null);
          }}
          onApplyArabicTranslation={(arabicText) => {
            if (intelligenceMaterial) {
              const updated = { ...intelligenceMaterial, arabicDescription: arabicText };
              handleUpdateMaterial(updated);
              setIntelligenceMaterial(updated);
              triggerToast('success', 'تم حفظ الترجمة العربية في سجل المواد بنجاح');
            }
          }}
        />
      )}

      {/* Port 16: Live Barcode & QR Camera Scanner Modal */}
      <LiveBarcodeScannerModal
        isOpen={isLiveScannerOpen}
        onClose={() => setIsLiveScannerOpen(false)}
        materials={materials}
        onSelectMaterial={(m) => {
          setIsLiveScannerOpen(false);
          setInspectingMaterial(m);
        }}
      />

      {/* Port 16: Organization Profile & Document Header Branding Settings */}
      <OrganizationSettingsModal
        isOpen={isOrganizationSettingsOpen}
        onClose={() => setIsOrganizationSettingsOpen(false)}
      />

      {/* EMIS Device & PWA Direct Installation Modal */}
      <DeviceInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Comprehensive System Features Presentation (PowerPoint) Modal */}
      <SystemPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
      />

      {/* Floating Interactive Quick-Action Speed Dial */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsFabOpen(false)}
            className="fixed inset-0 bg-industrial-950/45 backdrop-blur-xs z-35"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 right-4 sm:right-6 z-30 flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col items-end gap-2"
            >
              {/* Comprehensive System Presentation (PowerPoint) Shortcut */}
              <button
                onClick={() => {
                  setIsPresentationOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-amber-900/85 to-indigo-950/85 hover:from-amber-800/90 hover:to-indigo-900/90 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-system-presentation"
              >
                <span className="text-[11px] text-white font-medium">📊 العرض التقديمي لخواص المنظومة (PowerPoint)</span>
                <div className="p-1.5 bg-amber-500/20 rounded-lg group-hover:scale-110 group-hover:bg-amber-500/30 transition-all duration-200">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </div>
              </button>

              {/* Direct Device / PWA Installation Shortcut */}
              <button
                onClick={() => {
                  setIsInstallModalOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-r from-brand-900/85 to-indigo-950/85 hover:from-brand-800/90 hover:to-indigo-900/90 text-brand-300 border border-brand-500/40 hover:border-brand-400 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-install-app-direct"
              >
                <span className="text-[11px] text-white font-medium">📥 تثبيت التطبيق على جهازي (PWA)</span>
                <div className="p-1.5 bg-brand-500/30 rounded-lg group-hover:scale-110 group-hover:bg-brand-500/50 transition-all duration-200">
                  <Download className="h-4 w-4 text-brand-300" />
                </div>
              </button>

              {/* Port 16: Live Camera Scanner Shortcut */}
              <button
                onClick={() => {
                  setIsLiveScannerOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-cyan-400 border border-white/10 hover:border-cyan-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-live-scanner-port16"
              >
                <span className="text-[11px] text-white font-medium">📷 مسح الكاميرا المباشر (Barcode/QR)</span>
                <div className="p-1.5 bg-cyan-500/20 rounded-lg group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all duration-200">
                  <Camera className="h-4 w-4 text-cyan-400" />
                </div>
              </button>

              {/* Port 16: Organization Branding Shortcut */}
              <button
                onClick={() => {
                  setIsOrganizationSettingsOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-indigo-400 border border-white/10 hover:border-indigo-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-org-branding-port16"
              >
                <span className="text-[11px] text-white font-medium">🏢 هوية المؤسسة وترويسة الوثائق</span>
                <div className="p-1.5 bg-indigo-500/20 rounded-lg group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all duration-200">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                </div>
              </button>

              {/* Port 13: Specialized AI Assistant Shortcut */}
              <button
                onClick={() => {
                  setIsAiAssistantOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-purple-400 border border-white/10 hover:border-purple-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-ai-assistant-port13"
              >
                <span className="text-[11px] text-white font-medium">🤖 المساعد الهندسي الذكي (Port 13)</span>
                <div className="p-1.5 bg-purple-500/20 rounded-lg group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-200">
                  <Bot className="h-4 w-4 text-purple-400" />
                </div>
              </button>

              {/* Port 13: Remote Field QR Access Shortcut */}
              <button
                onClick={() => {
                  setIsRemoteAccessOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-sky-400 border border-white/10 hover:border-sky-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-remote-access-port13"
              >
                <span className="text-[11px] text-white font-medium">📱 الاتصال الميداني QR (Port 13)</span>
                <div className="p-1.5 bg-sky-500/20 rounded-lg group-hover:scale-110 group-hover:bg-sky-500/30 transition-all duration-200">
                  <Smartphone className="h-4 w-4 text-sky-400" />
                </div>
              </button>

              {/* Port 13: Recycle Bin & Data Safety Shortcut */}
              <button
                onClick={() => {
                  setActiveTab('recycle-bin');
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-rose-400 border border-white/10 hover:border-rose-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-recycle-bin-port13"
              >
                <span className="text-[11px] text-white font-medium">🗑️ سلة المحذوفات واسترجاع البيانات</span>
                <div className="p-1.5 bg-rose-500/20 rounded-lg group-hover:scale-110 group-hover:bg-rose-500/30 transition-all duration-200">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </div>
              </button>

              {/* Material Intelligence Shortcut */}
              <button
                onClick={() => {
                  setIntelligenceMaterial(null);
                  setIsIntelligenceOpen(true);
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-brand-400 border border-white/10 hover:border-brand-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-material-intelligence"
              >
                <span className="text-[11px] text-white font-medium">🌐 استخبارات وترجمة المواد (Port 9)</span>
                <div className="p-1.5 bg-brand-500/20 rounded-lg group-hover:scale-110 group-hover:bg-brand-500/30 transition-all duration-200">
                  <Globe className="h-4 w-4 text-brand-400" />
                </div>
              </button>

              {/* Scan Barcode / Camera OCR Button */}
              <NameplateScanner
                materialsList={materials}
                onRegisterNewEntry={(scannedData) => {
                  setPrefilledScanData(scannedData);
                  setActiveTab('add-material');
                  setIsFabOpen(false);
                }}
                onInspectMaterial={(mat) => {
                  setInspectingMaterial(mat);
                  setIsFabOpen(false);
                }}
                renderTrigger={(openScanner) => (
                  <button
                    onClick={() => {
                      openScanner();
                      setIsFabOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-amber-400 border border-white/10 hover:border-amber-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                    id="fab-camera-scanner"
                  >
                    <span className="text-[11px] text-white font-medium">📷 مسح باركود / لوحة بيانات</span>
                    <div className="p-1.5 bg-amber-500/20 rounded-lg group-hover:scale-110 group-hover:bg-amber-500/30 transition-all duration-200">
                      <Camera className="h-4 w-4 text-amber-400" />
                    </div>
                  </button>
                )}
              />

              {/* Universal Search Shortcut */}
              <button
                onClick={() => {
                  setActiveTab('search');
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-blue-400 border border-white/10 hover:border-blue-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-smart-search"
              >
                <span className="text-[11px] text-white font-medium">🔍 بحث هندسي ذكي (Smart Search)</span>
                <div className="p-1.5 bg-blue-500/20 rounded-lg group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-200">
                  <Search className="h-4 w-4 text-blue-400" />
                </div>
              </button>

              {/* AI Co-Pilot Shortcut */}
              <button
                onClick={() => {
                  setActiveTab('ai-copilot');
                  setIsFabOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-indigo-400 border border-white/10 hover:border-indigo-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                id="fab-ai-copilot"
              >
                <span className="text-[11px] text-white font-medium">⚡ المساعد الذكي (AI Co-Pilot)</span>
                <div className="p-1.5 bg-indigo-500/20 rounded-lg group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all duration-200">
                  <Zap className="h-4 w-4 text-indigo-400" />
                </div>
              </button>

              {/* Add Material Shortcut */}
              {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR' || currentUser.role === 'ENGINEER') && (
                <button
                  onClick={() => {
                    setActiveTab('add-material');
                    setIsFabOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-industrial-900/80 hover:bg-industrial-800/90 text-emerald-400 border border-white/10 hover:border-emerald-400/50 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-xl transition-all duration-200 ease-out hover:-translate-x-1.5 active:scale-95 cursor-pointer group"
                  id="fab-add-material"
                >
                  <span className="text-[11px] text-white font-medium">➕ تسجيل مادة جديدة</span>
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all duration-200">
                    <PlusCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Trigger Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-2xl border transition-all cursor-pointer select-none backdrop-blur-xl ${
            isFabOpen
              ? 'bg-red-600 border-red-400 text-white rotate-45 shadow-red-900/50'
              : 'bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-600 border-brand-400/40 text-white shadow-brand-950/60 hover:scale-105 hover:shadow-brand-500/30'
          }`}
          title={isFabOpen ? 'إغلاق القائمة السريعة' : 'أدوات الوصول السريع التفاعلية'}
          id="main-fab-trigger"
        >
          {isFabOpen ? (
            <X className="h-5 w-5 text-white transition-transform duration-200" />
          ) : (
            <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
          )}
        </motion.button>
      </div>

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

      {/* Quick Navigation / Command Palette Modal (Ctrl+K) */}
      {currentUser && (
        <QuickNavigationModal
          isOpen={isQuickNavOpen}
          onClose={() => setIsQuickNavOpen(false)}
          activeTab={activeTab}
          onNavigateTab={navigateToTab}
          userRole={currentUser.role}
          recentTabs={recentTabs}
        />
      )}

      {/* Global Intelligent Print & Document Export Modal */}
      <PrintPreviewModal />
    </div>
  );
}
