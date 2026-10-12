import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  Printer,
  X,
  FileText,
  Sliders,
  Check,
  Building2,
  User,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react-native';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';
import { QR_CODE_DATA_URI } from '../../../assets/qrCodeAsset';
import { ShareSaleModal } from './ShareSaleModal';

// Helper: Convert numbers to Indian Rupees in words
export function amountToWords(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  if (rounded <= 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let s = '';
    if (n >= 100) {
      s += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      s += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      s += ones[n] + ' ';
    }
    return s.trim();
  }

  let crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundred = rem;

  let words = '';
  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) words += convertGroup(hundred) + ' ';

  return words.trim() + ' Rupees Only';
}

export interface ReceiptItem {
  id?: number | string;
  productId?: number | string;
  productName: string;
  sku?: string;
  hsn?: string;
  brand?: string;
  brandName?: string;
  unit?: string;
  unitType?: string;
  subUnit?: string;
  subUnitName?: string;
  baseUnitName?: string;
  conversionRate?: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  gst?: number;
  taxAmount?: number;
  total: number;
}

export function getItemBrand(item: ReceiptItem): string | undefined {
  const raw =
    item.brand ||
    item.brandName ||
    (item as any).product?.brandName ||
    (typeof (item as any).product?.brand === 'string' ? (item as any).product?.brand : (item as any).product?.brand?.name) ||
    '';
  const b = String(raw).trim();
  return b && b.toLowerCase() !== 'n/a' && b !== '-' ? b : undefined;
}

export function getItemSubUnit(item: ReceiptItem): string | undefined {
  const raw =
    item.subUnit ||
    item.subUnitName ||
    (item as any).sub_unit ||
    (item as any).product?.subUnitName ||
    (typeof (item as any).product?.subUnit === 'string' ? (item as any).product?.subUnit : (item as any).product?.subUnit?.name) ||
    (item as any).product?.subunit?.name ||
    (item as any).productUnit?.name ||
    '';
  const s = String(raw).trim();
  return s && s.toLowerCase() !== 'n/a' && s !== '-' ? s : undefined;
}

export function getItemConversionRate(item: ReceiptItem): number | undefined {
  const raw =
    item.conversionRate ||
    (item as any).conversion_rate ||
    (item as any).product?.conversionRate ||
    (item as any).product?.conversion_rate ||
    (item as any).productUnit?.conversionFactor ||
    (item as any).conversionFactor ||
    (item as any).product?.subUnit?.multiplier;
  const n = Number(raw);
  return !isNaN(n) && n > 1 ? n : undefined;
}

export function getItemBaseUnit(item: ReceiptItem): string {
  const raw =
    item.baseUnitName ||
    (item as any).product?.baseUnitName ||
    (item as any).product?.baseUnit?.name ||
    (item as any).product?.unitName ||
    item.unit ||
    'Unit';
  return String(raw).trim() || 'Unit';
}

export function formatItemMeta(item: ReceiptItem): string {
  const brand = getItemBrand(item);
  const subUnit = getItemSubUnit(item);
  const conversionRate = getItemConversionRate(item);
  const baseUnit = getItemBaseUnit(item);
  const parts: string[] = [];
  if (brand) {
    parts.push(`Brand: ${brand}`);
  }
  if (subUnit) {
    const convInfo =
      conversionRate && Number(conversionRate) > 1
        ? ` (1 ${baseUnit} = ${conversionRate} ${subUnit})`
        : '';
    parts.push(`Sub Unit: ${subUnit}${convInfo}`);
  } else if (conversionRate && Number(conversionRate) > 1) {
    parts.push(`Conversion: 1 ${baseUnit} = ${conversionRate}`);
  }
  return parts.join(' | ');
}

export interface ReceiptPrintData {
  invoiceNumber: string;
  reference?: string;
  date: string;
  dueDate?: string;
  customerType?: 'retail' | 'wholesale';
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  biller?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  orderTax?: number;
  gst?: number;
  shipping?: number;
  total: number;
  paid?: number;
  due?: number;
  paymentMethod?: string;
  notes?: string;
  previousDue?: number;
  advancePayment?: number;
  showPreviousBalance?: boolean;
}

export type ReceiptPaperFormat = '80mm' | '140x210mm' | 'halfA4Landscape';

export interface ReceiptPrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: ReceiptPrintData | null;
  initialFormat?: ReceiptPaperFormat;
  initialCustomerType?: 'retail' | 'wholesale';
  initialColorMode?: 'bw' | 'color';
}

export function printHtmlViaIframe(htmlContent: string) {
  const globalDoc: any = (globalThis as any).document;
  const globalWin: any = (globalThis as any).window;
  if (!globalDoc) return;

  const existingIframe = globalDoc.getElementById('receipt-hidden-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = globalDoc.createElement('iframe');
  iframe.id = 'receipt-hidden-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  globalDoc.body?.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const printWin = globalWin?.open('', '_blank', 'width=800,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 400);
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
    } catch (err) {
      console.error('Iframe print error, trying popup window:', err);
      const printWin = globalWin?.open('', '_blank', 'width=800,height=600');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
          printWin.close();
        }, 400);
      }
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  }, 250);
}

export interface InvoicePageLayout {
  pageIndex: number;
  items: ReceiptItem[];
  startIndex: number;
  hasFooter: boolean;
}

export function getItemHeightMm(item: ReceiptItem, paperFormat: ReceiptPaperFormat = '140x210mm'): number {
  let lines = 1;
  const nameLen = (item.productName || '').length;
  const charLimit = paperFormat === 'halfA4Landscape' ? 40 : 25;
  if (nameLen > charLimit) lines += Math.ceil((nameLen - charLimit) / charLimit);
  const brand = getItemBrand(item);
  const subUnit = getItemSubUnit(item);
  const conversionRate = getItemConversionRate(item);
  if (brand || subUnit || conversionRate) lines += 1;

  if (paperFormat === 'halfA4Landscape') {
    return 4.8 + (lines - 1) * 3.2;
  }
  return 4.3 + (lines - 1) * 3.0;
}

export function paginateInvoiceItems({
  items,
  paperFormat,
  isWholesale,
  showBankDetails,
  isBalanceActive,
  previousDue = 0,
  advancePayment = 0,
}: {
  items: ReceiptItem[];
  paperFormat: ReceiptPaperFormat;
  isWholesale: boolean;
  showBankDetails: boolean;
  isBalanceActive: boolean;
  previousDue?: number;
  advancePayment?: number;
}): { pages: InvoicePageLayout[]; totalPages: number } {
  if (items.length === 0) {
    return {
      pages: [{ pageIndex: 0, items: [], startIndex: 0, hasFooter: true }],
      totalPages: 1,
    };
  }

  const isLandscape = paperFormat === 'halfA4Landscape';
  const pageHeight = isLandscape ? 136.5 : 201;
  const headerHeight = isLandscape ? 44 : 41;

  let footerHeight = isLandscape ? 48 : 52;
  if (isWholesale && showBankDetails) footerHeight += 11;
  if (isBalanceActive && (previousDue > 0 || advancePayment > 0)) footerHeight += 9;

  const availWithFooter = pageHeight - headerHeight - footerHeight;
  const availWithoutFooter = pageHeight - headerHeight - 4;

  const totalItemsHeight = items.reduce((s, it) => s + getItemHeightMm(it, paperFormat), 0);

  // 1. If all items AND entire footer fit on Page 1: Single page invoice!
  if (totalItemsHeight <= availWithFooter) {
    return {
      pages: [{ pageIndex: 0, items, startIndex: 0, hasFooter: true }],
      totalPages: 1,
    };
  }

  // 2. Multi-page: Footer cannot fit on Page 1 without splitting.
  // Rule: Fill Page 1 as much as possible with items.
  // If all items fit on Page 1 without footer:
  // Page 1 gets ALL items, Page 2 gets header + entire footer!
  if (totalItemsHeight <= availWithoutFooter) {
    return {
      pages: [
        { pageIndex: 0, items, startIndex: 0, hasFooter: false },
        { pageIndex: 1, items: [], startIndex: items.length, hasFooter: true },
      ],
      totalPages: 2,
    };
  }

  // 3. Items exceed Page 1 capacity even without footer:
  // Pack as many items as fit on Page 1, then rest of items and footer go to next page(s).
  const pages: InvoicePageLayout[] = [];
  let remaining = [...items];
  let curStart = 0;

  while (remaining.length > 0) {
    const remHeight = remaining.reduce((s, it) => s + getItemHeightMm(it, paperFormat), 0);

    // Can remaining items AND footer fit on this page?
    if (remHeight <= availWithFooter) {
      pages.push({
        pageIndex: pages.length,
        items: remaining,
        startIndex: curStart,
        hasFooter: true,
      });
      break;
    }

    // Can all remaining items fit on this page WITHOUT footer?
    // Pack all remaining items on this page, and move footer to next page.
    if (remHeight <= availWithoutFooter) {
      pages.push({
        pageIndex: pages.length,
        items: remaining,
        startIndex: curStart,
        hasFooter: false,
      });
      curStart += remaining.length;
      pages.push({
        pageIndex: pages.length,
        items: [],
        startIndex: curStart,
        hasFooter: true,
      });
      break;
    }

    // Pack as many items as fit on this page without footer:
    let accHeight = 0;
    let count = 0;
    for (const it of remaining) {
      const h = getItemHeightMm(it, paperFormat);
      if (accHeight + h > availWithoutFooter && count > 0) break;
      accHeight += h;
      count++;
    }

    pages.push({
      pageIndex: pages.length,
      items: remaining.slice(0, count),
      startIndex: curStart,
      hasFooter: false,
    });
    curStart += count;
    remaining = remaining.slice(count);

    if (remaining.length === 0) {
      pages.push({
        pageIndex: pages.length,
        items: [],
        startIndex: curStart,
        hasFooter: true,
      });
      break;
    }
  }

  return { pages, totalPages: pages.length };
}

