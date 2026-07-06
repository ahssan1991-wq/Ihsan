/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  FolderOpen,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  HardDrive,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  LogOut,
  User,
  X,
  Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User as UserType, UserRole, Material } from '../types';
import { dbService } from '../services/dbService';
import {
  initAuth,
  googleSignIn,
  logout,
  listDriveFiles,
  uploadFileToDrive,
  deleteFileFromDrive,
  getOrCreateVaultFolder,
  DriveFile,
  isFirebaseConfigured,
  setForceSandbox,
  getForceSandbox
} from '../services/googleDriveService';

interface GoogleDriveViewProps {
  currentUser: UserType;
}

export default function GoogleDriveView({ currentUser }: GoogleDriveViewProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [vaultFolderId, setVaultFolderId] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingLedger, setIsExportingLedger] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(!isFirebaseConfigured());
  
  // Custom Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Custom Confirm Delete State (Requirement: Explicit User Confirmation for Destructive actions)
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File Upload Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast trigger helper
  const triggerToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setGoogleUser(user);
        loadVaultData();
      },
      () => {
        setIsAuthenticated(false);
        setGoogleUser(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch / initialize vault folder and files
  const loadVaultData = async () => {
    setIsLoading(true);
    try {
      const folderId = await getOrCreateVaultFolder();
      setVaultFolderId(folderId);
      await fetchVaultFiles(folderId);
    } catch (err: any) {
      console.error('Failed to load Google Drive vault:', err);
      triggerToast('error', `Drive Connection Issue: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch files from Google Drive folder
  const fetchVaultFiles = async (folderId: string) => {
    try {
      setIsSyncing(true);
      const q = `'${folderId}' in parents and trashed = false`;
      const { files } = await listDriveFiles(q);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      triggerToast('error', `Failed to retrieve documents: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setSignInError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        setGoogleUser(result.user);
        setIsSandboxMode(!isFirebaseConfigured());
        triggerToast('success', `Connected to Google Drive successfully!`);
        // Load data after successful sign in
        const folderId = await getOrCreateVaultFolder();
        setVaultFolderId(folderId);
        await fetchVaultFiles(folderId);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setSignInError(err.message || String(err));
      triggerToast('error', `Connection Failed: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateSandbox = async () => {
    setIsLoading(true);
    setSignInError(null);
    try {
      setForceSandbox(true);
      setIsSandboxMode(true);
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        setGoogleUser(result.user);
        triggerToast('success', `Connected via Simulated Google Drive Sandbox Mode!`);
        const folderId = await getOrCreateVaultFolder();
        setVaultFolderId(folderId);
        await fetchVaultFiles(folderId);
      }
    } catch (err: any) {
      console.error('Sandbox activation error:', err);
      triggerToast('error', `Sandbox activation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLiveMode = () => {
    setForceSandbox(false);
    setIsSandboxMode(false);
    setIsAuthenticated(false);
    setGoogleUser(null);
    setDriveFiles([]);
    setVaultFolderId(null);
    triggerToast('info', 'Switched to Live Cloud Registry mode. Please sign in.');
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setGoogleUser(null);
      setDriveFiles([]);
      setVaultFolderId(null);
      triggerToast('info', 'Google Drive disconnected');
    } catch (err: any) {
      triggerToast('error', `Failed to disconnect: ${err.message}`);
    }
  };

  const handleManualRefresh = async () => {
    if (!vaultFolderId) return;
    await fetchVaultFiles(vaultFolderId);
    triggerToast('success', 'Vault status refreshed');
  };

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !vaultFolderId) return;

    const file = files[0];
    setIsUploading(true);
    triggerToast('info', `Uploading file "${file.name}" to Google Drive Vault...`);

    try {
      const uploadedFile = await uploadFileToDrive(file, file.name, vaultFolderId);
      triggerToast('success', `File "${uploadedFile.name}" successfully uploaded and cataloged!`);
      
      // Log this action to the audit/system log
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Uploaded technical file to Google Drive Vault: "${uploadedFile.name}"`
      });

      // Reload file listing
      await fetchVaultFiles(vaultFolderId);
    } catch (err: any) {
      console.error('File Upload Failure:', err);
      triggerToast('error', `Upload Failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export full inventory ledger as an Excel spreadsheet to Google Drive
  const handleExportLedgerToDrive = async () => {
    if (!vaultFolderId) return;
    setIsExportingLedger(true);
    triggerToast('info', 'Compiling and syncing Inventory Ledger to Google Drive...');

    try {
      const materials = dbService.getMaterials();
      
      // Map data into spreadsheet arrays
      const worksheetData: any[][] = [
        ['ZFOD ENGINEERING MATERIAL INVENTORY LEDGER'],
        ['Generated At', new Date().toISOString()],
        ['Operator', `${currentUser.name} (${currentUser.role})`],
        [],
        ['Part Number', 'Description', 'Manufacturer', 'Model', 'Quantity', 'Unit', 'Store', 'Rack', 'Shelf', 'OEM Verified', 'Health Score', 'Notes']
      ];

      materials.forEach(m => {
        worksheetData.push([
          m.partNumber,
          m.description,
          m.manufacturer,
          m.model,
          m.quantity,
          m.unit,
          m.store,
          m.rack,
          m.shelf,
          m.oemVerified ? 'TRUE' : 'FALSE',
          m.healthScore ? `${m.healthScore}%` : 'N/A',
          m.notes || ''
        ]);
      });

      // Create sheet and workbook
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ZFOD EMIS Inventory');

      // Export to binary
      const rawBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
      const buf = new ArrayBuffer(rawBinary.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < rawBinary.length; i++) {
        view[i] = rawBinary.charCodeAt(i) & 0xFF;
      }
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const filename = `ZFOD_EMIS_Ledger_Export_${timestamp}.xlsx`;

      const uploadedFile = await uploadFileToDrive(blob, filename, vaultFolderId);
      triggerToast('success', `Ledger Backup "${filename}" exported to Google Drive Vault!`);

      // Log this action
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        details: `Exported full Material Ledger spreadsheet to Google Drive Vault: "${filename}"`
      });

      await fetchVaultFiles(vaultFolderId);
    } catch (err: any) {
      console.error('Spreadsheet export issue:', err);
      triggerToast('error', `Backup Failed: ${err.message}`);
    } finally {
      setIsExportingLedger(false);
    }
  };

  // Execute actual deletion
  const executeDeleteFile = async () => {
    if (!fileToDelete || !vaultFolderId) return;
    setIsDeleting(true);
    try {
      await deleteFileFromDrive(fileToDelete.id);
      triggerToast('success', `Document "${fileToDelete.name}" was permanently deleted.`);
      
      // Log deletion action
      dbService.logActivity({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        details: `Deleted file from Google Drive Vault: "${fileToDelete.name}"`
      });

      await fetchVaultFiles(vaultFolderId);
    } catch (err: any) {
      console.error('File deletion error:', err);
      triggerToast('error', `Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  // Filtered files list
  const filteredFiles = driveFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 relative">
      
      {/* Absolute floating notifications/toasts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-lg max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <HardDrive className="h-5 w-5 text-indigo-600 shrink-0" />
            )}
            <p className="text-xs font-semibold leading-normal">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="text-industrial-400 hover:text-industrial-600 ml-auto shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-industrial-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-600">
              <Cloud className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black text-industrial-800 font-sans tracking-tight uppercase flex items-center gap-1.5">
              Google Drive Vault <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono font-black uppercase">WORKSPACE</span>
            </h1>
          </div>
          <p className="text-xs text-industrial-500 mt-1 max-w-2xl font-sans">
            Secure cloud storage hub to manage engineering documents, technical datasheets, and automate real-time spreadsheet inventory backups in Google Drive.
          </p>
        </div>
        
        {isAuthenticated && googleUser && (
          <div className="flex items-center gap-3 bg-industrial-50 border border-industrial-200 rounded-xl p-2.5">
            {googleUser.photoURL ? (
              <img
                src={googleUser.photoURL}
                referrerPolicy="no-referrer"
                alt={googleUser.displayName || 'Google Account'}
                className="h-8 w-8 rounded-full border border-industrial-300 shadow-3xs shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold border border-indigo-200 shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="text-left font-sans shrink-0">
              <p className="text-[11px] font-bold text-industrial-800 truncate max-w-[150px]">{googleUser.displayName}</p>
              <p className="text-[9px] font-mono text-industrial-450 truncate max-w-[150px]">{googleUser.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out Google Account"
              className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-industrial-500 hover:text-rose-600 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Sandbox Mode Warning Banner */}
      {!isFirebaseConfigured() && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 mt-4 text-left justify-between">
          <div className="flex items-start gap-3.5 flex-1">
            <div className="p-2 bg-amber-100 border border-amber-200 text-amber-700 rounded-xl shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-amber-800">تنبيه: وضع محاكاة التخزين السحابي / Active Sandbox Simulation</h4>
              <p className="text-[10.5px] text-amber-700 leading-normal font-sans font-sans">
                {getForceSandbox() 
                  ? "Running in Simulated Google Drive Sandbox Mode. Fully functional local session, perfect for testing without Google Cloud Console configuration."
                  : "Firebase is currently unconfigured. To secure live APIs and cloud directories, launch Firebase Setup in your workspace."}
                <span className="block mt-1 font-semibold">You can still upload, view, and organize files in the local session sandbox!</span>
              </p>
            </div>
          </div>
          {getForceSandbox() && (
            <button
              onClick={handleSwitchToLiveMode}
              className="mt-3 sm:mt-0 bg-white hover:bg-industrial-50 border border-amber-300 text-amber-850 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-pointer transition-colors"
            >
              التبديل إلى الوضع السحابي الحقيقي / Switch to Live Cloud Mode
            </button>
          )}
        </div>
      )}
      {!isAuthenticated ? (
        <div className="max-w-xl mx-auto py-12 text-center">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-industrial-200 rounded-2xl p-8 shadow-xs space-y-6"
          >
            <div className="mx-auto w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <Cloud className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-md font-bold text-industrial-800 font-sans">Connect Your Google Drive</h2>
              <p className="text-xs text-industrial-500 max-w-sm mx-auto leading-relaxed">
                Connect your Google account with EMIS securely using Google sign-in. This enables real-time file access, uploads, and cataloging under your Workspace cloud account.
              </p>
            </div>

            {/* Error Fallback Banner */}
            {signInError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2.5 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-red-850 font-bold text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>خطأ في الاتصال / Connection Issue</span>
                </div>
                <p className="text-[10.5px] text-red-750 leading-relaxed font-sans font-sans">
                  Google Sign-In popup was closed, blocked, or has restricted configurations. This is typical in sandbox iframe environments or when OAuth is not yet configured for your Google project.
                </p>
                <button
                  type="button"
                  onClick={handleActivateSandbox}
                  className="w-full mt-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10.5px] py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  الدخول الفوري عبر وضع المحاكاة / Connect Instantly via Local Sandbox
                </button>
              </div>
            )}

            {/* Google Sign In Button - Complies with Google Sign-In Branding Guidelines */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="gsi-material-button w-full sm:w-auto max-w-xs flex justify-center border border-industrial-250 bg-white hover:bg-industrial-50 transition-colors shadow-3xs rounded-lg py-2.5 px-5 cursor-pointer disabled:opacity-50"
              >
                <div className="gsi-material-button-content-wrapper flex items-center justify-center gap-3">
                  <div className="gsi-material-button-icon shrink-0">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-xs font-sans font-bold text-industrial-700">
                    {isLoading ? 'Connecting Registers...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>

              {!signInError && (
                <div className="text-[10px] text-industrial-400 font-sans flex items-center gap-1.5 mt-1">
                  <span>أو</span>
                  <button
                    type="button"
                    onClick={handleActivateSandbox}
                    disabled={isLoading}
                    className="text-indigo-650 hover:text-indigo-700 font-bold underline cursor-pointer"
                  >
                    التشغيل في وضع المحاكاة / Run in Simulated Sandbox Mode
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Middle: File Explorer panel */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search and control bar */}
            <div className="bg-white border border-industrial-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
              
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-industrial-400" />
                <input
                  type="text"
                  placeholder="Filter Vault Files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-industrial-50 border border-industrial-200 text-xs pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-400 font-sans"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handleManualRefresh}
                  disabled={isSyncing}
                  className="p-2 bg-industrial-50 hover:bg-industrial-100 border border-industrial-200 text-industrial-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Force Sync with Drive"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                
                {/* File Upload Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" /> Upload Document
                </button>
              </div>

            </div>

            {/* Folder / Files Matrix List */}
            <div className="bg-white border border-industrial-200 rounded-2xl overflow-hidden shadow-3xs min-h-[350px]">
              
              {/* Directory header */}
              <div className="bg-industrial-50/50 px-5 py-3.5 border-b border-industrial-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-indigo-500" />
                  <span className="text-xs font-bold text-industrial-800 font-mono tracking-tight">/Google Drive/ZFOD EMIS Document Vault</span>
                </div>
                <span className="text-[10px] font-mono text-industrial-450 font-bold bg-white px-2 py-0.5 border border-industrial-200 rounded-md">
                  {filteredFiles.length} item(s) found
                </span>
              </div>

              {/* Files rendering */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                  <p className="text-xs font-mono text-industrial-450">Synchronizing cloud files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center p-6 space-y-4">
                  <div className="w-12 h-12 bg-industrial-100 rounded-xl flex items-center justify-center text-industrial-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-industrial-700 font-sans">No files available in vault</p>
                    <p className="text-[10px] text-industrial-450 max-w-xs leading-normal">
                      No matching technical files or backups are stored in your application folder. Upload a new file or export the material ledger to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-industrial-150">
                  {filteredFiles.map((file, idx) => {
                    const isSpreadsheet = file.mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
                    const formattedDate = file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'N/A';
                    
                    return (
                      <div
                        key={`${file.id}-${idx}`}
                        className="px-5 py-4 hover:bg-industrial-50/30 flex items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl border shrink-0 ${
                            isSpreadsheet 
                              ? 'bg-emerald-50 border-emerald-150 text-emerald-600'
                              : 'bg-indigo-50 border-indigo-150 text-indigo-600'
                          }`}>
                            {isSpreadsheet ? (
                              <FileSpreadsheet className="h-4.5 w-4.5" />
                            ) : (
                              <FileText className="h-4.5 w-4.5" />
                            )}
                          </div>
                          
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-bold text-industrial-800 truncate" title={file.name}>
                              {file.name}
                            </h4>
                            <p className="text-[10px] font-mono text-industrial-450 mt-0.5 space-x-2">
                              <span>Size: {file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}</span>
                              <span>·</span>
                              <span>Created: {formattedDate}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-industrial-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all"
                              title="View Document in Google Drive"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-2 text-industrial-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                            title="Delete file permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

          {/* Right Panel: Side Panel Utilities */}
          <div className="space-y-6">
            
            {/* Quick backup section */}
            <div className="bg-white border border-industrial-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Auto Backup Engine
              </h3>
              <p className="text-[11px] text-industrial-500 leading-normal font-sans">
                Directly export the entire active material ledger (all parts, stock levels, warehouse indices and tags) directly into your Google Drive Vault folder as an Excel spreadsheet backup.
              </p>

              <button
                onClick={handleExportLedgerToDrive}
                disabled={isExportingLedger || isSyncing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
              >
                {isExportingLedger ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Saving Backup...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" /> Backup Ledger to Drive
                  </>
                )}
              </button>
            </div>

            {/* Folder Metadata info */}
            <div className="bg-industrial-50 border border-industrial-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-industrial-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-indigo-600" /> Storage Diagnostics
              </h3>
              
              <div className="space-y-3 font-sans">
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-200 text-xs">
                  <span className="text-industrial-500">Destination Folder</span>
                  <span className="font-bold text-industrial-700 truncate max-w-[150px]" title="ZFOD EMIS Document Vault">ZFOD EMIS Document Vault</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-200 text-xs">
                  <span className="text-industrial-500">Cloud Host</span>
                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">Google Drive API v3</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-industrial-200 text-xs">
                  <span className="text-industrial-500">Auth Token Status</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-xs">
                  <span className="text-industrial-500">Active Files Linked</span>
                  <span className="font-bold text-industrial-800">{driveFiles.length} Total</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Explicit User Confirmation Modal for Destructive Deletion */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-industrial-250 max-w-md w-full rounded-2xl p-6 shadow-xl text-center space-y-5 font-sans"
            >
              <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-industrial-800">Confirm Technical Document Deletion</h3>
                <p className="text-xs text-industrial-500 leading-normal">
                  Are you absolutely sure you want to delete <span className="font-bold text-industrial-700">"{fileToDelete.name}"</span> from Google Drive? This action will permanently remove the file from your Drive storage and cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeleting}
                  className="bg-white border border-industrial-250 text-industrial-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 hover:bg-industrial-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteFile}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-3xs disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4.5 w-4.5" /> Delete File
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
