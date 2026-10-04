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
} from 'react-native';
import {
  Printer,
  X,
  FileText,
  Sliders,
  Check,
  Building2,
  User,
  QrCode,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react-native';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';

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
  quantity: number;
  unitPrice: number;
  unit?: string;
  discount?: number;
  gst?: number;
  taxAmount?: number;
  total: number;
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
}

export interface ReceiptPrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  data: ReceiptPrintData | null;
  initialFormat?: '80mm' | 'halfA4Landscape';
  initialCustomerType?: 'retail' | 'wholesale';
}

export const ReceiptPrintPreviewModal: React.FC<ReceiptPrintPreviewModalProps> = ({
  visible,
  onClose,
  data,
  initialFormat = '80mm',
  initialCustomerType,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  const { settings } = useInvoiceSettingsStore();
  const business = settings.businessProfile;

  // Selected paper size: '80mm' (Thermal) or 'halfA4Landscape' (Regular Half A4 Landscape)
  const [paperFormat, setPaperFormat] = useState<'80mm' | 'halfA4Landscape'>(
    initialFormat || (settings.paperSize === 'halfA4Landscape' ? 'halfA4Landscape' : '80mm')
  );

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

  // Print execution handler for Web & Mobile
  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const isThermal = paperFormat === '80mm';
        const styleId = 'receipt-print-custom-styles';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = styleId;
          document.head.appendChild(styleTag);
        }

        // Exact print CSS:
        // 80mm thermal: 80mm width, auto height, continuous roll
        // Half A4 Landscape: 210mm x 148.5mm landscape (A5 continuous/half-sheet)
        styleTag.innerHTML = `
          @page {
            size: ${isThermal ? '80mm auto' : '210mm 148.5mm landscape'};
            margin: ${isThermal ? '2mm 3mm' : '4mm 6mm'};
          }
          @media print {
            body {
              visibility: hidden !important;
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #receipt-print-canvas, #receipt-print-canvas * {
              visibility: visible !important;
            }
            #receipt-print-canvas {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: ${isThermal ? '74mm' : '198mm'} !important;
              max-width: ${isThermal ? '74mm' : '198mm'} !important;
              padding: ${isThermal ? '2mm' : '3mm 4mm'} !important;
              margin: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: ${isThermal ? 'none' : '1px solid #333'} !important;
              border-radius: 0 !important;
              font-family: ${isThermal ? "'Courier New', Courier, monospace" : "'Inter', -apple-system, sans-serif"} !important;
              z-index: 9999999 !important;
            }
            .hide-on-print {
              display: none !important;
            }
          }
        `;

        window.print();
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
  const custName = data.customerName || 'Walk-in Customer';
  const custPhone = data.customerPhone || '';
  const custAddress = data.customerAddress || '';
  const custGstin = data.customerGstin || '';
  const subtotal = Number(data.subtotal || 0);
  const discount = Number(data.discount || 0);
  const gst = Number(data.gst || data.orderTax || 0);
  const total = Number(data.total || 0);
  const paid = Number(data.paid !== undefined ? data.paid : total);
  const due = Number(data.due !== undefined ? data.due : Math.max(0, total - paid));
  const biller = data.biller || 'Cashier';
  const paymentMethod = data.paymentMethod || 'Cash';
  const items = data.items || [];

  const isWholesale = customerType === 'wholesale';
  const isThermal = paperFormat === '80mm';

  // Tax calculations for GST
  const cgstAmount = Number((gst / 2).toFixed(2));
  const sgstAmount = Number((gst / 2).toFixed(2));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { width: isMobile ? '98%' : '94%', height: isMobile ? '96%' : '92%' }]}>
          {/* Header Action Bar */}
          <View style={styles.topBar}>
            <View style={styles.titleGroup}>
              <View style={styles.printerIconBadge}>
                <Printer size={18} color="#2563EB" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.modalTitle}>Receipt Print Preview</Text>
                  <View style={styles.invoiceBadge}>
                    <Text style={styles.invoiceBadgeText}>{invNumber}</Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>
                  Preview before sending to {isThermal ? '80mm Thermal Printer' : 'Half A4 Landscape Sheet'}
                </Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.printButtonText}>Print Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Controls Bar: Format Selector & Customer Type Selector */}
          <View style={styles.controlsBar}>
            <View style={styles.selectorGroup}>
              <Text style={styles.controlLabel}>Printer / Paper Size:</Text>
              <View style={styles.segmentedButtons}>
                <TouchableOpacity
                  style={[styles.segmentBtn, isThermal && styles.segmentBtnActive]}
                  onPress={() => setPaperFormat('80mm')}
                >
                  <FileText size={14} color={isThermal ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.segmentText, isThermal && styles.segmentTextActive]}>
                    Thermal (80 mm)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, !isThermal && styles.segmentBtnActive]}
                  onPress={() => setPaperFormat('halfA4Landscape')}
                >
                  <Building2 size={14} color={!isThermal ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.segmentText, !isThermal && styles.segmentTextActive]}>
                    Regular (Half A4 Landscape)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.selectorGroup}>
              <Text style={styles.controlLabel}>Customer / Invoice Type:</Text>
              <View style={styles.segmentedButtons}>
                <TouchableOpacity
                  style={[styles.segmentBtn, !isWholesale && styles.segmentBtnGreenActive]}
                  onPress={() => setCustomerType('retail')}
                >
                  <User size={14} color={!isWholesale ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.segmentText, !isWholesale && styles.segmentTextActive]}>
                    Retail Receipt
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, isWholesale && styles.segmentBtnPurpleActive]}
                  onPress={() => setCustomerType('wholesale')}
                >
                  <Building2 size={14} color={isWholesale ? '#FFFFFF' : '#475569'} />
                  <Text style={[styles.segmentText, isWholesale && styles.segmentTextActive]}>
                    Wholesale Tax Invoice
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
                {showTaxBreakdown && <Check size={12} color="#2563EB" />}
                <Text style={[styles.toggleChipText, showTaxBreakdown && styles.toggleChipTextActive]}>
                  Tax / GST
                </Text>
              </TouchableOpacity>

              {isWholesale && !isThermal && (
                <TouchableOpacity
                  style={[styles.toggleChip, showBankDetails && styles.toggleChipActive]}
                  onPress={() => setShowBankDetails(!showBankDetails)}
                >
                  {showBankDetails && <Check size={12} color="#2563EB" />}
                  <Text style={[styles.toggleChipText, showBankDetails && styles.toggleChipTextActive]}>
                    Bank Info
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.toggleChip, showQrCode && styles.toggleChipActive]}
                onPress={() => setShowQrCode(!showQrCode)}
              >
                {showQrCode && <Check size={12} color="#2563EB" />}
                <Text style={[styles.toggleChipText, showQrCode && styles.toggleChipTextActive]}>
                  UPI QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleChip, showTerms && styles.toggleChipActive]}
                onPress={() => setShowTerms(!showTerms)}
              >
                {showTerms && <Check size={12} color="#2563EB" />}
                <Text style={[styles.toggleChipText, showTerms && styles.toggleChipTextActive]}>
                  Terms & Sign
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Preview Container */}
          <View style={styles.previewCanvasArea}>
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isThermal ? styles.scrollContentThermal : styles.scrollContentLandscape,
              ]}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
              horizontal={!isThermal && isMobile}
            >
              {/* Native Print Area Container with ID for CSS Print Query */}
              {/* @ts-ignore */}
              <View
                nativeID="receipt-print-canvas"
                id="receipt-print-canvas"
                style={[
                  isThermal ? styles.thermalSheet : styles.landscapeSheet,
                  {
                    transform: zoomScale !== 1 ? [{ scale: zoomScale }] : undefined,
                  },
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
                    {items.map((item, idx) => (
                      <View key={idx} style={styles.thermalItemBlock}>
                        <Text style={styles.thermalItemName}>
                          {item.productName || `Product #${item.productId || idx + 1}`}
                          {item.hsn ? ` (HSN: ${item.hsn})` : ''}
                        </Text>
                        <View style={styles.thermalItemDetailRow}>
                          <Text style={[styles.thermalMono, { flex: 2, color: '#475569' }]}>
                            {item.discount ? `Disc: -₹${Number(item.discount).toFixed(2)}` : ''}
                            {showTaxBreakdown && item.gst ? ` GST ${item.gst}%` : ''}
                          </Text>
                          <Text style={[styles.thermalMono, { width: 36, textAlign: 'center' }]}>
                            {item.quantity}
                          </Text>
                          <Text style={[styles.thermalMono, { width: 55, textAlign: 'right' }]}>
                            {Number(item.unitPrice).toFixed(2)}
                          </Text>
                          <Text style={[styles.thermalMonoBold, { width: 65, textAlign: 'right' }]}>
                            {Number(item.total).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.thermalDashedLine} />

                    {/* Totals Breakdown */}
                    <View style={styles.thermalSummarySection}>
                      <View style={styles.thermalSummaryRow}>
                        <Text style={styles.thermalMono}>Items Count: {items.length}</Text>
                        <Text style={styles.thermalMono}>
                          Total Qty: {items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}
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
                      <Text style={styles.thermalGrandTotalLabel}>GRAND TOTAL:</Text>
                      <Text style={styles.thermalGrandTotalValue}>₹{total.toFixed(2)}</Text>
                    </View>

                    <View style={styles.thermalDoubleLine} />

                    {/* Payment Info */}
                    <View style={styles.thermalSummarySection}>
                      <View style={styles.thermalSummaryRow}>
                        <Text style={styles.thermalMono}>Amount Paid:</Text>
                        <Text style={styles.thermalMonoBold}>₹{paid.toFixed(2)}</Text>
                      </View>
                      {due > 0 && (
                        <View style={styles.thermalSummaryRow}>
                          <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>Balance Due:</Text>
                          <Text style={[styles.thermalMonoBold, { color: '#DC2626' }]}>₹{due.toFixed(2)}</Text>
                        </View>
                      )}
                    </View>

                    {/* QR Code Section */}
                    {showQrCode && (
                      <View style={styles.thermalQrBox}>
                        <View style={styles.simulatedQr}>
                          <QrCode size={56} color="#000000" />
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
                          <Text style={styles.lsTagline}>{business.tagline}</Text>
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
                            isWholesale ? styles.lsBadgeWholesale : styles.lsBadgeRetail,
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
                              due === 0 ? { color: '#059669' } : { color: '#DC2626' },
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
                        const rawAmt = Number(item.unitPrice || 0) * Number(item.quantity || 1);
                        const discAmt = Number(item.discount || 0);
                        const taxableAmt = Math.max(0, rawAmt - discAmt);
                        return (
                          <View
                            key={idx}
                            style={[styles.lsTableRow, idx % 2 === 1 && styles.lsTableRowAlt]}
                          >
                            <Text style={[styles.lsTd, { width: 30 }]}>{idx + 1}</Text>
                            <Text style={[styles.lsTdBold, { flex: 3 }]}>
                              {item.productName || `Item #${idx + 1}`}
                            </Text>
                            {isWholesale && (
                              <Text style={[styles.lsTd, { width: 60 }]}>{item.hsn || '9983'}</Text>
                            )}
                            <Text style={[styles.lsTd, { width: 45, textAlign: 'center' }]}>
                              {item.quantity}
                            </Text>
                            <Text style={[styles.lsTd, { width: 45, textAlign: 'center' }]}>
                              {item.unit || 'Pcs'}
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
                          <View style={styles.lsBankBox}>
                            <Text style={styles.lsBankTitle}>BANK DETAILS FOR WIRE TRANSFER / NEFT:</Text>
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
                          <View style={styles.lsTotalRow}>
                            <Text style={styles.lsTotalKey}>TOTAL AMOUNT:</Text>
                            <Text style={styles.lsTotalVal}>₹{total.toFixed(2)}</Text>
                          </View>
                          <View style={styles.lsSumRow}>
                            <Text style={styles.lsSumKey}>Amount Received:</Text>
                            <Text style={[styles.lsSumVal, { color: '#059669', fontWeight: '700' }]}>
                              ₹{paid.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.lsSumRow}>
                            <Text style={styles.lsSumKey}>Balance Due:</Text>
                            <Text
                              style={[
                                styles.lsSumVal,
                                { color: due > 0 ? '#DC2626' : '#64748B', fontWeight: '700' },
                              ]}
                            >
                              ₹{due.toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* UPI QR & Quick Verification */}
                        {showQrCode && (
                          <View style={styles.lsQrInlineBox}>
                            <QrCode size={40} color="#000000" />
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
          </View>

          {/* Footer Controls */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfoGroup}>
              <Text style={styles.bottomPaperSizeText}>
                Active Sheet:{' '}
                <Text style={{ fontWeight: '700', color: '#1E293B' }}>
                  {isThermal ? '80 mm Thermal Roll' : 'Half of A4 Page (Landscape / 210x148.5mm)'}
                </Text>
              </Text>
              <Text style={styles.bottomFormatBadge}>
                {isWholesale ? '🏢 Wholesale Format' : '🛒 Retail Format'}
              </Text>
            </View>

            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryPrintBtn} onPress={handlePrint}>
                <Printer size={16} color="#FFFFFF" />
                <Text style={styles.primaryPrintBtnText}>Print Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000000',
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
});