export function generateReceiptHtml({
  data,
  business,
  settings,
  paperFormat,
  customerType,
  colorMode = 'bw',
  showBusinessInfo,
  showTaxBreakdown,
  showBankDetails,
  showQrCode,
  showTerms,
  showSignatures,
  showPreviousBalance = true,
}: {
  data: ReceiptPrintData;
  business: any;
  settings: any;
  paperFormat: ReceiptPaperFormat;
  customerType: 'retail' | 'wholesale';
  colorMode?: 'bw' | 'color';
  showBusinessInfo: boolean;
  showTaxBreakdown: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
  showTerms: boolean;
  showSignatures: boolean;
  showPreviousBalance?: boolean;
}): string {
  const isThermal = paperFormat === '80mm';
  const isWholesale = customerType === 'wholesale';
  const invNumber = data.invoiceNumber || 'INV-0000';
  const invDate = data.date || new Date().toISOString().split('T')[0];
  const custName = data.customerName || (data as any).customer?.name || 'Walk-in Customer';
  const custPhone = data.customerPhone || (data as any).customer?.phone || '';
  const custAddress = data.customerAddress || (data as any).customer?.address || '';
  const custGstin = data.customerGstin || (data as any).customer?.taxNumber || (data as any).customer?.taxId || (data as any).customer?.gstin || '';
  const subtotal = Number(data.subtotal || 0);
  const discount = Number(data.discount || 0);
  const gst = Number(data.gst || data.orderTax || 0);
  const total = Number(data.total || 0);
  const paid = Number(data.paid !== undefined ? data.paid : total);
  const due = Number(data.due !== undefined ? data.due : Math.max(0, total - paid));
  const biller = data.biller || 'Cashier';
  const paymentMethod = data.paymentMethod || 'Cash';
  const items = data.items || [];
  const cgstAmount = Number((gst / 2).toFixed(2));
  const sgstAmount = Number((gst / 2).toFixed(2));

  // Previous Due / Advance calculations
  const previousDue = Number(data.previousDue || 0);
  const advancePayment = Number(data.advancePayment || 0);
  const isBalanceActive = Boolean(
    (showPreviousBalance !== undefined ? showPreviousBalance : data.showPreviousBalance) &&
    (previousDue > 0 || advancePayment > 0)
  );

  const totalPayable = total + (isBalanceActive && previousDue > 0 ? previousDue : 0);
  const netBalanceDue = Math.max(0, totalPayable - paid);

  const adjustedAdvance = Math.min(advancePayment, total);
  const netPayable = Math.max(0, total - adjustedAdvance);
  const netDue = Math.max(0, netPayable - paid);
  const remainingAdvance = Math.max(0, advancePayment - adjustedAdvance);

  const activePayableAmount = isBalanceActive && previousDue > 0 ? totalPayable : isBalanceActive && advancePayment > 0 ? netPayable : total;
  const words = amountToWords(activePayableAmount);

  const qrImageHtml = `<img src="${QR_CODE_DATA_URI}" alt="UPI QR" class="receipt-qr-img" />`;

  if (isThermal) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${invNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 1.5mm 2mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: 74mm;
      max-width: 74mm;
      margin: 0 auto;
      padding: 2mm 1mm;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      ${colorMode === 'bw' ? `
      -webkit-filter: grayscale(100%);
      filter: grayscale(100%);
      ` : ''}
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .store-name { font-size: 17px; font-weight: 900; letter-spacing: -0.2px; text-transform: uppercase; margin-bottom: 2px; text-align: center; }
    .tagline { font-size: 10px; margin-bottom: 2px; text-align: center; }
    .store-address { font-size: 10px; margin-bottom: 2px; text-align: center; line-height: 1.25; }
    .store-contact { font-size: 10px; margin-bottom: 2px; text-align: center; }
    .dashed-line { border-bottom: 1px dashed #000; margin: 5px 0; }
    .dotted-line { border-bottom: 1px dotted #666; margin: 4px 0; }
    .double-line { border-bottom: 2px solid #000; margin: 5px 0; }
    .receipt-title { font-size: 11px; font-weight: 800; text-align: center; margin: 3px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
    .customer-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 5px; margin: 4px 0; border-radius: 3px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { font-size: 10px; border-bottom: 1px dashed #000; padding: 3px 0; text-align: left; }
    td { font-size: 10px; padding: 3px 0; vertical-align: top; }
    .item-name { font-weight: bold; font-size: 11px; }
    .item-sub { font-size: 9.5px; color: #444; }
    .summary-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
    .grand-total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; margin: 4px 0; }
    .qr-container { text-align: center; margin: 8px 0; }
    .receipt-qr-img { width: 84px; height: 84px; object-fit: contain; display: inline-block; }
    .qr-caption { font-size: 9px; margin-top: 4px; font-weight: bold; }
    .upi-id { font-size: 8px; color: #444; }
    .footer-msg { font-size: 10px; font-weight: bold; text-align: center; margin: 6px 0 2px 0; }
    .terms { font-size: 8px; text-align: center; color: #444; line-height: 1.25; }
    .powered-by { font-size: 7.5px; color: #888; text-align: center; margin-top: 6px; }
  </style>
</head>
<body>
  ${showBusinessInfo ? `
    <div class="store-name">${business.businessName || 'Tarama Enterprise'}</div>
    ${business.tagline ? `<div class="tagline">${business.tagline}</div>` : ''}
    <div class="store-address">${business.address || ''}</div>
    <div class="store-contact">Phone: ${business.phone || ''}</div>
    <div class="store-contact"><strong>GSTIN: ${business.gstin || ''}</strong></div>
  ` : ''}

  <div class="dashed-line"></div>

  <div class="receipt-title">
    ${isWholesale ? '*** WHOLESALE TAX INVOICE ***' : '*** RETAIL CASH RECEIPT ***'}
  </div>

  <div class="meta-row">
    <span>Inv No: ${invNumber}</span>
    <span>Date: ${invDate}</span>
  </div>
  <div class="meta-row">
    <span>Cashier: ${biller}</span>
    <span>Mode: ${paymentMethod.toUpperCase()}</span>
  </div>

  <div class="customer-box">
    <div><strong>Customer:</strong> ${custName}</div>
    ${custPhone ? `<div><strong>Phone:</strong> ${custPhone}</div>` : ''}
    ${isWholesale && custGstin ? `<div><strong>Cust GSTIN:</strong> ${custGstin}</div>` : ''}
    ${isWholesale && custAddress ? `<div><strong>Address:</strong> ${custAddress}</div>` : ''}
  </div>

  <div class="dashed-line"></div>

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">ITEM</th>
        <th style="width: 15%; text-align: center;">QTY</th>
        <th style="width: 15%; text-align: right;">RATE</th>
        <th style="width: 20%; text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => {
        const brand = getItemBrand(item);
        const subUnit = getItemSubUnit(item);
        const conversionRate = getItemConversionRate(item);
        const baseUnit = getItemBaseUnit(item);
        const metaParts: string[] = [];
        if (brand) metaParts.push(`Brand: <strong>${brand}</strong>`);
        if (subUnit) {
          const convInfo =
            conversionRate && Number(conversionRate) > 1
              ? ` (1 ${baseUnit} = ${conversionRate} ${subUnit})`
              : '';
          metaParts.push(`Sub Unit: <strong>${subUnit}${convInfo}</strong>`);
        } else if (conversionRate && Number(conversionRate) > 1) {
          metaParts.push(`Conversion: <strong>1 ${baseUnit} = ${conversionRate}</strong>`);
        }
        const metaLine = metaParts.length > 0 ? `<div style="font-size: 10px; color: #475569; margin: 1px 0 2px 0;">${metaParts.join(' &nbsp;|&nbsp; ')}</div>` : '';

        return `
        <tr>
          <td colspan="4" style="padding-top: 3px;">
            <div class="item-name">${item.productName || 'Product'} ${item.hsn ? `(HSN: ${item.hsn})` : ''}</div>
            ${metaLine}
            <div class="meta-row item-sub">
              <span>${item.discount ? `Disc: -₹${Number(item.discount).toFixed(2)}` : ''} ${showTaxBreakdown && item.gst ? `GST ${item.gst}%` : ''}</span>
              <span style="width: 15%; text-align: center;">${item.quantity}${item.unit ? ` ${item.unit}` : ''}</span>
              <span style="width: 15%; text-align: right;">${Number(item.unitPrice).toFixed(2)}</span>
              <span style="width: 20%; text-align: right; font-weight: bold;">₹${Number(item.total).toFixed(2)}</span>
            </div>
          </td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="summary-row">
    <span>Items Count: ${items.length}</span>
    <span>Total Qty: ${Number(items.reduce((s, it) => s + (Number(it.quantity) || 0), 0).toFixed(4))}</span>
  </div>
  <div class="summary-row">
    <span>Subtotal:</span>
    <span>₹${subtotal.toFixed(2)}</span>
  </div>
  ${discount > 0 ? `
    <div class="summary-row">
      <span>Discount:</span>
      <span>-₹${discount.toFixed(2)}</span>
    </div>
  ` : ''}
  ${showTaxBreakdown && gst > 0 ? `
    <div class="summary-row">
      <span>CGST:</span>
      <span>₹${cgstAmount.toFixed(2)}</span>
    </div>
    <div class="summary-row">
      <span>SGST:</span>
      <span>₹${sgstAmount.toFixed(2)}</span>
    </div>
  ` : ''}

  <div class="double-line"></div>

  <div class="grand-total-row">
    <span>${isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL:' : 'GRAND TOTAL:'}</span>
    <span>₹${total.toFixed(2)}</span>
  </div>

  ${isBalanceActive && previousDue > 0 ? `
    <div class="summary-row bold" style="color: #dc2626; padding-top: 2px;">
      <span>Previous Due:</span>
      <span>+₹${previousDue.toFixed(2)}</span>
    </div>
    <div class="dashed-line"></div>
    <div class="grand-total-row" style="font-size: 14px;">
      <span>TOTAL PAYABLE:</span>
      <span>₹${totalPayable.toFixed(2)}</span>
    </div>
  ` : ''}

  ${isBalanceActive && advancePayment > 0 ? `
    <div class="summary-row bold" style="color: #16a34a; padding-top: 2px;">
      <span>Advance Credit:</span>
      <span>-₹${adjustedAdvance.toFixed(2)}</span>
    </div>
    <div class="dashed-line"></div>
    <div class="grand-total-row" style="font-size: 14px;">
      <span>NET PAYABLE:</span>
      <span>₹${netPayable.toFixed(2)}</span>
    </div>
  ` : ''}

  <div class="double-line"></div>

  <div class="summary-row">
    <span>Amount Paid:</span>
    <span class="bold">₹${paid.toFixed(2)}</span>
  </div>
  ${isBalanceActive && previousDue > 0 ? `
    <div class="summary-row bold" style="color: ${netBalanceDue > 0 ? '#dc2626' : '#059669'}; font-size: 11px;">
      <span>Net Balance Due:</span>
      <span>₹${netBalanceDue.toFixed(2)}</span>
    </div>
  ` : isBalanceActive && advancePayment > 0 ? `
    <div class="summary-row bold" style="color: ${netDue > 0 ? '#dc2626' : '#059669'}; font-size: 11px;">
      <span>Balance Due:</span>
      <span>₹${netDue.toFixed(2)}</span>
    </div>
    ${remainingAdvance > 0 ? `
      <div class="summary-row bold" style="color: #2563eb; font-size: 10px;">
        <span>Remaining Advance:</span>
        <span>₹${remainingAdvance.toFixed(2)}</span>
      </div>
    ` : ''}
  ` : (due > 0 ? `
    <div class="summary-row bold" style="color: #dc2626;">
      <span>Balance Due:</span>
      <span>₹${due.toFixed(2)}</span>
    </div>
  ` : '')}

  ${showQrCode ? `
    <div class="qr-container">
      ${qrImageHtml}
      <div class="qr-caption">Scan with UPI to Pay / Verify</div>
      <div class="upi-id">${business.upiId || ''}</div>
    </div>
  ` : ''}

  ${showTerms ? `
    <div class="footer-msg">${settings.footerMessage || 'Thank you for your business! Visit Again.'}</div>
    <div class="terms">
      * Goods once sold will not be exchanged after 7 days.<br/>
      * Subject to local jurisdiction.
    </div>
  ` : ''}

  <div class="dashed-line"></div>
  <div class="powered-by">Printed via Billing System</div>
</body>
</html>`;
  }

  // 140 mm width * 210 mm height Portrait Invoice
  if (paperFormat === '140x210mm') {
    const { pages, totalPages } = paginateInvoiceItems({
      items,
      paperFormat: '140x210mm',
      isWholesale,
      showBankDetails,
      isBalanceActive,
      previousDue,
      advancePayment,
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invNumber}</title>
  <style>
    @page {
      size: 140mm 210mm portrait;
      margin: 3mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5px;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 0;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      ${colorMode === 'bw' ? `
      -webkit-filter: grayscale(100%);
      filter: grayscale(100%);
      ` : ''}
    }
    .invoice-page {
      width: 132mm;
      max-width: 132mm;
      margin: 0 auto;
      padding: 1.5mm 0;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .store-name { font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .store-sub { font-size: 8px; color: #334155; line-height: 1.25; }
    .inv-badge {
      background: ${colorMode === 'bw' ? '#000000' : (isWholesale ? '#1e293b' : '#047857')};
      color: #fff;
      padding: 3px 8px;
      font-size: 9.5px;
      font-weight: 800;
      border-radius: 2px;
      display: inline-block;
      text-align: right;
    }
    .copy-text { font-size: 7.5px; color: #64748b; font-weight: bold; margin-top: 1px; }
    .parties-grid {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 4px;
      gap: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .party-col { flex: 1.5; }
    .status-col { flex: 1; text-align: right; }
    .section-title { font-size: 7.5px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 1px; }
    .cust-name { font-size: 11px; font-weight: bold; color: #0f172a; }
    .party-sub { font-size: 8px; color: #334155; line-height: 1.25; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; border: 1px solid #cbd5e1; }
    .items-table th { background: #f1f5f9; font-size: 8px; font-weight: 700; color: #1e293b; padding: 3px 4px; border: 1px solid #cbd5e1; }
    .items-table td { font-size: 8px; padding: 2.5px 4px; border: 1px solid #e2e8f0; }
    .items-table tr { page-break-inside: avoid; break-inside: avoid; }
    .alt-row { background: #f8fafc; }
    .continuation-note {
      text-align: right;
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
      padding: 2.5px 0;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bottom-grid {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bottom-left { flex: 1.2; }
    .bottom-right { flex: 1; }
    .words-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 3px 5px;
      border-radius: 2px;
      font-size: 7.5px;
      margin-bottom: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bank-box {
      background: ${colorMode === 'bw' ? '#f8fafc' : '#f0fdf4'};
      border: 1px solid ${colorMode === 'bw' ? '#cbd5e1' : '#bbf7d0'};
      padding: 3px 5px;
      border-radius: 2px;
      font-size: 7.5px;
      margin-bottom: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bank-title {
      font-weight: bold;
      color: ${colorMode === 'bw' ? '#000000' : '#166534'};
      font-size: 8px;
      margin-bottom: 1px;
    }
    .terms-box {
      font-size: 7px;
      color: #64748b;
      line-height: 1.2;
      margin-top: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      background: #fafafa;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .totals-table td { padding: 2px 5px; font-size: 8.5px; border-bottom: 1px solid #f1f5f9; }
    .grand-total-row {
      background: ${colorMode === 'bw' ? '#000000' : '#0f172a'};
      color: #fff;
      font-weight: bold;
    }
    .grand-total-row td {
      color: ${colorMode === 'bw' ? '#ffffff' : '#facc15'};
      font-size: 11px;
      font-weight: 900;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-box { width: 120px; text-align: center; }
    .sign-line { border-bottom: 1px solid #334155; margin-bottom: 2px; height: 14px; }
    .qr-inline {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      background: #f8fafc;
      padding: 3px;
      border: 1px solid #e2e8f0;
      border-radius: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .qr-inline .receipt-qr-img { width: 38px; height: 38px; object-fit: contain; }
    @media print {
      body { width: 100%; margin: 0; padding: 0; }
      .invoice-page {
        page-break-after: always;
        break-after: page;
      }
      .invoice-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
${pages.map((page, pageIdx) => {
  const isLastPage = page.hasFooter;
  const pageStartIndex = page.startIndex;
  const pageTitleNote = totalPages > 1 ? ` (Page ${pageIdx + 1} of ${totalPages})` : '';
  const hasItemsOnPage = page.items.length > 0;

  return `
  <div class="invoice-page">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 62%;">
          <div class="store-name">${business.businessName || 'Tarama Enterprise'}</div>
          ${business.tagline ? `<div style="color: ${colorMode === 'bw' ? '#334155' : '#2563eb'}; font-weight: 600; font-size: 8.5px;">${business.tagline}</div>` : ''}
          <div class="store-sub">${business.address || ''}</div>
          <div class="store-sub">Phone: ${business.phone || ''} | Email: ${business.email || ''}</div>
          <div class="store-sub" style="font-weight: bold; color: #0f172a;">
            GSTIN: ${business.gstin || ''} | State: ${business.state || ''} (${business.stateCode || ''})
          </div>
        </td>
        <td style="vertical-align: top; width: 38%; text-align: right;">
          <div class="inv-badge">
            ${isWholesale ? 'TAX INVOICE' : 'RETAIL INVOICE'}
          </div>
          <div class="copy-text">ORIGINAL FOR RECIPIENT</div>
          <table style="margin-top: 2px; width: 100%; text-align: right;">
            <tr>
              <td style="font-size: 7.5px; color: #64748b;">Invoice No:</td>
              <td style="font-size: 9px; font-weight: bold; color: #0f172a;">${invNumber}${pageTitleNote}</td>
            </tr>
            <tr>
              <td style="font-size: 7.5px; color: #64748b;">Date:</td>
              <td style="font-size: 8px; font-weight: 600; color: #0f172a;">${invDate}</td>
            </tr>
            <tr>
              <td style="font-size: 7.5px; color: #64748b;">Mode:</td>
              <td style="font-size: 8px; color: #0f172a;">${paymentMethod.toUpperCase()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="parties-grid">
      <div class="party-col">
        <div class="section-title">${isWholesale ? 'BILLED TO (BUYER):' : 'CUSTOMER:'}</div>
        <div class="cust-name">${custName}</div>
        ${custPhone ? `<div class="party-sub">Mobile: ${custPhone}</div>` : ''}
        ${custAddress ? `<div class="party-sub">Address: ${custAddress}</div>` : ''}
        ${isWholesale && custGstin ? `<div class="party-sub" style="font-weight: bold;">Buyer GSTIN: ${custGstin}</div>` : ''}
      </div>
      <div class="status-col">
        <div><strong>Status:</strong> <span style="font-weight: bold; color: ${due === 0 ? '#059669' : '#dc2626'};">${due === 0 ? 'FULLY PAID' : 'DUE'}</span></div>
        <div style="font-size: 7.5px; color: #64748b;">Supply: ${business.state || ''} (${business.stateCode || ''})</div>
      </div>
    </div>

    ${hasItemsOnPage ? `
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 20px;">#</th>
          <th style="text-align: left;">ITEM</th>
          ${isWholesale ? '<th style="width: 40px;">HSN</th>' : ''}
          <th style="width: 30px; text-align: center;">QTY</th>
          <th style="width: 45px; text-align: right;">RATE</th>
          <th style="width: 35px; text-align: right;">DISC</th>
          ${showTaxBreakdown ? `
            <th style="width: 45px; text-align: right;">TAXABLE</th>
            <th style="width: 35px; text-align: center;">GST</th>
          ` : ''}
          <th style="width: 55px; text-align: right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${page.items.map((item, idx) => {
          const globalIdx = pageStartIndex + idx + 1;
          const itemQty = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1;
          const rawAmt = Number(item.unitPrice || 0) * itemQty;
          const discAmt = Number(item.discount || 0);
          const taxableAmt = Math.max(0, rawAmt - discAmt);
          const brand = getItemBrand(item);
          const subUnit = getItemSubUnit(item);
          const conversionRate = getItemConversionRate(item);
          const baseUnit = getItemBaseUnit(item);
          const metaParts: string[] = [];
          if (brand) metaParts.push(`Brand: <strong>${brand}</strong>`);
          if (subUnit) {
            const convInfo =
              conversionRate && Number(conversionRate) > 1
                ? ` (1 ${baseUnit} = ${conversionRate} ${subUnit})`
                : '';
            metaParts.push(`Sub Unit: <strong>${subUnit}${convInfo}</strong>`);
          } else if (conversionRate && Number(conversionRate) > 1) {
            metaParts.push(`Conversion: <strong>1 ${baseUnit} = ${conversionRate}</strong>`);
          }
          const metaLine = metaParts.length > 0 ? `<div style="font-size: 8px; font-weight: normal; color: #475569; margin-top: 1.5px;">${metaParts.join(' &nbsp;|&nbsp; ')}</div>` : '';

          return `
            <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
              <td style="text-align: center;">${globalIdx}</td>
              <td style="font-weight: 600;">
                <div>${item.productName || 'Item'}</div>
                ${metaLine}
              </td>
              ${isWholesale ? `<td style="text-align: center;">${item.hsn || '9983'}</td>` : ''}
              <td style="text-align: center;">
                ${item.quantity} ${item.unit || ''}
                ${subUnit && subUnit !== item.unit ? `<div style="font-size: 7.5px; color: #64748b; font-weight: normal;">(Sub: ${subUnit})</div>` : ''}
              </td>
              <td style="text-align: right;">${Number(item.unitPrice).toFixed(2)}</td>
              <td style="text-align: right;">${discAmt > 0 ? Number(discAmt).toFixed(2) : '-'}</td>
              ${showTaxBreakdown ? `
                <td style="text-align: right;">${taxableAmt.toFixed(2)}</td>
                <td style="text-align: center;">${item.gst || 0}%</td>
              ` : ''}
              <td style="text-align: right; font-weight: bold;">${Number(item.total).toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    ` : `
    <div style="font-size: 8px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 6px 0 4px 0; padding-bottom: 2px; border-bottom: 1px dashed #cbd5e1;">
      Bill Summary & Settlement (All ${items.length} products listed on Page 1):
    </div>
    `}

    ${!isLastPage ? `
      <div class="continuation-note">
        ${page.items.length === items.length
          ? `All products listed above. Continued on Page ${pageIdx + 2} of ${totalPages} for Bill Summary & Signatures &rarr;`
          : `Continued on Page ${pageIdx + 2} of ${totalPages} &rarr;`}
      </div>
    ` : `
      <div class="bottom-grid">
        <div class="bottom-left">
          <div class="words-box">
            <strong>Amount in Words:</strong><br/>
            <em>${words}</em>
          </div>

          ${isWholesale && showBankDetails ? `
            <div class="bank-box">
              <div class="bank-title">BANK DETAILS (NEFT/RTGS):</div>
              <div>Bank: <strong>${business.bankName || ''}</strong></div>
              <div>A/C: <strong>${business.accountNumber || ''}</strong> | IFSC: <strong>${business.ifscCode || ''}</strong></div>
            </div>
          ` : ''}

          ${showTerms ? `
            <div class="terms-box">
              <strong>Terms:</strong> 1. Goods once sold will not be exchanged. 2. Subject to local jurisdiction.
            </div>
          ` : ''}
        </div>

        <div class="bottom-right">
          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td style="color: #64748b;">Discount:</td>
                <td style="text-align: right; color: #dc2626;">-₹${discount.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${showTaxBreakdown && gst > 0 ? `
              <tr>
                <td style="color: #64748b;">CGST + SGST:</td>
                <td style="text-align: right;">₹${gst.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total-row">
              <td style="color: #fff; font-weight: bold;">${isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL:' : 'TOTAL:'}</td>
              <td style="text-align: right; color: ${colorMode === 'bw' ? '#ffffff' : '#facc15'}; font-size: 11px; font-weight: bold;">₹${total.toFixed(2)}</td>
            </tr>
            ${isBalanceActive && previousDue > 0 ? `
              <tr>
                <td style="color: #dc2626; font-weight: bold;">Previous Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : '#dc2626'};">+₹${previousDue.toFixed(2)}</td>
              </tr>
              <tr style="background: ${colorMode === 'bw' ? '#e2e8f0' : '#fee2e2'}; font-weight: bold;">
                <td style="color: ${colorMode === 'bw' ? '#000000' : '#991b1b'};">TOTAL PAYABLE:</td>
                <td style="text-align: right; color: ${colorMode === 'bw' ? '#000000' : '#991b1b'}; font-size: 10px;">₹${totalPayable.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${isBalanceActive && advancePayment > 0 ? `
              <tr>
                <td style="color: #16a34a; font-weight: bold;">Advance Adjusted:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : '#16a34a'};">-₹${adjustedAdvance.toFixed(2)}</td>
              </tr>
              <tr style="background: ${colorMode === 'bw' ? '#e2e8f0' : '#dcfce7'}; font-weight: bold;">
                <td style="color: ${colorMode === 'bw' ? '#000000' : '#166534'};">NET PAYABLE:</td>
                <td style="text-align: right; color: ${colorMode === 'bw' ? '#000000' : '#166534'}; font-size: 10px;">₹${netPayable.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b;">Received:</td>
              <td style="text-align: right; font-weight: bold;">₹${paid.toFixed(2)}</td>
            </tr>
            ${isBalanceActive && previousDue > 0 ? `
              <tr>
                <td style="color: #64748b; font-weight: bold;">Net Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (netBalanceDue > 0 ? '#dc2626' : '#64748b')};">₹${netBalanceDue.toFixed(2)}</td>
              </tr>
            ` : isBalanceActive && advancePayment > 0 ? `
              <tr>
                <td style="color: #64748b; font-weight: bold;">Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (netDue > 0 ? '#dc2626' : '#64748b')};">₹${netDue.toFixed(2)}</td>
              </tr>
              ${remainingAdvance > 0 ? `
              <tr>
                <td style="color: #2563eb; font-weight: bold;">Remaining Adv:</td>
                <td style="text-align: right; font-weight: bold; color: #2563eb;">₹${remainingAdvance.toFixed(2)}</td>
              </tr>
              ` : ''}
            ` : `
              <tr>
                <td style="color: #64748b;">Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (due > 0 ? '#dc2626' : '#64748b')};">₹${due.toFixed(2)}</td>
              </tr>
            `}
          </table>

          ${showQrCode ? `
            <div class="qr-inline">
              ${qrImageHtml}
              <div>
                <div style="font-weight: bold; font-size: 8px;">Scan to Pay UPI</div>
                <div style="font-size: 7.5px; color: #64748b;">${business.upiId || ''}</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      ${showSignatures ? `
        <div class="signatures-row">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div style="font-size: 7.5px; color: #64748b;">Customer Signature</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 7.5px; font-weight: bold;">For ${business.businessName || ''}</div>
            <div class="sign-line"></div>
            <div style="font-size: 7.5px; color: #64748b;">Authorized Signatory</div>
          </div>
        </div>
      ` : ''}
    `}
  </div>
  `;
}).join('')}
</body>
</html>`;
  }

  // Regular Half A4 Landscape
  const { pages: pagesLs, totalPages: totalPagesLs } = paginateInvoiceItems({
    items,
    paperFormat: 'halfA4Landscape',
    isWholesale,
    showBankDetails,
    isBalanceActive,
    previousDue,
    advancePayment,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invNumber}</title>
  <style>
    @page {
      size: 210mm 148.5mm landscape;
      margin: 4mm 6mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5px;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 0;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      ${colorMode === 'bw' ? `
      -webkit-filter: grayscale(100%);
      filter: grayscale(100%);
      ` : ''}
    }
    ${colorMode === 'bw' ? `
    * {
      -webkit-filter: grayscale(100%) !important;
      filter: grayscale(100%) !important;
    }
    .inv-badge {
      background: #000000 !important;
      color: #ffffff !important;
    }
    .status-paid, .status-due {
      color: #000000 !important;
    }
    .grand-total-row {
      background: #000000 !important;
      color: #ffffff !important;
    }
    .grand-total-row td {
      color: #ffffff !important;
    }
    .bank-box {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
      color: #000000 !important;
    }
    .bank-title {
      color: #000000 !important;
    }
    ` : ''}
    .invoice-page {
      width: 198mm;
      max-width: 198mm;
      margin: 0 auto;
      padding: 2mm 0;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .invoice-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid; }
    .store-name { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .store-sub { font-size: 9.5px; color: #334155; line-height: 1.3; }
    .inv-badge {
      background: ${colorMode === 'bw' ? '#000000' : (isWholesale ? '#1e293b' : '#047857')};
      color: #fff;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 3px;
      display: inline-block;
      text-align: right;
    }
    .copy-text { font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; }
    .parties-grid {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 5px;
      gap: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .party-col { flex: 1.5; }
    .status-col { flex: 1; text-align: right; }
    .section-title { font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .cust-name { font-size: 12px; font-weight: bold; color: #0f172a; }
    .party-sub { font-size: 9px; color: #334155; line-height: 1.3; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; border: 1px solid #cbd5e1; }
    .items-table th { background: #f1f5f9; font-size: 8.5px; font-weight: 700; color: #1e293b; padding: 4px 5px; border: 1px solid #cbd5e1; }
    .items-table td { font-size: 9px; padding: 3px 5px; border: 1px solid #e2e8f0; }
    .items-table tr { page-break-inside: avoid; break-inside: avoid; }
    .alt-row { background: #f8fafc; }
    .continuation-note {
      text-align: right;
      font-size: 8.5px;
      font-weight: 600;
      color: #64748b;
      margin-top: 5px;
      padding: 3px 0;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .bottom-grid { display: flex; justify-content: space-between; gap: 14px; margin-top: 5px; page-break-inside: avoid; break-inside: avoid; }
    .bottom-left { flex: 1.3; }
    .bottom-right { flex: 1; }
    .words-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; border-radius: 3px; font-size: 8.5px; margin-bottom: 4px; page-break-inside: avoid; break-inside: avoid; }
    .bank-box { background: ${colorMode === 'bw' ? '#f8fafc' : '#f0fdf4'}; border: 1px solid ${colorMode === 'bw' ? '#cbd5e1' : '#bbf7d0'}; padding: 4px 6px; border-radius: 3px; font-size: 8px; margin-bottom: 4px; page-break-inside: avoid; break-inside: avoid; }
    .bank-title { font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : '#166534'}; font-size: 8.5px; margin-bottom: 2px; }
    .terms-box { font-size: 8px; color: #64748b; line-height: 1.25; margin-top: 4px; page-break-inside: avoid; break-inside: avoid; }
    .totals-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; background: #fafafa; page-break-inside: avoid; break-inside: avoid; }
    .totals-table td { padding: 2px 6px; font-size: 9px; border-bottom: 1px solid #f1f5f9; }
    .grand-total-row { background: ${colorMode === 'bw' ? '#000000' : '#0f172a'}; color: #fff; font-weight: bold; }
    .grand-total-row td { color: ${colorMode === 'bw' ? '#ffffff' : '#facc15'}; font-size: 12px; font-weight: 900; }
    .signatures-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; page-break-inside: avoid; break-inside: avoid; }
    .sign-box { width: 140px; text-align: center; }
    .sign-line { border-bottom: 1px solid #334155; margin-bottom: 3px; height: 16px; }
    .qr-inline { display: flex; align-items: center; gap: 6px; margin-top: 4px; background: #f8fafc; padding: 4px; border: 1px solid #e2e8f0; border-radius: 3px; page-break-inside: avoid; break-inside: avoid; }
    .qr-inline .receipt-qr-img { width: 44px; height: 44px; object-fit: contain; }
    @media print {
      body { width: 100%; margin: 0; padding: 0; }
      .invoice-page {
        page-break-after: always;
        break-after: page;
      }
      .invoice-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
${pagesLs.map((page, pageIdx) => {
  const isLastPage = page.hasFooter;
  const pageStartIndex = page.startIndex;
  const pageTitleNote = totalPagesLs > 1 ? ` (Page ${pageIdx + 1} of ${totalPagesLs})` : '';
  const hasItemsOnPage = page.items.length > 0;

  return `
  <div class="invoice-page">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <div class="store-name">${business.businessName || 'Tarama Enterprise'}</div>
          ${business.tagline ? `<div style="color: ${colorMode === 'bw' ? '#334155' : '#2563eb'}; font-weight: 600; font-size: 10px;">${business.tagline}</div>` : ''}
          <div class="store-sub">${business.address || ''}</div>
          <div class="store-sub">Phone: ${business.phone || ''} | Email: ${business.email || ''}</div>
          <div class="store-sub" style="font-weight: bold; color: #0f172a;">
            GSTIN: ${business.gstin || ''} | PAN: ${business.pan || 'N/A'} | State: ${business.state || ''} (${business.stateCode || ''})
          </div>
        </td>
        <td style="vertical-align: top; width: 40%; text-align: right;">
          <div class="inv-badge">
            ${isWholesale ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH MEMO'}
          </div>
          <div class="copy-text">ORIGINAL FOR RECIPIENT</div>
          <table style="margin-top: 4px; width: 100%; text-align: right;">
            <tr>
              <td style="font-size: 8.5px; color: #64748b;">Invoice No:</td>
              <td style="font-size: 10px; font-weight: bold; color: #0f172a;">${invNumber}${pageTitleNote}</td>
            </tr>
            <tr>
              <td style="font-size: 8.5px; color: #64748b;">Date:</td>
              <td style="font-size: 9px; font-weight: 600; color: #0f172a;">${invDate}</td>
            </tr>
            <tr>
              <td style="font-size: 8.5px; color: #64748b;">Payment Mode:</td>
              <td style="font-size: 9px; color: #0f172a;">${paymentMethod.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-size: 8.5px; color: #64748b;">Biller:</td>
              <td style="font-size: 9px; color: #0f172a;">${biller}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div class="parties-grid">
      <div class="party-col">
        <div class="section-title">${isWholesale ? 'DETAILS OF BUYER / BILLED TO:' : 'CUSTOMER DETAILS:'}</div>
        <div class="cust-name">${custName}</div>
        ${custPhone ? `<div class="party-sub">Mobile: ${custPhone}</div>` : ''}
        ${custAddress ? `<div class="party-sub">Address: ${custAddress}</div>` : ''}
        ${isWholesale ? `
          <div class="party-sub" style="margin-top: 2px;">
            <strong>Buyer GSTIN:</strong> ${custGstin || 'Unregistered / B2C'} | <strong>State Code:</strong> ${business.stateCode || ''}
          </div>
        ` : ''}
      </div>
      <div class="status-col">
        <div><strong>Status:</strong> <span class="${due === 0 ? 'status-paid' : 'status-due'}" style="font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (due === 0 ? '#059669' : '#dc2626')};">${due === 0 ? 'FULLY PAID' : paid > 0 ? 'PARTIAL DUE' : 'UNPAID'}</span></div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Place of Supply: ${business.state || ''} (${business.stateCode || ''})</div>
      </div>
    </div>

    ${hasItemsOnPage ? `
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th style="text-align: left;">ITEM & DESCRIPTION</th>
          ${isWholesale ? '<th style="width: 50px;">HSN</th>' : ''}
          <th style="width: 40px; text-align: center;">QTY</th>
          <th style="width: 40px; text-align: center;">UNIT</th>
          <th style="width: 60px; text-align: right;">RATE (₹)</th>
          <th style="width: 50px; text-align: right;">DISC (₹)</th>
          ${showTaxBreakdown ? `
            <th style="width: 60px; text-align: right;">TAXABLE</th>
            <th style="width: 45px; text-align: center;">GST%</th>
          ` : ''}
          <th style="width: 70px; text-align: right;">AMOUNT (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${page.items.map((item, idx) => {
          const globalIdx = pageStartIndex + idx + 1;
          const itemQty = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1;
          const rawAmt = Number(item.unitPrice || 0) * itemQty;
          const discAmt = Number(item.discount || 0);
          const taxableAmt = Math.max(0, rawAmt - discAmt);
          const brand = getItemBrand(item);
          const subUnit = getItemSubUnit(item);
          const conversionRate = getItemConversionRate(item);
          const baseUnit = getItemBaseUnit(item);
          const metaParts: string[] = [];
          if (brand) metaParts.push(`Brand: <strong>${brand}</strong>`);
          if (subUnit) {
            const convInfo =
              conversionRate && Number(conversionRate) > 1
                ? ` (1 ${baseUnit} = ${conversionRate} ${subUnit})`
                : '';
            metaParts.push(`Sub Unit: <strong>${subUnit}${convInfo}</strong>`);
          } else if (conversionRate && Number(conversionRate) > 1) {
            metaParts.push(`Conversion: <strong>1 ${baseUnit} = ${conversionRate}</strong>`);
          }
          const metaLine = metaParts.length > 0 ? `<div style="font-size: 8.5px; font-weight: normal; color: #475569; margin-top: 1.5px;">${metaParts.join(' &nbsp;|&nbsp; ')}</div>` : '';

          return `
            <tr class="${idx % 2 === 1 ? 'alt-row' : ''}">
              <td style="text-align: center;">${globalIdx}</td>
              <td style="font-weight: 600;">
                <div>${item.productName || 'Item'}</div>
                ${metaLine}
              </td>
              ${isWholesale ? `<td style="text-align: center;">${item.hsn || '9983'}</td>` : ''}
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: center;">
                ${item.unit || 'Pcs'}
                ${subUnit && subUnit !== item.unit ? `<div style="font-size: 7.5px; color: #64748b; font-weight: normal;">(Sub: ${subUnit})</div>` : ''}
              </td>
              <td style="text-align: right;">${Number(item.unitPrice).toFixed(2)}</td>
              <td style="text-align: right;">${discAmt > 0 ? Number(discAmt).toFixed(2) : '-'}</td>
              ${showTaxBreakdown ? `
                <td style="text-align: right;">${taxableAmt.toFixed(2)}</td>
                <td style="text-align: center;">${item.gst || 0}%</td>
              ` : ''}
              <td style="text-align: right; font-weight: bold;">${Number(item.total).toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    ` : `
    <div style="font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 6px 0 4px 0; padding-bottom: 2px; border-bottom: 1px dashed #cbd5e1;">
      Bill Summary & Settlement (All ${items.length} products listed on Page 1):
    </div>
    `}

    ${!isLastPage ? `
      <div class="continuation-note">
        ${page.items.length === items.length
          ? `All products listed above. Continued on Page ${pageIdx + 2} of ${totalPagesLs} for Bill Summary & Signatures &rarr;`
          : `Continued on Page ${pageIdx + 2} of ${totalPagesLs} &rarr;`}
      </div>
    ` : `
      <div class="bottom-grid">
        <div class="bottom-left">
          <div class="words-box">
            <strong>Invoice Amount in Words:</strong><br/>
            <em>${words}</em>
          </div>

          ${isWholesale && showBankDetails ? `
            <div class="bank-box">
              <div class="bank-title">BANK DETAILS FOR WIRE TRANSFER / NEFT:</div>
              <div>Bank: <strong>${business.bankName || ''}</strong> | A/C No: <strong>${business.accountNumber || ''}</strong></div>
              <div>IFSC: <strong>${business.ifscCode || ''}</strong> | Branch: <strong>${business.branch || ''}</strong></div>
            </div>
          ` : ''}

          ${showTerms ? `
            <div class="terms-box">
              <strong>Terms & Conditions:</strong><br/>
              1. Payment due upon receipt of invoice.<br/>
              2. Goods once sold will not be returned or exchanged without original invoice.<br/>
              3. All disputes subject to local court jurisdiction.
            </div>
          ` : ''}
        </div>

        <div class="bottom-right">
          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td style="color: #64748b;">Discount:</td>
                <td style="text-align: right; color: #dc2626;">-₹${discount.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${showTaxBreakdown && gst > 0 ? `
              <tr>
                <td style="color: #64748b;">CGST:</td>
                <td style="text-align: right;">₹${cgstAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">SGST:</td>
                <td style="text-align: right;">₹${sgstAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total-row">
              <td style="color: #fff; font-weight: bold;">${isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL TOTAL:' : 'TOTAL AMOUNT:'}</td>
              <td style="text-align: right; color: ${colorMode === 'bw' ? '#ffffff' : '#facc15'}; font-size: 12px; font-weight: bold;">₹${total.toFixed(2)}</td>
            </tr>
            ${isBalanceActive && previousDue > 0 ? `
              <tr>
                <td style="color: #dc2626; font-weight: bold;">Previous Due Balance:</td>
                <td style="text-align: right; color: #dc2626; font-weight: bold;">+₹${previousDue.toFixed(2)}</td>
              </tr>
              <tr style="background: ${colorMode === 'bw' ? '#e2e8f0' : '#fee2e2'}; font-weight: bold;">
                <td style="color: ${colorMode === 'bw' ? '#000000' : '#991b1b'}; font-size: 10px;">TOTAL PAYABLE:</td>
                <td style="text-align: right; color: ${colorMode === 'bw' ? '#000000' : '#991b1b'}; font-size: 10.5px;">₹${totalPayable.toFixed(2)}</td>
              </tr>
            ` : ''}
            ${isBalanceActive && advancePayment > 0 ? `
              <tr>
                <td style="color: #16a34a; font-weight: bold;">Previous Advance Available:</td>
                <td style="text-align: right; color: #16a34a; font-weight: bold;">-₹${adjustedAdvance.toFixed(2)}</td>
              </tr>
              <tr style="background: ${colorMode === 'bw' ? '#e2e8f0' : '#dcfce7'}; font-weight: bold;">
                <td style="color: ${colorMode === 'bw' ? '#000000' : '#166534'}; font-size: 10px;">NET PAYABLE:</td>
                <td style="text-align: right; color: ${colorMode === 'bw' ? '#000000' : '#166534'}; font-size: 10.5px;">₹${netPayable.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b;">Amount Received:</td>
              <td style="text-align: right; color: ${colorMode === 'bw' ? '#000000' : '#059669'}; font-weight: bold;">₹${paid.toFixed(2)}</td>
            </tr>
            ${isBalanceActive && previousDue > 0 ? `
              <tr>
                <td style="color: #64748b; font-weight: bold;">Net Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (netBalanceDue > 0 ? '#dc2626' : '#64748b')};">₹${netBalanceDue.toFixed(2)}</td>
              </tr>
            ` : isBalanceActive && advancePayment > 0 ? `
              <tr>
                <td style="color: #64748b; font-weight: bold;">Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (netDue > 0 ? '#dc2626' : '#64748b')};">₹${netDue.toFixed(2)}</td>
              </tr>
              ${remainingAdvance > 0 ? `
              <tr>
                <td style="color: #2563eb; font-weight: bold;">Remaining Advance:</td>
                <td style="text-align: right; font-weight: bold; color: #2563eb;">₹${remainingAdvance.toFixed(2)}</td>
              </tr>
              ` : ''}
            ` : `
              <tr>
                <td style="color: #64748b;">Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${colorMode === 'bw' ? '#000000' : (due > 0 ? '#dc2626' : '#64748b')};">₹${due.toFixed(2)}</td>
              </tr>
            `}
          </table>

          ${showQrCode ? `
            <div class="qr-inline">
              ${qrImageHtml}
              <div>
                <div style="font-weight: bold; font-size: 8.5px;">Scan to Pay UPI</div>
                <div style="font-size: 8px; color: #64748b;">${business.upiId || ''}</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      ${showSignatures ? `
        <div class="signatures-row">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-label">Customer's Signature</div>
          </div>
          <div class="sign-box">
            <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">For ${business.businessName || ''}</div>
            <div class="sign-line"></div>
            <div class="sign-label">Authorized Signatory</div>
          </div>
        </div>
      ` : ''}
    `}
  </div>
  `;
}).join('')}
</body>
</html>`;
}

export const ReceiptPrintPreviewModal: React.FC<ReceiptPrintPreviewModalProps> = ({
  visible,
  onClose,
  data,
  initialFormat = '80mm',
  initialCustomerType,
  initialColorMode,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  const { settings } = useInvoiceSettingsStore();
  const business = settings.businessProfile;

  // Selected paper size: '80mm' | '140x210mm' | 'halfA4Landscape'
  const defaultPaperFormat: ReceiptPaperFormat = 
    settings.defaultPreviewType === '140x210mm' || settings.paperSize === '140x210mm'
      ? '140x210mm'
      : settings.defaultPreviewType === 'halfA4Landscape' || settings.paperSize === 'halfA4Landscape' || settings.defaultPreviewType === 'invoice'
      ? 'halfA4Landscape'
      : '80mm';

  const [paperFormat, setPaperFormat] = useState<ReceiptPaperFormat>(
    initialFormat || defaultPaperFormat
  );

  // Print color mode: 'bw' (Default) or 'color'
  const [colorMode, setColorMode] = useState<'bw' | 'color'>(
    initialColorMode || settings.printColorMode || 'bw'
  );

  useEffect(() => {
    if (initialColorMode) {
      setColorMode(initialColorMode);
    } else if (settings.printColorMode) {
      setColorMode(settings.printColorMode);
    }
  }, [initialColorMode, settings.printColorMode]);

  useEffect(() => {
    if (initialFormat) {
      setPaperFormat(initialFormat);
    } else {
      const defFormat: ReceiptPaperFormat =
        settings.defaultPreviewType === '140x210mm' || settings.paperSize === '140x210mm'
          ? '140x210mm'
          : settings.defaultPreviewType === 'halfA4Landscape' || settings.paperSize === 'halfA4Landscape' || settings.defaultPreviewType === 'invoice'
          ? 'halfA4Landscape'
          : '80mm';
      setPaperFormat(defFormat);
    }
  }, [initialFormat, settings.defaultPreviewType, settings.paperSize, visible]);

  // Customer / Invoice Type: 'retail' or 'wholesale'
  const detectedCustomerType: 'retail' | 'wholesale' = useMemo(() => {
    if (initialCustomerType) return initialCustomerType;
    if (data?.customerType) return data.customerType;
    if (data?.customerGstin && data.customerGstin.trim().length > 3) return 'wholesale';
    return 'retail';
  }, [initialCustomerType, data]);

  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>(detectedCustomerType);

  useEffect(() => {
    setCustomerType(detectedCustomerType);
  }, [detectedCustomerType]);

  // Options toggles
  const [showBusinessInfo, setShowBusinessInfo] = useState(true);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);
  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(1.5, Math.round((prev + 0.15) * 100) / 100));
  };
  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(0.35, Math.round((prev - 0.15) * 100) / 100));
  };
  const handleZoomReset = () => {
    setZoomScale(1);
  };
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviousBalance, setShowPreviousBalance] = useState<boolean>(
    data?.showPreviousBalance !== undefined ? Boolean(data.showPreviousBalance) : true
  );

  useEffect(() => {
    if (data?.showPreviousBalance !== undefined) {
      setShowPreviousBalance(Boolean(data.showPreviousBalance));
    }
  }, [data?.showPreviousBalance]);

  // Print execution handler for Web & Mobile using clean isolated HTML iframe
  const handlePrint = () => {
    if (!data) return;
    if (Platform.OS === 'web' && typeof (globalThis as any).window !== 'undefined') {
      try {
        const htmlContent = generateReceiptHtml({
          data,
          business,
          settings,
          paperFormat,
          customerType,
          colorMode,
          showBusinessInfo,
          showTaxBreakdown,
          showBankDetails,
          showQrCode,
          showTerms,
          showSignatures,
          showPreviousBalance,
        });

        printHtmlViaIframe(htmlContent);
      } catch (err) {
        console.error('Print error:', err);
        Alert.alert('Print Error', 'Could not open browser print dialog.');
      }
    } else {
      Alert.alert(
        'Print Preview Ready',
        `Receipt #${data?.invoiceNumber || ''} is ready for ${
          paperFormat === '80mm' ? 'Thermal (80 mm)' : 'Regular (Half A4 Landscape)'
        } print.`
      );
    }
  };

  if (!visible || !data) return null;

  // Normalized values
  const invNumber = data.invoiceNumber || 'INV-0000';
  const invDate = data.date || new Date().toISOString().split('T')[0];
  const custName = data.customerName || (data as any).customer?.name || 'Walk-in Customer';
  const custPhone = data.customerPhone || (data as any).customer?.phone || '';
  const custAddress = data.customerAddress || (data as any).customer?.address || '';
  const custGstin = data.customerGstin || (data as any).customer?.taxNumber || (data as any).customer?.taxId || (data as any).customer?.gstin || '';
  const subtotal = Number(data.subtotal || 0);
  const discount = Number(data.discount || 0);
  const gst = Number(data.gst || data.orderTax || 0);
  const total = Number(data.total || 0);
  const paid = Number(data.paid !== undefined ? data.paid : total);
  const due = Number(data.due !== undefined ? data.due : Math.max(0, total - paid));
  const biller = data.biller || 'Cashier';
  const paymentMethod = data.paymentMethod || 'Cash';
  const items = data.items || [];

  // Previous balance calculations for preview
  const previousDue = Number(data.previousDue || 0);
  const advancePayment = Number(data.advancePayment || 0);
  const isBalanceActive = Boolean(
    showPreviousBalance && (previousDue > 0 || advancePayment > 0)
  );

  const totalPayable = total + (isBalanceActive && previousDue > 0 ? previousDue : 0);
  const netBalanceDue = Math.max(0, totalPayable - paid);

  const adjustedAdvance = Math.min(advancePayment, total);
  const netPayable = Math.max(0, total - adjustedAdvance);
  const netDue = Math.max(0, netPayable - paid);
  const remainingAdvance = Math.max(0, advancePayment - adjustedAdvance);

  const isWholesale = customerType === 'wholesale';
  const isThermal = paperFormat === '80mm';

  // Active payable and amount in words
  const activePayableAmount =
    isBalanceActive && previousDue > 0
      ? totalPayable
      : isBalanceActive && advancePayment > 0
      ? netPayable
      : total;
  const words = amountToWords(activePayableAmount);

  // Tax calculations for GST
  const cgstAmount = Number((gst / 2).toFixed(2));
  const sgstAmount = Number((gst / 2).toFixed(2));

  const renderControlsContent = () => (
    <>
      <View style={styles.selectorGroup}>
        <Text style={styles.controlLabel}>Paper Size:</Text>
        <View style={styles.segmentedButtons}>
          <TouchableOpacity
            style={[styles.segmentBtn, paperFormat === '80mm' && styles.segmentBtnActive]}
            onPress={() => setPaperFormat('80mm')}
          >
            <FileText size={13} color={paperFormat === '80mm' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, paperFormat === '80mm' && styles.segmentTextActive]}>
              80 mm Thermal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, paperFormat === '140x210mm' && styles.segmentBtnActive]}
            onPress={() => setPaperFormat('140x210mm')}
          >
            <FileText size={13} color={paperFormat === '140x210mm' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, paperFormat === '140x210mm' && styles.segmentTextActive]}>
              140×210 mm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, paperFormat === 'halfA4Landscape' && styles.segmentBtnActive]}
            onPress={() => setPaperFormat('halfA4Landscape')}
          >
            <Building2 size={13} color={paperFormat === 'halfA4Landscape' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, paperFormat === 'halfA4Landscape' && styles.segmentTextActive]}>
              Half A4 Landscape
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.selectorGroup}>
        <Text style={styles.controlLabel}>Type:</Text>
        <View style={styles.segmentedButtons}>
          <TouchableOpacity
            style={[styles.segmentBtn, !isWholesale && styles.segmentBtnGreenActive]}
            onPress={() => setCustomerType('retail')}
          >
            <User size={13} color={!isWholesale ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, !isWholesale && styles.segmentTextActive]}>
              Retail Receipt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, isWholesale && styles.segmentBtnPurpleActive]}
            onPress={() => setCustomerType('wholesale')}
          >
            <Building2 size={13} color={isWholesale ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.segmentText, isWholesale && styles.segmentTextActive]}>
              Wholesale Tax Invoice
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Mode Selector */}
      <View style={styles.selectorGroup}>
        <Text style={styles.controlLabel}>Color:</Text>
        <View style={styles.segmentedButtons}>
          <TouchableOpacity
            style={[styles.segmentBtn, colorMode === 'bw' && styles.segmentBtnDarkActive]}
            onPress={() => setColorMode('bw')}
          >
            <Text style={[styles.segmentText, colorMode === 'bw' && styles.segmentTextActive]}>
              ⚫ B&W
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, colorMode === 'color' && styles.segmentBtnActive]}
            onPress={() => setColorMode('color')}
          >
            <Text style={[styles.segmentText, colorMode === 'color' && styles.segmentTextActive]}>
              🎨 Color
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick toggles */}
      <View style={styles.togglesRow}>
        <TouchableOpacity
          style={[styles.toggleChip, showTaxBreakdown && styles.toggleChipActive]}
          onPress={() => setShowTaxBreakdown(!showTaxBreakdown)}
        >
          {showTaxBreakdown && <Check size={11} color="#2563EB" />}
          <Text style={[styles.toggleChipText, showTaxBreakdown && styles.toggleChipTextActive]}>
            Tax / GST
          </Text>
        </TouchableOpacity>

        {isWholesale && !isThermal && (
          <TouchableOpacity
            style={[styles.toggleChip, showBankDetails && styles.toggleChipActive]}
            onPress={() => setShowBankDetails(!showBankDetails)}
          >
            {showBankDetails && <Check size={11} color="#2563EB" />}
            <Text style={[styles.toggleChipText, showBankDetails && styles.toggleChipTextActive]}>
              Bank Info
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.toggleChip, showQrCode && styles.toggleChipActive]}
          onPress={() => setShowQrCode(!showQrCode)}
        >
          {showQrCode && <Check size={11} color="#2563EB" />}
          <Text style={[styles.toggleChipText, showQrCode && styles.toggleChipTextActive]}>
            UPI QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleChip, showTerms && styles.toggleChipActive]}
          onPress={() => setShowTerms(!showTerms)}
        >
          {showTerms && <Check size={11} color="#2563EB" />}
          <Text style={[styles.toggleChipText, showTerms && styles.toggleChipTextActive]}>
            Terms & Sign
          </Text>
        </TouchableOpacity>

        {((previousDue > 0) || (advancePayment > 0) || data.showPreviousBalance !== undefined) && (
          <TouchableOpacity
            style={[styles.toggleChip, showPreviousBalance && styles.toggleChipActive]}
            onPress={() => setShowPreviousBalance(!showPreviousBalance)}
          >
            {showPreviousBalance && <Check size={11} color="#2563EB" />}
            <Text style={[styles.toggleChipText, showPreviousBalance && styles.toggleChipTextActive]}>
              {previousDue > 0 ? 'Prev Due' : advancePayment > 0 ? 'Advance' : 'Prev Balance'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { padding: isMobile ? 0 : 16 }]}>
        <View
          style={[
            styles.modalCard,
            isMobile
              ? { width: '100%', height: '100%', borderRadius: 0, borderWidth: 0 }
              : { width: '94%', maxWidth: 1080, height: '92%', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
          ]}
        >
          {/* Header Action Bar */}
          {isMobile ? (
            <View style={styles.topBarMobile}>
              <View style={styles.titleGroupMobile}>
                <View style={styles.printerIconBadge}>
                  <Printer size={16} color="#2563EB" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.modalTitleMobile} numberOfLines={1}>Print Preview</Text>
                    <View style={styles.invoiceBadge}>
                      <Text style={styles.invoiceBadgeText} numberOfLines={1}>{invNumber}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.topActionsMobile}>
                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} accessibilityLabel="Zoom Out">
                    <ZoomOut size={13} color="#94A3B8" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.zoomResetBtn} onPress={handleZoomReset} accessibilityLabel="Reset Zoom">
                    <Text style={styles.zoomText}>{Math.round(zoomScale * 100)}%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} accessibilityLabel="Zoom In">
                    <ZoomIn size={13} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeIconButton} onPress={onClose} accessibilityLabel="Close Preview">
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.topBar}>
              <View style={styles.titleGroup}>
                <View style={styles.printerIconBadge}>
                  <Printer size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.modalTitle}>Receipt Print Preview</Text>
                    <View style={styles.invoiceBadge}>
                      <Text style={styles.invoiceBadgeText}>{invNumber}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    Preview before sending to {isThermal ? '80mm Thermal Printer' : paperFormat === '140x210mm' ? '140×210 mm Sheet' : 'Half A4 Landscape Sheet'}
                  </Text>
                </View>
              </View>

              <View style={styles.topActions}>
                {/* Desktop Zoom Controls */}
                <View style={styles.zoomControls}>
                  <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} accessibilityLabel="Zoom Out">
                    <ZoomOut size={14} color="#94A3B8" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.zoomResetBtn} onPress={handleZoomReset} accessibilityLabel="Reset Zoom">
                    <Text style={styles.zoomText}>{Math.round(zoomScale * 100)}%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} accessibilityLabel="Zoom In">
                    <ZoomIn size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.printButton, { backgroundColor: '#10B981' }]}
                  onPress={() => setShowShareModal(true)}
                >
                  <Share2 size={16} color="#FFFFFF" />
                  <Text style={styles.printButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.printButton}
                  onPress={handlePrint}
                >
                  <Printer size={16} color="#FFFFFF" />
                  <Text style={styles.printButtonText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeIconButton} onPress={onClose} accessibilityLabel="Close Preview">
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Controls Bar: Format Selector & Customer Type Selector */}
          {isMobile ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.controlsScrollContent}
              style={styles.controlsBarMobileScroll}
            >
              {renderControlsContent()}
            </ScrollView>
          ) : (
            <View style={styles.controlsBar}>
              {renderControlsContent()}
            </View>
          )}

          {/* Main Preview Container */}
          <View style={styles.previewCanvasArea}>
            <ScrollView
              style={styles.canvasVerticalScroll}
              contentContainerStyle={styles.canvasVerticalContent}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.canvasHorizontalContent}
              >
                {/* Native Print Area Container with ID for CSS Print Query */}
                {/* @ts-ignore */}
                <View
                  nativeID="receipt-print-canvas"
                  id="receipt-print-canvas"
                  style={[
                    isThermal
                      ? styles.thermalSheet
                      : paperFormat === '140x210mm'
                      ? styles.p140Sheet
                      : styles.landscapeSheet,
                    {
                      transform: zoomScale !== 1 ? [{ scale: zoomScale }] : undefined,
                      ...(Platform.OS === 'web' ? { transformOrigin: 'top center' } : {}),
                    },
                    colorMode === 'bw' && Platform.OS === 'web' ? ({ filter: 'grayscale(100%)' } as any) : undefined,
                  ]}
                >
                {isThermal ? (
                  /* ======================================================== */
                  /*                80 MM THERMAL RECEIPT LAYOUT              */
                  /* ======================================================== */
                  <View style={styles.thermalInner}>
                    {/* Header */}
                    {showBusinessInfo && (
                      <View style={styles.thermalCenterHeader}>
                        <Text style={styles.thermalStoreName}>{business.businessName}</Text>
                        {!!business.tagline && (
                          <Text style={styles.thermalTagline}>{business.tagline}</Text>
                        )}
                        <Text style={styles.thermalAddress}>{business.address}</Text>
                        <Text style={styles.thermalContact}>
                          Phone: {business.phone}
                        </Text>
                        <Text style={styles.thermalGstin}>
                          GSTIN: {business.gstin}
                        </Text>
                      </View>
                    )}

                    <View style={styles.thermalDashedLine} />

                    {/* Receipt Title & Meta */}
                    <View style={styles.thermalBadgeBox}>
                      <Text style={styles.thermalBadgeTitle}>
                        {isWholesale ? '*** WHOLESALE TAX INVOICE ***' : '*** RETAIL CASH RECEIPT ***'}
                      </Text>
                    </View>

                    <View style={styles.thermalMetaRow}>
                      <Text style={styles.thermalMono}>Invoice No: {invNumber}</Text>
                      <Text style={styles.thermalMono}>Date: {invDate}</Text>
                    </View>
                    <View style={styles.thermalMetaRow}>
                      <Text style={styles.thermalMono}>Cashier: {biller}</Text>
                      <Text style={styles.thermalMono}>Mode: {paymentMethod.toUpperCase()}</Text>
                    </View>

                    {/* Customer Info */}
                    <View style={styles.thermalCustomerBox}>
                      <Text style={styles.thermalMonoBold}>Customer: {custName}</Text>
                      {!!custPhone && <Text style={styles.thermalMono}>Phone: {custPhone}</Text>}
                      {isWholesale && !!custGstin && (
                        <Text style={styles.thermalMonoBold}>Cust GSTIN: {custGstin}</Text>
                      )}
                      {isWholesale && !!custAddress && (
                        <Text style={styles.thermalMono}>Address: {custAddress}</Text>
                      )}
                    </View>

                    <View style={styles.thermalDashedLine} />

                    {/* Items Header */}
                    <View style={styles.thermalItemHeaderRow}>
                      <Text style={[styles.thermalMonoBold, { flex: 2 }]}>ITEM</Text>
                      <Text style={[styles.thermalMonoBold, { width: 36, textAlign: 'center' }]}>QTY</Text>
                      <Text style={[styles.thermalMonoBold, { width: 55, textAlign: 'right' }]}>RATE</Text>
                      <Text style={[styles.thermalMonoBold, { width: 65, textAlign: 'right' }]}>TOTAL</Text>
                    </View>

                    <View style={styles.thermalDottedLine} />

                    {/* Items List */}
                    {items.map((item, idx) => {
                      const metaText = formatItemMeta(item);
                      return (
                        <View key={idx} style={styles.thermalItemBlock}>
                          <Text style={styles.thermalItemName}>
                            {item.productName || `Product #${item.productId || idx + 1}`}
                            {item.hsn ? ` (HSN: ${item.hsn})` : ''}
                          </Text>
                          {metaText ? (
                            <Text style={{ fontSize: 10, color: '#475569', marginTop: 1, marginBottom: 2 }}>
                              {metaText}
                            </Text>
                          ) : null}
                          <View style={styles.thermalItemDetailRow}>
                            <Text style={[styles.thermalMono, { flex: 2, color: '#475569' }]}>
                              {item.discount ? `Disc: -₹${Number(item.discount).toFixed(2)}` : ''}
                              {showTaxBreakdown && item.gst ? ` GST ${item.gst}%` : ''}
                            </Text>
                            <Text style={[styles.thermalMono, { width: 36, textAlign: 'center' }]}>
                              {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                            </Text>
                            <Text style={[styles.thermalMono, { width: 55, textAlign: 'right' }]}>
                              {Number(item.unitPrice).toFixed(2)}
                            </Text>
                            <Text style={[styles.thermalMonoBold, { width: 65, textAlign: 'right' }]}>
                              {Number(item.total).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                    <View style={styles.thermalDashedLine} />

                    {/* Totals Breakdown */}
                    <View style={styles.thermalSummarySection}>
                      <View style={styles.thermalSummaryRow}>
                        <Text style={styles.thermalMono}>Items Count: {items.length}</Text>
                        <Text style={styles.thermalMono}>
                          Total Qty: {Number(items.reduce((s, it) => s + (Number(it.quantity) || 0), 0).toFixed(4))}
                        </Text>
                      </View>
                      <View style={styles.thermalSummaryRow}>
                        <Text style={styles.thermalMono}>Subtotal:</Text>
                        <Text style={styles.thermalMono}>₹{subtotal.toFixed(2)}</Text>
                      </View>
                      {discount > 0 && (
                        <View style={styles.thermalSummaryRow}>
                          <Text style={styles.thermalMono}>Discount:</Text>
                          <Text style={styles.thermalMono}>-₹{discount.toFixed(2)}</Text>
                        </View>
                      )}
                      {showTaxBreakdown && gst > 0 && (
                        <>
                          <View style={styles.thermalSummaryRow}>
                            <Text style={styles.thermalMono}>CGST ({(gst > 0 ? 'Tax' : '')}):</Text>
                            <Text style={styles.thermalMono}>₹{cgstAmount.toFixed(2)}</Text>
                          </View>
                          <View style={styles.thermalSummaryRow}>
                            <Text style={styles.thermalMono}>SGST:</Text>
                            <Text style={styles.thermalMono}>₹{sgstAmount.toFixed(2)}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    <View style={styles.thermalDoubleLine} />

                    {/* Grand Total */}
                    <View style={styles.thermalGrandTotalRow}>
                      <Text style={styles.thermalGrandTotalLabel}>
                        {isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL:' : 'GRAND TOTAL:'}
                      </Text>
                      <Text style={styles.thermalGrandTotalValue}>₹{total.toFixed(2)}</Text>
                    </View>

                    {isBalanceActive && previousDue > 0 && (
                      <>
                        <View style={styles.thermalSummaryRow}>
                          <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>Previous Due:</Text>
                          <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>+₹{previousDue.toFixed(2)}</Text>
                        </View>
                        <View style={[styles.thermalGrandTotalRow, { marginTop: 2 }]}>
                          <Text style={[styles.thermalGrandTotalLabel, { fontSize: 13 }]}>TOTAL PAYABLE:</Text>
                          <Text style={[styles.thermalGrandTotalValue, { fontSize: 13 }]}>₹{totalPayable.toFixed(2)}</Text>
                        </View>
                      </>
                    )}

                    {isBalanceActive && advancePayment > 0 && (
                      <>
                        <View style={styles.thermalSummaryRow}>
                          <Text style={[styles.thermalMonoBold, { color: '#16A34A' }]}>Advance Credit:</Text>
                          <Text style={[styles.thermalMonoBold, { color: '#16A34A' }]}>-₹{adjustedAdvance.toFixed(2)}</Text>
                        </View>
                        <View style={[styles.thermalGrandTotalRow, { marginTop: 2 }]}>
                          <Text style={[styles.thermalGrandTotalLabel, { fontSize: 13 }]}>NET PAYABLE:</Text>
                          <Text style={[styles.thermalGrandTotalValue, { fontSize: 13 }]}>₹{netPayable.toFixed(2)}</Text>
                        </View>
                      </>
                    )}

                    <View style={styles.thermalDoubleLine} />

                    {/* Payment Info */}
                    <View style={styles.thermalSummarySection}>
                      <View style={styles.thermalSummaryRow}>
                        <Text style={styles.thermalMono}>Amount Paid:</Text>
                        <Text style={styles.thermalMonoBold}>₹{paid.toFixed(2)}</Text>
                      </View>
                      {isBalanceActive && previousDue > 0 ? (
                        <View style={styles.thermalSummaryRow}>
                          <Text style={[styles.thermalMonoBold, { color: netBalanceDue > 0 ? '#DC2626' : '#059669' }]}>Net Balance Due:</Text>
                          <Text style={[styles.thermalMonoBold, { color: netBalanceDue > 0 ? '#DC2626' : '#059669' }]}>₹{netBalanceDue.toFixed(2)}</Text>
                        </View>
                      ) : isBalanceActive && advancePayment > 0 ? (
                        <>
                          <View style={styles.thermalSummaryRow}>
                            <Text style={[styles.thermalMonoBold, { color: netDue > 0 ? '#DC2626' : '#059669' }]}>Balance Due:</Text>
                            <Text style={[styles.thermalMonoBold, { color: netDue > 0 ? '#DC2626' : '#059669' }]}>₹{netDue.toFixed(2)}</Text>
                          </View>
                          {remainingAdvance > 0 && (
                            <View style={styles.thermalSummaryRow}>
                              <Text style={[styles.thermalMonoBold, { color: '#2563EB' }]}>Remaining Advance:</Text>
                              <Text style={[styles.thermalMonoBold, { color: '#2563EB' }]}>₹{remainingAdvance.toFixed(2)}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        due > 0 && (
                          <View style={styles.thermalSummaryRow}>
                            <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>Balance Due:</Text>
                            <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>₹{due.toFixed(2)}</Text>
                          </View>
                        )
                      )}
                    </View>

                    {/* QR Code Section */}
                    {showQrCode && (
                      <View style={styles.thermalQrBox}>
                        <View style={styles.simulatedQr}>
                          <Image
                            source={{ uri: QR_CODE_DATA_URI }}
                            style={styles.thermalQrImg}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={styles.thermalQrCaption}>
                          Scan with UPI to Pay / Verify
                        </Text>
                        <Text style={styles.thermalUpiId}>{business.upiId}</Text>
                      </View>
                    )}

                    {/* Footer Messages */}
                    {showTerms && (
                      <View style={styles.thermalFooterSection}>
                        <Text style={styles.thermalFooterMsg}>{settings.footerMessage}</Text>
                        <Text style={styles.thermalTermsText}>
                          * Goods once sold will not be exchanged after 7 days.
                        </Text>
                        <Text style={styles.thermalTermsText}>
                          * Subject to local jurisdiction.
                        </Text>
                      </View>
                    )}

                    <View style={styles.thermalDashedLine} />
                    <Text style={styles.thermalPoweredBy}>Printed via Billing System</Text>
                  </View>
                ) : paperFormat === '140x210mm' ? (
                  /* ======================================================== */
                  /*        140 MM X 210 MM PORTRAIT INVOICE LAYOUT          */
                  /* ======================================================== */
                  <View style={styles.p140Inner}>
                    {/* Header */}
                    <View style={styles.p140HeaderTable}>
                      <View style={{ flex: 1.4 }}>
                        <Text style={styles.p140StoreName}>{business.businessName || 'Tarama Enterprise'}</Text>
                        {business.tagline ? <Text style={styles.p140Tagline}>{business.tagline}</Text> : null}
                        <Text style={styles.p140StoreSub}>{business.address || ''}</Text>
                        <Text style={styles.p140StoreSub}>Phone: {business.phone || ''}</Text>
                        <Text style={[styles.p140StoreSub, { fontWeight: '700', color: '#0F172A', marginTop: 2 }]}>
                          GSTIN: {business.gstin || ''} | State: {business.state || 'West Bengal'} ({business.stateCode || '19'})
                        </Text>
                      </View>

                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View style={[styles.p140Badge, { backgroundColor: isWholesale ? '#1E293B' : '#047857' }]}>
                          <Text style={styles.p140BadgeText}>
                            {isWholesale ? 'TAX INVOICE' : 'RETAIL INVOICE'}
                          </Text>
                        </View>
                        <Text style={styles.p140Original}>ORIGINAL FOR RECIPIENT</Text>

                        <View style={styles.p140MetaGrid}>
                          <View style={styles.p140MetaRow}>
                            <Text style={styles.p140MetaKey}>Invoice No:</Text>
                            <Text style={styles.p140MetaVal}>{invNumber}</Text>
                          </View>
                          <View style={styles.p140MetaRow}>
                            <Text style={styles.p140MetaKey}>Date:</Text>
                            <Text style={styles.p140MetaVal}>{invDate}</Text>
                          </View>
                          <View style={styles.p140MetaRow}>
                            <Text style={styles.p140MetaKey}>Mode:</Text>
                            <Text style={styles.p140MetaVal}>{paymentMethod.toUpperCase()}</Text>
                          </View>
                          <View style={styles.p140MetaRow}>
                            <Text style={styles.p140MetaKey}>Biller:</Text>
                            <Text style={styles.p140MetaVal}>{biller}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Parties */}
                    <View style={styles.p140PartiesRow}>
                      <View style={{ flex: 1.4 }}>
                        <Text style={styles.p140SectionHead}>
                          {isWholesale ? 'BILLED TO (BUYER):' : 'CUSTOMER:'}
                        </Text>
                        <Text style={styles.p140CustName}>{custName}</Text>
                        {custPhone ? <Text style={styles.p140PartySub}>Phone: {custPhone}</Text> : null}
                        {custAddress ? <Text style={styles.p140PartySub}>Address: {custAddress}</Text> : null}
                        {isWholesale && custGstin ? (
                          <Text style={[styles.p140PartySub, { fontWeight: '700', marginTop: 1 }]}>
                            GSTIN: {custGstin}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={[styles.p140StatusPaid, { color: due === 0 ? '#059669' : paid > 0 ? '#D97706' : '#DC2626' }]}>
                          STATUS: {due === 0 ? 'FULLY PAID' : paid > 0 ? 'PARTIAL DUE' : 'UNPAID'}
                        </Text>
                        <Text style={styles.p140PartySub}>Place of Supply: {business.state} ({business.stateCode})</Text>
                      </View>
                    </View>

                    {/* Items Table */}
                    <View style={styles.p140Table}>
                      <View style={styles.p140TableHead}>
                        <Text style={[styles.p140Th, { width: 22, textAlign: 'center' }]}>#</Text>
                        <Text style={[styles.p140Th, { flex: 2 }]}>ITEM & DESCRIPTION</Text>
                        {isWholesale && <Text style={[styles.p140Th, { width: 42, textAlign: 'center' }]}>HSN</Text>}
                        <Text style={[styles.p140Th, { width: 36, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.p140Th, { width: 48, textAlign: 'right' }]}>RATE</Text>
                        <Text style={[styles.p140Th, { width: 42, textAlign: 'right' }]}>DISC</Text>
                        {showTaxBreakdown && (
                          <>
                            <Text style={[styles.p140Th, { width: 48, textAlign: 'right' }]}>TAXABLE</Text>
                            <Text style={[styles.p140Th, { width: 34, textAlign: 'center' }]}>GST%</Text>
                          </>
                        )}
                        <Text style={[styles.p140Th, { width: 62, textAlign: 'right' }]}>TOTAL</Text>
                      </View>

                      {items.map((item, idx) => {
                        const itemQty = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1;
                        const rawAmt = Number(item.unitPrice || 0) * itemQty;
                        const discAmt = Number(item.discount || 0);
                        const taxableAmt = Math.max(0, rawAmt - discAmt);
                        const metaText = formatItemMeta(item);

                        return (
                          <View key={idx} style={[styles.p140TableRow, idx % 2 === 1 && styles.p140TableRowAlt]}>
                            <Text style={[styles.p140Td, { width: 22, textAlign: 'center' }]}>{idx + 1}</Text>
                            <View style={{ flex: 2 }}>
                              <Text style={[styles.p140Td, { fontWeight: '600', color: '#0F172A' }]}>
                                {item.productName || `Item #${idx + 1}`}
                              </Text>
                              {metaText ? <Text style={{ fontSize: 7.5, color: '#64748B', marginTop: 1 }}>{metaText}</Text> : null}
                            </View>
                            {isWholesale && (
                              <Text style={[styles.p140Td, { width: 42, textAlign: 'center' }]}>{item.hsn || '-'}</Text>
                            )}
                            <Text style={[styles.p140Td, { width: 36, textAlign: 'center' }]}>
                              {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                            </Text>
                            <Text style={[styles.p140Td, { width: 48, textAlign: 'right' }]}>
                              {Number(item.unitPrice).toFixed(2)}
                            </Text>
                            <Text style={[styles.p140Td, { width: 42, textAlign: 'right' }]}>
                              {discAmt > 0 ? discAmt.toFixed(2) : '-'}
                            </Text>
                            {showTaxBreakdown && (
                              <>
                                <Text style={[styles.p140Td, { width: 48, textAlign: 'right' }]}>
                                  {taxableAmt.toFixed(2)}
                                </Text>
                                <Text style={[styles.p140Td, { width: 34, textAlign: 'center' }]}>
                                  {item.gst || 0}%
                                </Text>
                              </>
                            )}
                            <Text style={[styles.p140Td, { width: 62, textAlign: 'right', fontWeight: '700', color: '#0F172A' }]}>
                              {Number(item.total).toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Bottom Section */}
                    <View style={styles.p140BottomGrid}>
                      {/* Left: Words, Bank, Terms */}
                      <View style={{ flex: 1.2, paddingRight: 10 }}>
                        <View style={styles.p140WordsBox}>
                          <Text style={styles.p140WordsTitle}>Invoice Amount in Words:</Text>
                          <Text style={styles.p140WordsVal}>{words}</Text>
                        </View>

                        {isWholesale && showBankDetails && (
                          <View style={styles.p140BankBox}>
                            <Text style={styles.p140BankTitle}>BANK DETAILS FOR WIRE TRANSFER / NEFT:</Text>
                            <Text style={styles.p140BankText}>
                              Bank: <Text style={{ fontWeight: '700' }}>{business.bankName}</Text>
                            </Text>
                            <Text style={styles.p140BankText}>
                              A/C: <Text style={{ fontWeight: '700' }}>{business.accountNumber}</Text> | IFSC: <Text style={{ fontWeight: '700' }}>{business.ifscCode}</Text>
                            </Text>
                          </View>
                        )}

                        {showTerms && (
                          <View style={styles.p140TermsBox}>
                            <Text style={styles.p140TermsHead}>Terms & Conditions:</Text>
                            <Text style={styles.p140TermsText}>1. Goods once sold will not be exchanged after 7 days.</Text>
                            <Text style={styles.p140TermsText}>2. Subject to local jurisdiction.</Text>
                          </View>
                        )}
                      </View>

                      {/* Right: Calculations & QR */}
                      <View style={{ flex: 1 }}>
                        <View style={styles.p140TotalsTable}>
                          <View style={styles.p140TotalRow}>
                            <Text style={styles.p140TotalKey}>Subtotal:</Text>
                            <Text style={styles.p140TotalVal}>₹{subtotal.toFixed(2)}</Text>
                          </View>
                          {discount > 0 && (
                            <View style={styles.p140TotalRow}>
                              <Text style={styles.p140TotalKey}>Discount:</Text>
                              <Text style={[styles.p140TotalVal, { color: '#DC2626' }]}>-₹{discount.toFixed(2)}</Text>
                            </View>
                          )}
                          {showTaxBreakdown && gst > 0 && (
                            <>
                              <View style={styles.p140TotalRow}>
                                <Text style={styles.p140TotalKey}>CGST:</Text>
                                <Text style={styles.p140TotalVal}>₹{cgstAmount.toFixed(2)}</Text>
                              </View>
                              <View style={styles.p140TotalRow}>
                                <Text style={styles.p140TotalKey}>SGST:</Text>
                                <Text style={styles.p140TotalVal}>₹{sgstAmount.toFixed(2)}</Text>
                              </View>
                            </>
                          )}
                          <View style={styles.p140GrandTotalRow}>
                            <Text style={styles.p140GrandTotalKey}>
                              {isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL:' : 'GRAND TOTAL:'}
                            </Text>
                            <Text style={styles.p140GrandTotalVal}>₹{total.toFixed(2)}</Text>
                          </View>

                          {isBalanceActive && previousDue > 0 && (
                            <>
                              <View style={styles.p140TotalRow}>
                                <Text style={[styles.p140TotalKey, { color: '#DC2626', fontWeight: '700' }]}>Previous Due:</Text>
                                <Text style={[styles.p140TotalVal, { color: '#DC2626', fontWeight: '700' }]}>+₹{previousDue.toFixed(2)}</Text>
                              </View>
                              <View style={[styles.p140GrandTotalRow, { backgroundColor: '#FEE2E2', paddingVertical: 2.5 }]}>
                                <Text style={[styles.p140GrandTotalKey, { color: '#991B1B', fontSize: 9 }]}>TOTAL PAYABLE:</Text>
                                <Text style={[styles.p140GrandTotalVal, { color: '#991B1B', fontSize: 10 }]}>₹{totalPayable.toFixed(2)}</Text>
                              </View>
                            </>
                          )}

                          {isBalanceActive && advancePayment > 0 && (
                            <>
                              <View style={styles.p140TotalRow}>
                                <Text style={[styles.p140TotalKey, { color: '#16A34A', fontWeight: '700' }]}>Advance Credit:</Text>
                                <Text style={[styles.p140TotalVal, { color: '#16A34A', fontWeight: '700' }]}>-₹{adjustedAdvance.toFixed(2)}</Text>
                              </View>
                              <View style={[styles.p140GrandTotalRow, { backgroundColor: '#DCFCE7', paddingVertical: 2.5 }]}>
                                <Text style={[styles.p140GrandTotalKey, { color: '#166534', fontSize: 9 }]}>NET PAYABLE:</Text>
                                <Text style={[styles.p140GrandTotalVal, { color: '#166534', fontSize: 10 }]}>₹{netPayable.toFixed(2)}</Text>
                              </View>
                            </>
                          )}

                          <View style={styles.p140TotalRow}>
                            <Text style={styles.p140TotalKey}>Received:</Text>
                            <Text style={[styles.p140TotalVal, { color: '#059669', fontWeight: '700' }]}>₹{paid.toFixed(2)}</Text>
                          </View>

                          {isBalanceActive && previousDue > 0 ? (
                            <View style={styles.p140TotalRow}>
                              <Text style={[styles.p140TotalKey, { fontWeight: '700' }]}>Net Balance Due:</Text>
                              <Text style={[styles.p140TotalVal, { color: netBalanceDue > 0 ? '#DC2626' : '#059669', fontWeight: '700' }]}>
                                ₹{netBalanceDue.toFixed(2)}
                              </Text>
                            </View>
                          ) : isBalanceActive && advancePayment > 0 ? (
                            <View style={styles.p140TotalRow}>
                              <Text style={[styles.p140TotalKey, { fontWeight: '700' }]}>Balance Due:</Text>
                              <Text style={[styles.p140TotalVal, { color: netDue > 0 ? '#DC2626' : '#059669', fontWeight: '700' }]}>
                                ₹{netDue.toFixed(2)}
                              </Text>
                            </View>
                          ) : (
                            due > 0 && (
                              <View style={styles.p140TotalRow}>
                                <Text style={[styles.p140TotalKey, { color: '#DC2626', fontWeight: '700' }]}>Balance Due:</Text>
                                <Text style={[styles.p140TotalVal, { color: '#DC2626', fontWeight: '700' }]}>₹{due.toFixed(2)}</Text>
                              </View>
                            )
                          )}
                        </View>

                        {/* QR Code */}
                        {showQrCode && (
                          <View style={styles.p140QrRow}>
                            <Image source={{ uri: QR_CODE_DATA_URI }} style={styles.p140QrImg} resizeMode="contain" />
                            <View>
                              <Text style={styles.p140QrCaption}>Scan with UPI to Pay</Text>
                              <Text style={styles.p140QrUpi}>{business.upiId}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Signatures */}
                    {showSignatures && (
                      <View style={styles.p140SignaturesRow}>
                        <View style={styles.p140SignBox}>
                          <View style={styles.p140SignLine} />
                          <Text style={styles.p140SignLabel}>Customer Signature</Text>
                        </View>
                        <View style={styles.p140SignBox}>
                          <Text style={styles.p140SignCompany}>For {business.businessName}</Text>
                          <View style={styles.p140SignLine} />
                          <Text style={styles.p140SignLabel}>Authorized Signatory</Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  /* ======================================================== */
                  /*       HALF A4 LANDSCAPE (210mm x 148.5mm) LAYOUT        */
                  /* ======================================================== */
                  <View style={styles.landscapeInner}>
                    {/* Header Row */}
                    <View style={styles.lsHeaderRow}>
                      {/* Left: Seller Information */}
                      <View style={styles.lsSellerCol}>
                        <Text style={styles.lsStoreName}>{business.businessName}</Text>
                        {!!business.tagline && (
                          <Text style={[styles.lsTagline, colorMode === 'bw' && { color: '#334155' }]}>
                            {business.tagline}
                          </Text>
                        )}
                        <Text style={styles.lsStoreAddress}>{business.address}</Text>
                        <View style={styles.lsContactRow}>
                          <Text style={styles.lsContactText}>Phone: {business.phone}</Text>
                          <Text style={styles.lsContactText}>Email: {business.email}</Text>
                        </View>
                        <View style={styles.lsTaxRow}>
                          <Text style={styles.lsTaxBold}>GSTIN: {business.gstin}</Text>
                          <Text style={styles.lsTaxBold}>PAN: {business.pan || 'N/A'}</Text>
                          <Text style={styles.lsTaxBold}>State: {business.state} ({business.stateCode})</Text>
                        </View>
                      </View>

                      {/* Right: Invoice Type Badge & Details */}
                      <View style={styles.lsInvoiceMetaCol}>
                        <View
                          style={[
                            styles.lsInvoiceTypeBadge,
                            colorMode === 'bw'
                              ? styles.lsBadgeBw
                              : isWholesale
                              ? styles.lsBadgeWholesale
                              : styles.lsBadgeRetail,
                          ]}
                        >
                          <Text style={styles.lsInvoiceTypeBadgeText}>
                            {isWholesale ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH MEMO'}
                          </Text>
                        </View>
                        <Text style={styles.lsOriginalCopyText}>ORIGINAL FOR RECIPIENT</Text>

                        <View style={styles.lsMetaGrid}>
                          <View style={styles.lsMetaItem}>
                            <Text style={styles.lsMetaKey}>Invoice No:</Text>
                            <Text style={styles.lsMetaValBold}>{invNumber}</Text>
                          </View>
                          <View style={styles.lsMetaItem}>
                            <Text style={styles.lsMetaKey}>Date:</Text>
                            <Text style={styles.lsMetaVal}>{invDate}</Text>
                          </View>
                          <View style={styles.lsMetaItem}>
                            <Text style={styles.lsMetaKey}>Payment Mode:</Text>
                            <Text style={styles.lsMetaVal}>{paymentMethod.toUpperCase()}</Text>
                          </View>
                          <View style={styles.lsMetaItem}>
                            <Text style={styles.lsMetaKey}>Biller:</Text>
                            <Text style={styles.lsMetaVal}>{biller}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Parties Section: Billed To / Shipped To */}
                    <View style={styles.lsPartiesSection}>
                      <View style={styles.lsPartyCol}>
                        <Text style={styles.lsSectionHeader}>
                          {isWholesale ? 'DETAILS OF BUYER / BILLED TO:' : 'CUSTOMER DETAILS:'}
                        </Text>
                        <Text style={styles.lsCustomerName}>{custName}</Text>
                        {!!custPhone && <Text style={styles.lsPartyText}>Mobile: {custPhone}</Text>}
                        {!!custAddress && <Text style={styles.lsPartyText}>Address: {custAddress}</Text>}
                        {isWholesale && (
                          <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                            <Text style={styles.lsPartyGstin}>
                              Buyer GSTIN: <Text style={{ fontWeight: '700' }}>{custGstin || 'Unregistered / B2C'}</Text>
                            </Text>
                            <Text style={styles.lsPartyText}>State Code: {business.stateCode}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.lsPartyStatusCol}>
                        <View style={styles.lsStatusBadgeBox}>
                          <Text style={styles.lsStatusTitle}>STATUS:</Text>
                          <Text
                            style={[
                              styles.lsStatusVal,
                              colorMode === 'bw'
                                ? { color: '#000000' }
                                : due === 0
                                ? { color: '#059669' }
                                : { color: '#DC2626' },
                            ]}
                          >
                            {due === 0 ? 'FULLY PAID' : paid > 0 ? 'PARTIAL DUE' : 'UNPAID'}
                          </Text>
                        </View>
                        <Text style={styles.lsPlaceOfSupply}>
                          Place of Supply: {business.state} ({business.stateCode})
                        </Text>
                      </View>
                    </View>

                    {/* Table of Items */}
                    <View style={styles.lsTable}>
                      {/* Header */}
                      <View style={styles.lsTableHead}>
                        <Text style={[styles.lsTh, { width: 30 }]}>#</Text>
                        <Text style={[styles.lsTh, { flex: 3 }]}>ITEM & DESCRIPTION</Text>
                        {isWholesale && <Text style={[styles.lsTh, { width: 60 }]}>HSN</Text>}
                        <Text style={[styles.lsTh, { width: 45, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.lsTh, { width: 45, textAlign: 'center' }]}>UNIT</Text>
                        <Text style={[styles.lsTh, { width: 65, textAlign: 'right' }]}>RATE (₹)</Text>
                        <Text style={[styles.lsTh, { width: 55, textAlign: 'right' }]}>DISC (₹)</Text>
                        {showTaxBreakdown && (
                          <>
                            <Text style={[styles.lsTh, { width: 70, textAlign: 'right' }]}>TAXABLE</Text>
                            <Text style={[styles.lsTh, { width: 50, textAlign: 'center' }]}>GST%</Text>
                          </>
                        )}
                        <Text style={[styles.lsTh, { width: 80, textAlign: 'right' }]}>AMOUNT (₹)</Text>
                      </View>

                      {/* Rows */}
                      {items.map((item, idx) => {
                        const itemQty = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : 1;
                        const rawAmt = Number(item.unitPrice || 0) * itemQty;
                        const discAmt = Number(item.discount || 0);
                        const taxableAmt = Math.max(0, rawAmt - discAmt);
                        return (
                          <View
                            key={idx}
                            style={[styles.lsTableRow, idx % 2 === 1 && styles.lsTableRowAlt]}
                          >
                            <Text style={[styles.lsTd, { width: 30 }]}>{idx + 1}</Text>
                            <View style={{ flex: 3 }}>
                              <Text style={styles.lsTdBold}>
                                {item.productName || `Item #${idx + 1}`}
                              </Text>
                              {(() => {
                                const metaText = formatItemMeta(item);
                                return metaText ? (
                                  <Text style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>
                                    {metaText}
                                  </Text>
                                ) : null;
                              })()}
                            </View>
                            {isWholesale && (
                              <Text style={[styles.lsTd, { width: 60 }]}>{item.hsn || '9983'}</Text>
                            )}
                            <Text style={[styles.lsTd, { width: 45, textAlign: 'center' }]}>
                              {item.quantity}
                            </Text>
                            <Text style={[styles.lsTd, { width: 45, textAlign: 'center' }]}>
                              {item.unit || 'Pcs'}
                              {(() => {
                                const sub = getItemSubUnit(item);
                                return sub && sub !== item.unit ? `\n(Sub: ${sub})` : '';
                              })()}
                            </Text>
                            <Text style={[styles.lsTd, { width: 65, textAlign: 'right' }]}>
                              {Number(item.unitPrice).toFixed(2)}
                            </Text>
                            <Text style={[styles.lsTd, { width: 55, textAlign: 'right' }]}>
                              {discAmt > 0 ? Number(discAmt).toFixed(2) : '-'}
                            </Text>
                            {showTaxBreakdown && (
                              <>
                                <Text style={[styles.lsTd, { width: 70, textAlign: 'right' }]}>
                                  {taxableAmt.toFixed(2)}
                                </Text>
                                <Text style={[styles.lsTd, { width: 50, textAlign: 'center' }]}>
                                  {item.gst || 0}%
                                </Text>
                              </>
                            )}
                            <Text style={[styles.lsTdBold, { width: 80, textAlign: 'right' }]}>
                              {Number(item.total).toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Bottom Area: Left (Words, Bank, QR, Terms) & Right (Calculation Breakdown) */}
                    <View style={styles.lsBottomRow}>
                      {/* Left Block */}
                      <View style={styles.lsBottomLeftCol}>
                        <View style={styles.lsAmountInWordsBox}>
                          <Text style={styles.lsWordsLabel}>Invoice Amount in Words:</Text>
                          <Text style={styles.lsWordsText}>{amountToWords(total)}</Text>
                        </View>

                        {/* Bank Details for Wholesale */}
                        {isWholesale && showBankDetails && (
                          <View style={[styles.lsBankBox, colorMode === 'bw' && styles.lsBankBoxBw]}>
                            <Text style={[styles.lsBankTitle, colorMode === 'bw' && { color: '#000000' }]}>
                              BANK DETAILS FOR WIRE TRANSFER / NEFT:
                            </Text>
                            <View style={styles.lsBankGrid}>
                              <Text style={styles.lsBankText}>
                                Bank: <Text style={styles.lsBoldText}>{business.bankName}</Text>
                              </Text>
                              <Text style={styles.lsBankText}>
                                A/C No: <Text style={styles.lsBoldText}>{business.accountNumber}</Text>
                              </Text>
                              <Text style={styles.lsBankText}>
                                IFSC: <Text style={styles.lsBoldText}>{business.ifscCode}</Text>
                              </Text>
                              <Text style={styles.lsBankText}>
                                Branch: <Text style={styles.lsBoldText}>{business.branch}</Text>
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Terms & Conditions */}
                        {showTerms && (
                          <View style={styles.lsTermsBox}>
                            <Text style={styles.lsTermsTitle}>Terms & Conditions:</Text>
                            <Text style={styles.lsTermsLine}>
                              1. Payment due upon receipt of invoice.
                            </Text>
                            <Text style={styles.lsTermsLine}>
                              2. Goods once sold will not be returned or exchanged without original invoice.
                            </Text>
                            <Text style={styles.lsTermsLine}>
                              3. All disputes subject to local court jurisdiction.
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right Block: Totals & Summary Table */}
                      <View style={styles.lsBottomRightCol}>
                        <View style={styles.lsSummaryTable}>
                          <View style={styles.lsSumRow}>
                            <Text style={styles.lsSumKey}>Subtotal:</Text>
                            <Text style={styles.lsSumVal}>₹{subtotal.toFixed(2)}</Text>
                          </View>
                          {discount > 0 && (
                            <View style={styles.lsSumRow}>
                              <Text style={styles.lsSumKey}>Discount:</Text>
                              <Text style={[styles.lsSumVal, { color: '#DC2626' }]}>-₹{discount.toFixed(2)}</Text>
                            </View>
                          )}
                          {showTaxBreakdown && gst > 0 && (
                            <>
                              <View style={styles.lsSumRow}>
                                <Text style={styles.lsSumKey}>CGST (9% / State):</Text>
                                <Text style={styles.lsSumVal}>₹{cgstAmount.toFixed(2)}</Text>
                              </View>
                              <View style={styles.lsSumRow}>
                                <Text style={styles.lsSumKey}>SGST (9% / Central):</Text>
                                <Text style={styles.lsSumVal}>₹{sgstAmount.toFixed(2)}</Text>
                              </View>
                            </>
                          )}
                          <View style={[styles.lsTotalRow, colorMode === 'bw' && { backgroundColor: '#000000' }]}>
                            <Text style={styles.lsTotalKey}>
                              {isBalanceActive && (previousDue > 0 || advancePayment > 0) ? 'CURRENT BILL TOTAL:' : 'TOTAL AMOUNT:'}
                            </Text>
                            <Text style={[styles.lsTotalVal, colorMode === 'bw' && { color: '#FFFFFF' }]}>
                              ₹{total.toFixed(2)}
                            </Text>
                          </View>

                          {isBalanceActive && previousDue > 0 && (
                            <>
                              <View style={styles.lsSumRow}>
                                <Text style={[styles.lsSumKey, { color: '#DC2626', fontWeight: '700' }]}>Previous Due Balance:</Text>
                                <Text style={[styles.lsSumVal, { color: '#DC2626', fontWeight: '700' }]}>+₹{previousDue.toFixed(2)}</Text>
                              </View>
                              <View style={[styles.lsTotalRow, { backgroundColor: '#FEE2E2', paddingVertical: 3 }]}>
                                <Text style={[styles.lsTotalKey, { color: '#991B1B', fontSize: 10 }]}>TOTAL PAYABLE:</Text>
                                <Text style={[styles.lsTotalVal, { color: '#991B1B', fontSize: 11 }]}>₹{totalPayable.toFixed(2)}</Text>
                              </View>
                            </>
                          )}

                          {isBalanceActive && advancePayment > 0 && (
                            <>
                              <View style={styles.lsSumRow}>
                                <Text style={[styles.lsSumKey, { color: '#16A34A', fontWeight: '700' }]}>Previous Advance Credit:</Text>
                                <Text style={[styles.lsSumVal, { color: '#16A34A', fontWeight: '700' }]}>-₹{adjustedAdvance.toFixed(2)}</Text>
                              </View>
                              <View style={[styles.lsTotalRow, { backgroundColor: '#DCFCE7', paddingVertical: 3 }]}>
                                <Text style={[styles.lsTotalKey, { color: '#166534', fontSize: 10 }]}>NET PAYABLE:</Text>
                                <Text style={[styles.lsTotalVal, { color: '#166534', fontSize: 11 }]}>₹{netPayable.toFixed(2)}</Text>
                              </View>
                            </>
                          )}

                          <View style={styles.lsSumRow}>
                            <Text style={styles.lsSumKey}>Amount Received:</Text>
                            <Text
                              style={[
                                styles.lsSumVal,
                                { color: colorMode === 'bw' ? '#000000' : '#059669', fontWeight: '700' },
                              ]}
                            >
                              ₹{paid.toFixed(2)}
                            </Text>
                          </View>
                          {isBalanceActive && previousDue > 0 ? (
                            <View style={styles.lsSumRow}>
                              <Text style={[styles.lsSumKey, { fontWeight: '700' }]}>Net Balance Due:</Text>
                              <Text
                                style={[
                                  styles.lsSumVal,
                                  {
                                    color: colorMode === 'bw' ? '#000000' : (netBalanceDue > 0 ? '#DC2626' : '#059669'),
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                ₹{netBalanceDue.toFixed(2)}
                              </Text>
                            </View>
                          ) : isBalanceActive && advancePayment > 0 ? (
                            <>
                              <View style={styles.lsSumRow}>
                                <Text style={[styles.lsSumKey, { fontWeight: '700' }]}>Balance Due:</Text>
                                <Text
                                  style={[
                                    styles.lsSumVal,
                                    {
                                      color: colorMode === 'bw' ? '#000000' : (netDue > 0 ? '#DC2626' : '#059669'),
                                      fontWeight: '700',
                                    },
                                  ]}
                                >
                                  ₹{netDue.toFixed(2)}
                                </Text>
                              </View>
                              {remainingAdvance > 0 && (
                                <View style={styles.lsSumRow}>
                                  <Text style={[styles.lsSumKey, { color: '#2563EB', fontWeight: '700' }]}>Remaining Advance:</Text>
                                  <Text style={[styles.lsSumVal, { color: '#2563EB', fontWeight: '700' }]}>₹{remainingAdvance.toFixed(2)}</Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <View style={styles.lsSumRow}>
                              <Text style={styles.lsSumKey}>Balance Due:</Text>
                              <Text
                                style={[
                                  styles.lsSumVal,
                                  {
                                    color: colorMode === 'bw' ? '#000000' : (due > 0 ? '#DC2626' : '#64748B'),
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                ₹{due.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* UPI QR & Quick Verification */}
                        {showQrCode && (
                          <View style={styles.lsQrInlineBox}>
                            <Image
                              source={{ uri: QR_CODE_DATA_URI }}
                              style={styles.lsQrImg}
                              resizeMode="contain"
                            />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.lsQrTitle}>Scan to Pay UPI</Text>
                              <Text style={styles.lsQrSub}>{business.upiId}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Signatures Row */}
                    {showSignatures && (
                      <View style={styles.lsSignaturesRow}>
                        <View style={styles.lsSignColLeft}>
                          <View style={styles.lsSignLine} />
                          <Text style={styles.lsSignCaption}>Customer's Signature</Text>
                        </View>
                        <View style={styles.lsSignColRight}>
                          <Text style={styles.lsForCompanyText}>For {business.businessName}</Text>
                          <View style={styles.lsSignLine} />
                          <Text style={styles.lsSignCaption}>Authorized Signatory</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </View>

        {/* Footer Controls */}
        {isMobile ? (
          <View style={styles.bottomBarMobile}>
            <TouchableOpacity
              style={styles.mobileCloseBtn}
              onPress={onClose}
            >
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobileShareBtn}
              onPress={() => setShowShareModal(true)}
            >
              <Share2 size={15} color="#FFFFFF" />
              <Text style={styles.primaryPrintBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mobilePrintBtn}
              onPress={handlePrint}
            >
              <Printer size={15} color="#FFFFFF" />
              <Text style={styles.primaryPrintBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfoGroup}>
              <Text style={styles.bottomPaperSizeText}>
                Active Sheet:{' '}
                <Text style={{ fontWeight: '700', color: '#CBD5E1' }}>
                  {isThermal
                    ? '80 mm Thermal Roll'
                    : paperFormat === '140x210mm'
                    ? '140×210 mm Portrait Sheet'
                    : 'Half of A4 Page (Landscape / 210x148.5mm)'}
                </Text>
              </Text>
              <Text style={styles.bottomFormatBadge}>
                {isWholesale ? '🏢 Wholesale Format' : '🛒 Retail Format'}
              </Text>
            </View>

            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onClose}
              >
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryPrintBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setShowShareModal(true)}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.primaryPrintBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryPrintBtn}
                onPress={handlePrint}
              >
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.primaryPrintBtnText}>Print Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </View>

      <ShareSaleModal
        visible={showShareModal}
        sale={data}
        onClose={() => setShowShareModal(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topBarMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleGroupMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  printerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalTitleMobile: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  invoiceBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topActionsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 2,
  },
  zoomBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  zoomResetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  zoomText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  printButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  closeIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  controlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  controlsBarMobileScroll: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    maxHeight: 52,
    flexGrow: 0,
  },
  controlsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  selectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentedButtons: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  segmentBtnActive: {
    backgroundColor: '#2563EB',
  },
  segmentBtnDarkActive: {
    backgroundColor: '#334155',
  },
  segmentBtnGreenActive: {
    backgroundColor: '#059669',
  },
  segmentBtnPurpleActive: {
    backgroundColor: '#7C3AED',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0F172A',
  },
  toggleChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  toggleChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  toggleChipTextActive: {
    color: '#93C5FD',
    fontWeight: '600',
  },
  previewCanvasArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  canvasVerticalScroll: {
    flex: 1,
    width: '100%',
  },
  canvasVerticalContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 14,
  },
  canvasHorizontalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
    paddingHorizontal: 12,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  scrollContentThermal: {
    width: '100%',
    alignItems: 'center',
  },
  scrollContentLandscape: {
    alignItems: 'center',
  },

  /* ------------------------------------------------------------------------ */
  /*                  80 MM THERMAL RECEIPT STYLES                           */
  /* ------------------------------------------------------------------------ */
  thermalSheet: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderTopWidth: 3,
    borderTopColor: '#0F172A',
  },
  thermalInner: {
    width: '100%',
  },
  thermalCenterHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  thermalStoreName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  thermalTagline: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'center',
    marginTop: 1,
  },
  thermalAddress: {
    fontSize: 10,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  thermalContact: {
    fontSize: 10,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 1,
  },
  thermalGstin: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 1,
  },
  thermalBadgeBox: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  thermalBadgeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thermalDashedLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#64748B',
    borderStyle: 'dashed',
    marginVertical: 5,
  },
  thermalDottedLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    borderStyle: 'dotted',
    marginVertical: 4,
  },
  thermalDoubleLine: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    marginVertical: 5,
  },
  thermalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  thermalMono: {
    fontSize: 10,
    color: '#000000',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  thermalMonoBold: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  thermalCustomerBox: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thermalItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  thermalItemBlock: {
    paddingVertical: 3,
  },
  thermalItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  thermalItemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 1,
  },
  thermalSummarySection: {
    paddingVertical: 2,
  },
  thermalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
  },
  thermalGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  thermalGrandTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  thermalGrandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  thermalQrBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  simulatedQr: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000000',
  },
  thermalQrImg: {
    width: 76,
    height: 76,
  },
  thermalQrCaption: {
    fontSize: 9,
    color: '#334155',
    marginTop: 4,
    fontWeight: '600',
  },
  thermalUpiId: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 1,
  },
  thermalFooterSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  thermalFooterMsg: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 3,
  },
  thermalTermsText: {
    fontSize: 8,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 11,
  },
  thermalPoweredBy: {
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  /* ------------------------------------------------------------------------ */
  /*          HALF A4 LANDSCAPE (210mm x 148.5mm) STYLES                      */
  /* ------------------------------------------------------------------------ */
  landscapeSheet: {
    width: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  landscapeInner: {
    width: '100%',
  },
  lsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
  },
  lsSellerCol: {
    flex: 1.4,
    paddingRight: 16,
  },
  lsStoreName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  lsTagline: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  lsStoreAddress: {
    fontSize: 10,
    color: '#334155',
    marginTop: 3,
    lineHeight: 14,
  },
  lsContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
  },
  lsContactText: {
    fontSize: 10,
    color: '#475569',
  },
  lsTaxRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
    paddingTop: 3,
  },
  lsTaxBold: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  lsInvoiceMetaCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lsInvoiceTypeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  lsBadgeWholesale: {
    backgroundColor: '#1E293B',
  },
  lsBadgeRetail: {
    backgroundColor: '#047857',
  },
  lsBadgeBw: {
    backgroundColor: '#000000',
  },
  lsInvoiceTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lsOriginalCopyText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  lsMetaGrid: {
    marginTop: 6,
    width: '100%',
    maxWidth: 220,
  },
  lsMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  lsMetaKey: {
    fontSize: 10,
    color: '#475569',
  },
  lsMetaVal: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '500',
  },
  lsMetaValBold: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800',
  },
  lsPartiesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  lsPartyCol: {
    flex: 1.5,
  },
  lsSectionHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  lsCustomerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  lsPartyText: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 14,
  },
  lsPartyGstin: {
    fontSize: 10,
    color: '#0F172A',
  },
  lsPartyStatusCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lsStatusBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lsStatusTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  lsStatusVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  lsPlaceOfSupply: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 3,
  },

  /* Landscape Table */
  lsTable: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  lsTableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  lsTh: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  lsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lsTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  lsTd: {
    fontSize: 10,
    color: '#334155',
  },
  lsTdBold: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Bottom Row */
  lsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 16,
  },
  lsBottomLeftCol: {
    flex: 1.3,
  },
  lsAmountInWordsBox: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lsWordsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  lsWordsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
    fontStyle: 'italic',
    marginTop: 1,
  },
  lsBankBox: {
    marginTop: 6,
    backgroundColor: '#F0FDF4',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  lsBankBoxBw: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  lsBankTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.3,
  },
  lsBankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  lsBankText: {
    fontSize: 9,
    color: '#14532D',
  },
  lsBoldText: {
    fontWeight: '700',
  },
  lsTermsBox: {
    marginTop: 6,
  },
  lsTermsTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  lsTermsLine: {
    fontSize: 8.5,
    color: '#64748B',
    lineHeight: 11,
  },

  /* Bottom Right Calculations */
  lsBottomRightCol: {
    flex: 1,
  },
  lsSummaryTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  lsSumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lsSumKey: {
    fontSize: 10,
    color: '#475569',
  },
  lsSumVal: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '500',
  },
  lsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#0F172A',
  },
  lsTotalKey: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lsTotalVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FACC15',
  },
  lsQrInlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lsQrImg: {
    width: 44,
    height: 44,
  },
  lsQrTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  lsQrSub: {
    fontSize: 8.5,
    color: '#64748B',
  },

  /* Signatures */
  lsSignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    paddingTop: 6,
  },
  lsSignColLeft: {
    width: 160,
  },
  lsSignColRight: {
    width: 180,
    alignItems: 'flex-end',
  },
  lsForCompanyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 18,
  },
  lsSignLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 3,
  },
  lsSignCaption: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    width: '100%',
  },

  /* Bottom Actions Bar */
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  bottomInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomPaperSizeText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  bottomFormatBadge: {
    backgroundColor: '#334155',
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  secondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  primaryPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryPrintBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Mobile Bottom Bar */
  bottomBarMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  mobileCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  mobileShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  mobilePrintBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },

  /* ------------------------------------------------------------------------ */
  /*          140 MM X 210 MM PORTRAIT INVOICE STYLES                         */
  /* ------------------------------------------------------------------------ */
  p140Sheet: {
    width: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  p140Inner: {
    width: '100%',
  },
  p140HeaderTable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    paddingBottom: 6,
    marginBottom: 6,
  },
  p140StoreName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  p140Tagline: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#0284C7',
    marginBottom: 1,
  },
  p140StoreSub: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 13,
  },
  p140Badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 2,
    alignSelf: 'flex-end',
  },
  p140BadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  p140Original: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '700',
  },
  p140MetaGrid: {
    width: 140,
    gap: 2,
    marginTop: 4,
  },
  p140MetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  p140MetaKey: {
    fontSize: 8.5,
    color: '#64748B',
  },
  p140MetaVal: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  p140PartiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  p140SectionHead: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  p140CustName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  p140PartySub: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 12,
  },
  p140StatusPaid: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  p140Table: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  p140TableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  p140Th: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  p140TableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  p140TableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  p140Td: {
    fontSize: 9,
    color: '#334155',
  },
  p140BottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  p140WordsBox: {
    backgroundColor: '#F8FAFC',
    padding: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  p140WordsTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },
  p140WordsVal: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0F172A',
    fontStyle: 'italic',
  },
  p140BankBox: {
    marginTop: 5,
    backgroundColor: '#F0FDF4',
    padding: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  p140BankTitle: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#166534',
  },
  p140BankText: {
    fontSize: 8,
    color: '#14532D',
  },
  p140TermsBox: {
    marginTop: 5,
  },
  p140TermsHead: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
  },
  p140TermsText: {
    fontSize: 7.5,
    color: '#64748B',
    lineHeight: 10,
  },
  p140TotalsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  p140TotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  p140TotalKey: {
    fontSize: 9,
    color: '#475569',
  },
  p140TotalVal: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0F172A',
  },
  p140GrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#0F172A',
  },
  p140GrandTotalKey: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  p140GrandTotalVal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FACC15',
  },
  p140QrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    padding: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  p140QrImg: {
    width: 36,
    height: 36,
  },
  p140QrCaption: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F172A',
  },
  p140QrUpi: {
    fontSize: 7.5,
    color: '#64748B',
  },
  p140SignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 4,
  },
  p140SignBox: {
    width: 140,
    alignItems: 'center',
  },
  p140SignLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 2,
  },
  p140SignCompany: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  p140SignLabel: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
});
