/**
 * Export Utilities for NKU HR Services Portal
 * Generates Excel (.xlsx) files using XLSX library and formatted printable PDF view
 * Synchronized with the active Company Profile (Branding, Logo, Address, Contact, NPWP)
 */
import * as XLSX from 'xlsx';
import { CompanyProfile } from '../types';

export function exportToExcel(
  data: Record<string, any>[],
  fileName: string = 'nku_export',
  sheetName: string = 'Data',
  company?: string | CompanyProfile,
  reportTitle?: string
) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const workbook = XLSX.utils.book_new();
  // Clean raw table export: Row 1 = Headers, Row 2+ = Data rows (Without upper header banner)
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto column width adjustment
  const maxProps = Object.keys(data[0] || {});
  const colWidths = maxProps.map((prop) => {
    let maxLen = prop.length;
    for (const row of data) {
      const val = row[prop] !== null && row[prop] !== undefined ? String(row[prop]) : '';
      if (val.length > maxLen) maxLen = val.length;
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 42) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  const validFileName = `${cleanName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, validFileName);
}

export function exportToPdfPrint(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  company?: string | CompanyProfile
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Izinkan popup untuk mencetak / simpan PDF.');
    return;
  }

  let companyName = 'PT. NINDYA KRIDA UTAMA';
  let companyLogo = '/logo_nku.svg';
  let companyAddress = '';
  let companyPhone = '';
  let companyEmail = '';
  let companyTaxId = '';
  let companyColor = '#0f172a';

  if (typeof company === 'string') {
    companyName = company || 'PT. NINDYA KRIDA UTAMA';
  } else if (company && typeof company === 'object') {
    companyName = company.company_name || 'PT. NINDYA KRIDA UTAMA';
    companyLogo = company.logo_url || '/logo_nku.svg';
    companyAddress = company.address || '';
    companyPhone = company.phone || '';
    companyEmail = company.email || '';
    companyTaxId = company.tax_id || '';
    companyColor = company.color_palette || '#0f172a';
  }

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper to remove duplicated company name suffix from title
  const cleanDocTitle = (rawTitle: string) => {
    if (!rawTitle) return '';
    let t = rawTitle.trim();
    if (companyName) {
      const regex = new RegExp(`\\s*[-–—|•]?\\s*${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      t = t.replace(regex, '');
    }
    return t.trim() || rawTitle;
  };

  const finalDocTitle = cleanDocTitle(title);

  const contactText = [
    companyAddress,
    companyPhone ? `Telp: ${companyPhone}` : '',
    companyEmail ? `Email: ${companyEmail}` : '',
  ].filter(Boolean).join(' • ');

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${finalDocTitle} - ${companyName}</title>
  <style>
    @media print {
      @page { size: landscape; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
      .no-print-bar { display: none !important; }
      .doc-container { padding: 0 !important; margin: 0 !important; max-width: none !important; box-shadow: none !important; border: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      line-height: 1.4;
      background: #f1f5f9;
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .no-print-title {
      font-size: 13px;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .print-action {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .print-action:hover {
      background: #1d4ed8;
    }
    .close-action {
      background: #334155;
      color: #e2e8f0;
    }
    .close-action:hover {
      background: #475569;
    }
    .doc-container {
      max-width: 1300px;
      margin: 20px auto 40px auto;
      background: #ffffff;
      padding: 28px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 2px solid ${companyColor || '#0f172a'};
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 14px;
      text-align: left;
    }
    .brand-logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #f8fafc;
      padding: 2px;
      border: 1px solid #e2e8f0;
    }
    .company-name {
      font-size: 19px;
      font-weight: 800;
      color: ${companyColor || '#0f172a'};
      letter-spacing: 0.5px;
      margin: 0;
      text-align: left;
    }
    .company-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
      text-align: left;
    }
    .title-container {
      text-align: center;
      margin: 16px 0 14px 0;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      text-align: center;
      margin: 0;
      letter-spacing: 0.3px;
    }
    .doc-subtitle {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
      text-align: center;
      font-weight: 500;
    }
    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 12px;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .footer {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="no-print-title">
      <span>Pratinjau Dokumen Cetak / PDF &bull; <strong>${finalDocTitle}</strong></span>
    </div>
    <div class="no-print-actions">
      <button class="action-btn print-action" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>Cetak / Simpan PDF</span>
      </button>
      <button class="action-btn close-action" onclick="window.close()">
        <span>Tutup</span>
      </button>
    </div>
  </div>

  <div class="doc-container">
    <div class="header">
      <div class="brand-box">
        ${companyLogo ? `<img src="${companyLogo}" alt="Logo" class="brand-logo" onerror="this.style.display='none'" />` : ''}
        <div>
          <h1 class="company-name">${companyName}</h1>
          <div class="company-sub">${contactText || 'Sistem Manajemen SDM, Kehadiran & Penggajian'}</div>
          ${companyTaxId ? `<div class="company-sub" style="font-weight: 600;">NPWP: ${companyTaxId}</div>` : ''}
        </div>
      </div>
      <div class="doc-meta">
        <div>Tanggal Cetak: <strong>${currentDate}</strong></div>
        <div>Total Data: <strong>${rows.length} Baris</strong></div>
        <div>Klasifikasi: Dokumen Resmi Perusahaan</div>
      </div>
    </div>

    <div class="title-container">
      <div class="doc-title">${finalDocTitle}</div>
      ${subtitle ? `<div class="doc-subtitle">${subtitle}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">No</th>
          ${headers.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, idx) => `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            ${row.map((cell) => `<td>${cell !== null && cell !== undefined ? String(cell) : '-'}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="footer">
      <div>Dokumen sah digenerate secara otomatis melalui Sistem Operasional ${companyName}</div>
      <div>Halaman 1 dari 1</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function formatRupiah(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}
