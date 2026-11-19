import { Platform, Linking } from 'react-native';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';

export interface ReportColumnDef {
  key: string;
  title?: string;
  header?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (val: any, row?: any) => string;
}

export interface ReportExportOptions {
  title: string;
  dateRangeLabel?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  columns: ReportColumnDef[];
  data: any[];
  summary?: any;
  businessName?: string;
  phone?: string;
  phoneNumber?: string;
  partyName?: string;
  subtitle?: string;
  businessProfile?: any;
  notes?: string;
}

/**
 * Retrieve current active business / company profile
 */
export function getCompanyProfile() {
  try {
    const profile = useInvoiceSettingsStore.getState().settings?.businessProfile;
    return {
      businessName: (profile?.businessName && profile.businessName.trim()) || 'Tarama Enterprise',
      address: profile?.address || '',
      phone: profile?.phone || '',
      gstin: profile?.gstin || '',
      email: profile?.email || '',
    };
  } catch {
    return {
      businessName: 'Tarama Enterprise',
      address: '',
      phone: '',
      gstin: '',
      email: '',
    };
  }
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
 * Sanitize strings for jsPDF WinAnsi standard font rendering.
 * Replaces Rupee symbol ₹ (U+20B9 / 8377) with 'Rs. ' to prevent 8-bit truncation
 * to 0xB9 which displays as superscript 1 ('¹').
 */
function sanitizePdfText(val: any): string {
  if (val === null || val === undefined) return '';
  const s = typeof val === 'number' ? String(val) : String(cleanVal(val));
  return s.replace(/₹/g, 'Rs. ');
}

/**
 * Helper to normalize any date input to YYYY-MM-DD
 */
function normalizeDateToYMD(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Match YYYY-MM-DD or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
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
    if (!raw) return true; // Keep items without explicit date field (e.g. inventory master items)
    const norm = normalizeDateToYMD(raw);
    if (!norm) return true;
    if (sDate && norm < sDate) return false;
    if (eDate && norm > eDate) return false;
    return true;
  });
}

/**
 * Generate formatted HTML printable document for report
 */
