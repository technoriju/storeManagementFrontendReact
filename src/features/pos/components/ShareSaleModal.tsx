import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  Share,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import {
  Share2,
  Mail,
  MessageCircle,
  X,
  Printer,
  Download,
  Send,
  Phone,
  User,
  Check,
  Building2,
  FileText,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';
import { QR_CODE_DATA_URI } from '../../../assets/qrCodeAsset';
import {
  shareInvoiceImage,
  shareInvoiceImageToWhatsApp,
  downloadInvoiceImage,
} from '../utils/invoiceImageShare';
import {
  ReceiptPrintData,
  ReceiptPaperFormat,
  generateReceiptHtml,
  printHtmlViaIframe,
  amountToWords,
} from './ReceiptPrintPreviewModal';

function toReceiptPrintData(sale: any): ReceiptPrintData {
  const invNumber = sale.invoiceNumber || sale.reference || `INV-${sale.id || ''}`;
  const invDate = sale.date || (sale.createdAt ? String(sale.createdAt).split('T')[0] : new Date().toISOString().split('T')[0]);
  const subtotal = Number(sale.subtotal || sale.grandTotal || sale.total || 0);
  const total = Number(sale.grandTotal || sale.total || 0);
  const discount = Number(sale.discount || 0);
  const gst = Number(sale.orderTax || sale.gst || 0);
  const paid = Number(sale.paid !== undefined ? sale.paid : total);
  const due = Number(sale.due !== undefined ? sale.due : Math.max(0, total - paid));

  const items = Array.isArray(sale.items) && sale.items.length > 0
    ? sale.items.map((it: any, idx: number) => ({
        productName: it.productName || `Item #${idx + 1}`,
        sku: it.sku,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice || it.price || 0),
        unit: it.unit || 'Pcs',
        discount: Number(it.discount || 0),
        gst: Number(it.gst || 0),
        taxAmount: Number(it.taxAmount || 0),
        total: Number(it.total || (Number(it.quantity) || 1) * (Number(it.unitPrice || it.price || 0))),
        hsn: it.hsn || '',
      }))
    : [
        {
          productName: 'General Goods / Services',
          quantity: 1,
          unitPrice: total,
          total: total,
          unit: 'Unit',
        },
      ];

  return {
    invoiceNumber: invNumber,
    reference: sale.reference,
    date: invDate,
    customerName: sale.customerName || 'Walk-in Customer',
    customerPhone: sale.customerPhone || '',
    customerEmail: (sale as any).customerEmail || '',
    customerAddress: sale.customerAddress || '',
    customerGstin: sale.customerGstin || '',
    customerType: (sale.customerGstin && sale.customerGstin.length > 3) ? 'wholesale' : 'retail',
    biller: sale.biller || 'Cashier',
    subtotal,
    discount,
    gst,
    orderTax: sale.orderTax ? Number(sale.orderTax) : undefined,
    shipping: Number(sale.shipping || 0),
    total,
    paid,
    due,
    paymentMethod: sale.paymentMethod || 'Cash',
    notes: sale.notes,
    previousDue: Number(sale.previousDue || 0),
    advancePayment: Number(sale.advancePayment || 0),
    showPreviousBalance: Boolean(sale.showPreviousBalance),
    items,
  };
}

interface ShareSaleModalProps {
  visible: boolean;
  sale: any | null;
  onClose: () => void;
  onOpenFullPreview?: () => void;
}

