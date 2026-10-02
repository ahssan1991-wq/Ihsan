/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Shield,
  Users, 
  Building2, 
  Warehouse, 
  Mail, 
  Activity, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Key, 
  Lock, 
  RefreshCw, 
  Send, 
  Check, 
  X, 
  Search, 
  Sliders, 
  FileSpreadsheet, 
  Download, 
  Server, 
  Database, 
  Cpu, 
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { User, UserRole, Site, MasterWarehouse, EmailSettings, EmailLogEntry, AuditLogEntry, EmailSendResult } from '../types';
import { dbService } from '../services/dbService';
import { getBaseApiUrl } from '../services/apiClient';

interface AdminDashboardProps {
  currentUser: User;
  onNavigateTab?: (tabId: string) => void;
}

export default function AdminDashboard({ currentUser, onNavigateTab }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'sites' | 'warehouses' | 'email' | 'audit' | 'health'>('users');
  
  // Master state
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [warehouses, setWarehouses] = useState<MasterWarehouse[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(dbService.getEmailSettings());
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  
  // Search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<MasterWarehouse | null>(null);

  // Email test state
  const [testRecipient, setTestRecipient] = useState(currentUser.email || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<EmailSendResult | null>(null);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);
  const [isTestingCritical, setIsTestingCritical] = useState(false);
  const [criticalTestResult, setCriticalTestResult] = useState<any>(null);

  // System health state
  const [healthStatus, setHealthStatus] = useState<{
    database: string;
    server: string;
    smtp: string;
    storageUsedPercent: number;
    totalMaterials: number;
    totalUsers: number;
  }>({
    database: 'CONNECTED',
    server: 'ONLINE',
    smtp: 'CONFIGURED',
    storageUsedPercent: 18,
    totalMaterials: 0,
    totalUsers: 0
  });

  const reloadData = () => {
    setUsers(dbService.getUsers());
    setSites(dbService.getSites());
    setWarehouses(dbService.getWarehouses());
    setEmailSettings(dbService.getEmailSettings());
    setEmailLogs(dbService.getEmailLogs());
    setAuditLogs(dbService.getAuditLogs());

    // Also fetch latest server email logs asynchronously
    dbService.fetchEmailLogs().then(logs => {
      if (logs && logs.length > 0) setEmailLogs(logs);
    });

    const materials = dbService.getMaterials();
    setHealthStatus(prev => ({
      ...prev,
      totalMaterials: materials.length,
      totalUsers: dbService.getUsers().length
    }));
  };

  useEffect(() => {
    reloadData();
    const handleUsersUpdate = () => reloadData();
    const handleSitesUpdate = () => reloadData();
    const handleAuditUpdate = () => reloadData();

    window.addEventListener('emis:users-updated', handleUsersUpdate);
    window.addEventListener('emis:sites-updated', handleSitesUpdate);
    window.addEventListener('emis:warehouses-updated', handleSitesUpdate);
    window.addEventListener('emis:audit-logs-updated', handleAuditUpdate);

    // Fetch server health
    fetch(`${getBaseApiUrl()}/api/admin/health`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setHealthStatus(prev => ({
            ...prev,
            server: 'ONLINE',
            database: data.services?.database || 'CONNECTED',
            smtp: data.services?.smtp || 'CONFIGURED'
          }));
        }
      })
      .catch(() => {
        setHealthStatus(prev => ({ ...prev, server: 'STANDALONE_PWA' }));
      });

    return () => {
      window.removeEventListener('emis:users-updated', handleUsersUpdate);
      window.removeEventListener('emis:sites-updated', handleSitesUpdate);
      window.removeEventListener('emis:warehouses-updated', handleSitesUpdate);
      window.removeEventListener('emis:audit-logs-updated', handleAuditUpdate);
    };
  }, []);

  // --- USER HANDLERS ---

  const handleToggleUserStatus = (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (user.id === currentUser.id && nextStatus === 'DISABLED') {
      alert('You cannot disable your own active administrator account.');
      return;
    }
    const res = dbService.setUserStatus(user.id, nextStatus, currentUser);
    if (res.success) {
      reloadData();
    } else {
      alert(res.error || 'Failed to update user status.');
    }
  };

  const handleResetPassword = () => {
    if (!resetPassUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    const res = dbService.resetUserPassword(resetPassUser.id, newPassword.trim(), currentUser);
    if (res.success) {
      alert(`Password for ${resetPassUser.name} has been successfully updated.`);
      setIsResetPassOpen(false);
      setResetPassUser(null);
      setNewPassword('');
    } else {
      alert(res.error || 'Failed to reset password.');
    }
  };

  // --- EMAIL HANDLERS ---

  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.saveEmailSettings(emailSettings, currentUser);
    setEmailSaveSuccess(true);
    setTimeout(() => setEmailSaveSuccess(false), 3000);
    reloadData();
  };

  const handleApplySmtpPreset = (preset: 'gmail' | 'office365' | 'custom') => {
    if (preset === 'gmail') {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'SMTP',
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          user: prev.smtp?.user || prev.adminNotificationEmail || '',
          pass: prev.smtp?.pass || '',
          secure: false
        }
      }));
    } else if (preset === 'office365') {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'SMTP',
        smtp: {
          host: 'smtp.office365.com',
          port: 587,
          user: prev.smtp?.user || prev.adminNotificationEmail || '',
          pass: prev.smtp?.pass || '',
          secure: false
        }
      }));
    } else {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'SMTP',
        smtp: {
          host: '',
          port: 587,
          user: '',
          pass: '',
          secure: false
        }
      }));
    }
  };

  const handleTriggerTestEmail = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const recipient = testRecipient.trim() || emailSettings.adminNotificationEmail;
      const res = await dbService.sendTestEmail(recipient, emailSettings);
      setTestResult(res);
      const updatedLogs = await dbService.fetchEmailLogs();
      setEmailLogs(updatedLogs);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'FAILED',
        eventId: `test-${Date.now()}`,
        error: err.message || 'Failed to send test email',
        timestamp: new Date().toISOString(),
        recipient: testRecipient
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTriggerCriticalTestAlert = async () => {
    setIsTestingCritical(true);
    setCriticalTestResult(null);
    try {
      await dbService.saveEmailSettings(emailSettings, currentUser);
      const res = await dbService.testCriticalMaterialEmailAlert(currentUser);
      setCriticalTestResult(res);
      const updatedLogs = await dbService.fetchEmailLogs();
      setEmailLogs(updatedLogs);
    } catch (err: any) {
      setCriticalTestResult({
        success: false,
        status: 'FAILED',
        error: err.message || 'Failed to trigger critical material test alert'
      });
    } finally {
      setIsTestingCritical(false);
    }
  };

  // --- EXPORT AUDIT LOGS ---
  const handleExportAuditLogs = () => {
    const csvRows = [
      ['Timestamp', 'User', 'User Role', 'Action', 'Entity', 'Entity ID', 'Site', 'Result', 'Details'].join(','),
      ...auditLogs.map(l => [
        `"${l.timestamp}"`,
        `"${l.user}"`,
        `"${l.userRole || ''}"`,
        `"${l.action}"`,
        `"${l.entity}"`,
        `"${l.entityId}"`,
        `"${l.site || ''}"`,
        `"${l.result}"`,
        `"${(l.newValue || l.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EMIS_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (selectedSiteFilter !== 'ALL' && u.siteId !== selectedSiteFilter && u.site !== selectedSiteFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, selectedSiteFilter, searchTerm]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [sites, searchTerm]);

  // Filtered warehouses
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(w => {
      if (selectedSiteFilter !== 'ALL' && w.siteId !== selectedSiteFilter && w.siteCode !== selectedSiteFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || w.siteName?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [warehouses, selectedSiteFilter, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="admin-governance-dashboard">
      {/* Top Banner */}
      <div className="bg-white dark:bg-industrial-900 rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-industrial-900 dark:text-white">
                Admin Control & Real-World Site Governance
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-full border border-red-200 dark:border-red-900">
                Port 10
              </span>
            </div>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-1">
              Identity Management • RBAC Enforcement • Real-World Facilities • SMTP Alerts • Audit Ledger
            </p>
          </div>
        </div>

        {/* Quick System Stats */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-3.5 py-2 rounded-xl bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 text-xs">
            <div className="text-industrial-400 text-[10px] font-semibold uppercase">Facilities</div>
            <div className="text-sm font-bold text-industrial-900 dark:text-white">{sites.length} Active Sites</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 text-xs">
            <div className="text-industrial-400 text-[10px] font-semibold uppercase">Accounts</div>
            <div className="text-sm font-bold text-industrial-900 dark:text-white">{users.length} Master Users</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 text-xs">
            <div className="text-industrial-400 text-[10px] font-semibold uppercase">SMTP Alert</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {emailSettings.enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-industrial-200 dark:border-industrial-800">
        {[
          { id: 'users', label: 'User & RBAC Access', icon: Users, count: users.length },
          { id: 'sites', label: 'Real-World Sites & Stations', icon: Building2, count: sites.length },
          { id: 'warehouses', label: 'Warehouses & Sub-Stores', icon: Warehouse, count: warehouses.length },
          { id: 'email', label: 'Email Alerts & SMTP Engine', icon: Mail, count: null },
          { id: 'audit', label: 'Audit Trail & Security Ledger', icon: Activity, count: auditLogs.length },
          { id: 'health', label: 'System Health & Node Status', icon: Server, count: null }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-industrial-900 shadow-xs'
                  : 'border-transparent text-industrial-600 dark:text-industrial-400 hover:text-industrial-900 dark:hover:text-white hover:bg-industrial-100/50 dark:hover:bg-industrial-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300' : 'bg-industrial-200 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER & RBAC MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-industrial-700 dark:text-industrial-300 focus:outline-none"
              >
                <option value="ALL">All Facilities</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>

              <button
                onClick={() => setIsAddUserOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                id="btn-add-new-user"
              >
                <Plus className="w-4 h-4" />
                Add User Account
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-industrial-900 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-950/80 text-industrial-500 dark:text-industrial-400 font-semibold border-b border-industrial-200 dark:border-industrial-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">User & Identifier</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Primary Facility & Store</th>
                    <th className="p-4">Allowed Sites Multi-Scope</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800/60">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-industrial-50/60 dark:hover:bg-industrial-850/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-industrial-900 dark:text-white flex items-center gap-1.5">
                              {u.name}
                              {u.id === currentUser.id && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-brand-50 text-brand-600 border border-brand-200 font-semibold">You</span>
                              )}
                            </div>
                            <div className="text-[11px] text-industrial-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          u.role === UserRole.ADMIN ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200' :
                          u.role === UserRole.ENGINEER ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200' :
                          u.role === UserRole.STOREKEEPER ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200' :
                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-industrial-800 dark:text-industrial-200">{u.site || 'NDGS'}</div>
                        <div className="text-[11px] text-industrial-400">{u.warehouse || 'Default Store'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.allowedSites && u.allowedSites.length > 0 ? (
                            u.allowedSites.map(sId => {
                              const sObj = sites.find(s => s.id === sId || s.code === sId);
                              return (
                                <span key={sId} className="px-1.5 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 text-[10px] font-mono text-industrial-700 dark:text-industrial-300">
                                  {sObj ? sObj.name : sId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-industrial-400">All Scopes</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="p-4 text-industrial-500 text-[11px]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setResetPassUser(u); setIsResetPassOpen(true); }}
                            title="Reset User Password"
                            className="p-1.5 text-industrial-500 hover:text-amber-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingUser(u); }}
                            title="Edit User Profile"
                            className="p-1.5 text-industrial-500 hover:text-brand-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL-WORLD SITES & STATIONS */}
      {activeTab === 'sites' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
              <input
                type="text"
                placeholder="Search facilities by name, code, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              onClick={() => setIsAddSiteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              id="btn-add-new-site"
            >
              <Plus className="w-4 h-4" />
              Register New Facility / Site
            </button>
          </div>

          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSites.map(s => {
              const siteWarehouses = warehouses.filter(w => w.siteId === s.id || w.siteCode === s.code);
              return (
                <div 
                  key={s.id} 
                  className="bg-white dark:bg-industrial-900 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-3"
                  id={`site-card-${s.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-industrial-900 dark:text-white">{s.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300">
                            {s.code}
                          </span>
                        </div>
                        <p className="text-xs text-industrial-500 dark:text-industrial-400">{s.area}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-industrial-200 text-industrial-600'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-industrial-600 dark:text-industrial-300 leading-relaxed">
                    {s.description || 'Primary engineering operations facility'}
                  </p>

                  <div className="pt-3 border-t border-industrial-100 dark:border-industrial-800/80 flex items-center justify-between text-xs text-industrial-500">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5 text-industrial-400" />
                      <span>{siteWarehouses.length} Linked Warehouses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingSite(s)}
                        className="px-3 py-1.5 min-h-[34px] text-xs font-bold text-industrial-700 dark:text-industrial-200 hover:text-brand-600 bg-industrial-100 hover:bg-industrial-200 dark:bg-industrial-800 dark:hover:bg-industrial-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-3xs"
                        title="Edit Facility"
                        aria-label={`Edit ${s.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand-500" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: WAREHOUSES & SUB-STORES */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
              <input
                type="text"
                placeholder="Search warehouses by name, code, or site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedSiteFilter}
                onChange={(e) => setSelectedSiteFilter(e.target.value)}
                className="text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl px-3 py-2 text-industrial-700 dark:text-industrial-300 focus:outline-none"
              >
                <option value="ALL">All Parent Facilities</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button
                onClick={() => setIsAddWarehouseOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                id="btn-add-new-wh"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse / Store
              </button>
            </div>
          </div>

          {/* Warehouses Table */}
          <div className="bg-white dark:bg-industrial-900 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-950/80 text-industrial-500 dark:text-industrial-400 font-semibold border-b border-industrial-200 dark:border-industrial-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Store Name & Code</th>
                    <th className="p-4">Parent Facility</th>
                    <th className="p-4">Storage Classification & Details</th>
                    <th className="p-4">Physical Room / Bay</th>
                    <th className="p-4">Operational Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800/60">
                  {filteredWarehouses.map(w => (
                    <tr key={w.id} className="hover:bg-industrial-50/60 dark:hover:bg-industrial-850/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                            <Warehouse className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-industrial-900 dark:text-white">{w.name}</div>
                            <div className="text-[11px] font-mono text-industrial-400">{w.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-industrial-800 dark:text-industrial-200 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-industrial-400" />
                          {w.siteName || 'NDGS'}
                        </span>
                      </td>
                      <td className="p-4 text-industrial-600 dark:text-industrial-300 max-w-sm">
                        {w.description || 'General storage facility'}
                      </td>
                      <td className="p-4 text-industrial-500 font-mono text-[11px]">
                        {w.location || 'Zone A'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {w.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setEditingWarehouse(w)}
                          className="p-1.5 text-industrial-500 hover:text-brand-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMAIL ALERTS & SMTP ENGINE */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Settings Form */}
          <div className="lg:col-span-2 bg-white dark:bg-industrial-900 p-6 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-brand-600" />
                  SMTP Server Configuration & Real-World Alerts
                </h3>
                <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
                  Configure direct SMTP delivery to engineering teams for material arrivals and stock adjustments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-industrial-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-industrial-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                </label>
              </div>
            </div>

            <form onSubmit={handleSaveEmailConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    Primary Admin Notification Recipient
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin-alerts@company.com"
                    value={emailSettings.adminNotificationEmail || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, adminNotificationEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1 flex items-center justify-between">
                    <span>Engineering Team Recipient Email</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Critical Spares</span>
                  </label>
                  <input
                    type="email"
                    placeholder="ahssan1991@gmail.com"
                    value={emailSettings.engineeringTeamEmail || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, engineeringTeamEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-industrial-400 mt-1 block">
                    Receives real-time alerts whenever a critical material is updated or stock drops below safe limits.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailSettings.senderName || 'EMIS Material Intelligence'}
                    onChange={(e) => setEmailSettings({ ...emailSettings, senderName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                    Critical Alert Governance
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSettings.criticalMaterialAlertsEnabled !== false}
                      onChange={(e) => setEmailSettings({ ...emailSettings, criticalMaterialAlertsEnabled: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-industrial-800 dark:text-industrial-200">
                      Enable Cloud Trigger for Critical Spares & Safety Deficits
                    </span>
                  </label>
                </div>
              </div>

              {/* SMTP Credentials */}
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-950/60 border border-industrial-200 dark:border-industrial-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-industrial-800 dark:text-industrial-200 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-brand-600" />
                    SMTP Connection Credentials (NodeMailer Engine)
                  </h4>
                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-industrial-500 dark:text-industrial-400 font-medium">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('gmail')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 hover:border-brand-500 font-semibold text-industrial-700 dark:text-industrial-300 transition-colors"
                    >
                      Gmail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('office365')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 hover:border-brand-500 font-semibold text-industrial-700 dark:text-industrial-300 transition-colors"
                    >
                      Office 365
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('custom')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 hover:border-brand-500 font-semibold text-industrial-700 dark:text-industrial-300 transition-colors"
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com or mail.company.com"
                      value={emailSettings.smtp?.host || ''}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        smtp: { ...emailSettings.smtp, host: e.target.value, port: emailSettings.smtp?.port || 587, user: emailSettings.smtp?.user || '', pass: emailSettings.smtp?.pass || '' }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-lg text-industrial-900 dark:text-industrial-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={emailSettings.smtp?.port || 587}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        smtp: { ...emailSettings.smtp, port: parseInt(e.target.value) || 587, host: emailSettings.smtp?.host || '', user: emailSettings.smtp?.user || '', pass: emailSettings.smtp?.pass || '' }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-lg text-industrial-900 dark:text-industrial-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                      SMTP User / Auth Email
                    </label>
                    <input
                      type="text"
                      placeholder="user@gmail.com or alerts@company.com"
                      value={emailSettings.smtp?.user || ''}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        smtp: { ...emailSettings.smtp, user: e.target.value, host: emailSettings.smtp?.host || '', port: emailSettings.smtp?.port || 587, pass: emailSettings.smtp?.pass || '' }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-lg text-industrial-900 dark:text-industrial-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-industrial-600 dark:text-industrial-400 mb-1">
                      SMTP Password / App Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={emailSettings.smtp?.pass || ''}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        smtp: { ...emailSettings.smtp, pass: e.target.value, host: emailSettings.smtp?.host || '', port: emailSettings.smtp?.port || 587, user: emailSettings.smtp?.user || '' }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-800 rounded-lg text-industrial-900 dark:text-industrial-100 font-mono"
                    />
                    {/* Live Gmail App Password helper & warning */}
                    {(() => {
                      const isGmail = (emailSettings.smtp?.host || '').toLowerCase().includes('gmail.com') || (emailSettings.smtp?.user || '').toLowerCase().endsWith('@gmail.com');
                      const cleanPass = (emailSettings.smtp?.pass || '').trim().replace(/\s+/g, '');
                      if (!isGmail) return null;
                      if (cleanPass.length > 0 && cleanPass.length < 16) {
                        return (
                          <div className="mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                            <div className="flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Google App Password Required (Entered: {cleanPass.length}/16 chars)</span>
                            </div>
                            <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-tight">
                              Google strictly blocks personal passwords &amp; PINs for SMTP with error <strong>535-5.7.8</strong>. You must generate a 16-character App Password.
                            </p>
                            <a
                              href="https://myaccount.google.com/apppasswords"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              Generate Google App Password ↗
                            </a>
                          </div>
                        );
                      }
                      if (cleanPass.length === 16) {
                        return (
                          <p className="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid 16-character Google App Password format
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300">
                  <strong>💡 Tip for Gmail:</strong> If using Gmail, enter <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">smtp.gmail.com</code> (Port 587) and generate a 16-character <em>App Password</em> from your Google Account (Security &gt; 2-Step Verification &gt; App Passwords).
                </div>
              </div>

              {/* Event Triggers */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-industrial-800 dark:text-industrial-200">
                  Transactional Alert Triggers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'criticalMaterialUpdated', label: '🚨 Critical Spare Record Modified' },
                    { key: 'criticalStockBreached', label: '⚠️ Critical Safety Stock Deficit Breach' },
                    { key: 'materialAdded', label: 'New Material Creation Alert' },
                    { key: 'existingMaterialQuantityChanged', label: 'Existing Material Qty Changed' },
                    { key: 'materialAccepted', label: 'Material QA Acceptance Notice' },
                    { key: 'materialRejected', label: 'Material Rejection / Blacklist' },
                    { key: 'lowStock', label: 'Safety Stock Critical Alert' },
                    { key: 'syncFailure', label: 'Cloud Sync / Failure Notice' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg bg-industrial-50 dark:bg-industrial-950/40 border border-industrial-200 dark:border-industrial-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(emailSettings.triggers as any)[item.key] ?? true}
                        onChange={(e) => setEmailSettings({
                          ...emailSettings,
                          triggers: {
                            ...emailSettings.triggers,
                            [item.key]: e.target.checked
                          }
                        })}
                        className="rounded text-brand-600 focus:ring-0"
                      />
                      <span className="text-[11px] font-semibold text-industrial-700 dark:text-industrial-300">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  id="btn-save-email-settings"
                >
                  Save Email Alert Settings
                </button>
                {emailSaveSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Configuration saved successfully
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Real SMTP Live Test & Status Panel */}
          <div className="bg-white dark:bg-industrial-900 p-6 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Live SMTP Dispatch Test
              </h3>
              <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
                Send a live test message to verify outbound SMTP connectivity.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                  Recipient Test Email Address
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@company.com"
                  className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono text-industrial-900 dark:text-industrial-100"
                />
              </div>

              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleTriggerTestEmail}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                id="btn-send-smtp-test"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Attempting Live SMTP Connection...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Live SMTP Test Email
                  </>
                )}
              </button>

              {/* Critical Material Cloud Trigger Test Button */}
              <div className="pt-2 border-t border-industrial-100 dark:border-industrial-800">
                <button
                  type="button"
                  disabled={isTestingCritical}
                  onClick={handleTriggerCriticalTestAlert}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  id="btn-test-critical-alert"
                >
                  {isTestingCritical ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Dispatching Cloud Function Critical Alert...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Test Critical Material Cloud Alert
                    </>
                  )}
                </button>
                <span className="text-[10px] text-industrial-400 mt-1 block text-center">
                  Simulates a high-priority instrumentation update and sends real-time email to the Engineering Team ({emailSettings.engineeringTeamEmail || 'ahssan1991@gmail.com'}).
                </span>
              </div>

              {/* Critical Test Result Output Card */}
              {criticalTestResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  criticalTestResult.status === 'SENT'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : criticalTestResult.status === 'NOT_CONFIGURED'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {criticalTestResult.status === 'SENT' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      Engineering Alert: {criticalTestResult.status || 'PROCESSED'}
                    </span>
                    <span className="text-[10px] font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  {criticalTestResult.message && (
                    <p className="text-[11px] leading-relaxed opacity-90">{criticalTestResult.message}</p>
                  )}

                  {criticalTestResult.recipients && (
                    <div className="text-[10px] font-mono bg-white/60 dark:bg-black/30 p-1.5 rounded">
                      Recipients: {criticalTestResult.recipients.join(', ')}
                    </div>
                  )}

                  {criticalTestResult.error && (
                    <div className="text-[10.5px] p-2 rounded bg-rose-100/50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-sans leading-relaxed" dir="auto">
                      {criticalTestResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Test Output Card */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : testResult.status === 'NOT_CONFIGURED'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : testResult.status === 'NOT_CONFIGURED' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      {testResult.success
                        ? 'تم تأكيد تسليم البريد عبر SMTP / SMTP Delivery Confirmed'
                        : testResult.status === 'NOT_CONFIGURED'
                        ? 'يلزم ضبط إعدادات خادم البريد (SMTP) / SMTP Configuration Required'
                        : 'تعذر إرسال البريد عبر SMTP / SMTP Delivery Failed'}
                    </span>
                    <span className="text-[10px] font-mono">
                      {new Date(testResult.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  {testResult.messageId && (
                    <div className="font-mono text-[10px] text-industrial-500 break-all">
                      Message ID: {testResult.messageId}
                    </div>
                  )}

                  {testResult.error && (
                    <div className={`text-[11px] p-2.5 rounded-lg space-y-2 ${
                      testResult.status === 'NOT_CONFIGURED'
                        ? 'bg-white/80 dark:bg-black/30 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                        : 'bg-white/80 dark:bg-black/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                    }`}>
                      <div className="text-[11px] leading-relaxed font-sans" dir="auto">{testResult.error}</div>
                      
                      {(testResult.error.includes('535') || testResult.error.includes('App Password') || testResult.error.includes('BadCredentials') || testResult.error.includes('Username and Password not accepted')) && (
                        <div className="pt-2 border-t border-rose-200/80 dark:border-rose-800/50 space-y-1.5 text-xs">
                          <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-rose-600" />
                            How to Resolve Google 535-5.7.8 (Bad Credentials):
                          </div>
                          <p className="text-[11px] text-rose-800/90 dark:text-rose-300">
                            Google disables normal passwords for SMTP. You must create a dedicated <strong>16-character App Password</strong>:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-[10.5px] text-rose-800 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/40 p-2 rounded-lg">
                            <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google account.</li>
                            <li>
                              Open{' '}
                              <a
                                href="https://myaccount.google.com/apppasswords"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold underline text-brand-600 dark:text-brand-400 hover:text-brand-700"
                              >
                                Google App Passwords (myaccount.google.com/apppasswords) ↗
                              </a>
                            </li>
                            <li>Under "App name", enter <strong>EMIS</strong> and click <strong>Create</strong>.</li>
                            <li>Copy the 16 characters (e.g. <code className="font-mono bg-white/70 dark:bg-black/40 px-1 py-0.5 rounded">abcd efgh ijkl mnop</code>) and paste into the <strong>SMTP Password</strong> field above.</li>
                            <li>Click <strong>Save Email Alert Settings</strong>, then retry <strong>Send Live SMTP Test Email</strong>.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email Outbox Log Preview */}
            <div className="pt-4 border-t border-industrial-100 dark:border-industrial-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-industrial-800 dark:text-industrial-200">Recent Outbox Logs</span>
                <span className="text-[10px] text-industrial-400 font-mono">{emailLogs.length} Records</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {emailLogs.length === 0 ? (
                  <p className="text-[11px] text-industrial-400 italic">No emails dispatched in this session.</p>
                ) : (
                  emailLogs.slice(0, 10).map((l, i) => (
                    <div key={i} className="p-2 rounded-lg bg-industrial-50 dark:bg-industrial-950 text-[11px] flex items-center justify-between">
                      <div className="truncate mr-2">
                        <div className="font-semibold text-industrial-800 dark:text-industrial-200 truncate">{l.subject}</div>
                        <div className="text-[10px] text-industrial-400">{l.recipient}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        l.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-industrial-900 p-4 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
              <input
                type="text"
                placeholder="Search audit trail by actor, entity, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              onClick={handleExportAuditLogs}
              className="flex items-center gap-1.5 px-4 py-2 bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 dark:hover:bg-industrial-700 text-industrial-800 dark:text-industrial-200 rounded-xl text-xs font-bold transition-colors shrink-0"
              id="btn-export-audit-csv"
            >
              <Download className="w-4 h-4" />
              Export Audit Trail (CSV)
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-industrial-900 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-industrial-50 dark:bg-industrial-950/80 text-industrial-500 dark:text-industrial-400 font-semibold border-b border-industrial-200 dark:border-industrial-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity Type & ID</th>
                    <th className="p-4">Facility / Site</th>
                    <th className="p-4">Details / Delta</th>
                    <th className="p-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800/60">
                  {auditLogs.filter(l => {
                    if (searchTerm) {
                      const q = searchTerm.toLowerCase();
                      return l.user?.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q);
                    }
                    return true;
                  }).map(l => (
                    <tr key={l.id} className="hover:bg-industrial-50/60 dark:hover:bg-industrial-850/50 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-industrial-500 whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-industrial-900 dark:text-white">{l.user}</div>
                        <div className="text-[10px] text-industrial-400 uppercase">{l.userRole || 'System'}</div>
                      </td>
                      <td className="p-4 font-semibold text-industrial-800 dark:text-industrial-200">
                        {l.action}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-industrial-100 dark:bg-industrial-800 font-mono text-[10px] text-industrial-700 dark:text-industrial-300">
                          {l.entity}: {l.entityId}
                        </span>
                      </td>
                      <td className="p-4 text-industrial-600 dark:text-industrial-300">
                        {l.site || 'NDGS'}
                      </td>
                      <td className="p-4 text-industrial-600 dark:text-industrial-400 max-w-xs truncate text-[11px]">
                        {l.newValue || l.details || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {l.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-industrial-900 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-industrial-500">Database Engine</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {healthStatus.database}
              </span>
            </div>
            <div className="text-lg font-bold text-industrial-900 dark:text-white">Firestore & Local Ledger</div>
            <p className="text-xs text-industrial-400">Synchronized and persistent across sessions.</p>
          </div>

          <div className="bg-white dark:bg-industrial-900 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-industrial-500">Backend API Services</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {healthStatus.server}
              </span>
            </div>
            <div className="text-lg font-bold text-industrial-900 dark:text-white">Express / Node.js Engine</div>
            <p className="text-xs text-industrial-400">Serving SMTP proxies and AI enrichment.</p>
          </div>

          <div className="bg-white dark:bg-industrial-900 p-5 rounded-2xl border border-industrial-200 dark:border-industrial-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-industrial-500">Outbound Alerts</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                {healthStatus.smtp}
              </span>
            </div>
            <div className="text-lg font-bold text-industrial-900 dark:text-white">NodeMailer SMTP Engine</div>
            <p className="text-xs text-industrial-400">Alert recipient: {emailSettings.adminNotificationEmail}</p>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Reset Password Modal */}
      {isResetPassOpen && resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-industrial-900 max-w-md w-full rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                Reset Password for {resetPassUser.name}
              </h3>
              <button onClick={() => setIsResetPassOpen(false)} className="text-industrial-400 hover:text-industrial-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-industrial-500">
              Enter a new secure password for <strong className="text-industrial-900 dark:text-white">{resetPassUser.email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                New Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 4 characters"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono text-industrial-900 dark:text-industrial-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetPassOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                Confirm Password Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <AddUserModal
          sites={sites}
          warehouses={warehouses}
          currentUser={currentUser}
          onClose={() => setIsAddUserOpen(false)}
          onSuccess={() => { setIsAddUserOpen(false); reloadData(); }}
        />
      )}

      {/* Add Site Modal */}
      {isAddSiteOpen && (
        <AddSiteModal
          currentUser={currentUser}
          onClose={() => setIsAddSiteOpen(false)}
          onSuccess={() => { setIsAddSiteOpen(false); reloadData(); }}
        />
      )}

      {/* Edit Site Modal */}
      {editingSite && (
        <EditSiteModal
          site={editingSite}
          currentUser={currentUser}
          onClose={() => setEditingSite(null)}
          onSuccess={() => { setEditingSite(null); reloadData(); }}
        />
      )}

      {/* Add Warehouse Modal */}
      {isAddWarehouseOpen && (
        <AddWarehouseModal
          sites={sites}
          currentUser={currentUser}
          onClose={() => setIsAddWarehouseOpen(false)}
          onSuccess={() => { setIsAddWarehouseOpen(false); reloadData(); }}
        />
      )}
    </div>
  );
}

// Submodal: Add User
function AddUserModal({ sites, warehouses, currentUser, onClose, onSuccess }: {
  sites: Site[];
  warehouses: MasterWarehouse[];
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.ENGINEER);
  const [siteId, setSiteId] = useState(sites[0]?.id || 'site-ndgs');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'wh-elec-a');
  const [password, setPassword] = useState('emis123');
  const [allowedSites, setAllowedSites] = useState<string[]>([sites[0]?.id || 'site-ndgs']);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const selectedSite = sites.find(s => s.id === siteId);
    const selectedWh = warehouses.find(w => w.id === warehouseId);

    const res = dbService.createUser({
      name,
      email,
      role,
      siteId,
      site: selectedSite?.name || 'NDGS',
      warehouseId,
      warehouse: selectedWh?.name || 'Main Electrical Store',
      allowedSites,
      password
    }, currentUser);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to create user account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-industrial-900 max-w-lg w-full rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Create Master User Account
          </h3>
          <button onClick={onClose} className="text-industrial-400 hover:text-industrial-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                System Role (RBAC)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
              >
                <option value={UserRole.ADMIN}>Administrator (Full Access)</option>
                <option value={UserRole.ENGINEER}>Lead Engineer</option>
                <option value={UserRole.STOREKEEPER}>Warehouse Storekeeper</option>
                <option value={UserRole.INSPECTOR}>QA Inspector</option>
                <option value={UserRole.VIEWER}>Read-Only Viewer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Primary Assigned Facility
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Default Store Location
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Initial Login Password
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Submodal: Add Site
function AddSiteModal({ currentUser, onClose, onSuccess }: {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = dbService.createSite({
      name,
      code,
      area,
      location,
      description
    }, currentUser);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to register facility.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-industrial-900 max-w-md w-full rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Register Operational Facility / Site
          </h3>
          <button onClick={onClose} className="text-industrial-400 hover:text-industrial-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Facility Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NDGS or South Gathering Station"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Unique Site Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. NDGS-01"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Operating Sector / Area
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Gas Processing"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Physical Location / Coordinate Description
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. North Sector Field Block 4"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Engineering Notes / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational context and equipment capacity..."
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
            >
              Register Facility
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Submodal: Edit Facility / Site
function EditSiteModal({ site, currentUser, onClose, onSuccess }: {
  site: Site;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(site.name || '');
  const [code, setCode] = useState(site.code || '');
  const [area, setArea] = useState(site.area || '');
  const [location, setLocation] = useState(site.location || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(site.status || 'ACTIVE');
  const [description, setDescription] = useState(site.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = dbService.updateSite(site.id, {
      name,
      code,
      area,
      location,
      status,
      active: status === 'ACTIVE',
      description
    }, currentUser);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to update facility details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-industrial-900 max-w-md w-full rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950 text-brand-600 rounded-xl border border-brand-200 dark:border-brand-800">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-industrial-900 dark:text-white">
                Edit Operational Facility
              </h3>
              <p className="text-xs text-industrial-500 font-mono">{site.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-industrial-400 hover:text-industrial-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Facility Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NDGS or Northern Desert Station"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Facility Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. NDGS-01"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono text-industrial-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-bold text-industrial-900 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Operating Sector / Area
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Gas Processing & Compression"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Physical Location / Coordinates Description
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sector North Block 4"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Engineering Notes / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Facility details, capacity and equipment..."
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl text-industrial-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Submodal: Add Warehouse
function AddWarehouseModal({ sites, currentUser, onClose, onSuccess }: {
  sites: Site[];
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id || 'site-ndgs');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = dbService.createWarehouse({
      name,
      code,
      siteId,
      location,
      description
    }, currentUser);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Failed to add warehouse.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-industrial-900 max-w-md w-full rounded-2xl p-6 border border-industrial-200 dark:border-industrial-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-industrial-900 dark:text-white flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-600" />
            Add Warehouse / Sub-Store
          </h3>
          <button onClick={onClose} className="text-industrial-400 hover:text-industrial-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Store / Warehouse Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Electrical Store (Store B)"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Warehouse Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WH-ELEC-B"
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
                Parent Facility
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Physical Bay / Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bay 4 - Rack Row 2"
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-industrial-700 dark:text-industrial-300 mb-1">
              Classification & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Store materials scope (e.g., high-voltage switchgear spares)..."
              className="w-full px-3 py-2 text-xs bg-industrial-50 dark:bg-industrial-950 border border-industrial-200 dark:border-industrial-800 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-industrial-100 dark:border-industrial-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-industrial-600 hover:bg-industrial-100 dark:hover:bg-industrial-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              Save Warehouse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
