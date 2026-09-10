/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCheck2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';
import { ApprovalRequest, EnterpriseTask, User as AppUser, UserRole } from '../../types';
import { dbService } from '../../services/dbService';

interface TaskApprovalCenterTabProps {
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const TaskApprovalCenterTab: React.FC<TaskApprovalCenterTabProps> = ({
  currentUser,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'APPROVALS' | 'TASKS'>('APPROVALS');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() => dbService.getApprovalRequests() || []);
  const [tasks, setTasks] = useState<EnterpriseTask[]>(() => dbService.getEnterpriseTasks() || []);

  // Decision Modal State
  const [selectedApprovalForDecision, setSelectedApprovalForDecision] = useState<ApprovalRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION'>('APPROVED');
  const [decisionComments, setDecisionComments] = useState('');

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'INSPECTION' | 'VERIFICATION' | 'DISPATCH' | 'CYCLE_COUNT' | 'EXPIRY_REVIEW'>('INSPECTION');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Senior Instrument Reviewer');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const refreshAll = () => {
    setApprovals(dbService.getApprovalRequests() || []);
    setTasks(dbService.getEnterpriseTasks() || []);
    onRefreshData();
  };

  const handleDecideApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalForDecision) return;

    dbService.decideApprovalRequest(
      selectedApprovalForDecision.id,
      decisionType,
      currentUser,
      decisionComments || `Decision recorded as ${decisionType}`
    );

    setSelectedApprovalForDecision(null);
    setDecisionComments('');
    refreshAll();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.createEnterpriseTask({
      title: newTaskTitle,
      description: newTaskDesc,
      category: newTaskCategory,
      priority: newTaskPriority,
      assignedTo: newTaskAssignee,
      assignedBy: currentUser.name,
      dueDate: newTaskDueDate || new Date(Date.now() + 86400000 * 3).toISOString(),
      relatedEntity: 'Material'
    }, currentUser);

    setShowNewTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    refreshAll();
  };

  const handleCompleteTask = (taskId: string) => {
    dbService.updateEnterpriseTask(taskId, { status: 'COMPLETED' }, currentUser);
    refreshAll();
  };

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const pastApprovals = approvals.filter(a => a.status !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* HEADER & TOP TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-industrial-850 p-4 rounded-xl border border-industrial-700">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            Enterprise Tasks & Approval Decision Center
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Unified inbox for engineering transfer approvals, material scrap requisitions, and operational SLA task tracking.
          </p>
        </div>

        <div className="flex items-center bg-industrial-900 p-1 rounded-lg border border-industrial-700">
          <button 
            onClick={() => setActiveTab('APPROVALS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'APPROVALS' ? 'bg-emerald-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Approvals Inbox ({pendingApprovals.length} Pending)
          </button>
          <button 
            onClick={() => setActiveTab('TASKS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'TASKS' ? 'bg-brand-600 text-white shadow' : 'text-industrial-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Action Tasks ({tasks.filter(t => t.status !== 'COMPLETED').length} Open)
          </button>
        </div>
      </div>

      {/* VIEW 1: APPROVALS INBOX */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-6">
          {/* PENDING APPROVALS SECTION */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Pending Action Required ({pendingApprovals.length})
            </h3>

            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 bg-industrial-850 rounded-xl border border-dashed border-industrial-700">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-industrial-200 font-semibold">Inbox Clear! All approval requests have been resolved.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map(app => (
                  <div key={app.id} className="p-4 bg-industrial-850 border border-amber-500/30 rounded-xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          {app.approvalNumber}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-300">
                          {app.type}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        app.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        app.priority === 'URGENT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-industrial-800 text-industrial-300'
                      }`}>
                        {app.priority}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{app.title}</h4>
                      <p className="text-xs text-industrial-300 mt-1">{app.description}</p>
                    </div>

                    <div className="p-2.5 bg-industrial-900/60 rounded-lg border border-industrial-750 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-industrial-400 block text-[10px]">Requested By</span>
                        <span className="text-white font-semibold">{app.requestedBy}</span>
                      </div>
                      <div>
                        <span className="text-industrial-400 block text-[10px]">Quantity / Scope</span>
                        <span className="text-brand-300 font-bold">{app.amountOrQuantity || '1 Transfer'}</span>
                      </div>
                      <div>
                        <span className="text-industrial-400 block text-[10px]">Date</span>
                        <span className="text-industrial-400">{new Date(app.requestedDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-700/60">
                      <button 
                        onClick={() => {
                          setSelectedApprovalForDecision(app);
                          setDecisionType('RETURNED_FOR_CORRECTION');
                        }}
                        className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-750 text-industrial-300 text-xs font-semibold rounded border border-industrial-700 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return for Correction
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedApprovalForDecision(app);
                          setDecisionType('REJECTED');
                        }}
                        className="px-3 py-1.5 bg-rose-950/40 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold rounded border border-rose-700/50 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedApprovalForDecision(app);
                          setDecisionType('APPROVED');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORICAL RESOLVED APPROVALS */}
          <div className="pt-4 border-t border-industrial-700">
            <h3 className="text-sm font-bold text-industrial-400 uppercase tracking-wider mb-3">
              Decision History ({pastApprovals.length})
            </h3>

            <div className="bg-industrial-850 border border-industrial-700 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left text-xs text-industrial-300">
                <thead className="bg-industrial-900/80 text-industrial-400 uppercase font-mono text-[11px] border-b border-industrial-700">
                  <tr>
                    <th className="py-3 px-4">Req #</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Decided By</th>
                    <th className="py-3 px-4">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-750 font-medium">
                  {pastApprovals.map(app => (
                    <tr key={app.id} className="hover:bg-industrial-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{app.approvalNumber}</td>
                      <td className="py-3 px-4">
                        <span className="text-white font-semibold">{app.title}</span>
                        {app.comments && <div className="text-[10px] text-industrial-400 italic mt-0.5">"{app.comments}"</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-industrial-400">{app.type}</td>
                      <td className="py-3 px-4">{app.requestedBy}</td>
                      <td className="py-3 px-4 text-industrial-300">{app.decidedBy || 'System Admin'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          app.status === 'REJECTED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {app.status}
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

      {/* VIEW 2: ACTION TASKS & SLA */}
      {activeTab === 'TASKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Enterprise Operational Action Tasks</h3>
            <button 
              onClick={() => setShowNewTaskModal(true)}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" /> Create New Action Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map(task => {
              const isCompleted = task.status === 'COMPLETED';
              return (
                <div 
                  key={task.id} 
                  className={`p-4 bg-industrial-850 border rounded-xl space-y-3 shadow transition-all ${
                    isCompleted ? 'border-industrial-750 opacity-70' : 'border-industrial-700 hover:border-brand-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/30">
                        {task.taskNumber}
                      </span>
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-industrial-800 text-industrial-300">
                        {task.category}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-industrial-800 text-industrial-300'
                    }`}>
                      {task.priority} PRIORITY
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-industrial-300 mt-1">{task.description}</p>
                  </div>

                  <div className="p-2.5 bg-industrial-900/60 rounded-lg border border-industrial-750 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-industrial-400 block text-[10px]">Assigned To</span>
                      <span className="text-white font-semibold">{task.assignedTo}</span>
                    </div>
                    <div>
                      <span className="text-industrial-400 block text-[10px]">Due Date</span>
                      <span className="text-amber-400 font-bold">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-industrial-400 block text-[10px]">SLA Status</span>
                      <span className="text-emerald-400 font-bold">{task.slaStatus}</span>
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="flex items-center justify-end pt-2 border-t border-industrial-700/60">
                      <button 
                        onClick={() => handleCompleteTask(task.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Task Complete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: DECIDE APPROVAL REQUEST */}
      {selectedApprovalForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              Decision on {selectedApprovalForDecision.approvalNumber}
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              {selectedApprovalForDecision.title}
            </p>

            <form onSubmit={handleDecideApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Select Decision</label>
                <select 
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value as any)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                >
                  <option value="APPROVED">✅ APPROVED (Grant Requisition)</option>
                  <option value="REJECTED">❌ REJECTED (Decline Requisition)</option>
                  <option value="RETURNED_FOR_CORRECTION">🔄 RETURN FOR CORRECTION (Request Edits)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Reviewer Comments / Audit Justification</label>
                <textarea 
                  rows={3} 
                  required 
                  value={decisionComments} 
                  onChange={(e) => setDecisionComments(e.target.value)}
                  placeholder="Material allocation verified against project schedule..."
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setSelectedApprovalForDecision(null)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-industrial-850 border border-industrial-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand-400" /> Create Operational Action Task
            </h3>
            <p className="text-xs text-industrial-400 mb-4">
              Assign inspection, verification or cycle count task to engineering staff.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Task Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Bench Calibration Check for Returned Rosemount Sensor" 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Category</label>
                  <select 
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as any)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="INSPECTION">INSPECTION</option>
                    <option value="VERIFICATION">VERIFICATION</option>
                    <option value="DISPATCH">DISPATCH</option>
                    <option value="CYCLE_COUNT">CYCLE_COUNT</option>
                    <option value="EXPIRY_REVIEW">EXPIRY_REVIEW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Priority</label>
                  <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Assignee</label>
                  <input 
                    type="text" 
                    required 
                    value={newTaskAssignee} 
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newTaskDueDate} 
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Description & Instructions</label>
                <textarea 
                  rows={3} 
                  value={newTaskDesc} 
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded px-3 py-2 text-xs text-white"
                  placeholder="Detail the technical verification steps required..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-industrial-700">
                <button 
                  type="button" 
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 bg-industrial-800 text-industrial-300 hover:bg-industrial-750 text-xs font-medium rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded shadow"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
