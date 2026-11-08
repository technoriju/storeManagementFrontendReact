import { Platform, Linking } from 'react-native';
import * as XLSX from 'xlsx';

export interface ReportColumnDef {
  key: string;
  title: string;
  width?: number;
}

export interface ReportExportOptions {
  title: string;
  dateRangeLabel: string;
  columns: ReportColumnDef[];
  data: any[];
  summary?: any;
  businessName?: string;
  phone?: string;
  partyName?: string;
}

/**
 * Clean numeric string or number for export
 */
function cleanVal(val: any): string | number {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    return val.name || val.title || JSON.stringify(val);
  }
  return String(val);
}

/**
 * Generate formatted HTML printable document for report
 */
export function generateReportHtml(options: ReportExportOptions): string {
  const { title, dateRangeLabel, columns, data, summary, businessName = 'Billing Store' } = options;

  // Build table headers
  const thHtml = columns
    .map(
      (c) =>
        `<th style="padding: 8px 12px; text-align: left; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 12px; font-weight: 700; color: #334155;">${c.title}</th>`
    )
    .join('');

  // Build table rows
  const rowsHtml = data
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          let v = row[col.key];
          if (v === undefined || v === null) {
            // Check fallback fields
            if (col.key === 'customerName') v = row.customer?.name || row.partyName;
            else if (col.key === 'supplierName') v = row.supplier?.name || row.partyName;
            else if (col.key === 'total') v = row.grandTotal || row.amount;
          }
          return `<td style="padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #1e293b;">${cleanVal(v)}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  // Summary box if provided
  let summaryHtml = '';
  if (summary && typeof summary === 'object') {
    const summaryItems = Object.entries(summary)
      .filter(([k, v]) => typeof v === 'number' || typeof v === 'string')
      .slice(0, 6)
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        const formatted = typeof v === 'number' ? `₹${v.toLocaleString()}` : String(v);
        return `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; min-width: 140px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">${label}</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatted}</div>
          </div>`;
      })
      .join('');

    if (summaryItems) {
      summaryHtml = `<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;">${summaryItems}</div>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${dateRangeLabel}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; }
      @page { size: auto; margin: 10mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 24px;
      margin: 0 auto;
      max-width: 1000px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand { font-size: 20px; font-weight: 800; color: #2563eb; }
    .report-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .period { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${businessName}</div>
      <div class="report-title">${title}</div>
      <div class="period">Period: ${dateRangeLabel}</div>
    </div>
    <div class="meta">
      <div>Total Records: <strong>${data.length}</strong></div>
      <div>Generated: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  ${summaryHtml}

  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer">
    <div>${businessName} • Report Statement</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;
}

/**
 * Print or download PDF via browser / system print dialog
 */
export function printOrSavePdfReport(options: ReportExportOptions) {
  const htmlContent = generateReportHtml(options);

  if (Platform.OS === 'web') {
    const globalDoc: any = (globalThis as any).document;
    const globalWin: any = (globalThis as any).window;
    if (!globalDoc) return;

    let iframe = globalDoc.getElementById('report-print-iframe');
    if (iframe) iframe.remove();

    iframe = globalDoc.createElement('iframe');
    iframe.id = 'report-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    globalDoc.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      const printWin = globalWin.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 300);
      }
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error:', e);
      }
    }, 400);
  } else {
    // Native share / open
    void Linking.openURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`).catch(() => {});
  }
}

/**
 * Download Report as Excel (.xlsx) file datewise
 */
export function exportReportToExcel(options: ReportExportOptions) {
  const { title, dateRangeLabel, columns, data } = options;

  // Format rows matching columns
  const excelRows = data.map((item, idx) => {
    const rowObj: Record<string, any> = { 'S.No': idx + 1 };
    columns.forEach((col) => {
      let val = item[col.key];
      if (val === undefined || val === null) {
        if (col.key === 'customerName') val = item.customer?.name || item.partyName;
        else if (col.key === 'supplierName') val = item.supplier?.name || item.partyName;
        else if (col.key === 'total') val = item.grandTotal || item.amount;
      }
      rowObj[col.title] = cleanVal(val);
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  // Set column widths
  const colWidths = [{ wch: 6 }, ...columns.map((c) => ({ wch: Math.max(12, (c.title || '').length + 4) }))];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  const sheetName = title.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Report');

  const safeFileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dateRangeLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, safeFileName);
  } else {
    // React Native fallback
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
    void Linking.openURL(dataUri).catch(() => {});
  }
}

/**
 * Share Report to WhatsApp (like sales module)
 */
export function shareReportToWhatsApp(options: ReportExportOptions) {
  const { title, dateRangeLabel, data, summary, businessName = 'Store', phone = '', partyName } = options;

  let lines: string[] = [];
  lines.push(`📊 *${title}*`);
  if (businessName) lines.push(`🏢 *${businessName}*`);
  if (partyName) lines.push(`👤 *Party:* ${partyName}`);
  lines.push(`🗓️ *Period:* ${dateRangeLabel}`);
  lines.push(`──────────────────────`);

  if (summary && typeof summary === 'object') {
    if (summary.totalSales !== undefined) lines.push(`• *Total Sales:* ₹${Number(summary.totalSales).toLocaleString()}`);
    if (summary.totalPurchases !== undefined) lines.push(`• *Total Purchases:* ₹${Number(summary.totalPurchases).toLocaleString()}`);
    if (summary.totalBilled !== undefined) lines.push(`• *Total Billed:* ₹${Number(summary.totalBilled).toLocaleString()}`);
    if (summary.totalPaid !== undefined) lines.push(`• *Total Paid:* ₹${Number(summary.totalPaid).toLocaleString()}`);
    if (summary.totalDue !== undefined) lines.push(`• *Balance Due:* ₹${Number(summary.totalDue).toLocaleString()}`);
    if (summary.outstandingBalance !== undefined) lines.push(`• *Outstanding Due:* ₹${Number(summary.outstandingBalance).toLocaleString()}`);
    if (summary.netProfit !== undefined) lines.push(`• *Net Profit:* ₹${Number(summary.netProfit).toLocaleString()}`);
  }

  lines.push(`• *Total Entries:* ${data.length}`);
  lines.push(`──────────────────────`);

  // Show top 3-4 summary entries
  if (data.length > 0) {
    lines.push(`*Recent Entries:*`);
    data.slice(0, 3).forEach((item, i) => {
      const id = item.invoiceNumber || item.voucherNo || item.sku || item.name || `#${i + 1}`;
      const amt = item.total || item.amount || item.grandTotal || item.inflow || item.outflow || item.outstandingBalance || '';
      const amtStr = amt !== '' ? ` - ₹${Number(amt).toLocaleString()}` : '';
      lines.push(`${i + 1}. ${id}${amtStr}`);
    });
    if (data.length > 3) {
      lines.push(`_...and ${data.length - 3} more records_`);
    }
    lines.push(`──────────────────────`);
  }

  lines.push(`_Generated from Billing Application_`);

  const fullText = lines.join('\n');
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullText)}`
    : `https://wa.me/?text=${encodeURIComponent(fullText)}`;

  if (Platform.OS === 'web') {
    const globalWin: any = (globalThis as any).window;
    if (globalWin) {
      globalWin.open(waUrl, '_blank');
    } else {
      void Linking.openURL(waUrl);
    }
  } else {
    void Linking.openURL(waUrl);
  }
}
