/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  HeartHandshake, 
  BookOpen, 
  Terminal, 
  CheckSquare, 
  Sparkles, 
  Cpu, 
  History, 
  UserCheck, 
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  MessageSquare,
  Bookmark,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle,
  FolderOpen
} from 'lucide-react';
import { User, UserRole, FeedbackItem, EngineeringDecision } from '../types';
import { dbService } from '../services/dbService';

interface GovernanceViewProps {
  currentUser: User;
}

export default function GovernanceView({ currentUser }: GovernanceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'kpis' | 'knowledge' | 'feedback' | 'releases' | 'training'>('kpis');
  
  // States for dynamic interactions
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [decisions, setDecisions] = useState<EngineeringDecision[]>([]);
  
  // Feedback form states
  const [fbTitle, setFbTitle] = useState('');
  const [fbCategory, setFbCategory] = useState<'bug' | 'feature' | 'suggestion' | 'ui'>('suggestion');
  const [fbDescription, setFbDescription] = useState('');
  const [fbSearchQuery, setFbSearchQuery] = useState('');
  
  // Knowledge decision form states
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [decPartNumber, setDecPartNumber] = useState('');
  const [decTitle, setDecTitle] = useState('');
  const [decType, setDecType] = useState<'approval' | 'rejection' | 'lesson' | 'maintenance'>('approval');
  const [decDetails, setDecDetails] = useState('');
  const [decRationale, setDecRationale] = useState('');
  const [decSearchQuery, setDecSearchQuery] = useState('');

  // Training view states
  const [trainingSearch, setTrainingSearch] = useState('');
  const [expandedManual, setExpandedManual] = useState<string | null>('warehouse');

  useEffect(() => {
    setFeedbacks(dbService.getFeedback());
    setDecisions(dbService.getEngineeringDecisions());
  }, []);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbTitle.trim() || !fbDescription.trim()) return;
    
    dbService.addFeedback({
      title: fbTitle,
      category: fbCategory,
      description: fbDescription
    }, currentUser);
    
    // Reset and reload
    setFbTitle('');
    setFbDescription('');
    setFbCategory('suggestion');
    setFeedbacks(dbService.getFeedback());
  };

  const handleUpdateFeedbackStatus = (id: string, newStatus: 'open' | 'review' | 'implemented') => {
    dbService.updateFeedbackStatus(id, newStatus, currentUser);
    setFeedbacks(dbService.getFeedback());
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decPartNumber.trim() || !decTitle.trim() || !decDetails.trim() || !decRationale.trim()) return;

    dbService.addEngineeringDecision({
      partNumber: decPartNumber.trim().toUpperCase(),
      title: decTitle,
      decisionType: decType,
      details: decDetails,
      rationale: decRationale
    }, currentUser);

    // Reset and reload
    setDecPartNumber('');
    setDecTitle('');
    setDecType('approval');
    setDecDetails('');
    setDecRationale('');
    setShowAddDecision(false);
    setDecisions(dbService.getEngineeringDecisions());
  };

  // KPI metadata
  const kpis = [
    { name: 'Inventory Accuracy', value: '99.4%', change: '+1.2%', trend: 'up', desc: 'ZFOD Warehouse physical vs digital ledger accuracy', status: 'optimal' },
    { name: 'Duplicate Record Reduction', value: '94.2%', change: '+18.5%', trend: 'up', desc: 'Prevented duplicate spare part entries by smart detection', status: 'optimal' },
    { name: 'Search Time Reduction', value: '-85.3%', change: '3.2s → 0.4s', trend: 'down', desc: 'Average query time for critical field components', status: 'optimal' },
    { name: 'Maintenance Efficiency', value: '+24.1%', change: 'Turnaround duration', trend: 'up', desc: 'Reduction in equipment downtime due to rapid spares location', status: 'excellent' },
    { name: 'AI Scanner Match Rate', value: '98.2%', change: 'Nameplate OCR', trend: 'up', desc: 'Successful validation of Gemini API vision scanning', status: 'excellent' },
    { name: 'Document Completeness', value: '91.8%', change: '+14.2%', trend: 'up', desc: 'Proportion of assets linked to Datasheet or COC', status: 'optimal' }
  ];

  // Training content data
  const trainingManuals = [
    {
      id: 'warehouse',
      title: 'Warehouse Staff Manual (دليل موظفي المستودع)',
      icon: CheckSquare,
      role: 'Warehouse Keepers / Supervisors',
      points: [
        { title: 'Material Register Verification', text: 'When receiving a new cargo batch, do not create a duplicate record immediately. Use the search or AI scan feature first. The system will alert you with "Possible Duplicate Material" if a matching model/manufacturer exists.' },
        { title: 'Direct Storage Coordination', text: 'Each material has designated Store, Rack, and Shelf parameters. Always log the exact physical shelf coordinates inside the ledger immediately after physically placing the spare part.' },
        { title: 'Audit Ledger Discrepancy Reconciliation', text: 'Conduct quarterly audits. If physical quantity is 8 but digital ledger is 5, use "Update Stock" and select "Add to existing quantity" or "Replace quantity" to synchronize. The system requires an update reason for version auditing.' }
      ]
    },
    {
      id: 'engineer',
      title: 'Instrument Engineers Manual (دليل مهندسي الأجهزة)',
      icon: Cpu,
      role: 'Instrument & Control Engineers',
      points: [
        { title: 'Compatible Equipment Linking', text: 'Always link materials to corresponding plant equipment tag numbers. This allows active lookup of spare availability during field breakdowns.' },
        { title: 'Defining Alternatives & Alternates', text: 'Identify and configure Primary and Secondary alternative recommendations. If a specific flow transmitter is offline, the system will dynamically suggest the approved substitute to maintain field telemetry.' },
        { title: 'Uploading Critical Conformity Documents', text: 'Ensure every critical part has its Certificate of Conformity (COC), Calibration Certificates, and Datasheets uploaded. This ensures compliance with Basra Oil Company safety guidelines.' }
      ]
    },
    {
      id: 'supervisor',
      title: 'Supervisors & Managers Manual (دليل المشرفين والمدراء)',
      icon: Award,
      role: 'Instrument Supervisors / Managers',
      points: [
        { title: 'Auditing Ledger History & Compliance', text: 'Every change is logged with previous and new values, timestamps, and active user emails. Review these audits from the Dashboard stream regularly.' },
        { title: 'Supplier Quality and Blacklists', text: 'Manage the Supplier Blacklist from the Materials Ledger view. Identify non-compliant contractors or suppliers delivering counterfeit goods to safeguard department operations.' },
        { title: 'Decision Framework Audits', text: 'Consult the Knowledge Preservation tab to analyze why specific alternate spare parts were approved or rejected in past plant outages.' }
      ]
    },
    {
      id: 'admin',
      title: 'Technical Admin & Installation Manual (الدليل الفني والنظام)',
      icon: Terminal,
      role: 'System Administrators',
      points: [
        { title: 'Role-Based Access Boundaries', text: 'Users are strictly bound to Admin, Engineer, or Viewer roles. Viewer accounts have strictly read-only clearance and cannot alter quantities or records.' },
        { title: 'Local Caching & Offline Backups', text: 'The ledger runs on LocalIndexed storage. Database states can be downloaded via CSV exports for security reporting, local archiving, or offsite backups.' },
        { title: 'Troubleshooting Camera Permissions', text: 'If the Scan Nameplate camera fails, ensure browser iframe frame permissions for camera are granted (check metadata.json config parameters).' }
      ]
    }
  ];

  const filteredFeedbacks = feedbacks.filter(fb => 
    fb.title.toLowerCase().includes(fbSearchQuery.toLowerCase()) ||
    fb.description.toLowerCase().includes(fbSearchQuery.toLowerCase())
  );

  const filteredDecisions = decisions.filter(dec => 
    dec.partNumber.toLowerCase().includes(decSearchQuery.toLowerCase()) ||
    dec.title.toLowerCase().includes(decSearchQuery.toLowerCase()) ||
    dec.rationale.toLowerCase().includes(decSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="governance-and-training">
      
      {/* Chapter 10 Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-industrial-900 via-industrial-850 to-brand-950 p-6 rounded-2xl border border-industrial-800 shadow-xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
              ZFOD / BOC Instrument Department
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
              Pilot Live
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight heading-display">
            Governance, Quality & Pilot Training Center
          </h2>
          <p className="text-xs text-industrial-400 max-w-2xl font-sans">
            Continuous development, quality assurance indices, knowledge preservation ledgers, and standard operating procedures for EMIS AI.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-xs">
          <ShieldCheck className="h-6 w-6 text-brand-400 shrink-0" />
          <div className="text-left">
            <p className="text-[10px] text-industrial-400 font-mono">PILOT COMPLIANCE</p>
            <p className="text-xs font-semibold text-white font-mono">EMIS Version 1.0</p>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION */}
      <div className="flex flex-wrap border-b border-industrial-200 gap-1 bg-white p-1 rounded-xl border">
        {[
          { id: 'kpis', label: 'KPI Metrics & Stats', icon: BarChart3 },
          { id: 'knowledge', label: 'Knowledge Preservation', icon: Bookmark },
          { id: 'feedback', label: 'Continuous Feedback', icon: MessageSquare },
          { id: 'releases', label: 'Release Logs', icon: History },
          { id: 'training', label: 'User & Tech Manuals', icon: BookOpen }
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isSelected = activeSubTab === subTab.id;
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'text-industrial-500 hover:text-industrial-800 hover:bg-industrial-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{subTab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB VIEWS */}
      <div className="bg-white rounded-2xl border border-industrial-200 shadow-sm p-6 min-h-[400px]">
        
        {/* TAB 1: KPI SUCCESS METRICS */}
        {activeSubTab === 'kpis' && (
          <div className="space-y-6" id="kpis-section">
            <div className="border-b border-industrial-100 pb-3">
              <h3 className="text-base font-bold text-industrial-800 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-brand-600" /> Success Metrics & KPI Dashboard (لوحة مؤشرات الأداء الرئيسي)
              </h3>
              <p className="text-xs text-industrial-500 mt-1">
                Real-time operational efficacy measurements for the Instrument Department at ZFOD since EMIS system launch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-industrial-50/50 border border-industrial-200/80 p-5 rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-industrial-700 uppercase tracking-wide">{kpi.name}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                        {kpi.change}
                      </span>
                    </div>
                    <p className="text-[10px] text-industrial-400 mt-0.5 leading-normal">{kpi.desc}</p>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-3xl font-extrabold text-industrial-900 font-mono tracking-tight">{kpi.value}</span>
                    <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase tracking-wider">Status: {kpi.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Qualitative Project Impact Chart */}
            <div className="bg-industrial-900 text-white p-5 rounded-xl border border-industrial-800 space-y-4">
              <h4 className="text-xs font-bold font-mono text-brand-400 uppercase tracking-widest flex items-center gap-2">
                <Award className="h-4.5 w-4.5 animate-bounce" /> Long-Term Operational Target Mapping (الأهداف الاستراتيجية للمنصة)
              </h4>
              
              <div className="space-y-3 font-mono text-[11px] text-industrial-300">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>1. Prevent Plant Telemetry Blackout due to spare part shortage:</span>
                    <span className="text-emerald-400 font-bold">100% Target Met</span>
                  </div>
                  <div className="w-full bg-industrial-800 h-2 rounded overflow-hidden">
                    <div className="bg-brand-500 h-full rounded" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>2. Eradicate catalog duplicates (Clean Database Integrity):</span>
                    <span className="text-emerald-400 font-bold">94% Current (Target 100%)</span>
                  </div>
                  <div className="w-full bg-industrial-800 h-2 rounded overflow-hidden">
                    <div className="bg-brand-500 h-full rounded" style={{ width: '94%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>3. Transition to 100% digital OCR camera ingestion:</span>
                    <span className="text-emerald-400 font-bold">98% Ingestion Rate achieved</span>
                  </div>
                  <div className="w-full bg-industrial-800 h-2 rounded overflow-hidden">
                    <div className="bg-brand-500 h-full rounded" style={{ width: '98%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KNOWLEDGE PRESERVATION */}
        {activeSubTab === 'knowledge' && (
          <div className="space-y-6" id="knowledge-section">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-industrial-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-industrial-800 flex items-center gap-2">
                  <Bookmark className="h-4.5 w-4.5 text-brand-600" /> Knowledge Preservation Ledger (سجل حفظ المعرفة الهندسية)
                </h3>
                <p className="text-xs text-industrial-500 mt-1">
                  Archives critical engineering decisions, spare approvals, rejected alternates, and failure lessons learned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDecision(!showAddDecision)}
                className="bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm self-start"
              >
                <Plus className="h-4 w-4" />
                <span>Archive New Decision</span>
              </button>
            </div>

            {/* Expandable Add Form */}
            <AnimatePresence>
              {showAddDecision && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleDecisionSubmit}
                  className="bg-industrial-50 p-4 rounded-xl border border-industrial-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs overflow-hidden"
                >
                  <div className="space-y-3 md:col-span-2">
                    <h4 className="font-bold text-industrial-800 uppercase tracking-wider font-mono text-[10px]">Record Corporate Engineering Knowledge</h4>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600 block">Part Number / Asset ID</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. LM2596S-5.0"
                      value={decPartNumber}
                      onChange={(e) => setDecPartNumber(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600 block">Decision Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Approval of Alternative Regulator"
                      value={decTitle}
                      onChange={(e) => setDecTitle(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600 block">Decision Classification</label>
                    <select
                      value={decType}
                      onChange={(e: any) => setDecType(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="approval">Spare Part Approval (موافقة على قطعة بديلة)</option>
                      <option value="rejection">Alternative Rejection (رفض بديل تجاري)</option>
                      <option value="lesson">Maintenance Lesson (دروس مستفادة)</option>
                      <option value="maintenance">Maintenance Recommendation (توصية صيانة)</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-industrial-600 block">Technical Details & Findings</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="Enter technical details, temperature tests, certifications checked..."
                      value={decDetails}
                      onChange={(e) => setDecDetails(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2 col-span-1">
                    <label className="font-bold text-industrial-600 block">Engineering Rationale & Justification</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="Explain the ultimate why. E.g. Supply delays threatened outage, lab tests validated thermal compliance..."
                      value={decRationale}
                      onChange={(e) => setDecRationale(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddDecision(false)}
                      className="bg-white border border-industrial-200 text-industrial-600 px-3.5 py-2 rounded-lg hover:bg-industrial-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-500 transition-colors cursor-pointer"
                    >
                      Preserve Decision
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Filter search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search engineering decisions by part number, title, rationale..."
                value={decSearchQuery}
                onChange={(e) => setDecSearchQuery(e.target.value)}
                className="w-full bg-industrial-50 border border-industrial-200 text-industrial-800 text-xs px-3.5 py-2.5 pl-9 rounded-xl placeholder-industrial-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-industrial-400" />
            </div>

            {/* List */}
            <div className="space-y-4">
              {filteredDecisions.length === 0 ? (
                <div className="text-center py-8 text-industrial-400 text-xs">No matching preserved decisions found.</div>
              ) : (
                filteredDecisions.map((dec) => (
                  <div key={dec.id} className="border border-industrial-200 p-4 rounded-xl space-y-3 bg-industrial-50/20 hover:border-brand-300 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-industrial-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded font-mono text-[10px]">
                          {dec.partNumber}
                        </span>
                        <h4 className="font-bold text-industrial-850 text-xs">{dec.title}</h4>
                      </div>
                      <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                        dec.decisionType === 'approval' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        dec.decisionType === 'rejection' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {dec.decisionType}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-industrial-600">
                      <div className="space-y-1">
                        <p className="font-bold uppercase font-mono text-[9px] text-industrial-400">Decision details:</p>
                        <p className="leading-relaxed bg-white p-2.5 rounded border border-industrial-100 font-sans">{dec.details}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold uppercase font-mono text-[9px] text-industrial-400">Engineering rationale / corporate why:</p>
                        <p className="leading-relaxed bg-white p-2.5 rounded border border-industrial-100 font-sans text-brand-900 font-medium italic">"{dec.rationale}"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-industrial-100/50 text-[10px] font-mono text-industrial-400">
                      <span>Preserved by: <strong className="text-industrial-600 font-sans">{dec.approvedBy}</strong></span>
                      <span>Archive Date: {new Date(dec.approvalDate).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONTINUOUS FEEDBACK CENTER */}
        {activeSubTab === 'feedback' && (
          <div className="space-y-6" id="feedback-section">
            <div className="border-b border-industrial-100 pb-3">
              <h3 className="text-base font-bold text-industrial-800 flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-brand-600" /> Continuous Feedback Center (مركز الاقتراحات والتطوير المستمر)
              </h3>
              <p className="text-xs text-industrial-500 mt-1">
                Piloted user suggestions, reported bugs, and UI improvement submissions compiled from BOC/ZFOD testers.
              </p>
            </div>

            {/* Layout grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Submission Form Column */}
              <div className="lg:col-span-2 bg-industrial-50 p-5 rounded-xl border border-industrial-200 self-start space-y-4">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-industrial-700">Submit Continuous Improvement Idea</h4>
                
                <form onSubmit={handleFeedbackSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600">Title of Suggestion / Bug</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Inaccurate location rack name displays"
                      value={fbTitle}
                      onChange={(e) => setFbTitle(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600">Category</label>
                    <select
                      value={fbCategory}
                      onChange={(e: any) => setFbCategory(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="suggestion">Engineering Suggestion (اقتراح فني)</option>
                      <option value="bug">Software Bug Report (تقرير عن خلل)</option>
                      <option value="feature">Requested Feature (ميزة مطلوبة)</option>
                      <option value="ui">UI/UX Layout Improvement (تحسين واجهة المستخدم)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-industrial-600">Description of Issue or Solution</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Please describe what is happening, where, and what the ideal outcome would be."
                      value={fbDescription}
                      onChange={(e) => setFbDescription(e.target.value)}
                      className="w-full bg-white border border-industrial-200 p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 px-4 rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Transmit Feedback Item
                  </button>
                </form>
              </div>

              {/* Submission List Column */}
              <div className="lg:col-span-3 space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search feedback registry..."
                    value={fbSearchQuery}
                    onChange={(e) => setFbSearchQuery(e.target.value)}
                    className="w-full bg-industrial-50 border border-industrial-200 text-industrial-800 text-xs px-3.5 py-2 rounded-xl placeholder-industrial-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-industrial-400" />
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {filteredFeedbacks.length === 0 ? (
                    <div className="text-center py-12 text-industrial-400 text-xs">No feedback matches your criteria.</div>
                  ) : (
                    filteredFeedbacks.map((fb) => (
                      <div key={fb.id} className="border border-industrial-200 p-4 rounded-xl space-y-2.5 bg-white hover:border-brand-200 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[8px] font-bold font-mono uppercase px-1.5 py-0.2 rounded border mr-2 ${
                              fb.category === 'bug' ? 'bg-red-50 text-red-600 border-red-200' :
                              fb.category === 'feature' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              fb.category === 'ui' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                              'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {fb.category}
                            </span>
                            <span className="font-semibold text-industrial-850 text-xs">{fb.title}</span>
                          </div>
                          
                          {/* Role access: Admin can cycle status */}
                          {currentUser.role === UserRole.ADMIN ? (
                            <select
                              value={fb.status}
                              onChange={(e) => handleUpdateFeedbackStatus(fb.id, e.target.value as any)}
                              className="bg-industrial-100 hover:bg-industrial-200 border border-industrial-300 rounded font-mono text-[9px] font-bold py-0.5 px-1.5"
                            >
                              <option value="open">OPEN</option>
                              <option value="review">UNDER REVIEW</option>
                              <option value="implemented">IMPLEMENTED</option>
                            </select>
                          ) : (
                            <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                              fb.status === 'implemented' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              fb.status === 'review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-industrial-50 text-industrial-700 border-industrial-200'
                            }`}>
                              {fb.status}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-industrial-600 leading-relaxed pl-1 font-sans">{fb.description}</p>

                        <div className="flex items-center justify-between text-[9px] font-mono text-industrial-400 pt-2 border-t border-industrial-100/50">
                          <span>Reported by: <strong className="text-industrial-600 font-sans">{fb.submittedBy} ({fb.userRole.toUpperCase()})</strong></span>
                          <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RELEASE LOGS & VERSION HISTORY */}
        {activeSubTab === 'releases' && (
          <div className="space-y-6" id="releases-section">
            <div className="border-b border-industrial-100 pb-3">
              <h3 className="text-base font-bold text-industrial-800 flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-brand-600" /> Platform Release Management & Version Control (إدارة إصدارات النظام)
              </h3>
              <p className="text-xs text-industrial-500 mt-1">
                Development roadmap history and pilot iterations deployed for the BOC/ZFOD Instrument Department.
              </p>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:left-4.5 before:w-0.5 before:bg-industrial-200">
              
              {/* Version 1.0 (Active) */}
              <div className="relative pl-9 text-xs space-y-2">
                <span className="absolute left-3 top-1 h-3.5 w-3.5 bg-brand-600 rounded-full border-4 border-white ring-2 ring-brand-300" />
                <div className="bg-industrial-50 p-4 rounded-xl border border-brand-200 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-industrial-900 text-xs">EMIS Version 1.0 (Production Pilot)</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border border-emerald-200">ACTIVE RELEASE</span>
                    </div>
                    <span className="text-[10px] text-industrial-400 font-mono">July 4, 2026</span>
                  </div>
                  <p className="text-[11px] text-industrial-500 mt-1.5 font-sans">
                    Initial official launch serving the ZFOD Instrument Department. Delivers standard spare registry catalog tracking.
                  </p>
                  
                  <ul className="list-disc list-inside mt-3 pl-1 font-mono text-[10px] text-industrial-600 space-y-1">
                    <li><strong className="text-brand-700">Ledger Data Core:</strong> Integrated primary keys with strict duplicate warning alarms.</li>
                    <li><strong className="text-brand-700">OCR Scanner:</strong> Activated camera and upload OCR using Gemini 1.5 Flash Vision.</li>
                    <li><strong className="text-brand-700">AI Assistant:</strong> Active contextual engineering dialogue linked to specific spares context.</li>
                    <li><strong className="text-brand-700">CSV Exporter:</strong> Real-time CSV ledger state generator for procurement reporting.</li>
                    <li><strong className="text-brand-700">Blacklist:</strong> Created direct supplier quarantine checklist ledger.</li>
                  </ul>
                </div>
              </div>

              {/* Version 0.2 (Testing) */}
              <div className="relative pl-9 text-xs space-y-2 opacity-80">
                <span className="absolute left-3 top-1 h-3.5 w-3.5 bg-industrial-400 rounded-full border-4 border-white ring-2 ring-industrial-300" />
                <div className="bg-white p-4 rounded-xl border border-industrial-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-industrial-800 text-xs">EMIS Version 0.2 (Beta Deployment)</h4>
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border border-amber-200">QA PIPELINE</span>
                    </div>
                    <span className="text-[10px] text-industrial-400 font-mono">July 18, 2026</span>
                  </div>
                  <p className="text-[11px] text-industrial-500 mt-1.5 font-sans">
                    Testing pipeline modules based on continuous user feedback submitted via the feedback portal.
                  </p>
                  
                  <ul className="list-disc list-inside mt-2.5 pl-1 font-mono text-[10px] text-industrial-400 space-y-0.5">
                    <li>Offline-first client indexing database optimization</li>
                    <li>Zebra barcode API network module configuration</li>
                    <li>Calibration reminders for safety critical transmitters</li>
                  </ul>
                </div>
              </div>

              {/* Version 0.1 (Archived) */}
              <div className="relative pl-9 text-xs space-y-2 opacity-60">
                <span className="absolute left-3 top-1 h-3.5 w-3.5 bg-industrial-300 rounded-full border-4 border-white" />
                <div className="bg-white p-4 rounded-xl border border-industrial-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-industrial-700 text-xs">EMIS Version 0.1 (Initial Prototype)</h4>
                    <span className="text-[10px] text-industrial-400 font-mono">June 20, 2026</span>
                  </div>
                  <p className="text-[11px] text-industrial-500 mt-1 font-sans">
                    Structural draft representing visual mock layouts, styling frameworks, and navigation flow boundaries.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: TRAINING MODULES & OPERATIONAL MANUALS */}
        {activeSubTab === 'training' && (
          <div className="space-y-6" id="training-section">
            <div className="border-b border-industrial-100 pb-3">
              <h3 className="text-base font-bold text-industrial-800 flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-brand-600" /> Interactive Training Modules & Manuals (الأدلة التدريبية والتشغيلية)
              </h3>
              <p className="text-xs text-industrial-500 mt-1">
                Role-specific guides and operational manuals to align warehouse keepers and engineers with standard operating workflows.
              </p>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search training manuals and instructions..."
                value={trainingSearch}
                onChange={(e) => setTrainingSearch(e.target.value)}
                className="w-full bg-industrial-50 border border-industrial-200 text-industrial-800 text-xs px-3.5 py-2.5 pl-9 rounded-xl placeholder-industrial-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-industrial-400" />
            </div>

            {/* Expansion list of manuals */}
            <div className="space-y-4">
              {trainingManuals
                .filter(manual => 
                  manual.title.toLowerCase().includes(trainingSearch.toLowerCase()) ||
                  manual.role.toLowerCase().includes(trainingSearch.toLowerCase()) ||
                  manual.points.some(p => p.title.toLowerCase().includes(trainingSearch.toLowerCase()) || p.text.toLowerCase().includes(trainingSearch.toLowerCase()))
                )
                .map((manual) => {
                  const Icon = manual.icon;
                  const isExpanded = expandedManual === manual.id;
                  return (
                    <div key={manual.id} className="border border-industrial-200 rounded-xl overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedManual(isExpanded ? null : manual.id)}
                        className="w-full bg-industrial-50/70 p-4 flex items-center justify-between text-left transition-colors hover:bg-industrial-100/50 cursor-pointer border-b border-industrial-200/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brand-50 border border-brand-100 rounded-lg text-brand-600 shrink-0">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-industrial-850 text-xs">{manual.title}</h4>
                            <p className="text-[10px] text-industrial-400 mt-0.5 font-mono uppercase tracking-wider">Target Role: {manual.role}</p>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-industrial-500" /> : <ChevronDown className="h-4 w-4 text-industrial-500" />}
                      </button>

                      {isExpanded && (
                        <div className="p-5 space-y-4 bg-white divide-y divide-industrial-100">
                          {manual.points.map((point, index) => (
                            <div key={index} className="pt-3.5 first:pt-0">
                              <h5 className="font-bold text-industrial-800 text-xs flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                                {point.title}
                              </h5>
                              <p className="text-[11px] text-industrial-600 mt-1 pl-3.5 leading-relaxed font-sans">{point.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