export function generateReportHtml(options: ReportExportOptions): string {
  const company = getCompanyProfile();
  const businessName = (options.businessName && options.businessName.trim()) || company.businessName;
  const businessAddress = company.address;
  const businessPhone = company.phone;
  const businessGstin = company.gstin;

  const { title = 'Report', startDate, endDate, columns = [], data = [], summary } = options;
  const dateRangeLabel = options.dateRangeLabel || options.dateRange || 'All Time';
  const partyName = options.partyName || (options as any).customerName || (options as any).supplierName || '';
  const phone = options.phone || options.phoneNumber || '';

  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  // Build table headers
  const thHtml = columns
    .map(
      (c) =>
        `<th style="padding: 9px 12px; text-align: left; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.3px;">${c.title || c.header || c.key}</th>`
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
              if (col.key === 'productName' || col.key === 'name') v = row.productName || row.name || row.item;
              else if (col.key === 'customerName') v = row.customer?.name || row.partyName;
              else if (col.key === 'supplierName') v = row.supplier?.name || row.partyName;
              else if (col.key === 'total') v = row.grandTotal || row.amount || (Number(row.quantity || 1) * Number(row.unitPrice || 0));
            }
            if (col.format && typeof col.format === 'function') {
              try {
                v = col.format(v, row);
              } catch (e) {
                // ignore
              }
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
    const isPartyOrBill = Boolean(
      partyName ||
      title.toLowerCase().includes('customer') ||
      title.toLowerCase().includes('supplier') ||
      title.toLowerCase().includes('invoice') ||
      title.toLowerCase().includes('bill')
    );
    let rawSummaryEntries = Object.entries(summary).filter(
      ([k, v]) => {
        if (typeof v !== 'number' && (typeof v !== 'string' || (v as string).trim() === '')) return false;
        if (isPartyOrBill) {
          const lk = k.toLowerCase();
          // Remove tax related cards for customer/supplier bill/statement sharing
          if (lk.includes('tax') || lk.includes('gst')) return false;
        }
        return true;
      }
    );

    // Ensure Total Due or Advance Payment card is added
    if (isPartyOrBill) {
      const hasBalanceCard = rawSummaryEntries.some(([k]) => {
        const lk = k.toLowerCase();
        return lk.includes('due') || lk === 'outstandingbalance' || lk.includes('advance');
      });
      if (!hasBalanceCard) {
        if ((summary as any).advancePayment && Number((summary as any).advancePayment) > 0) {
          rawSummaryEntries.push(['advancePayment', (summary as any).advancePayment]);
        } else {
          const dueVal = (summary as any).totalDue ?? (summary as any).outstandingBalance ?? (summary as any).due ?? 0;
          rawSummaryEntries.push(['totalDue', dueVal]);
        }
      }
    }

    const summaryItems = rawSummaryEntries
      .slice(0, 6)
      .map(([k, v]) => {
        let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        const lk = k.toLowerCase();
        if (lk === 'outstandingbalance' || lk === 'totaldue' || lk === 'due') {
          label = 'Total Due';
        } else if (lk.includes('advance')) {
          label = 'Advance Payment';
        }
        const formatted = typeof v === 'number' ? `₹${v.toLocaleString()}` : String(v);
        const isDue = label.toLowerCase().includes('due');
        const isAdv = label.toLowerCase().includes('advance');
        const valColor = isDue && Number(v) > 0 ? '#dc2626' : isAdv && Number(v) > 0 ? '#16a34a' : '#0f172a';
        return `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; min-width: 130px; flex: 1;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">${label}</div>
            <div style="font-size: 14px; font-weight: 800; color: ${valColor}; margin-top: 2px;">${formatted}</div>
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
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
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
      ${businessAddress ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${businessAddress}</div>` : ''}
      ${businessGstin || businessPhone ? `<div style="font-size: 11px; color: #475569; margin-top: 1px;">${businessGstin ? `GSTIN: <strong>${businessGstin}</strong>` : ''} ${businessPhone ? `&nbsp;•&nbsp; Contact: <strong>${businessPhone}</strong>` : ''}</div>` : ''}
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
    <div>Total Records: ${filteredRows.length}</div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF Blob and data URI using high-speed vector jsPDF
 */
export async function generateReportPdfBlob(options: ReportExportOptions): Promise<{ blob: Blob; fileName: string; dataUri?: string }> {
  const company = getCompanyProfile();
  const businessName = (options.businessName && options.businessName.trim()) || company.businessName;
  const businessAddress = company.address;
  const businessPhone = company.phone;
  const businessGstin = company.gstin;

  const { title = 'Document', startDate, endDate, columns = [], data = [], summary } = options;
  const dateRangeLabel = options.dateRangeLabel || options.dateRange || 'All Time';
  const partyName = options.partyName || (options as any).customerName || (options as any).supplierName || '';
  const phone = options.phone || options.phoneNumber || '';
  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  const rangePart = (startDate && endDate ? `${startDate}_to_${endDate}` : (dateRangeLabel || 'all')).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${rangePart}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 28;
  const marginRight = 28;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxY = pageHeight - 40;

  let y = 35;
  let pageNum = 1;

  // Header branding
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(30, 41, 59); // slate-800
  pdf.text(businessName, marginLeft, y);

  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139); // slate-500
  if (businessAddress) {
    pdf.text(businessAddress, marginLeft, y);
    y += 11;
  }
  const metaLine = [
    businessGstin ? `GSTIN: ${businessGstin}` : '',
    businessPhone ? `Phone: ${businessPhone}` : '',
  ].filter(Boolean).join('   |   ');
  if (metaLine) {
    pdf.text(metaLine, marginLeft, y);
    y += 12;
  }

  // Accent divider line
  pdf.setDrawColor(37, 99, 235); // blue-600
  pdf.setLineWidth(1.5);
  pdf.line(marginLeft, y, marginLeft + contentWidth, y);
  y += 14;

  // Report Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text(title, marginLeft, y);

  if (partyName) {
    y += 13;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Party: ${partyName}${phone ? ` (${phone})` : ''}`, marginLeft, y);
  }

  y += 13;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Filter: ${dateRangeLabel}   |   Date Range: ${displayRange}   |   Total Records: ${filteredRows.length}`, marginLeft, y);
  y += 16;

  // Summary box cards if present
  if (summary && typeof summary === 'object') {
    const isPartyOrBill = Boolean(
      partyName ||
      title.toLowerCase().includes('customer') ||
      title.toLowerCase().includes('supplier') ||
      title.toLowerCase().includes('invoice') ||
      title.toLowerCase().includes('bill')
    );
    let summaryEntries = Object.entries(summary).filter(([k, v]) => {
      if (typeof v !== 'number' && (typeof v !== 'string' || (v as string).trim() === '')) return false;
      if (isPartyOrBill) {
        const lk = k.toLowerCase();
        // Remove tax related cards for customer/supplier bill/statement sharing
        if (lk.includes('tax') || lk.includes('gst')) return false;
      }
      return true;
    });

    // Ensure Total Due or Advance Payment card is added
    if (isPartyOrBill) {
      const hasBalanceCard = summaryEntries.some(([k]) => {
        const lk = k.toLowerCase();
        return lk.includes('due') || lk === 'outstandingbalance' || lk.includes('advance');
      });
      if (!hasBalanceCard) {
        if ((summary as any).advancePayment && Number((summary as any).advancePayment) > 0) {
          summaryEntries.push(['advancePayment', (summary as any).advancePayment]);
        } else {
          const dueVal = (summary as any).totalDue ?? (summary as any).outstandingBalance ?? (summary as any).due ?? 0;
          summaryEntries.push(['totalDue', dueVal]);
        }
      }
    }

    summaryEntries = summaryEntries.slice(0, 6);

    if (summaryEntries.length > 0) {
      const cardGap = 8;
      const numCols = Math.min(summaryEntries.length, 3);
      const cardWidth = (contentWidth - (cardGap * (numCols - 1))) / numCols;
      const cardHeight = 32;

      summaryEntries.forEach(([k, v], idx) => {
        const colIdx = idx % numCols;
        const rowIdx = Math.floor(idx / numCols);
        const cardX = marginLeft + colIdx * (cardWidth + cardGap);
        const cardY = y + rowIdx * (cardHeight + 6);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.75);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

        let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        const lk = k.toLowerCase();
        if (lk === 'outstandingbalance' || lk === 'totaldue' || lk === 'due') {
          label = 'Total Due';
        } else if (lk.includes('advance')) {
          label = 'Advance Payment';
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label.toUpperCase(), cardX + 6, cardY + 11);

        const formatted = typeof v === 'number' ? `Rs. ${v.toLocaleString('en-IN')}` : sanitizePdfText(v);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        const isDue = label.toLowerCase().includes('due');
        const isAdv = label.toLowerCase().includes('advance');
        if (isDue && Number(v) > 0) {
          pdf.setTextColor(220, 38, 38); // red for due
        } else if (isAdv && Number(v) > 0) {
          pdf.setTextColor(22, 163, 74); // green for advance
        } else {
          pdf.setTextColor(15, 23, 42);
        }
        pdf.text(formatted, cardX + 6, cardY + 24);
      });

      const totalSummaryRows = Math.ceil(summaryEntries.length / numCols);
      y += totalSummaryRows * (cardHeight + 6) + 10;
    }
  }

  // Calculate Column Widths
  const sNoWidth = 26;
  const tableCols = columns.map((c) => {
    const key = (c.key || '').toLowerCase();
    const title = c.title || c.header || c.key || '';
    let w = c.width || 0;
    if (!w) {
      if (key.includes('date')) w = 62;
      else if (key.includes('total') || key.includes('amount') || key.includes('paid') || key.includes('due') || key.includes('balance') || key.includes('price') || key.includes('rate')) w = 68;
      else if (key.includes('status')) w = 55;
      else if (key.includes('phone') || key.includes('mobile')) w = 70;
      else if (key.includes('invoice') || key.includes('voucher') || key.includes('no') || key.includes('ref') || key.includes('sku')) w = 70;
      else if (key.includes('product') || key.includes('item') || key.includes('desc') || key.includes('name')) w = 120;
      else w = 90;
    }
    return { ...c, title, assignedWidth: w };
  });

  const totalAssigned = tableCols.reduce((sum, c) => sum + c.assignedWidth, 0);
  const availableForCols = contentWidth - sNoWidth;
  const scaleFactor = availableForCols / totalAssigned;
  tableCols.forEach((c) => {
    c.assignedWidth = Math.round(c.assignedWidth * scaleFactor);
  });
  const currentSum = tableCols.reduce((sum, c) => sum + c.assignedWidth, 0);
  if (tableCols.length > 0) {
    tableCols[tableCols.length - 1].assignedWidth += (availableForCols - currentSum);
  }

  const headerHeight = 18;
  const rowHeight = 17;

  const renderTableHeader = () => {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(marginLeft, y, contentWidth, headerHeight, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(1);
    pdf.line(marginLeft, y + headerHeight, marginLeft + contentWidth, y + headerHeight);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);

    let hX = marginLeft;
    pdf.text('#', hX + 4, y + 12);
    hX += sNoWidth;

    tableCols.forEach((c) => {
      pdf.text((c.title || '').toUpperCase(), hX + 4, y + 12);
      hX += c.assignedWidth;
    });

    y += headerHeight;
  };

  const renderFooter = (page: number) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, pageHeight - 30, marginLeft + contentWidth, pageHeight - 30);
    pdf.text(`${businessName} • ${title} • Period: ${displayRange}`, marginLeft, pageHeight - 18);
    pdf.text(`Page ${page}`, marginLeft + contentWidth, pageHeight - 18, { align: 'right' });
  };

  renderTableHeader();

  if (filteredRows.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`No transaction records found for date range (${displayRange})`, marginLeft + 12, y + 18);
    y += 30;
  } else {
    filteredRows.forEach((row, idx) => {
      if (y + rowHeight > maxY) {
        renderFooter(pageNum);
        pdf.addPage();
        pageNum++;
        y = 35;
        renderTableHeader();
      }

      if (idx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(marginLeft, y, contentWidth, rowHeight, 'F');
      }
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.5);
      pdf.line(marginLeft, y + rowHeight, marginLeft + contentWidth, y + rowHeight);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(30, 41, 59);

      let rX = marginLeft;
      pdf.text(String(idx + 1), rX + 4, y + 11.5);
      rX += sNoWidth;

      tableCols.forEach((c) => {
        let val = row[c.key];
        if (val === undefined || val === null) {
          if (c.key === 'productName' || c.key === 'name') val = row.productName || row.name || row.item;
          else if (c.key === 'customerName') val = row.customer?.name || row.partyName;
          else if (c.key === 'supplierName') val = row.supplier?.name || row.partyName;
          else if (c.key === 'total') val = row.grandTotal || row.amount || (Number(row.quantity || 1) * Number(row.unitPrice || 0));
        }

        if (c.format && typeof c.format === 'function') {
          try {
            val = c.format(val, row);
          } catch (e) {
            // fallback
          }
        }

        let strVal = sanitizePdfText(val);
        const maxTextWidth = c.assignedWidth - 8;
        if (pdf.getTextWidth(strVal) > maxTextWidth) {
          while (strVal.length > 3 && pdf.getTextWidth(strVal + '..') > maxTextWidth) {
            strVal = strVal.slice(0, -1);
          }
          strVal += '..';
        }

        const isNumeric = /^(INR|Rs\.?|-?\d+([.,]\d+)?%?)$/i.test(strVal.trim());
        if (isNumeric && c.assignedWidth > 50) {
          pdf.text(strVal, rX + c.assignedWidth - 4, y + 11.5, { align: 'right' });
        } else {
          pdf.text(strVal, rX + 4, y + 11.5);
        }
        rX += c.assignedWidth;
      });

      y += rowHeight;
    });
  }

  renderFooter(pageNum);

  const blob = pdf.output('blob');
  const dataUri = pdf.output('datauristring');
  return { blob, fileName, dataUri };
}

