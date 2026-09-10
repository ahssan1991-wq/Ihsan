/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Users,
  X,
  RefreshCw,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Smartphone,
  Laptop,
  Tablet
} from 'lucide-react';
import { 
  ActiveSession, 
  RemoteAccessSettings, 
  LoginAuditRecord, 
  User, 
  UserRole 
} from '../types';
import {
  getActiveSessions,
  revokeSession,
  getRemoteAccessSettings,
  saveRemoteAccessSettings,
  getLoginAudits
} from '../services/port13Service';

interface RemoteAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export default function RemoteAccessModal({ isOpen, onClose, currentUser }: RemoteAccessModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'sessions' | 'audits'>('settings');
  const [settings, setSettings] = useState<RemoteAccessSettings>(getRemoteAccessSettings());
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [audits, setAudits] = useState<LoginAuditRecord[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = () => {
    setSettings(getRemoteAccessSettings());
    setSessions(getActiveSessions());
    setAudits(getLoginAudits());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleRemote = () => {
    const updated: RemoteAccessSettings = {
      ...settings,
      remoteAccessEnabled: !settings.remoteAccessEnabled
    };
    saveRemoteAccessSettings(updated);
    setSettings(updated);
    setFeedback(`Remote Web Access has been ${updated.remoteAccessEnabled ? 'ENABLED' : 'DISABLED'}.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleEmergencyBypass = () => {
    const updated: RemoteAccessSettings = {
      ...settings,
      allowEmergencyBypass: !settings.allowEmergencyBypass
    };
    saveRemoteAccessSettings(updated);
    setSettings(updated);
  };

  const handleRevoke = (sessionId: string) => {
    const success = revokeSession(sessionId);
    if (success) {
      setSessions(getActiveSessions());
      setFeedback('Active session successfully revoked.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Mobile Phone': return Smartphone;
      case 'Tablet': return Tablet;
      case 'Laptop': return Laptop;
      default: return Monitor;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white dark:bg-industrial-900 border border-industrial-200 dark:border-industrial-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-industrial-200 dark:border-industrial-700 bg-industrial-50/70 dark:bg-industrial-850/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-xl">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-industrial-900 dark:text-white flex items-center gap-2">
                <span>Remote / Emergency Web Access Governance</span>
                {settings.remoteAccessEnabled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    ENABLED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                    DISABLED
                  </span>
                )}
              </h3>
              <p className="text-xs text-industrial-500 dark:text-industrial-400">
                Configure corporate network boundaries, active concurrent sessions, and tamper-evident authentication logs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-industrial-400 hover:text-industrial-800 dark:hover:text-white bg-white dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-brand-600 text-white shadow-xs font-bold'
                : 'text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100'
            }`}
          >
            Access Policy Settings
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-brand-600 text-white shadow-xs font-bold'
                : 'text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100'
            }`}
          >
            Active Sessions ({sessions.filter(s => !s.isRevoked).length})
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'audits'
                ? 'bg-brand-600 text-white shadow-xs font-bold'
                : 'text-industrial-600 dark:text-industrial-400 hover:bg-industrial-100'
            }`}
          >
            Login Audits ({audits.length})
          </button>
        </div>

        {/* Notification message */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-industrial-900 dark:text-white">
                      Secure Remote Web Ingress
                    </h4>
                    <p className="text-xs text-industrial-500">
                      When enabled, allows authorized personnel to access EMIS outside the refinery local intranet via HTTPS reverse proxy.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleRemote}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.remoteAccessEnabled ? 'bg-brand-600' : 'bg-industrial-300 dark:bg-industrial-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.remoteAccessEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-industrial-900 dark:text-white">
                      Emergency Bypass for Lead Engineers
                    </h4>
                    <p className="text-xs text-industrial-500">
                      Permits emergency login bypass for critical breakdown work orders during network disruptions.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleEmergencyBypass}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.allowEmergencyBypass ? 'bg-brand-600' : 'bg-industrial-300 dark:bg-industrial-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.allowEmergencyBypass ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Security Boundary Notice */}
              <div className="p-4 bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 rounded-xl text-xs space-y-2">
                <span className="font-bold text-industrial-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Port 13 Hardened Architecture Pipeline</span>
                </span>
                <p className="text-industrial-600 dark:text-industrial-400">
                  Direct database exposure to the public Internet is strictly forbidden. All requests pass through:
                </p>
                <div className="p-2 bg-white dark:bg-industrial-900 rounded-lg font-mono text-[11px] text-brand-600 dark:text-brand-400">
                  Client &rarr; HTTPS (TLS 1.3) &rarr; Port 3000 Reverse Proxy &rarr; Authentication &rarr; RBAC &rarr; Internal Ledger DB
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              {sessions.filter(s => !s.isRevoked).length === 0 ? (
                <div className="p-8 text-center text-industrial-400 text-xs">
                  No active remote sessions currently registered.
                </div>
              ) : (
                sessions.filter(s => !s.isRevoked).map(sess => {
                  const Icon = getDeviceIcon(sess.deviceType);
                  return (
                    <div
                      key={sess.sessionId}
                      className="p-4 bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl flex items-center justify-between gap-4 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-industrial-900 dark:text-white">
                              {sess.userName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300">
                              {sess.userRole}
                            </span>
                          </div>
                          <p className="text-industrial-500 font-mono text-[11px] mt-0.5">
                            IP: {sess.ipAddress} • {sess.browser} on {sess.platform}
                          </p>
                          <span className="text-[10px] text-industrial-400 font-mono block">
                            Logged in: {new Date(sess.loginTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevoke(sess.sessionId)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: LOGIN AUDITS */}
          {activeTab === 'audits' && (
            <div className="space-y-3">
              {audits.length === 0 ? (
                <div className="p-8 text-center text-industrial-400 text-xs">
                  No login audit entries logged yet.
                </div>
              ) : (
                <div className="bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-700 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-industrial-50 dark:bg-industrial-900 text-industrial-500 uppercase text-[10px] tracking-wider border-b border-industrial-200 dark:border-industrial-700">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">User / Account</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3">IP Address</th>
                          <th className="py-2.5 px-3">Device & Browser</th>
                          <th className="py-2.5 px-3">Reason / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                        {audits.map(audit => (
                          <tr key={audit.id} className="hover:bg-industrial-50/50 dark:hover:bg-industrial-800/40">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-industrial-400">
                              {new Date(audit.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-industrial-900 dark:text-white">
                              {audit.username}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                audit.success
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}>
                                {audit.success ? 'SUCCESS' : 'DENIED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-industrial-600 dark:text-industrial-300">
                              {audit.ipAddress}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-industrial-500">
                              {audit.deviceType} • {audit.browser}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-industrial-500">
                              {audit.failureReason || 'Authorized Session'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