export const ShareSaleModal: React.FC<ShareSaleModalProps> = ({
  visible,
  sale,
  onClose,
  onOpenFullPreview,
}) => {
  const theme = useTheme();
  const invoiceSettings = useInvoiceSettingsStore((state) => state.settings);
  const business = invoiceSettings?.businessProfile || {
    businessName: 'Tarama Enterprise',
    tagline: 'Wholesale & Retail Distributors',
    address: 'Near Old Bus Stand, Main Market',
    phone: '+91 98765 43210',
    email: 'contact@store.com',
    gstin: '19ABCDE1234F1Z5',
  };

  const [paperFormat, setPaperFormat] = useState<ReceiptPaperFormat>('80mm');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSharingFile, setIsSharingFile] = useState(false);
  const [isConvertingImage, setIsConvertingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const invoicePaperRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (sale) {
      setCustomerPhone(sale.customerPhone || '');
      setCustomerEmail((sale as any).customerEmail || '');
    }
  }, [sale]);

  const receiptData: ReceiptPrintData | null = useMemo(() => {
    if (!sale) return null;
    return toReceiptPrintData(sale);
  }, [sale]);

  // Previous balance calculations
  const previousDue = Number(receiptData?.previousDue || 0);
  const advancePayment = Number(receiptData?.advancePayment || 0);
  const isBalanceActive = Boolean(
    receiptData?.showPreviousBalance && (previousDue > 0 || advancePayment > 0)
  );

  const totalPayable = (receiptData?.total || 0) + (isBalanceActive && previousDue > 0 ? previousDue : 0);
  const paidAmt = Number(receiptData?.paid !== undefined ? receiptData.paid : (receiptData?.total || 0));
  const netBalanceDue = Math.max(0, totalPayable - paidAmt);

  const adjustedAdvance = Math.min(advancePayment, receiptData?.total || 0);
  const netPayable = Math.max(0, (receiptData?.total || 0) - adjustedAdvance);
  const netDue = Math.max(0, netPayable - paidAmt);
  const remainingAdvance = Math.max(0, advancePayment - adjustedAdvance);

  const htmlContent = useMemo(() => {
    if (!receiptData) return '';
    return generateReceiptHtml({
      data: receiptData,
      business,
      settings: invoiceSettings,
      paperFormat,
      customerType: receiptData.customerType || 'retail',
      colorMode: 'bw',
      showBusinessInfo: true,
      showTaxBreakdown: true,
      showBankDetails: true,
      showQrCode: true,
      showTerms: true,
      showSignatures: true,
      showPreviousBalance: isBalanceActive,
    });
  }, [receiptData, business, invoiceSettings, paperFormat, isBalanceActive]);

  if (!visible || !receiptData) return null;

  const invNumber = receiptData.invoiceNumber;
  const isThermal = paperFormat === '80mm';
  const isWholesale = receiptData.customerType === 'wholesale';

  // 1. Direct Print / Save as PDF
  const handlePrintOrSavePdf = () => {
    if (Platform.OS === 'web') {
      printHtmlViaIframe(htmlContent);
    } else {
      Alert.alert(
        'Print / Save PDF',
        `Invoice #${invNumber} is prepared in ${paperFormat === '80mm' ? 'Thermal' : 'A4'} format.`
      );
    }
  };

  // 2. Download / Share Printable Document (HTML/PDF)
  const handleShareDocument = async () => {
    try {
      setIsSharingFile(true);
      const fileName = `Invoice-${invNumber}.html`;

      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const file = new File([blob], fileName, { type: 'text/html', lastModified: Date.now() });

        // Web Share API with File support
        const nav = (globalThis as any).navigator;
        if (nav && nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: `Invoice ${invNumber}`,
            text: `Invoice #${invNumber} from ${business.businessName}`,
          });
          return;
        }

        // Fallback: download file and open print
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Invoice Downloaded', `${fileName} downloaded. You can send it directly to WhatsApp or Email.`);
        return;
      }

      // React Native Mobile (Android/iOS)
      try {
        const RNFS = (await import('react-native-fs')).default;
        const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.writeFile(filePath, htmlContent, 'utf8');

        await Share.share({
          title: `Invoice ${invNumber}`,
          url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
          message: `Invoice #${invNumber} from ${business.businessName}`,
        });
      } catch (nativeErr) {
        // Fallback to Share text
        await Share.share({
          title: `Invoice ${invNumber}`,
          message: `Invoice #${invNumber} for ₹${receiptData.total.toFixed(2)} from ${business.businessName}.`,
        });
      }
    } catch (e) {
      // User cancelled
    } finally {
      setIsSharingFile(false);
    }
  };

  // 3. Share Invoice as Image (PNG) - Converts visual invoice to image and triggers sharing
  const handleShareImage = async () => {
    try {
      setIsConvertingImage(true);
      setStatusMessage('Converting invoice to image...');
      const res = await shareInvoiceImage({
        targetRef: invoicePaperRef,
        invoiceNumber: invNumber,
        businessName: business.businessName,
        total: receiptData.total,
        customerPhone: customerPhone || receiptData.customerPhone,
      });

      if (res.method === 'download') {
        Alert.alert(
          'Invoice Image Downloaded',
          `Invoice #${invNumber} converted to image and downloaded as PNG. You can attach it to WhatsApp, Email, or SMS.`
        );
      }
    } catch (err: any) {
      console.error('Share image error:', err);
      Alert.alert('Image Sharing Failed', err?.message || 'Could not convert invoice to image.');
    } finally {
      setIsConvertingImage(false);
      setStatusMessage('');
    }
  };

  // 4. Save Invoice Image Directly
  const handleSaveImage = async () => {
    try {
      setIsConvertingImage(true);
      setStatusMessage('Saving invoice image as PNG...');
      const res = await downloadInvoiceImage(invoicePaperRef, invNumber);
      if (Platform.OS === 'web') {
        Alert.alert('Invoice Saved', `${res.fileName} downloaded successfully.`);
      } else {
        Alert.alert('Invoice Saved', `Invoice #${invNumber} image saved successfully.`);
      }
    } catch (err: any) {
      console.error('Save image error:', err);
      Alert.alert('Save Failed', err?.message || 'Could not save invoice image.');
    } finally {
      setIsConvertingImage(false);
      setStatusMessage('');
    }
  };

  // 5. Share to WhatsApp (converts to image & sends)
  const handleWhatsApp = async () => {
    try {
      setIsConvertingImage(true);
      setStatusMessage('Converting invoice image for WhatsApp...');
      await shareInvoiceImageToWhatsApp({
        targetRef: invoicePaperRef,
        invoiceNumber: invNumber,
        businessName: business.businessName,
        total: receiptData.total,
        customerPhone: customerPhone || receiptData.customerPhone,
      });
    } catch (err: any) {
      console.error('WhatsApp image share error:', err);
      // Fallback: direct WhatsApp URL
      const rawPhone = customerPhone.trim() || receiptData.customerPhone || '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      let msgStatus = (receiptData.due ?? 0) === 0 ? 'PAID' : 'DUE ₹' + (receiptData.due ?? 0).toFixed(2);
      let totalLine = `Total: *₹${receiptData.total.toFixed(2)}*`;

      if (isBalanceActive && previousDue > 0) {
        totalLine = `Current Bill: *₹${receiptData.total.toFixed(2)}*\nPrevious Due: *+₹${previousDue.toFixed(2)}*\nTotal Payable: *₹${totalPayable.toFixed(2)}*`;
        msgStatus = netBalanceDue === 0 ? 'PAID' : 'DUE ₹' + netBalanceDue.toFixed(2);
      } else if (isBalanceActive && advancePayment > 0) {
        totalLine = `Current Bill: *₹${receiptData.total.toFixed(2)}*\nAdvance Credit: *-₹${adjustedAdvance.toFixed(2)}*\nNet Payable: *₹${netPayable.toFixed(2)}*`;
        msgStatus = netDue === 0 ? 'PAID' : 'DUE ₹' + netDue.toFixed(2);
      }

      const msg = `🧾 *Invoice #${invNumber}*\nStore: *${business.businessName}*\n${totalLine}\nStatus: *${msgStatus}*`;
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      if (Platform.OS === 'web') {
        window.open(waUrl, '_blank');
      } else {
        Linking.openURL(waUrl);
      }
    } finally {
      setIsConvertingImage(false);
      setStatusMessage('');
    }
  };

  // 4. Share to Email
  const handleEmail = async () => {
    const targetEmail = customerEmail.trim() || receiptData.customerEmail || '';
    const subject = `Invoice ${invNumber} - ${business.businessName}`;
    let emailSummary = `Total Amount: ₹${receiptData.total.toFixed(2)}`;
    let emailStatus = (receiptData.due ?? 0) === 0 ? 'Paid' : 'Due ₹' + (receiptData.due ?? 0).toFixed(2);

    if (isBalanceActive && previousDue > 0) {
      emailSummary = `Current Bill: ₹${receiptData.total.toFixed(2)}\nPrevious Due: +₹${previousDue.toFixed(2)}\nTotal Payable: ₹${totalPayable.toFixed(2)}`;
      emailStatus = netBalanceDue === 0 ? 'Paid' : 'Due ₹' + netBalanceDue.toFixed(2);
    } else if (isBalanceActive && advancePayment > 0) {
      emailSummary = `Current Bill: ₹${receiptData.total.toFixed(2)}\nAdvance Credit: -₹${adjustedAdvance.toFixed(2)}\nNet Payable: ₹${netPayable.toFixed(2)}`;
      emailStatus = netDue === 0 ? 'Paid' : 'Due ₹' + netDue.toFixed(2);
    }

    const body = `Please find invoice #${invNumber} from ${business.businessName}.\n\n${emailSummary}\nDate: ${receiptData.date}\nPayment Status: ${emailStatus}\n\nThank you for your business!`;
    const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (Platform.OS === 'web') {
      window.location.href = mailtoUrl;
      return;
    }

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        await handleShareDocument();
      }
    } catch {
      await handleShareDocument();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
                <Share2 size={20} color="#10B981" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>Share Print Preview</Text>
                  <View style={styles.invoiceBadge}>
                    <Text style={styles.invoiceBadgeText}>{invNumber}</Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  Visual printable invoice • ₹{receiptData.total.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {onOpenFullPreview && (
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: theme.colors.border }]}
                  onPress={onOpenFullPreview}
                >
                  <Sliders size={15} color={theme.colors.textSecondary} />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Full Preview</Text>
                </TouchableOpacity>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Format Selector Bar */}
          <View style={[styles.formatBar, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Preview Format:
            </Text>
            <View style={styles.formatPills}>
              <TouchableOpacity
                style={[styles.pill, isThermal && styles.pillActive]}
                onPress={() => setPaperFormat('80mm')}
              >
                <FileText size={13} color={isThermal ? 'white' : theme.colors.textSecondary} />
                <Text style={[styles.pillText, isThermal && styles.pillTextActive]}>
                  80mm Thermal Receipt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, !isThermal && styles.pillActive]}
                onPress={() => setPaperFormat('halfA4Landscape')}
              >
                <Building2 size={13} color={!isThermal ? 'white' : theme.colors.textSecondary} />
                <Text style={[styles.pillText, !isThermal && styles.pillTextActive]}>
                  A4 / Landscape Invoice
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Body: Visual Print Preview Paper View */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            <View style={styles.paperSheetContainer}>
              <View
                ref={invoicePaperRef}
                collapsable={false}
                id="invoice-paper-sheet"
                nativeID="invoice-paper-sheet"
                style={[styles.paperSheet, isThermal ? styles.thermalSheet : styles.standardSheet]}
              >
                {/* Header Section */}
                <View style={styles.paperHeader}>
                  <Text style={styles.paperStoreName}>{business.businessName}</Text>
                  {!!business.tagline && <Text style={styles.paperTagline}>{business.tagline}</Text>}
                  <Text style={styles.paperAddress}>{business.address}</Text>
                  <Text style={styles.paperContact}>Phone: {business.phone}</Text>
                  {!!business.gstin && <Text style={styles.paperGstin}>GSTIN: {business.gstin}</Text>}
                </View>

                <View style={styles.dashedDivider} />

                {/* Receipt Title */}
                <View style={styles.titleBadgeBox}>
                  <Text style={styles.titleBadgeText}>
                    {isWholesale ? '*** WHOLESALE TAX INVOICE ***' : '*** RETAIL CASH RECEIPT ***'}
                  </Text>
                </View>

                {/* Meta Rows */}
                <View style={styles.paperMetaRow}>
                  <Text style={styles.paperMono}>Invoice No: {invNumber}</Text>
                  <Text style={styles.paperMono}>Date: {receiptData.date}</Text>
                </View>
                <View style={styles.paperMetaRow}>
                  <Text style={styles.paperMono}>Cashier: {receiptData.biller || 'Admin'}</Text>
                  <Text style={styles.paperMono}>Mode: {(receiptData.paymentMethod || 'CASH').toUpperCase()}</Text>
                </View>

                {/* Customer Box */}
                <View style={styles.paperCustomerBox}>
                  <Text style={styles.paperMonoBold}>Customer: {receiptData.customerName || 'Walk-in Customer'}</Text>
                  {!!receiptData.customerPhone && (
                    <Text style={styles.paperMono}>Phone: {receiptData.customerPhone}</Text>
                  )}
                  {isWholesale && !!receiptData.customerGstin && (
                    <Text style={styles.paperMonoBold}>Cust GSTIN: {receiptData.customerGstin}</Text>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Items Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { flex: 2 }]}>ITEM</Text>
                  <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>QTY</Text>
                  <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>PRICE</Text>
                  <Text style={[styles.thText, { flex: 1.1, textAlign: 'right' }]}>TOTAL</Text>
                </View>

                <View style={styles.dashedDivider} />

                {/* Items Rows */}
                {receiptData.items.map((item, idx) => (
                  <View key={idx} style={styles.tableItemRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      {!!item.sku && <Text style={styles.itemSub}>SKU: {item.sku}</Text>}
                    </View>
                    <Text style={[styles.itemQty, { flex: 0.8, textAlign: 'center' }]}>
                      {item.quantity} {item.unit || 'Pcs'}
                    </Text>
                    <Text style={[styles.itemPrice, { flex: 1, textAlign: 'right' }]}>
                      ₹{item.unitPrice.toFixed(2)}
                    </Text>
                    <Text style={[styles.itemTotal, { flex: 1.1, textAlign: 'right' }]}>
                      ₹{item.total.toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.dashedDivider} />

                {/* Financial Summary */}
                <View style={styles.summarySection}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Subtotal:</Text>
                    <Text style={styles.sumVal}>₹{receiptData.subtotal.toFixed(2)}</Text>
                  </View>

                  {(receiptData.gst ?? 0) > 0 && (
                    <>
                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>CGST ({((receiptData.gst ?? 0) / 2).toFixed(1)}%):</Text>
                        <Text style={styles.sumVal}>₹{((receiptData.gst ?? 0) / 2).toFixed(2)}</Text>
                      </View>
                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>SGST ({((receiptData.gst ?? 0) / 2).toFixed(1)}%):</Text>
                        <Text style={styles.sumVal}>₹{((receiptData.gst ?? 0) / 2).toFixed(2)}</Text>
                      </View>
                    </>
                  )}

                  {!!receiptData.discount && receiptData.discount > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={styles.sumLabel}>Discount:</Text>
                      <Text style={styles.sumVal}>-₹{receiptData.discount.toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={styles.dashedDivider} />

                  {isBalanceActive && previousDue > 0 ? (
                    <>
                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Current Bill Total:</Text>
                        <Text style={styles.sumVal}>₹{receiptData.total.toFixed(2)}</Text>
                      </View>
                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { color: '#DC2626', fontWeight: 'bold' }]}>
                          Previous Due:
                        </Text>
                        <Text style={[styles.sumVal, { color: '#DC2626', fontWeight: 'bold' }]}>
                          +₹{previousDue.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.sumRow, { marginTop: 4 }]}>
                        <Text style={styles.grandTotalLabel}>TOTAL PAYABLE:</Text>
                        <Text style={styles.grandTotalVal}>₹{totalPayable.toFixed(2)}</Text>
                      </View>

                      <Text style={styles.wordsText}>Amount: {amountToWords(totalPayable)}</Text>

                      <View style={styles.dashedDivider} />

                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Paid Amount:</Text>
                        <Text style={[styles.sumVal, { color: '#059669', fontWeight: 'bold' }]}>
                          ₹{paidAmt.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { fontWeight: 'bold' }]}>Net Balance Due:</Text>
                        <Text
                          style={[
                            styles.sumVal,
                            {
                              color: netBalanceDue > 0 ? '#DC2626' : '#059669',
                              fontWeight: 'bold',
                            },
                          ]}
                        >
                          ₹{netBalanceDue.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  ) : isBalanceActive && advancePayment > 0 ? (
                    <>
                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Current Bill Total:</Text>
                        <Text style={styles.sumVal}>₹{receiptData.total.toFixed(2)}</Text>
                      </View>
                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { color: '#16A34A', fontWeight: 'bold' }]}>
                          Advance Credit:
                        </Text>
                        <Text style={[styles.sumVal, { color: '#16A34A', fontWeight: 'bold' }]}>
                          -₹{adjustedAdvance.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.sumRow, { marginTop: 4 }]}>
                        <Text style={styles.grandTotalLabel}>NET PAYABLE:</Text>
                        <Text style={styles.grandTotalVal}>₹{netPayable.toFixed(2)}</Text>
                      </View>

                      <Text style={styles.wordsText}>Amount: {amountToWords(netPayable)}</Text>

                      <View style={styles.dashedDivider} />

                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Paid Amount:</Text>
                        <Text style={[styles.sumVal, { color: '#059669', fontWeight: 'bold' }]}>
                          ₹{paidAmt.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.sumRow}>
                        <Text style={[styles.sumLabel, { fontWeight: 'bold' }]}>Balance Due:</Text>
                        <Text
                          style={[
                            styles.sumVal,
                            {
                              color: netDue > 0 ? '#DC2626' : '#059669',
                              fontWeight: 'bold',
                            },
                          ]}
                        >
                          ₹{netDue.toFixed(2)}
                        </Text>
                      </View>
                      {remainingAdvance > 0 && (
                        <View style={styles.sumRow}>
                          <Text style={[styles.sumLabel, { color: '#2563EB', fontWeight: 'bold' }]}>
                            Remaining Advance:
                          </Text>
                          <Text style={[styles.sumVal, { color: '#2563EB', fontWeight: 'bold' }]}>
                            ₹{remainingAdvance.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={[styles.sumRow, { marginTop: 4 }]}>
                        <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
                        <Text style={styles.grandTotalVal}>₹{receiptData.total.toFixed(2)}</Text>
                      </View>

                      <Text style={styles.wordsText}>Amount: {amountToWords(receiptData.total)}</Text>

                      <View style={styles.dashedDivider} />

                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Paid Amount:</Text>
                        <Text style={[styles.sumVal, { color: '#059669', fontWeight: 'bold' }]}>
                          ₹{(receiptData.paid ?? receiptData.total).toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>Balance Due:</Text>
                        <Text
                          style={[
                            styles.sumVal,
                            {
                              color: (receiptData.due || 0) > 0 ? '#DC2626' : '#111827',
                              fontWeight: 'bold',
                            },
                          ]}
                        >
                          ₹{(receiptData.due || 0).toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* QR Code Section */}
                <View style={styles.qrCodeSection}>
                  <Image
                    source={{ uri: QR_CODE_DATA_URI }}
                    style={styles.qrCodeImg}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrCodeText}>Scan with UPI to Pay / Verify</Text>
                  {!!business.phone && (
                    <Text style={styles.qrCodeSub}>UPI / PhonePe / GPay: {business.phone}</Text>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Footer Note */}
                <View style={styles.paperFooter}>
                  <Text style={styles.footerMsg}>Thank you for your business! Visit Again.</Text>
                  <Text style={styles.footerTerms}>* Goods once sold cannot be returned without receipt</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Quick Sharing Toolbar (Bottom Action Bar) */}
          <View style={[styles.bottomBarContainer, { borderTopColor: theme.colors.border }]}>
            {/* Primary Action Buttons */}
            <View style={styles.bottomBar}>
              {/* Share as Image Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={handleShareImage}
                disabled={isConvertingImage}
              >
                <ImageIcon size={18} color="white" />
                <Text style={styles.actionBtnText}>Share Whatsapp / Others</Text>
              </TouchableOpacity>

              {/* WhatsApp Button (converts & sends image) */}
              {/* <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                onPress={handleWhatsApp}
                disabled={isConvertingImage}
              >
                <MessageCircle size={18} color="white" />
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity> */}

              {/* Save Image Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleSaveImage}
                disabled={isConvertingImage}
              >
                <Download size={18} color="white" />
                <Text style={styles.actionBtnText}>Save PNG</Text>
              </TouchableOpacity>

              {/* Print / Save as PDF Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#1E293B' }]}
                onPress={handlePrintOrSavePdf}
                disabled={isConvertingImage}
              >
                <Printer size={18} color="white" />
                <Text style={styles.actionBtnText}>Print</Text>
              </TouchableOpacity>
            </View>

            {/* Secondary Options Row */}
            <View style={styles.bottomRowSecondary}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Other formats:</Text>
              <TouchableOpacity style={styles.secondaryPillBtn} onPress={handleShareDocument}>
                <FileText size={13} color={theme.colors.textSecondary} />
                <Text style={styles.secondaryPillText}>HTML Doc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryPillBtn} onPress={handleEmail}>
                <Mail size={13} color={theme.colors.textSecondary} />
                <Text style={styles.secondaryPillText}>Email Text</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Image Conversion Loading Overlay */}
          {isConvertingImage && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingTitle}>Processing Invoice Image</Text>
                <Text style={styles.loadingSub}>
                  {statusMessage || 'Converting invoice to image...'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  container: {
    width: '100%',
    maxWidth: 620,
    height: '92%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  invoiceBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  formatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  formatPills: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#2563EB',
  },
  pillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  paperSheetContainer: {
    width: '100%',
    alignItems: 'center',
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  thermalSheet: {
    width: '100%',
    maxWidth: 380,
  },
  standardSheet: {
    width: '100%',
    maxWidth: 540,
  },
  paperHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  paperStoreName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  paperTagline: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 2,
  },
  paperAddress: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 2,
  },
  paperContact: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
  },
  paperGstin: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginTop: 2,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  titleBadgeBox: {
    alignItems: 'center',
    marginVertical: 2,
  },
  titleBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  paperMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  paperMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#374151',
  },
  paperMonoBold: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  paperCustomerBox: {
    marginTop: 4,
    paddingTop: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  thText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  tableItemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#6B7280',
  },
  itemQty: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#374151',
  },
  itemPrice: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#374151',
  },
  itemTotal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  summarySection: {
    marginTop: 4,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  sumLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#4B5563',
  },
  sumVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#111827',
  },
  grandTotalLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalVal: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  wordsText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 2,
  },
  paperFooter: {
    alignItems: 'center',
    marginTop: 6,
  },
  footerMsg: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  footerTerms: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  bottomBarContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  bottomRowSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  secondaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  secondaryPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  qrCodeImg: {
    width: 85,
    height: 85,
    marginVertical: 2,
  },
  qrCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  qrCodeSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#4B5563',
    marginTop: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  loadingSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
