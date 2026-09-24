/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Building2,
  Calendar,
  Send
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Material, User } from '../../types';
import { executePrint } from '../../utils/printManager';

interface ManagementReportsTabProps {
  selectedSite: string;
  dateRange: string;
  currentUser: User;
  onNavigateToTab: (tab: string, query?: string) => void;
}

export default function ManagementReportsTab({
  selectedSite,
  dateRange,
  currentUser,
  onNavigateToTab
}: ManagementReportsTabProps) {
  const [selectedReportType, setSelectedReportType] = useState<'EXECUTIVE' | 'REJECTIONS' | 'MISSING_DOCS' | 'SUPPLIER_RISK' | 'STOCK_CRITICAL'>('EXECUTIVE');
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isParsingQuery, setIsParsingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const materials = dbService.getMaterials() || [];
  const kpis = dbService.getEngineeringKpis(selectedSite) || [];
  const suppliers = dbService.getSupplierRiskProfiles() || [];
  const opportunities = dbService.getCrossSiteOpportunities(selectedSite) || [];
  const rejections = (materials || []).filter(m => m.inspectionStatus === 'REJECTED' || m.status === 'Blacklisted');
  const missingDocs = (materials || []).filter(m => !m.datasheet && !m.coc && (!m.documents || Object.keys(m.documents).length === 0));
  const outOfStock = (materials || []).filter(m => (m.quantity || 0) === 0);

  const handleRunNaturalQuery = async () => {
    if (!naturalQuery.trim()) return;
    setIsParsingQuery(true);
    setQueryResult(null);

    try {
      const response = await fetch('/api/gemini/natural-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: naturalQuery })
      });

      if (!response.ok) throw new Error('Query parser error');
      const data = await response.json();
      setQueryResult(data);
    } catch (e: any) {
      console.error('Natural query error:', e);
    } finally {
      setIsParsingQuery(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (selectedReportType === 'EXECUTIVE') {
      csvContent += 'Metric,Value,Unit,Status\n';
      kpis.forEach(k => {
        csvContent += `"${k.name}",${k.currentValue},"${k.unit}","${k.status}"\n`;
      });
    } else if (selectedReportType === 'REJECTIONS') {
      csvContent += 'Part Number,Description,Manufacturer,Site,Inspection Status\n';
      rejections.forEach(m => {
        csvContent += `"${m.partNumber}","${m.description}","${m.manufacturer || ''}","${m.store || ''}","${m.inspectionStatus || ''}"\n`;
      });
    } else if (selectedReportType === 'MISSING_DOCS') {
      csvContent += 'Part Number,Description,Manufacturer,Site,Missing\n';
      missingDocs.forEach(m => {
        csvContent += `"${m.partNumber}","${m.description}","${m.manufacturer || ''}","${m.store || ''}","Datasheet & CoC"\n`;
      });
    } else if (selectedReportType === 'SUPPLIER_RISK') {
      csvContent += 'Supplier Name,Code,Category,Risk Tier,Compliance Score,Rejection Rate\n';
      suppliers.forEach(s => {
        csvContent += `"${s.supplierName}","${s.supplierCode}","${s.category}","${s.riskTier}",${s.complianceScore}%,${s.rejectionRate}%\n`;
      });
    } else if (selectedReportType === 'STOCK_CRITICAL') {
      csvContent += 'Part Number,Description,Requesting Site,Shortage,Matching Surplus Site,Available\n';
      opportunities.forEach(o => {
        csvContent += `"${o.partNumber}","${o.description}","${o.requestingSite}",${o.shortageQuantity},"${o.matchingSite}",${o.availableQuantity}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMIS_Report_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    let rowsHtml = '';
    let title = 'EMIS Engineering Management Report';

    if (selectedReportType === 'EXECUTIVE') {
      title = 'Executive Operational Health Summary';
      rowsHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px;">
          ${kpis.map(k => `
            <div style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background: #f8fafc;">
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">${k.name}</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${k.currentValue}${k.unit}</div>
              <div style="font-size: 10px; color: #16a34a; margin-top: 2px;">Target: ${k.target}${k.unit}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (selectedReportType === 'REJECTIONS') {
      title = 'Material Rejection & Non-Conformance Log';
      rowsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Part Number</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Description</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Manufacturer</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Site</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rejections.map(m => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${m.partNumber}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.description}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.manufacturer || 'OEM'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.store || 'NDGS'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #dc2626; font-weight: bold;">${m.inspectionStatus || m.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (selectedReportType === 'MISSING_DOCS') {
      title = 'Technical Document Deficiency Register';
      rowsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Part Number</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Description</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Store</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Datasheet</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Certificate</th>
            </tr>
          </thead>
          <tbody>
            ${missingDocs.map(m => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${m.partNumber}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.description}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${m.store || 'NDGS'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${m.datasheet ? 'Present' : '<span style="color:#dc2626; font-weight:bold;">Missing</span>'}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${m.oemCertificateId ? 'Present' : '<span style="color:#dc2626; font-weight:bold;">Missing</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (selectedReportType === 'SUPPLIER_RISK') {
      title = 'Supplier Quality & Risk Scorecards';
      rowsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Vendor</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Code</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Category</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Compliance</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Rejection Rate</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Risk Tier</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(s => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${s.supplierName}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${s.supplierCode}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${s.category}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${s.complianceScore}%</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #dc2626;">${s.rejectionRate}%</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${s.riskTier === 'HIGH' ? '#dc2626' : s.riskTier === 'MEDIUM' ? '#d97706' : '#16a34a'};">${s.riskTier}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      title = 'Cross-Site Stock Redistribution Manifest';
      rowsHtml = `
        <table style="width:100%; border-collapse: collapse; margin-top: 20px; font-size: 11px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Part Number</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Description</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Requesting Site</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Deficit</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Surplus Site</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Available</th>
            </tr>
          </thead>
          <tbody>
            ${opportunities.map(o => `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${o.partNumber}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${o.description}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${o.requestingSite}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #dc2626; font-weight: bold;">${o.shortageQuantity}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${o.matchingSite}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color: #16a34a; font-weight: bold;">${o.availableQuantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            @media print { @page { margin: 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div style="font-size: 10px; font-family: monospace; color: #0284c7; text-transform: uppercase;">EMIS Official Engineering Report • ISO 9001 Audit Ready</div>
              <h1 style="font-size: 18px; margin: 4px 0 0 0; font-weight: 800;">${title}</h1>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Site Scope: <strong>${selectedSite}</strong> | Period: <strong>${dateRange}</strong> | Prepared by: <strong>${currentUser.name}</strong></div>
            </div>
            <div style="text-align: right; font-size: 11px; font-family: monospace; color: #64748b;">
              <div>${new Date().toLocaleString()}</div>
            </div>
          </div>
          ${rowsHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { try { window.print(); } catch(e){} }, 400);
            };
          </script>
        </body>
      </html>
    `;

    executePrint(title, html, `${title.replace(/\s+/g, '_')}.html`);
  };

  return (
    <div className="space-y-6">
      {/* Natural Language Analytics Bar */}
      <div className="bg-industrial-900 border border-brand-500/30 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Natural Language Analytical Query Parser
          </h3>
        </div>
        <p className="text-xs text-industrial-400">
          Ask questions in plain English or Arabic (e.g. <em>"Show all rejected transmitters at NDGS with missing datasheets"</em> or <em>"ما هي المواد الناقصة في حقل جمنا"</em>).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunNaturalQuery()}
            placeholder="Type your engineering or inventory analytical query here..."
            className="flex-1 px-3.5 py-2 bg-industrial-950 border border-industrial-800 rounded-lg text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleRunNaturalQuery}
            disabled={isParsingQuery || !naturalQuery.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isParsingQuery ? 'Parsing...' : 'Analyze'}</span>
          </button>
        </div>

        {/* Natural Query Structured Output */}
        {queryResult && (
          <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-2 text-xs">
            <div className="text-brand-400 font-semibold">{queryResult.explanation}</div>
            <div className="text-industrial-300 font-arabic text-[11px]" dir="rtl">{queryResult.arabicExplanation}</div>
            <div className="flex items-center gap-2 flex-wrap pt-1 font-mono text-[10px]">
              <span className="text-industrial-400">Target Filters:</span>
              <span className="bg-industrial-900 px-2 py-0.5 rounded text-white border border-industrial-800">
                Site: {queryResult.filters.site}
              </span>
              <span className="bg-industrial-900 px-2 py-0.5 rounded text-white border border-industrial-800">
                Category: {queryResult.filters.category}
              </span>
              <span className="bg-industrial-900 px-2 py-0.5 rounded text-white border border-industrial-800">
                Status: {queryResult.filters.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Report Generator Controls */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedReportType('EXECUTIVE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedReportType === 'EXECUTIVE' ? 'bg-brand-600 text-white shadow' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setSelectedReportType('REJECTIONS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedReportType === 'REJECTIONS' ? 'bg-red-600 text-white shadow' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              QA Rejection Audit ({rejections.length})
            </button>
            <button
              onClick={() => setSelectedReportType('MISSING_DOCS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedReportType === 'MISSING_DOCS' ? 'bg-amber-600 text-white shadow' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              Missing Docs Deficiencies ({missingDocs.length})
            </button>
            <button
              onClick={() => setSelectedReportType('SUPPLIER_RISK')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedReportType === 'SUPPLIER_RISK' ? 'bg-purple-600 text-white shadow' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              Supplier Scorecards ({suppliers.length})
            </button>
            <button
              onClick={() => setSelectedReportType('STOCK_CRITICAL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedReportType === 'STOCK_CRITICAL' ? 'bg-emerald-600 text-white shadow' : 'bg-industrial-950 text-industrial-400 border border-industrial-800'
              }`}
            >
              Cross-Site Deficits ({opportunities.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 border border-industrial-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 border border-industrial-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formal Rendered Report Document */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-6 shadow-2xl space-y-6">
        {/* Document Header */}
        <div className="border-b border-industrial-800 pb-4 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono text-brand-400 uppercase tracking-widest">
              EMIS Official Engineering Report &bull; ISO 9001 Audit Ready
            </span>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mt-1">
              {selectedReportType === 'EXECUTIVE' && 'Executive Material Integrity & Operational Health Summary'}
              {selectedReportType === 'REJECTIONS' && 'Material Rejection & Quality Non-Conformance Log'}
              {selectedReportType === 'MISSING_DOCS' && 'Technical Certificate & Datasheet Deficiency Register'}
              {selectedReportType === 'SUPPLIER_RISK' && 'Vendor Performance & Quality Risk Scorecards'}
              {selectedReportType === 'STOCK_CRITICAL' && 'Multi-Site Stock Shortages & Redistribution Manifest'}
            </h2>
            <div className="text-xs text-industrial-400 mt-1 font-mono">
              Site Scope: <strong className="text-white">{selectedSite}</strong> &bull; Period: <strong className="text-white">{dateRange}</strong> &bull; Prepared by: <strong className="text-white">{currentUser.name}</strong>
            </div>
          </div>
          <span className="text-xs text-industrial-500 font-mono">
            {new Date().toLocaleString()}
          </span>
        </div>

        {/* Dynamic Table Content based on selected report */}
        {selectedReportType === 'EXECUTIVE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpis.map(k => (
                <div key={k.id} className="p-3 bg-industrial-950 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400 font-mono uppercase">{k.name}</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">{k.currentValue}{k.unit}</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Target: {k.target}{k.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReportType === 'REJECTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-950 text-industrial-400 font-mono text-[10px] uppercase border-b border-industrial-800">
                <tr>
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Manufacturer</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3 text-right">QA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {rejections.map((m, idx) => (
                  <tr key={m.id || (m.sequence !== undefined ? `mat-seq-${m.sequence}` : '') || m.partNumber || `rej-${idx}`} className="hover:bg-industrial-850/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{m.partNumber || '—'}</td>
                    <td className="py-2.5 px-3 text-industrial-200">{m.description}</td>
                    <td className="py-2.5 px-3 text-industrial-400">{m.manufacturer || 'OEM'}</td>
                    <td className="py-2.5 px-3 text-industrial-300 font-mono">{m.store || 'NDGS'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold">
                        {m.inspectionStatus || m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReportType === 'MISSING_DOCS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-950 text-industrial-400 font-mono text-[10px] uppercase border-b border-industrial-800">
                <tr>
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3 text-right">Missing Certificates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {missingDocs.map((m, idx) => (
                  <tr key={m.id || (m.sequence !== undefined ? `mat-seq-${m.sequence}` : '') || m.partNumber || `miss-doc-${idx}`} className="hover:bg-industrial-850/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{m.partNumber || '—'}</td>
                    <td className="py-2.5 px-3 text-industrial-200">{m.description}</td>
                    <td className="py-2.5 px-3 text-industrial-300 font-mono">{m.store || 'NDGS'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold">
                        Datasheet & CoC Missing
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReportType === 'SUPPLIER_RISK' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-950 text-industrial-400 font-mono text-[10px] uppercase border-b border-industrial-800">
                <tr>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Rejection Rate</th>
                  <th className="py-2.5 px-3">Compliance</th>
                  <th className="py-2.5 px-3 text-right">Risk Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {suppliers.map(s => (
                  <tr key={s.supplierId} className="hover:bg-industrial-850/50">
                    <td className="py-2.5 px-3 font-bold text-white">{s.supplierName}</td>
                    <td className="py-2.5 px-3 font-mono text-industrial-400">{s.supplierCode}</td>
                    <td className="py-2.5 px-3 text-industrial-300">{s.category}</td>
                    <td className="py-2.5 px-3 font-mono text-red-400">{s.rejectionRate}%</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{s.complianceScore}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.riskTier === 'LOW' ? 'bg-emerald-500/20 text-emerald-400' :
                        s.riskTier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {s.arabicRiskTier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReportType === 'STOCK_CRITICAL' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-950 text-industrial-400 font-mono text-[10px] uppercase border-b border-industrial-800">
                <tr>
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Deficit Site</th>
                  <th className="py-2.5 px-3">Deficit Qty</th>
                  <th className="py-2.5 px-3">Surplus Site</th>
                  <th className="py-2.5 px-3">Available Qty</th>
                  <th className="py-2.5 px-3 text-right">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800">
                {opportunities.map(o => (
                  <tr key={o.id} className="hover:bg-industrial-850/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{o.partNumber}</td>
                    <td className="py-2.5 px-3 text-red-400 font-mono">{o.requestingSite}</td>
                    <td className="py-2.5 px-3 text-red-400 font-mono font-bold">-{o.shortageQuantity} EA</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">{o.matchingSite}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">+{o.availableQuantity} EA</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {o.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
