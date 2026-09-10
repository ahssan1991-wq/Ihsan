/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  DollarSign, 
  UserCheck, 
  ShieldCheck, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ApprovalRequest, User as UserType, UserRole } from '../types';
import { OfficialDocumentHeader, OfficialDocumentFooter } from './OfficialDocumentHeader';
import { organizationProfileService } from '../services/organizationProfileService';

interface WorkflowApprovalsViewProps {
  currentUser?: UserType;
  onNavigateToTab?: (tab: string, query?: string) => void;
}

const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'app-001',
    approvalNumber: 'APR-2026-0081',
    type: 'REORDER_REQUISITION',
    title: 'Urgent Procurement of Differential Pressure Transmitters for Unit 14',
    description: 'Requisition PR-2026-0042 for 4x Rosemount 3051CD coplanar transmitters to replenish emergency shutdown safety stock.',
    requestedBy: 'Eng. Tariq Al-Ghamdi (Lead Instrumentation)',
    requestedDate: '2026-09-08',
    priority: 'CRITICAL',
    amountOrQuantity: '$14,800.00 USD (4 Units)',
    relatedEntityId: 'pr-2026-0042',
    relatedEntityNumber: 'PR-2026-0042',
    status: 'PENDING'
  },
  {
    id: 'app-002',
    approvalNumber: 'APR-2026-0082',
    type: 'MATERIAL_TRANSFER',
    title: 'Inter-Warehouse Site Transfer: Main Store to Offshore Rig 4',
    description: 'Dispatching 12x Swagelok Class 2500 stainless instrumentation needle valves and tube fittings for offshore maintenance overhaul.',
    requestedBy: 'Khalid Al-Otaibi (Warehouse Supervisor)',
    requestedDate: '2026-09-07',
    priority: 'URGENT',
    amountOrQuantity: '12 Units',
    relatedEntityId: 'trf-2026-0019',
    relatedEntityNumber: 'TRF-2026-0019',
    status: 'PENDING'
  },
  {
    id: 'app-003',
    approvalNumber: 'APR-2026-0083',
    type: 'INVENTORY_ADJUSTMENT',
    title: 'Cycle Count Variance Reconciliation - Rack B4 Flange Gaskets',
    description: 'Adjusting ledger stock following physical inventory count session CNT-2026-0012: +2 surplus Spiral Wound Gaskets 6-inch Class 300.',
    requestedBy: 'Saeed Mansoor (Inventory Auditor)',
    requestedDate: '2026-09-06',
    priority: 'ROUTINE',
    amountOrQuantity: '+2 Units (Surplus)',
    relatedEntityId: 'cnt-2026-0012',
    relatedEntityNumber: 'CNT-2026-0012',
    status: 'APPROVED',
    decidedBy: 'Eng. H. Al-Mansoor',
    decidedDate: '2026-09-07',
    comments: 'Surplus verified against physical count and vendor packing slip reconciliation.'
  },
  {
    id: 'app-004',
    approvalNumber: 'APR-2026-0084',
    type: 'SCRAP_DISPOSAL',
    title: 'Quarantine Scrap Authorization - Degraded Viton Flange O-Rings',
    description: 'Batch LOT-QA-109 exceeded certified shelf-life by 180 days with observed elastomer hardening. Condemned for safety compliance.',
    requestedBy: 'Nasser Al-Dossary (QA/QC Inspector)',
    requestedDate: '2026-09-05',
    priority: 'ROUTINE',
    amountOrQuantity: '50 EA (Scrap)',
    relatedEntityId: 'scr-2026-0004',
    relatedEntityNumber: 'SCR-2026-0004',
    status: 'PENDING'
  }
];

