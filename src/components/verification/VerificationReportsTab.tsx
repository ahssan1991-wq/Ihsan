/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  FileCheck,
  Printer,
  Download,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  Layers,
  ChevronRight,
  X,
  ExternalLink,
  Plus
} from 'lucide-react';
import { MaterialVerificationReport, User, ConflictSeverity } from '../../types';
import { dbService } from '../../services/dbService';
import { executePrint } from '../../utils/printManager';

interface VerificationReportsTabProps {
  currentUser: User;
  onSelectReportForVerification?: (report: MaterialVerificationReport) => void;
}

export const VerificationReportsTab: React.FC<VerificationReportsTabProps> = ({
  currentUser,
  onSelectReportForVerification
}) => {
  const [reports, setReports] = useState<MaterialVerificationReport[]>(() => dbService.getVerificationReports());
  const [selectedReport, setSelectedReport] = useState<MaterialVerificationReport | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.materialInfo.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'FINAL':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'UNDER_REVIEW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'DRAFT':
      default:
        return 'bg-industrial-500/10 text-industrial-600 dark:text-industrial-400 border-industrial-500/30';
    }
  };

  const handlePrint = () => {
    if (!selectedReport) return;

    const matrixRows = selectedReport.crossMatrix.map(r => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${r.field}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${r.mrValue || '-'}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${r.poValue || '-'}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; color: #0284c7;">${r.nameplateValue || '-'}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${r.datasheetValue || '-'}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${r.result === 'MATCH' ? '#16a34a' : '#d97706'};">${r.result}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${selectedReport.reportNumber} - Engineering Verification Report</title>
          <style>
            @media print {
              @page { margin: 12mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
            th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; }
            .signoff { margin-top: 25px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="font-size: 20px; margin: 0; font-weight: 800;">EMIS MATERIAL VERIFICATION REPORT</h1>
              <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Report #: ${selectedReport.reportNumber} | Part #: ${selectedReport.partNumber}</p>
            </div>
            <div style="text-align: right; font-size: 11px; font-family: monospace;">
              <div>Status: <strong>${selectedReport.status}</strong></div>
              <div>Date: ${new Date(selectedReport.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <strong style="color: #64748b; text-transform: uppercase;">Material Details</strong><br/>
              Part Number: <strong>${selectedReport.partNumber}</strong><br/>
              Report ID: ${selectedReport.id}
            </div>
            <div class="card">
              <strong style="color: #64748b; text-transform: uppercase;">Procurement Reference</strong><br/>
              MR: ${selectedReport.mrData?.mrNumber || 'N/A'}<br/>
              PO: ${selectedReport.poData?.poNumber || 'N/A'}<br/>
              Supplier: ${selectedReport.poData?.supplier || 'N/A'}
            </div>
            <div class="card">
              <strong style="color: #64748b; text-transform: uppercase;">Compliance & Origin</strong><br/>
              Standard: ${selectedReport.cocData?.standard || 'N/A'}<br/>
              CoC #: ${selectedReport.cocData?.certificateNumber || 'N/A'}<br/>
              Origin: ${selectedReport.cooData?.countryOfOrigin || 'N/A'}
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: bold; margin: 20px 0 5px 0;">Cross-Verification Parameter Matrix</h3>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>MR Value</th>
                <th>PO Value</th>
                <th>Nameplate Scan</th>
                <th>OEM Datasheet</th>
                <th style="text-align: center;">Result</th>
              </tr>
            </thead>
            <tbody>
              ${matrixRows}
            </tbody>
          </table>

          <div class="signoff">
            <p><strong>Authorized Engineer Sign-off:</strong> ${selectedReport.engineerDecision?.reviewer || 'Pending'}</p>
            <p><strong>Comments:</strong> ${selectedReport.engineerDecision?.comments || 'None'}</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { try { window.print(); } catch(e){} }, 400);
            };
          </script>
        </body>
      </html>
    `;

    executePrint(`تقرير_مطابقة_${selectedReport.reportNumber}`, html, `${selectedReport.reportNumber}.html`);
  };

  const handleExportJson = (report: MaterialVerificationReport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${report.reportNumber}-VerificationReport.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/30">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-industrial-900 dark:text-white">
              Material Verification Reports Vault
            </h2>
            <p className="text-xs text-industrial-500 dark:text-industrial-400 mt-0.5">
              Auditable, formal engineering reports containing multi-document cross verification, evidence traces, and engineer sign-off.
            </p>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-industrial-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Report # or Part..."
              className="text-xs pl-8 pr-3 py-2 rounded-xl border border-industrial-200 dark:border-industrial-750 bg-industrial-50 dark:bg-industrial-800 text-industrial-900 dark:text-white w-48 sm:w-60"
            />
          </div>

          <div className="flex items-center gap-1 bg-industrial-100 dark:bg-industrial-800 p-1 rounded-xl">
            {(['ALL', 'FINAL', 'UNDER_REVIEW', 'DRAFT'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white dark:bg-industrial-700 text-brand-600 dark:text-brand-400 shadow-2xs'
                    : 'text-industrial-500 hover:text-industrial-900 dark:hover:text-white'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Table List */}
      <div className="p-5 rounded-2xl bg-white dark:bg-industrial-850 border border-industrial-200 dark:border-industrial-750 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-industrial-50 dark:bg-industrial-800/80 text-industrial-600 dark:text-industrial-300 border-b border-industrial-200 dark:border-industrial-750">
                <th className="p-3 font-semibold">Report #</th>
                <th className="p-3 font-semibold">Part Number / Description</th>
                <th className="p-3 font-semibold">Manufacturer & Model</th>
                <th className="p-3 font-semibold">MR & PO Reference</th>
                <th className="p-3 font-semibold text-center">Status</th>
                <th className="p-3 font-semibold">Engineer Reviewer</th>
                <th className="p-3 font-semibold">Created / Updated</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-industrial-400">
                    No verification reports found matching filters.
                  </td>
                </tr>
              ) : (
                filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-industrial-50/60 dark:hover:bg-industrial-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {rep.reportNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-industrial-900 dark:text-white">{rep.partNumber}</div>
                      <div className="text-[11px] text-industrial-500 truncate max-w-xs">{rep.materialInfo.description}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-industrial-900 dark:text-white">{rep.materialInfo.manufacturer}</div>
                      <div className="text-[11px] text-industrial-500 font-mono">{rep.materialInfo.model}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-industrial-600 dark:text-industrial-300">
                      <div>MR: {rep.mrData?.mrNumber || 'N/A'}</div>
                      <div>PO: {rep.poData?.poNumber || 'N/A'}</div>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${getStatusBadge(rep.status)}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-industrial-700 dark:text-industrial-300">
                      {rep.engineerDecision ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{rep.engineerDecision.reviewer}</span>
                        </div>
                      ) : (
                        <span className="text-industrial-400 italic">Pending Engineer Sign-off</span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-industrial-500 font-mono whitespace-nowrap">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="py-1 px-2.5 rounded-lg bg-industrial-100 dark:bg-industrial-800 hover:bg-brand-500 hover:text-white text-industrial-700 dark:text-industrial-200 font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Report</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Modal View for Selected Report */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-industrial-850 rounded-2xl border border-industrial-200 dark:border-industrial-750 p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-industrial-200 dark:border-industrial-750 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl border border-brand-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-industrial-900 dark:text-white">
                      {selectedReport.reportNumber}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${getStatusBadge(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>
                  <p className="text-xs text-industrial-500">
                    Material Verification & Engineering Intelligence Audit Report
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300 transition-colors cursor-pointer"
                  title="Print Report"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleExportJson(selectedReport)}
                  className="p-2 rounded-xl bg-industrial-100 dark:bg-industrial-800 hover:bg-industrial-200 text-industrial-700 dark:text-industrial-300 transition-colors cursor-pointer"
                  title="Download JSON Report"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-xl text-industrial-400 hover:text-industrial-600 dark:hover:text-industrial-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Material & Procurement Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-700 text-xs space-y-1">
                <span className="font-bold text-industrial-400 uppercase text-[10px] block">Material Item</span>
                <div className="font-mono font-bold text-industrial-900 dark:text-white">{selectedReport.partNumber}</div>
                <div className="text-industrial-600 dark:text-industrial-300">{selectedReport.materialInfo.description}</div>
                <div className="text-industrial-500 font-mono text-[11px]">{selectedReport.materialInfo.manufacturer} - {selectedReport.materialInfo.model}</div>
              </div>

              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-700 text-xs space-y-1">
                <span className="font-bold text-industrial-400 uppercase text-[10px] block">Procurement Reference</span>
                <div>MR: <span className="font-mono font-bold">{selectedReport.mrData?.mrNumber || 'N/A'}</span></div>
                <div>PO: <span className="font-mono font-bold">{selectedReport.poData?.poNumber || 'N/A'}</span></div>
                <div>Delivery Note: <span className="font-mono font-bold">{selectedReport.deliveryData?.deliveryNoteNumber || 'N/A'}</span></div>
                <div>Supplier: <span>{selectedReport.poData?.supplier || 'N/A'}</span></div>
              </div>

              <div className="p-4 rounded-xl bg-industrial-50 dark:bg-industrial-800/60 border border-industrial-200 dark:border-industrial-700 text-xs space-y-1">
                <span className="font-bold text-industrial-400 uppercase text-[10px] block">Compliance & Origin</span>
                <div>CoC Standard: <span className="font-mono">{selectedReport.cocData?.standard || 'N/A'}</span></div>
                <div>CoC Number: <span className="font-mono">{selectedReport.cocData?.certificateNumber || 'N/A'}</span></div>
                <div>Country of Origin: <span className="font-bold">{selectedReport.cooData?.countryOfOrigin || 'N/A'}</span></div>
                <div>Nameplate S/N: <span className="font-mono">{selectedReport.nameplateData?.serialNumber || 'N/A'}</span></div>
              </div>
            </div>

            {/* Cross Verification Matrix in Modal */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-industrial-900 dark:text-white uppercase tracking-wider">
                Cross-Verification Parameter Matrix
              </h4>
              <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-750">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-industrial-50 dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300">
                      <th className="p-2.5 font-semibold">Parameter</th>
                      <th className="p-2.5 font-semibold">MR Value</th>
                      <th className="p-2.5 font-semibold">PO Value</th>
                      <th className="p-2.5 font-semibold">Nameplate Scan</th>
                      <th className="p-2.5 font-semibold">OEM Datasheet</th>
                      <th className="p-2.5 font-semibold text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                    {selectedReport.crossMatrix.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold">{r.field}</td>
                        <td className="p-2.5 font-mono">{r.mrValue || '-'}</td>
                        <td className="p-2.5 font-mono">{r.poValue || '-'}</td>
                        <td className="p-2.5 font-mono text-brand-600 dark:text-brand-400">{r.nameplateValue || '-'}</td>
                        <td className="p-2.5 font-mono">{r.datasheetValue || '-'}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.result === 'MATCH' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {r.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Engineer Decision & Audit Trail */}
            <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  <span>Authorized Engineering Sign-off</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-500">
                  {selectedReport.engineerDecision?.date ? new Date(selectedReport.engineerDecision.date).toLocaleString() : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-industrial-700 dark:text-industrial-300">
                <strong>Reviewer:</strong> {selectedReport.engineerDecision?.reviewer || 'Not yet signed'}
              </p>
              <p className="text-xs text-industrial-700 dark:text-industrial-300">
                <strong>Comments:</strong> {selectedReport.engineerDecision?.comments || 'No comments recorded.'}
              </p>
            </div>

            {/* Close / Action Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-industrial-200 dark:border-industrial-750">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300 hover:bg-industrial-200"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