/**
 * Directly download report as PDF file
 */
export async function exportReportToPdf(options: ReportExportOptions, customFileName?: string) {
  try {
    const result = await generateReportPdfBlob(options);
    const fileName = customFileName
      ? (customFileName.toLowerCase().endsWith('.pdf') ? customFileName : `${customFileName}.pdf`)
      : result.fileName;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1000);
      return;
    }

    // Native Mobile (Android / iOS)
    try {
      const RNFS = (await import('react-native-fs')).default;
      const RNShare = (await import('react-native-share')).default;
      const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      if (result.dataUri) {
        const base64Data = result.dataUri.split('base64,')[1] || result.dataUri;
        await RNFS.writeFile(destPath, base64Data, 'base64');
        const shareUri = Platform.OS === 'android' ? `file://${destPath}` : destPath;
        await RNShare.open({
          title: options.title,
          url: shareUri,
          type: 'application/pdf',
          filename: fileName,
        });
        return;
      }
    } catch (nativeErr) {
      console.warn('Native PDF export share failed:', nativeErr);
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
  const company = getCompanyProfile();
  const businessName = (options.businessName && options.businessName.trim()) || company.businessName;
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

  // Prepend company name and metadata header to Excel spreadsheet
  const headerDetails = [company.address, company.gstin ? `GSTIN: ${company.gstin}` : '', company.phone ? `Phone: ${company.phone}` : '']
    .filter(Boolean)
    .join('  |  ');

  const headerAoa: any[][] = [
    [businessName],
    [`${title} - Period: ${displayRange.replace(/_/g, ' ')}`],
  ];
  if (headerDetails) {
    headerAoa.push([headerDetails]);
  }
  headerAoa.push([]); // Blank row separator

  const worksheet = XLSX.utils.aoa_to_sheet(headerAoa);
  const dataStartRow = headerAoa.length + 1;
  XLSX.utils.sheet_add_json(worksheet, excelRows, { origin: `A${dataStartRow}` });

  // Set column widths
  const colWidths = [{ wch: 8 }, ...columns.map((c) => ({ wch: Math.max(14, (c.title || '').length + 4) }))];
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
export async function shareReportToWhatsApp(options: ReportExportOptions, phoneArg?: string) {
  const company = getCompanyProfile();
  const businessName = (options.businessName && options.businessName.trim()) || company.businessName;
  const { title = 'Document', startDate, endDate, data = [], summary } = options;
  const dateRangeLabel = options.dateRangeLabel || options.dateRange || 'All Time';
  const partyName = options.partyName || (options as any).customerName || (options as any).supplierName || '';
  const phone = phoneArg || options.phone || options.phoneNumber || '';

  const filteredRows = filterDataByDateRange(data, startDate, endDate);
  const displayRange = startDate && endDate ? `${startDate} to ${endDate}` : dateRangeLabel;

  // 1. MUST convert data to PDF first
  let pdfResult: { blob?: Blob; fileName: string; dataUri?: string } | null = null;
  try {
    pdfResult = await generateReportPdfBlob({ ...options, businessName, data: filteredRows, partyName, phone, dateRangeLabel });
  } catch (err) {
    console.warn('PDF generation before WhatsApp share:', err);
  }

  const fileName = pdfResult?.fileName || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;

  // 2. Prepare formatted summary message
  let lines: string[] = [];
  lines.push(`🏢 *${businessName}*`);
  lines.push(`📄 *${title}*`);
  if (partyName) lines.push(`👤 *Party:* ${partyName}`);
  lines.push(`🗓️ *Period:* ${displayRange}`);
  if (startDate && endDate) lines.push(`📅 *Date Range:* ${startDate} to ${endDate}`);
  lines.push(`──────────────────────`);

  if (summary && typeof summary === 'object') {
    const summaryEntries = Object.entries(summary).filter(([k]) => {
      const lk = k.toLowerCase();
      return !lk.includes('tax') && !lk.includes('gst');
    });

    if (summaryEntries.length > 0) {
      summaryEntries.forEach(([k, v]) => {
        let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
        const lk = k.toLowerCase();
        if (lk === 'outstandingbalance' || lk === 'totaldue' || lk === 'due') {
          label = 'Total Due';
        } else if (lk.includes('advance')) {
          label = 'Advance Payment';
        }
        const valStr = typeof v === 'number'
          ? (lk.includes('item') || lk.includes('count') || lk.includes('qty') ? `${v}` : `₹${v.toLocaleString()}`)
          : String(v);
        lines.push(`• *${label}:* ${valStr}`);
      });
    }
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
      const pdfFile = new File([pdfResult.blob], fileName, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });

      if (nav.canShare({ files: [pdfFile] })) {
        try {
          // Attempt 1: Share file with title & message
          await nav.share({
            title: `${title} - ${displayRange}`,
            text: `${businessName} • ${title} (${displayRange})\nPDF report attached.`,
            files: [pdfFile],
          });
          sharedViaFile = true;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Share with text failed, attempting file-only share:', shareErr);
          try {
            // Attempt 2: Share file only without text (some mobile apps fail if both are present)
            await nav.share({
              files: [pdfFile],
              title: `${title} - ${displayRange}`,
            });
            sharedViaFile = true;
          } catch (retryErr: any) {
            if (retryErr.name === 'AbortError') return;
            console.warn('File-only share failed:', retryErr);
          }
        }
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
          message: `${businessName} • ${title} (${displayRange})`,
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