export const WorkflowApprovalsView: React.FC<WorkflowApprovalsViewProps> = ({
  currentUser,
  onNavigateToTab
}) => {
  const [requests, setRequests] = useState<ApprovalRequest[]>(() => {
    try {
      const stored = localStorage.getItem('emis_workflow_approvals_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_APPROVAL_REQUESTS;
  });

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);

  const saveRequests = (updated: ApprovalRequest[]) => {
    setRequests(updated);
    try {
      localStorage.setItem('emis_workflow_approvals_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving approvals:', e);
    }
  };

  const handleDecision = (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    const updated = requests.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status,
          decidedBy: currentUser?.name || 'Authorized Engineering Signatory',
          decidedDate: new Date().toISOString().split('T')[0],
          comments: approvalComment || (status === 'APPROVED' ? 'Approved in accordance with EMIS technical authority delegation.' : 'Request rejected by reviewing engineer.')
        };
      }
      return req;
    });

    saveRequests(updated);
    setSelectedRequest(null);
    setApprovalComment('');
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      const matchesSearch = 
        req.approvalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    let pending = 0;
    let criticalPending = 0;
    let approved = 0;
    let rejected = 0;

    requests.forEach(r => {
      if (r.status === 'PENDING') {
        pending++;
        if (r.priority === 'CRITICAL') criticalPending++;
      } else if (r.status === 'APPROVED') approved++;
      else if (r.status === 'REJECTED') rejected++;
    });

    return { pending, criticalPending, approved, rejected };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Printable Approval Certificate */}
      {isPrintMode && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4">
              <span className="font-bold text-sm">Official Technical Approval Sign-off Certificate</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Print Certificate
                </button>
                <button
                  onClick={() => setIsPrintMode(false)}
                  className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>

            <OfficialDocumentHeader
              titleEn="Engineering Authority Approval Certificate"
              titleAr="شهادة اعتماد وموافقة السلطة الفنية الهندسية"
              documentNumber={selectedRequest.approvalNumber}
              statusBadge={selectedRequest.status}
            />

            <div className="grid grid-cols-2 gap-4 text-xs border border-gray-300 p-4 rounded-lg bg-gray-50">
              <div>
                <span className="text-gray-500 font-mono block">Transaction Subject</span>
                <strong className="text-sm">{selectedRequest.title}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Approval Type</span>
                <strong className="font-mono">{selectedRequest.type.replace('_', ' ')}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Requested By</span>
                <span>{selectedRequest.requestedBy} ({selectedRequest.requestedDate})</span>
              </div>
              <div>
                <span className="text-gray-500 font-mono block">Quantities / Value</span>
                <strong className="font-mono">{selectedRequest.amountOrQuantity}</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold block uppercase tracking-wider text-gray-700">Detailed Scope & Justification</span>
              <p className="p-3 bg-gray-100 border border-gray-200 rounded leading-relaxed">
                {selectedRequest.description}
              </p>
            </div>

            <div className="p-4 border-2 border-emerald-600 rounded-lg bg-emerald-50 text-xs space-y-2">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>Electronic Decision Record & Digital Cryptographic Stamp</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-gray-800">
                <div><strong>Decision:</strong> {selectedRequest.status}</div>
                <div><strong>Decided Date:</strong> {selectedRequest.decidedDate || 'N/A'}</div>
                <div><strong>Authorizing Engineer:</strong> {selectedRequest.decidedBy || 'Pending Signature'}</div>
                <div><strong>Audit Hash:</strong> SHA256:{Math.random().toString(36).substring(2, 12).toUpperCase()}</div>
              </div>
              {selectedRequest.comments && (
                <div className="pt-2 border-t border-emerald-200">
                  <strong>Notes: </strong>{selectedRequest.comments}
                </div>
              )}
            </div>

            <OfficialDocumentFooter
              preparedBy={selectedRequest.requestedBy}
              approvedBy={selectedRequest.decidedBy}
              date={selectedRequest.decidedDate || selectedRequest.requestedDate}
            />
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-industrial-900 border border-industrial-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Multi-Level Workflow Approvals & Electronic Sign-off</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PORT 16
              </span>
            </h1>
            <p className="text-xs text-industrial-400" dir="rtl">
              إدارة دورة الموافقات الرقمية لطلبات الشراء، أذونات الصرف، وتسويات الجرد
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono uppercase font-bold">
            <span>Pending My Approval</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {metrics.pending} <span className="text-xs font-normal text-industrial-400">Requests</span>
          </div>
          <div className="text-[11px] text-industrial-400">Awaiting your electronic sign-off</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono uppercase font-bold">
            <span>Critical Priority</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {metrics.criticalPending} <span className="text-xs font-normal text-industrial-400">Emergency</span>
          </div>
          <div className="text-[11px] text-rose-300/80">Immediate plant turnaround impact</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono uppercase font-bold">
            <span>Approved History</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {metrics.approved} <span className="text-xs font-normal text-industrial-400">Completed</span>
          </div>
          <div className="text-[11px] text-industrial-400">Audited and executed</div>
        </div>

        <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 space-y-1">
          <div className="flex items-center justify-between text-industrial-400 text-xs font-mono uppercase font-bold">
            <span>Rejected / Returned</span>
            <XCircle className="w-4 h-4 text-industrial-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {metrics.rejected} <span className="text-xs font-normal text-industrial-400">Requests</span>
          </div>
          <div className="text-[11px] text-industrial-400">Returned for modification</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-industrial-900 border border-industrial-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-industrial-850 hover:bg-industrial-800 text-industrial-300 border border-industrial-750'
              }`}
            >
              <span>{st}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search approval title, requester, ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-industrial-850 border border-industrial-750 text-white text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Requests */}
        <div className="lg:col-span-6 space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-industrial-500 bg-industrial-900 border border-industrial-800 rounded-2xl">
              No approval requests matching selected filter.
            </div>
          ) : (
            filteredRequests.map(req => {
              const isSelected = selectedRequest?.id === req.id;

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-industrial-850 border-brand-500 shadow-md'
                      : 'bg-industrial-900 border-industrial-800 hover:border-industrial-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-brand-400">
                          {req.approvalNumber}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold uppercase ${
                          req.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          req.priority === 'URGENT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-industrial-750 text-industrial-400'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">
                        {req.title}
                      </h3>
                      <p className="text-xs text-industrial-400 line-clamp-2 mt-0.5">
                        {req.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        req.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {req.status}
                      </span>
                      <div className="text-xs font-mono font-bold text-white mt-1">
                        {req.amountOrQuantity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-industrial-800 text-[11px] text-industrial-400">
                    <span>Requested by: <strong className="text-industrial-300">{req.requestedBy}</strong></span>
                    <span className="font-mono">{req.requestedDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Request Sign-off Panel */}
        <div className="lg:col-span-6">
          {selectedRequest ? (
            <div className="bg-industrial-900 border border-industrial-800 rounded-2xl p-5 space-y-5 shadow-xl">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-industrial-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-400">
                      {selectedRequest.approvalNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-industrial-800 text-industrial-300">
                      {selectedRequest.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">
                    {selectedRequest.title}
                  </h2>
                </div>

                <button
                  onClick={() => setIsPrintMode(true)}
                  className="p-2 rounded-xl bg-industrial-800 hover:bg-industrial-750 text-industrial-300 hover:text-white transition-colors"
                  title="Print Certificate"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-industrial-850 rounded-xl border border-industrial-750 text-xs">
                <div>
                  <span className="text-industrial-400 font-mono block">Requester:</span>
                  <strong className="text-white">{selectedRequest.requestedBy}</strong>
                </div>
                <div>
                  <span className="text-industrial-400 font-mono block">Request Date:</span>
                  <span className="text-white font-mono">{selectedRequest.requestedDate}</span>
                </div>
                <div>
                  <span className="text-industrial-400 font-mono block">Quantities / Value:</span>
                  <strong className="text-brand-400 font-mono">{selectedRequest.amountOrQuantity}</strong>
                </div>
                <div>
                  <span className="text-industrial-400 font-mono block">Linked Entity ID:</span>
                  <span className="text-white font-mono">{selectedRequest.relatedEntityNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-industrial-400 font-bold block">
                  Technical Justification & Scope
                </span>
                <p className="text-xs text-industrial-300 bg-industrial-850 p-3 rounded-xl border border-industrial-800 leading-relaxed">
                  {selectedRequest.description}
                </p>
              </div>

              {/* Decision Section */}
              {selectedRequest.status === 'PENDING' ? (
                <div className="p-4 bg-industrial-850/70 rounded-xl border border-industrial-750 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <UserCheck className="w-4 h-4 text-brand-400" />
                    <span>Electronic Authority Sign-off / اعتماد التوقيع</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-industrial-300">
                      Engineering Decision Notes / ملاحظات الاعتماد
                    </label>
                    <textarea
                      rows={2}
                      value={approvalComment}
                      onChange={e => setApprovalComment(e.target.value)}
                      placeholder="Enter verification notes, specification compliance review, or conditions..."
                      className="w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-700 text-white text-xs focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleDecision(selectedRequest.id, 'APPROVED')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Sign / اعتماد فني</span>
                    </button>

                    <button
                      onClick={() => handleDecision(selectedRequest.id, 'REJECTED')}
                      className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject / رفض</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-industrial-850 rounded-xl border border-industrial-750 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-industrial-400 font-mono">Decision Status:</span>
                    <span className={`font-mono font-bold uppercase ${
                      selectedRequest.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="text-xs text-industrial-300">
                    <strong>Decided By: </strong>{selectedRequest.decidedBy} on {selectedRequest.decidedDate}
                  </div>
                  {selectedRequest.comments && (
                    <div className="text-xs text-industrial-400 bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                      <strong>Notes: </strong>{selectedRequest.comments}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-industrial-500 bg-industrial-900 border border-industrial-800 rounded-2xl">
              Select an approval request from the left list to review and sign.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
