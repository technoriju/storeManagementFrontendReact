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
  startDate?: string;
  endDate?: string;
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
 * Filter rows strictly by date range if startDate or endDate provided
 */
export function filterDataByDateRange(data: any[], startDate?: string, endDate?: string): any[] {
  if (!Array.isArray(data)) return [];
  if (!startDate && !endDate) return data;

  const sDate = startDate ? startDate.slice(0, 10) : undefined;
  const eDate = endDate ? endDate.slice(0, 10) : undefined;

  return data.filter((item) => {
    if (!item) return false;
    const raw = item.date || item.saleDate || item.purchaseDate || item.paymentDate || item.expenseDate || item.incomeDate || item.createdAt;
    if (!raw) return true;
    const d = String(raw).slice(0, 10);
    if (sDate && d < sDate) return false;
    if (eDate && d > eDate) return false;
    return true;
  });
}

/**
 * Generate formatted HTML printable document for report
 */
export function generateReportHtml(options: ReportExportOptions): string {
  const { title, dateRangeLabel, startDate, endDate, columns, data, summary, businessName = 'Billing Store', partyName, phone } = options;

  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  // Build table headers
  const thHtml = columns
    .map(
      (c) =>
        `<th style="padding: 9px 12px; text-align: left; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.3px;">${c.title}</th>`
    )
    .join('');

  // Build table rows
  let rowsHtml = '';
  if (filteredRows.length === 0) {
    rowsHtml = `<tr><td colspan="${columns.length}" style="text-align: center; padding: 36px 12px; color: #64748b; font-style: italic; background: #ffffff; font-size: 13px;">No transaction records found for date range (${displayRange})</td></tr>`;
  } else {
    rowsHtml = filteredRows
      .map((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const cells = columns
          .map((col) => {
            let v = row[col.key];
            if (v === undefined || v === null) {
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
  }

  // Summary box if provided
  let summaryHtml = '';
  if (summary && typeof summary === 'object') {
    const summaryItems = Object.entries(summary)
      .filter(([k, v]) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== ''))
      .slice(0, 6)
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        const formatted = typeof v === 'number' ? `₹${v.toLocaleString()}` : String(v);
        return `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; min-width: 130px; flex: 1;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">${label}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formatted}</div>
          </div>`;
      })
      .join('');

    if (summaryItems) {
      summaryHtml = `<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">${summaryItems}</div>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${displayRange}</title>
  <style>
    @media print {
      body { margin: 0; padding: 8mm; }
      @page { size: auto; margin: 8mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 20px;
      margin: 0 auto;
      max-width: 1000px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand { font-size: 20px; font-weight: 800; color: #2563eb; letter-spacing: -0.3px; }
    .report-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .period-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 12px;
      color: #1e40af;
    }
    .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
    .meta strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .footer {
      margin-top: 24px;
      padding-top: 10px;
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
    <div style="flex: 1;">
      <div class="brand">${businessName}</div>
      <div class="report-title">${title}</div>
      ${partyName ? `<div style="font-size: 12.5px; font-weight: 600; color: #334155; margin-top: 3px;">Party: ${partyName} ${phone ? `(${phone})` : ''}</div>` : ''}
      <div class="period-badge">
        <strong>Filter:</strong> ${dateRangeLabel} &nbsp;|&nbsp; <strong>Date Range:</strong> ${displayRange}
      </div>
    </div>
    <div class="meta">
      <div><strong>Date Range:</strong> ${displayRange}</div>
      <div><strong>Total Records:</strong> ${filteredRows.length}</div>
      <div><strong>Printed:</strong> ${new Date().toLocaleString()}</div>
    </div>
  </div>

  ${summaryHtml}

  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="footer">
    <div>${businessName} • ${title} • Period: ${displayRange}</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF Blob and data URI using html2canvas + jsPDF
 */
export async function generateReportPdfBlob(options: ReportExportOptions): Promise<{ blob: Blob; fileName: string; dataUri?: string }> {
  const { title, dateRangeLabel, startDate, endDate } = options;
  const rangePart = (startDate && endDate ? `${startDate}_to_${endDate}` : dateRangeLabel).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${rangePart}.pdf`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const htmlString = generateReportHtml(options);
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.padding = '20px';
    container.innerHTML = htmlString;
    document.body.appendChild(container);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      const dataUri = pdf.output('datauristring');
      return { blob, fileName, dataUri };
    } finally {
      container.remove();
    }
  }

  // Programmatic jsPDF fallback
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  pdf.setFontSize(16);
  pdf.text(`${options.businessName || 'Store'} - ${options.title}`, 14, 20);
  pdf.setFontSize(10);
  pdf.text(`Date Range: ${displayRange}`, 14, 28);
  if (options.partyName) {
    pdf.text(`Party: ${options.partyName} ${options.phone ? `(${options.phone})` : ''}`, 14, 34);
  }

  const blob = pdf.output('blob');
  const dataUri = pdf.output('datauristring');
  return { blob, fileName, dataUri };
}

/**
 * Directly download report as PDF file
 */
export async function exportReportToPdf(options: ReportExportOptions) {
  try {
    const result = await generateReportPdfBlob(options);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1000);
      return;
    }
  } catch (err) {
    console.warn('Direct PDF download fallback to print dialog:', err);
  }
  // Fallback
  printOrSavePdfReport(options);
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
  const { title, dateRangeLabel, startDate, endDate, columns, data } = options;
  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate}_to_${endDate}` : dateRangeLabel;

  // Format rows matching columns
  const excelRows = filteredRows.map((item, idx) => {
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

  const safeFileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${displayRange.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, safeFileName);
  } else {
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
    void Linking.openURL(dataUri).catch(() => {});
  }
}

/**
 * Convert data to PDF first, then share via WhatsApp / System Share
 */
export async function shareReportToWhatsApp(options: ReportExportOptions) {
  const { title, dateRangeLabel, startDate, endDate, data, summary, businessName = 'Store', phone = '', partyName } = options;

  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  // 1. MUST convert data to PDF first
  let pdfResult: { blob?: Blob; fileName: string; dataUri?: string } | null = null;
  try {
    pdfResult = await generateReportPdfBlob({ ...options, data: filteredRows });
  } catch (err) {
    console.warn('PDF generation before WhatsApp share:', err);
  }

  const fileName = pdfResult?.fileName || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;

  // 2. Prepare formatted summary message
  let lines: string[] = [];
  lines.push(`📄 *${title}*`);
  if (businessName) lines.push(`🏢 *${businessName}*`);
  if (partyName) lines.push(`👤 *Party:* ${partyName}`);
  lines.push(`🗓️ *Period:* ${dateRangeLabel}`);
  if (startDate && endDate) lines.push(`📅 *Date Range:* ${startDate} to ${endDate}`);
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

  lines.push(`• *Total Records in Period:* ${filteredRows.length}`);
  lines.push(`──────────────────────`);

  if (filteredRows.length > 0) {
    lines.push(`*Recent Entries:*`);
    filteredRows.slice(0, 3).forEach((item, i) => {
      const id = item.invoiceNumber || item.voucherNo || item.sku || item.name || `#${i + 1}`;
      const d = item.date ? ` (${item.date})` : '';
      const amt = item.total || item.amount || item.grandTotal || item.inflow || item.outflow || item.outstandingBalance || '';
      const amtStr = amt !== '' ? ` - ₹${Number(amt).toLocaleString()}` : '';
      lines.push(`${i + 1}. ${id}${d}${amtStr}`);
    });
    if (filteredRows.length > 3) {
      lines.push(`_...and ${filteredRows.length - 3} more records_`);
    }
    lines.push(`──────────────────────`);
  }

  lines.push(`📎 *PDF Report Attached:* ${fileName}`);
  lines.push(`_Generated from Billing Application_`);

  const fullText = lines.join('\n');
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  // 3. Share with converted PDF
  if (Platform.OS === 'web') {
    const nav = typeof globalThis !== 'undefined' ? (globalThis as any).navigator : null;
    let sharedViaFile = false;

    // Use Web Share API if browser supports file attachments (Mobile Safari, Android Chrome, etc.)
    if (nav?.canShare && pdfResult?.blob) {
      try {
        const pdfFile = new File([pdfResult.blob], fileName, { type: 'application/pdf' });
        if (nav.canShare({ files: [pdfFile] })) {
          await nav.share({
            title: `${title} - ${displayRange}`,
            text: fullText,
            files: [pdfFile],
          });
          sharedViaFile = true;
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return;
      }
    }

    if (!sharedViaFile) {
      // Download converted PDF file directly to device
      if (pdfResult?.blob) {
        const url = URL.createObjectURL(pdfResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          a.remove();
          URL.revokeObjectURL(url);
        }, 1000);
      }

      // Open WhatsApp chat with detailed summary and PDF notice
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullText)}`
        : `https://wa.me/?text=${encodeURIComponent(fullText)}`;

      const globalWin: any = (globalThis as any).window;
      if (globalWin) {
        globalWin.open(waUrl, '_blank');
      } else {
        void Linking.openURL(waUrl);
      }
    }
  } else {
    // React Native Native (Android / iOS)
    try {
      const RNFS = (await import('react-native-fs')).default;
      const RNShare = (await import('react-native-share')).default;
      const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

      if (pdfResult?.dataUri) {
        const base64Data = pdfResult.dataUri.split('base64,')[1] || pdfResult.dataUri;
        await RNFS.writeFile(destPath, base64Data, 'base64');
        const shareUri = Platform.OS === 'android' ? `file://${destPath}` : destPath;

        await RNShare.open({
          title: `${title} - ${displayRange}`,
          message: fullText,
          url: shareUri,
          type: 'application/pdf',
          filename: fileName,
        });
      } else {
        const waUrl = cleanPhone
          ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(fullText)}`
          : `whatsapp://send?text=${encodeURIComponent(fullText)}`;
        await Linking.openURL(waUrl);
      }
    } catch (e: any) {
      if (e?.message?.includes('User did not share') || e?.name === 'AbortError') return;
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullText)}`
        : `https://wa.me/?text=${encodeURIComponent(fullText)}`;
      void Linking.openURL(waUrl).catch(() => {});
    }
  }
}
