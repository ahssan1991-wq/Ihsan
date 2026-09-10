/**
 * EMIS Intelligent Print & Document Export Engine
 * Provides resilient printing and document export across all environments:
 * - Direct iframe-safe printing
 * - Fallback Print Preview Modal with live rendering
 * - Unrestricted New Tab opening (bypasses sandboxed iframe restrictions)
 * - Direct standalone HTML/PDF download
 */

import { Material } from '../types';

export interface PrintPreviewData {
  isOpen: boolean;
  title: string;
  html: string;
  filename: string;
  blobUrl?: string;
  isIframeEnv: boolean;
}

export type PrintStatus = 'ready' | 'printed' | 'preview_opened' | 'downloaded' | 'blocked' | 'tab_opened';

// Global event bus for print preview modal
const PRINT_EVENT_NAME = 'emis-print-preview-request';

export function openPrintPreview(title: string, html: string, filename?: string) {
  const safeFilename = filename || `${title.replace(/[\s/\\?%*:|"<>]/g, '_')}_${Date.now()}.html`;
  
  // Inject auto-print trigger for when opened in standalone tab
  let fullHtml = html;
  if (!fullHtml.includes('<!DOCTYPE html>')) {
    fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 400);
    };
  </script>
</body>
</html>`;
  }

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const event = new CustomEvent(PRINT_EVENT_NAME, {
    detail: {
      isOpen: true,
      title,
      html: fullHtml,
      filename: safeFilename,
      blobUrl,
      isIframeEnv: isRunningInIframe(),
    } as PrintPreviewData,
  });

  window.dispatchEvent(event);
  return blobUrl;
}

export function subscribeToPrintRequests(callback: (data: PrintPreviewData) => void) {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<PrintPreviewData>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener(PRINT_EVENT_NAME, handler);
  return () => window.removeEventListener(PRINT_EVENT_NAME, handler);
}

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Universal print executor:
 * 1. Tries hidden iframe print.
 * 2. If blocked, sandboxed, or running in an iframe, automatically opens the Smart Print Preview Modal.
 */
export async function executePrint(
  title: string,
  htmlContent: string,
  filename?: string,
  forceModal: boolean = false
): Promise<PrintStatus> {
  const isIframe = isRunningInIframe();
  const safeFilename = filename || `${title.replace(/[\s/\\?%*:|"<>]/g, '_')}_${Date.now()}.html`;

  // Ensure full HTML structure with print styling
  let formattedHtml = htmlContent;
  if (!formattedHtml.includes('<!DOCTYPE html>')) {
    formattedHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @media print {
      @page { margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif;
      padding: 15px;
      color: #0f172a;
      background: #ffffff;
      direction: rtl;
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 400);
    };
  </script>
</body>
</html>`;
  }

  // If forceModal or in iframe environment, open the print modal right away
  // to prevent unhandled sandboxing exceptions and provide direct buttons (Print, Open Tab, Download).
  if (forceModal || isIframe) {
    openPrintPreview(title, formattedHtml, safeFilename);
    return 'preview_opened';
  }

  // Attempt direct iframe print in standard top-level window
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        document.body.removeChild(iframe);
        openPrintPreview(title, formattedHtml, safeFilename);
        resolve('preview_opened');
        return;
      }

      doc.open();
      doc.write(formattedHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve('printed');
        } catch (err) {
          console.warn('Direct print failed, switching to preview modal:', err);
          openPrintPreview(title, formattedHtml, safeFilename);
          resolve('preview_opened');
        } finally {
          setTimeout(() => {
            try {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            } catch (_) {}
          }, 60000);
        }
      }, 400);
    } catch (e) {
      console.warn('Failed to initialize print iframe:', e);
      openPrintPreview(title, formattedHtml, safeFilename);
      resolve('preview_opened');
    }
  });
}

/**
 * Download document directly as an HTML / PDF-ready file
 */
export function downloadDocument(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Open document in an unrestricted new tab
 */
export function openDocumentInNewTab(html: string, title?: string): boolean {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
      return true;
    }
  } catch (err) {
    console.warn('window.open blocked:', err);
  }
  return false;
}

// ==========================================
// DOCUMENT HTML GENERATORS
// ==========================================

/**
 * Generates official Material Physical Tag HTML (Barcodes, QR, specs)
 */
export function generateAssetTagHtml(
  material: Material,
  options: {
    size?: 'small' | 'standard' | 'large';
    includeMfg?: boolean;
    includeLocation?: boolean;
    includeSpecs?: boolean;
    qrDataUrl?: string;
  } = {}
): string {
  const {
    size = 'standard',
    includeMfg = true,
    includeLocation = true,
    includeSpecs = true,
    qrDataUrl,
  } = options;

  const widthMm = size === 'small' ? '75mm' : size === 'large' ? '105mm' : '90mm';
  const heightMm = size === 'small' ? '45mm' : size === 'large' ? '75mm' : '60mm';

  const qrSrc = qrDataUrl || '';
  const scanUrl = `${window.location.origin}${window.location.pathname}?part=${encodeURIComponent(material.partNumber)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Asset_Tag_${material.partNumber}</title>
  <style>
    @media print {
      @page {
        size: ${widthMm} ${heightMm};
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .tag-container {
        border: 2px solid #000 !important;
        page-break-inside: avoid;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f8fafc;
    }
    .tag-container {
      width: ${widthMm};
      height: ${heightMm};
      border: 2.5px solid #0f172a;
      border-radius: 6px;
      padding: 12px;
      background: #ffffff;
      box-sizing: border-box;
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .qr-section {
      width: 32%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-right: 1.5px dashed #94a3b8;
      padding-right: 10px;
    }
    .qr-section img {
      width: 100%;
      max-width: 90px;
      height: auto;
      object-fit: contain;
    }
    .qr-label {
      font-family: monospace;
      font-size: 7.5px;
      font-weight: 800;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .info-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
    }
    .badge-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .asset-badge {
      font-family: monospace;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .code-badge {
      font-family: monospace;
      font-size: 8px;
      font-weight: bold;
      background: #0f172a;
      color: #ffffff;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .part-title {
      font-family: monospace;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      margin: 4px 0 2px 0;
      word-break: break-all;
    }
    .description {
      font-size: 9px;
      color: #334155;
      line-height: 1.3;
      margin: 2px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mfg-line {
      font-size: 8.5px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .loc-badge {
      font-family: monospace;
      font-size: 8px;
      font-weight: 800;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="tag-container">
    <div class="qr-section">
      ${qrSrc ? `<img src="${qrSrc}" alt="QR" />` : `<div style="font-size:8px;font-family:monospace;text-align:center;">SCAN: ${material.partNumber}</div>`}
      <div class="qr-label">ENGINEERING ASSET</div>
    </div>
    <div class="info-section">
      <div>
        <div class="badge-bar">
          <span class="asset-badge">EMIS IDENTIFICATION TAG</span>
          ${material.materialCode ? `<span class="code-badge">${material.materialCode}</span>` : ''}
        </div>
        <div class="part-title">${material.partNumber}</div>
        ${includeSpecs && material.description ? `<div class="description">${material.description}</div>` : ''}
      </div>
      <div>
        ${includeMfg ? `<div class="mfg-line">OEM: ${material.manufacturer || 'Standard'} · ${material.model || '-'}</div>` : ''}
        ${includeLocation ? `<div class="loc-badge">LOC: WH ${material.store?.split(' ')[0] || '1'} · R:${material.rack || '-'} / S:${material.shelf || '-'}</div>` : ''}
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { try { window.print(); } catch(e){} }, 400);
    };
  </script>
</body>
</html>`;
}

/**
 * Generates official Material Digital Passport printable document
 */
export function generatePassportPrintHtml(material: Material, qrDataUrl?: string): string {
  const specs = [
    { label: 'Sub-Category', value: material.materialType || material.category || 'Industrial Equipment' },
    { label: 'Pressure Rating', value: material.pressureRating || 'N/A' },
    { label: 'Connection Size', value: material.connectionSize || 'Standard' },
    { label: 'Electrical Rating', value: material.electricalRating || 'N/A' },
    { label: 'Signal Output', value: material.outputProtocol || 'N/A' },
    { label: 'Measuring Range', value: material.measuringRange || 'N/A' },
    { label: 'IP Protection', value: material.ipRating || 'IP66 / Standard' },
    { label: 'Certifications', value: (material as any).certificationMarks || material.coc || material.hazardousClassification || 'ATEX / CE' },
    { label: 'Country of Origin', value: (material as any).countryOfOrigin || (material as any).origin || 'N/A' },
  ];

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>جواز_المادة_${material.partNumber}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif;
      padding: 20px;
      color: #0f172a;
      background: #fff;
      direction: rtl;
      line-height: 1.4;
    }
    .passport-card {
      border: 2px solid #0f172a;
      border-radius: 12px;
      padding: 24px;
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header-title h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .header-title p {
      margin: 0;
      font-size: 11px;
      color: #475569;
    }
    .passport-id {
      text-align: left;
      direction: ltr;
      font-family: monospace;
      font-size: 11px;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 20px;
      margin-bottom: 20px;
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .main-meta h2 {
      margin: 0 0 6px 0;
      font-size: 18px;
      font-family: monospace;
      color: #0f172a;
    }
    .main-meta p {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #334155;
    }
    .meta-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .badge {
      font-size: 10px;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    .qr-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .qr-box img {
      width: 110px;
      height: 110px;
      object-fit: contain;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 6px;
      margin: 18px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      font-size: 11px;
    }
    .spec-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px;
      border-radius: 6px;
    }
    .spec-label {
      color: #64748b;
      font-size: 9.5px;
      display: block;
      margin-bottom: 2px;
    }
    .spec-value {
      font-weight: bold;
      color: #0f172a;
      font-family: monospace;
    }
    .loc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      font-size: 11px;
      margin-top: 8px;
    }
    .footer-signatures {
      margin-top: 30px;
      border-top: 1.5px solid #0f172a;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
    }
    .sig-block {
      width: 200px;
      text-align: center;
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      margin-top: 35px;
      font-weight: bold;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="passport-card">
    <div class="header">
      <div class="header-title">
        <h1>🛡️ جواز الهوية الرقمية للمادة الهندسية (Material Digital Passport)</h1>
        <p>نظام إدارة المستودعات والتحقق الهندسي المعتمد — ZFOD EMIS Platform</p>
      </div>
      <div class="passport-id">
        <strong>SN:</strong> ${material.serialNumber || 'SN-AUTOGEN-' + material.partNumber}<br/>
        <strong>DATE:</strong> ${new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>

    <div class="hero-grid">
      <div class="main-meta">
        <h2>${material.partNumber}</h2>
        <p>${material.description}</p>
        <div class="meta-badges">
          <span class="badge">الشركة: ${material.manufacturer}</span>
          <span class="badge">الموديل: ${material.model || 'Standard'}</span>
          <span class="badge">الفئة: ${material.category}</span>
          <span class="badge" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0;">الرصيد: ${material.quantity} ${material.unit}</span>
        </div>
      </div>
      <div class="qr-box">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : `<div style="font-size:9px;font-family:monospace;text-align:center;">QR CODE</div>`}
        <span style="font-size:8px;font-family:monospace;margin-top:4px;color:#64748b;">VERIFIED ASSET</span>
      </div>
    </div>

    <div class="section-title">⚡ مصفوفة المواصفات الفنية والهندسية</div>
    <div class="specs-grid">
      ${specs
        .map(
          (s) => `
        <div class="spec-item">
          <span class="spec-label">${s.label}</span>
          <span class="spec-value">${s.value}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="section-title">📍 موقع التخزين واللوجستيات بالمستودع</div>
    <div class="loc-grid">
      <div class="spec-item"><span class="spec-label">المستودع</span><span class="spec-value">${material.store || 'المستودع الرئيسي'}</span></div>
      <div class="spec-item"><span class="spec-label">الرف (Rack)</span><span class="spec-value">${material.rack || '-'}</span></div>
      <div class="spec-item"><span class="spec-label">الصف (Shelf)</span><span class="spec-value">${material.shelf || '-'}</span></div>
      <div class="spec-item"><span class="spec-label">المحطة (Station)</span><span class="spec-value">${material.station || '-'}</span></div>
    </div>

    <div class="footer-signatures">
      <div>
        <strong>حالة الاعتماد:</strong> ${material.oemVerified ? '✓ تم التحقق والمطابقة مع شهادات المصنع (OEM Verified)' : 'قيد المراجعة الفنية'}<br/>
        <strong>تاريخ الإصدار:</strong> ${new Date().toLocaleString('ar-EG')}
      </div>
      <div class="sig-block">مهندس الجودة والمطابقة الفنية</div>
      <div class="sig-block">أمين المستودع الهندسي</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { try { window.print(); } catch(e){} }, 400);
    };
  </script>
</body>
</html>`;
}

/**
 * Generates official Material Issue or Return Voucher (MIV / MRV)
 */
export function generateVoucherPrintHtml(voucher: {
  voucherId: string;
  type: 'issue' | 'return';
  material: Material;
  quantity: number;
  recipient: string;
  department?: string;
  woRef?: string;
  mrfRef?: string;
  notes?: string;
  userName: string;
  date?: string;
}): string {
  const isIssue = voucher.type === 'issue';
  const typeTitle = isIssue ? 'سند صرف مواد هندسية (Material Issue Voucher - MIV)' : 'سند إرجاع مواد هندسية (Material Return Voucher - MRV)';
  const themeColor = isIssue ? '#d97706' : '#059669';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${voucher.voucherId}_${voucher.type.toUpperCase()}</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif;
      padding: 20px;
      color: #0f172a;
      background: #fff;
      direction: rtl;
    }
    .voucher-box {
      border: 2px solid ${themeColor};
      border-radius: 10px;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .v-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .v-header h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: ${themeColor};
      font-weight: 800;
    }
    .v-header p {
      margin: 0;
      font-size: 11px;
      color: #64748b;
    }
    .v-id {
      font-family: monospace;
      font-size: 13px;
      font-weight: bold;
      background: #f8fafc;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px;
      text-align: right;
    }
    th {
      background: #f1f5f9;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .sig {
      width: 180px;
      text-align: center;
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      font-size: 11px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="voucher-box">
    <div class="v-header">
      <div>
        <h1>${typeTitle}</h1>
        <p>نظام إدارة المستودعات والعمليات الهندسية ZFOD EMIS</p>
      </div>
      <div class="v-id">
        رقم السند: ${voucher.voucherId}<br/>
        التاريخ: ${voucher.date || new Date().toLocaleString('ar-EG')}
      </div>
    </div>

    <table>
      <tr>
        <th style="width: 25%;">رقم القطعة (Part No)</th>
        <td style="font-family: monospace; font-weight: bold;">${voucher.material.partNumber}</td>
        <th style="width: 20%;">كود المادة</th>
        <td style="font-family: monospace;">${voucher.material.materialCode || '-'}</td>
      </tr>
      <tr>
        <th>وصف المادة</th>
        <td colspan="3">${voucher.material.description}</td>
      </tr>
      <tr>
        <th>الشركة المصنعة / الموديل</th>
        <td>${voucher.material.manufacturer} · ${voucher.material.model || '-'}</td>
        <th>الموقع بالمستودع</th>
        <td>WH: ${voucher.material.store} (R:${voucher.material.rack} / S:${voucher.material.shelf})</td>
      </tr>
      <tr>
        <th>الكمية المنفذة</th>
        <td style="font-size: 14px; font-weight: bold; color: ${themeColor};">
          ${voucher.quantity} ${voucher.material.unit}
        </td>
        <th>أمين المستودع المنفذ</th>
        <td>${voucher.userName}</td>
      </tr>
      <tr>
        <th>المستلم / الجهة المستفيدة</th>
        <td style="font-weight: bold;">${voucher.recipient}</td>
        <th>أمر العمل (WO Ref)</th>
        <td style="font-family: monospace;">${voucher.woRef || '-'}</td>
      </tr>
      <tr>
        <th>طلب المواد (MRF Ref)</th>
        <td style="font-family: monospace;">${voucher.mrfRef || '-'}</td>
        <th>ملاحظات إضافية</th>
        <td>${voucher.notes || 'لا توجد ملاحظات'}</td>
      </tr>
    </table>

    <div class="footer">
      <div class="sig">توقيع المستلم</div>
      <div class="sig">مهندس الصيانة / الموقع</div>
      <div class="sig">اعتماد أمين المستودع</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { try { window.print(); } catch(e){} }, 400);
    };
  </script>
</body>
</html>`;
}
