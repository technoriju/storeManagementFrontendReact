import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  Printer,
  FileText,
  CheckCircle2,
  Sliders,
  Eye,
  Check,
  Building2,
  User,
  Sparkles,
  Database,
  LayoutGrid,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import {
  useInvoiceSettingsStore,
  DefaultPreviewType,
  PaperSize,
} from '../store/invoiceSettings.store';
import {
  ReceiptPrintPreviewModal,
  ReceiptPrintData,
  ReceiptPaperFormat,
  printHtmlViaIframe,
  generateReceiptHtml,
  amountToWords,
} from '../../pos/components/ReceiptPrintPreviewModal';
import { QR_CODE_DATA_URI } from '../../../assets/qrCodeAsset';

interface InvoicePreviewScreenProps {
  onNavigate?: (routeId: string) => void;
}

type ViewMode = 'all' | '140x210mm' | '80mm' | 'halfA4Landscape';

export const InvoicePreviewScreen: React.FC<InvoicePreviewScreenProps> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const isLargeScreen = isDesktop || isTablet;

  const { settings, setDefaultPreviewType } = useInvoiceSettingsStore();
  const business = settings.businessProfile;

  // Active default template in local DB / store
  const activeDefault: DefaultPreviewType = settings.defaultPreviewType || '140x210mm';

  // Preview view mode: show all in main content area or single focus
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [colorMode, setColorMode] = useState<'bw' | 'color'>(settings.printColorMode || 'bw');
  const [modalFormat, setModalFormat] = useState<ReceiptPaperFormat>('140x210mm');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [dbSuccessToast, setDbSuccessToast] = useState<string | null>(null);

  // Sample data for preview
  const sampleData: ReceiptPrintData = useMemo(() => {
    if (customerType === 'wholesale') {
      return {
        invoiceNumber: 'WHL-2026-0142',
        reference: 'SL-993812',
        date: new Date().toISOString().split('T')[0],
        customerName: 'Metro Departmental Stores Pvt Ltd',
        customerPhone: '+91 91234 56789',
        customerEmail: 'accounts@metrostores.in',
        customerAddress: 'Building 4, APMC Commercial Yard, Pune, Maharashtra - 411037',
        customerGstin: '27AABCU9603R1ZX',
        customerType: 'wholesale',
        biller: 'Commercial Biller',
        subtotal: 18400,
        discount: 800,
        gst: 880,
        total: 18480,
        paid: 18480,
        due: 0,
        paymentMethod: 'Bank Transfer / NEFT',
        items: [
          {
            productName: 'Grade-A Wheat Flour (Chakki Atta 30kg Bag)',
            hsn: '1101',
            quantity: 10,
            unitPrice: 950,
            discount: 300,
            gst: 5,
            taxAmount: 460,
            total: 9660,
            unit: 'Bag',
          },
          {
            productName: 'Refined Sunflower Oil Tin (15L Box)',
            hsn: '1512',
            quantity: 5,
            unitPrice: 1780,
            discount: 500,
            gst: 5,
            taxAmount: 420,
            total: 8820,
            unit: 'Tin',
          },
        ],
      };
    }

    return {
      invoiceNumber: 'RET-2026-0891',
      reference: 'SL-884912',
      date: new Date().toISOString().split('T')[0],
      customerName: 'Aakash Verma (Walk-in)',
      customerPhone: '+91 98765 43210',
      customerAddress: '12 Green Park, Joypur, Howrah - 711401',
      customerType: 'retail',
      biller: 'POS Cashier 1',
      subtotal: 1250,
      discount: 50,
      gst: 60,
      total: 1260,
      paid: 1260,
      due: 0,
      paymentMethod: 'UPI',
      items: [
        {
          productName: 'Basmati Premium Rice (1kg)',
          hsn: '1006',
          quantity: 2,
          unitPrice: 160,
          discount: 10,
          gst: 5,
          taxAmount: 15,
          total: 325,
          unit: 'Kg',
        },
        {
          productName: 'Cold Pressed Groundnut Oil (1L)',
          hsn: '1508',
          quantity: 2,
          unitPrice: 240,
          discount: 20,
          gst: 5,
          taxAmount: 23,
          total: 483,
          unit: 'Bottle',
        },
        {
          productName: 'Organic Green Cardamom (100g)',
          hsn: '0908',
          quantity: 1,
          unitPrice: 450,
          discount: 20,
          gst: 5,
          taxAmount: 21.5,
          total: 451.5,
          unit: 'Pcs',
        },
      ],
    };
  }, [customerType]);

  const handleSetDefaultInDb = (type: DefaultPreviewType) => {
    setDefaultPreviewType(type);
    let label = '140 mm × 210 mm Portrait Invoice';
    if ((type as string) === '80mm' || type === 'receipt') label = '80 mm Thermal Receipt';
    if (type === 'halfA4Landscape' || type === 'invoice') label = 'Half A4 Landscape Invoice';

    setDbSuccessToast(`Saved in Local DB! Default template updated to "${label}".`);
    setTimeout(() => {
      setDbSuccessToast(null);
    }, 4500);
  };

  const handlePrintFormat = (format: ReceiptPaperFormat) => {
    if (Platform.OS === 'web' && typeof (globalThis as any).window !== 'undefined') {
      try {
        const htmlContent = generateReceiptHtml({
          data: sampleData,
          business,
          settings,
          paperFormat: format,
          customerType,
          colorMode,
          showBusinessInfo: true,
          showTaxBreakdown: true,
          showBankDetails: true,
          showQrCode: true,
          showTerms: true,
          showSignatures: true,
        });

        printHtmlViaIframe(htmlContent);
      } catch (err) {
        console.error('Print error:', err);
        Alert.alert('Print Error', 'Could not open browser print dialog.');
      }
    } else {
      setModalFormat(format);
      setShowModal(true);
    }
  };

  const words = useMemo(() => amountToWords(sampleData.total), [sampleData.total]);
  const cgstAmount = Number(((sampleData.gst || 0) / 2).toFixed(2));
  const sgstAmount = Number(((sampleData.gst || 0) / 2).toFixed(2));

  // Helper check for active default
  const is140Default = activeDefault === '140x210mm';
  const is80Default = activeDefault === 'receipt' || (activeDefault as string) === '80mm';
  const isLandscapeDefault = activeDefault === 'halfA4Landscape' || activeDefault === 'invoice';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Print & Invoice Preview</Text>
          <View style={styles.badgeDb}>
            <Database size={13} color="#059669" />
            <Text style={styles.badgeDbText}>
              Default in Local DB: {is140Default ? '140×210 mm' : is80Default ? '80 mm Thermal' : 'Half A4 Landscape'}
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          All previews shown directly in the main content area. Choose default template saved in local SQLite database.
        </Text>
      </View>

      {/* Local DB Confirmation Toast */}
      {dbSuccessToast && (
        <View style={styles.toastContainer}>
          <Database size={18} color="#059669" />
          <Text style={styles.toastText}>{dbSuccessToast}</Text>
        </View>
      )}

      {/* SECTION 1: CHOOSE DEFAULT TEMPLATE (3 OPTIONS) */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Default Invoice Format</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Click "Set as Default" on your preferred layout. This choice is stored directly in your local SQLite database for all future POS prints.
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          {/* OPTION 1: 140 mm width * 210 mm height (Portrait) */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.templateChoiceCard,
              is140Default && styles.templateChoiceCardActive,
              {
                borderColor: is140Default ? '#0284C7' : theme.colors.border,
                backgroundColor: is140Default ? '#F0F9FF' : theme.colors.surface,
              },
            ]}
            onPress={() => handleSetDefaultInDb('140x210mm')}
          >
            <View style={styles.choiceCardTop}>
              <View style={[styles.iconBadge, { backgroundColor: '#E0F2FE' }]}>
                <FileText size={22} color="#0284C7" />
              </View>
              {is140Default ? (
                <View style={[styles.defaultPill, { backgroundColor: '#0284C7' }]}>
                  <Check size={11} color="#FFFFFF" />
                  <Text style={styles.defaultPillText}>DEFAULT IN DB</Text>
                </View>
              ) : (
                <View style={styles.makeDefaultPrompt}>
                  <Text style={styles.makeDefaultPromptText}>Set as Default</Text>
                </View>
              )}
            </View>

            <Text style={[styles.choiceCardTitle, { color: theme.colors.text }]}>
              140 mm × 210 mm Invoice
            </Text>
            <Text style={[styles.choiceCardSub, { color: '#0284C7' }]}>
              140 mm width × 210 mm height (Portrait A5)
            </Text>

            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Perfect fit for 140mm (5.5") continuous or sheet billing
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Complete GST split, HSN item columns & buyer info
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Bank wire transfer details, UPI QR code & signatures
              </Text>
            </View>

            <View style={styles.choiceCardActions}>
              <TouchableOpacity
                style={[
                  styles.selectDefaultBtn,
                  is140Default
                    ? { backgroundColor: '#0284C7' }
                    : { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD' },
                ]}
                onPress={() => handleSetDefaultInDb('140x210mm')}
              >
                {is140Default ? (
                  <>
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={styles.selectDefaultBtnActiveText}>Active Default</Text>
                  </>
                ) : (
                  <>
                    <Database size={13} color="#0284C7" />
                    <Text style={[styles.selectDefaultBtnText, { color: '#0284C7' }]}>Set as Default</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewQuickBtn}
                onPress={() => setViewMode('140x210mm')}
              >
                <Eye size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.previewQuickBtnText, { color: theme.colors.textSecondary }]}>View</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* OPTION 2: 80 mm Thermal Slip */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.templateChoiceCard,
              is80Default && styles.templateChoiceCardActive,
              {
                borderColor: is80Default ? '#2563EB' : theme.colors.border,
                backgroundColor: is80Default ? '#EFF6FF' : theme.colors.surface,
              },
            ]}
            onPress={() => handleSetDefaultInDb('receipt')}
          >
            <View style={styles.choiceCardTop}>
              <View style={[styles.iconBadge, { backgroundColor: '#DBEAFE' }]}>
                <Printer size={22} color="#2563EB" />
              </View>
              {is80Default ? (
                <View style={[styles.defaultPill, { backgroundColor: '#2563EB' }]}>
                  <Check size={11} color="#FFFFFF" />
                  <Text style={styles.defaultPillText}>DEFAULT IN DB</Text>
                </View>
              ) : (
                <View style={styles.makeDefaultPrompt}>
                  <Text style={styles.makeDefaultPromptText}>Set as Default</Text>
                </View>
              )}
            </View>

            <Text style={[styles.choiceCardTitle, { color: theme.colors.text }]}>
              Thermal Receipt (80 mm)
            </Text>
            <Text style={[styles.choiceCardSub, { color: '#2563EB' }]}>
              80 mm Thermal Roll Slip
            </Text>

            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • High-speed continuous thermal roll output
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Bold store header, itemized quantities & rates
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • High-contrast grand total & centered UPI QR code
              </Text>
            </View>

            <View style={styles.choiceCardActions}>
              <TouchableOpacity
                style={[
                  styles.selectDefaultBtn,
                  is80Default
                    ? { backgroundColor: '#2563EB' }
                    : { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE' },
                ]}
                onPress={() => handleSetDefaultInDb('receipt')}
              >
                {is80Default ? (
                  <>
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={styles.selectDefaultBtnActiveText}>Active Default</Text>
                  </>
                ) : (
                  <>
                    <Database size={13} color="#2563EB" />
                    <Text style={[styles.selectDefaultBtnText, { color: '#2563EB' }]}>Set as Default</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewQuickBtn}
                onPress={() => setViewMode('80mm')}
              >
                <Eye size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.previewQuickBtnText, { color: theme.colors.textSecondary }]}>View</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* OPTION 3: Half A4 Landscape (210 x 148.5 mm) */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.templateChoiceCard,
              isLandscapeDefault && styles.templateChoiceCardActive,
              {
                borderColor: isLandscapeDefault ? '#7C3AED' : theme.colors.border,
                backgroundColor: isLandscapeDefault ? '#FAF5FF' : theme.colors.surface,
              },
            ]}
            onPress={() => handleSetDefaultInDb('halfA4Landscape')}
          >
            <View style={styles.choiceCardTop}>
              <View style={[styles.iconBadge, { backgroundColor: '#EDE9FE' }]}>
                <Building2 size={22} color="#7C3AED" />
              </View>
              {isLandscapeDefault ? (
                <View style={[styles.defaultPill, { backgroundColor: '#7C3AED' }]}>
                  <Check size={11} color="#FFFFFF" />
                  <Text style={styles.defaultPillText}>DEFAULT IN DB</Text>
                </View>
              ) : (
                <View style={styles.makeDefaultPrompt}>
                  <Text style={styles.makeDefaultPromptText}>Set as Default</Text>
                </View>
              )}
            </View>

            <Text style={[styles.choiceCardTitle, { color: theme.colors.text }]}>
              Half A4 Landscape
            </Text>
            <Text style={[styles.choiceCardSub, { color: '#7C3AED' }]}>
              210 mm width × 148.5 mm height (Landscape)
            </Text>

            <View style={styles.featureList}>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Wide 2-column commercial landscape voucher
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Ideal for dot-matrix, laser & wholesale invoicing
              </Text>
              <Text style={[styles.featureItem, { color: theme.colors.textSecondary }]}>
                • Dual customer & authorized signature columns
              </Text>
            </View>

            <View style={styles.choiceCardActions}>
              <TouchableOpacity
                style={[
                  styles.selectDefaultBtn,
                  isLandscapeDefault
                    ? { backgroundColor: '#7C3AED' }
                    : { backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#DDD6FE' },
                ]}
                onPress={() => handleSetDefaultInDb('halfA4Landscape')}
              >
                {isLandscapeDefault ? (
                  <>
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={styles.selectDefaultBtnActiveText}>Active Default</Text>
                  </>
                ) : (
                  <>
                    <Database size={13} color="#7C3AED" />
                    <Text style={[styles.selectDefaultBtnText, { color: '#7C3AED' }]}>Set as Default</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewQuickBtn}
                onPress={() => setViewMode('halfA4Landscape')}
              >
                <Eye size={13} color={theme.colors.textSecondary} />
                <Text style={[styles.previewQuickBtnText, { color: theme.colors.textSecondary }]}>View</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 2: MAIN CONTENT AREA - ALL PREVIEWS */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Controls Toolbar */}
        <View style={styles.previewHeaderRow}>
          <div>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {viewMode === 'all' ? 'All Print Previews (Main Area)' : 'Template Focus Preview'}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              {business.businessName || 'Tarama Enterprise'} • GSTIN: {business.gstin || '19BOBPP9698M1ZR'}
            </Text>
          </div>

          <View style={styles.previewControlsRow}>
            {/* View Mode Selector */}
            <View style={[styles.segmentedGroup, { backgroundColor: theme.colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  viewMode === 'all' && { backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
                ]}
                onPress={() => setViewMode('all')}
              >
                <LayoutGrid size={13} color={viewMode === 'all' ? '#0284C7' : theme.colors.textSecondary} />
                <Text style={[
                  styles.segmentedItemText,
                  { color: viewMode === 'all' ? '#0284C7' : theme.colors.textSecondary },
                  viewMode === 'all' && { fontWeight: '700' },
                ]}>
                  All Previews
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  viewMode === '140x210mm' && { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setViewMode('140x210mm')}
              >
                <Text style={[
                  styles.segmentedItemText,
                  { color: viewMode === '140x210mm' ? '#0284C7' : theme.colors.textSecondary },
                  viewMode === '140x210mm' && { fontWeight: '700' },
                ]}>
                  140×210mm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  viewMode === '80mm' && { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setViewMode('80mm')}
              >
                <Text style={[
                  styles.segmentedItemText,
                  { color: viewMode === '80mm' ? '#2563EB' : theme.colors.textSecondary },
                  viewMode === '80mm' && { fontWeight: '700' },
                ]}>
                  80mm Roll
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  viewMode === 'halfA4Landscape' && { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setViewMode('halfA4Landscape')}
              >
                <Text style={[
                  styles.segmentedItemText,
                  { color: viewMode === 'halfA4Landscape' ? '#7C3AED' : theme.colors.textSecondary },
                  viewMode === 'halfA4Landscape' && { fontWeight: '700' },
                ]}>
                  Half A4
                </Text>
              </TouchableOpacity>
            </View>

            {/* Customer Type Toggle */}
            <View style={[styles.segmentedGroup, { backgroundColor: theme.colors.background }]}>
              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  customerType === 'retail' && { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setCustomerType('retail')}
              >
                <User size={13} color={customerType === 'retail' ? '#059669' : theme.colors.textSecondary} />
                <Text style={[
                  styles.segmentedItemText,
                  { color: customerType === 'retail' ? '#059669' : theme.colors.textSecondary },
                  customerType === 'retail' && { fontWeight: '600' },
                ]}>
                  Retail
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedItem,
                  customerType === 'wholesale' && { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => setCustomerType('wholesale')}
              >
                <Building2 size={13} color={customerType === 'wholesale' ? '#7C3AED' : theme.colors.textSecondary} />
                <Text style={[
                  styles.segmentedItemText,
                  { color: customerType === 'wholesale' ? '#7C3AED' : theme.colors.textSecondary },
                  customerType === 'wholesale' && { fontWeight: '600' },
                ]}>
                  Wholesale
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/*              MAIN CONTENT AREA PREVIEW STAGE             */}
        {/* ======================================================== */}
        <View style={styles.allPreviewsContainer}>
          {/* 1. 140 mm width * 210 mm height Portrait Preview */}
          {(viewMode === 'all' || viewMode === '140x210mm') && (
            <View style={styles.previewBoxWrapper}>
              <View style={styles.previewBoxHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.previewTagDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={styles.previewBoxTitle}>140 mm width × 210 mm height (Portrait Invoice)</Text>
                  {is140Default && (
                    <View style={[styles.miniDefaultBadge, { backgroundColor: '#0284C7' }]}>
                      <Text style={styles.miniDefaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!is140Default && (
                    <TouchableOpacity
                      style={styles.setDefSmallBtn}
                      onPress={() => handleSetDefaultInDb('140x210mm')}
                    >
                      <Database size={11} color="#0284C7" />
                      <Text style={styles.setDefSmallBtnText}>Make Default in DB</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.testPrintSmallBtn}
                    onPress={() => handlePrintFormat('140x210mm')}
                  >
                    <Printer size={11} color="#FFFFFF" />
                    <Text style={styles.testPrintSmallBtnText}>Print 140×210</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 140x210mm Document Sheet */}
              <View style={styles.portrait140Sheet}>
                {/* Header */}
                <View style={styles.p140HeaderTable}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.p140StoreName}>{business.businessName || 'Tarama Enterprise'}</Text>
                    {business.tagline && <Text style={styles.p140Tagline}>{business.tagline}</Text>}
                    <Text style={styles.p140StoreSub}>{business.address || ''}</Text>
                    <Text style={styles.p140StoreSub}>Phone: {business.phone || ''}</Text>
                    <Text style={[styles.p140StoreSub, { fontWeight: '700', color: '#0F172A', marginTop: 2 }]}>
                      GSTIN: {business.gstin || ''} | State: {business.state || 'West Bengal'} ({business.stateCode || '19'})
                    </Text>
                  </View>

                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={[styles.p140Badge, { backgroundColor: customerType === 'wholesale' ? '#1E293B' : '#047857' }]}>
                      <Text style={styles.p140BadgeText}>
                        {customerType === 'wholesale' ? 'TAX INVOICE' : 'RETAIL INVOICE'}
                      </Text>
                    </View>
                    <Text style={styles.p140Original}>ORIGINAL FOR RECIPIENT</Text>

                    <View style={{ width: 130, gap: 2, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.p140MetaKey}>Invoice No:</Text>
                        <Text style={styles.p140MetaVal}>{sampleData.invoiceNumber}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.p140MetaKey}>Date:</Text>
                        <Text style={styles.p140MetaVal}>{sampleData.date}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.p140MetaKey}>Mode:</Text>
                        <Text style={styles.p140MetaVal}>{sampleData.paymentMethod?.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Parties */}
                <View style={styles.p140PartiesRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.p140SectionHead}>
                      {customerType === 'wholesale' ? 'BILLED TO (BUYER):' : 'CUSTOMER:'}
                    </Text>
                    <Text style={styles.p140CustName}>{sampleData.customerName}</Text>
                    {sampleData.customerPhone && <Text style={styles.p140PartySub}>Mob: {sampleData.customerPhone}</Text>}
                    {sampleData.customerAddress && <Text style={styles.p140PartySub}>Addr: {sampleData.customerAddress}</Text>}
                    {customerType === 'wholesale' && sampleData.customerGstin && (
                      <Text style={[styles.p140PartySub, { fontWeight: '700', marginTop: 1 }]}>
                        GSTIN: {sampleData.customerGstin}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.p140StatusPaid}>STATUS: FULLY PAID</Text>
                    <Text style={styles.p140PartySub}>Supply: {business.state || 'West Bengal'} ({business.stateCode || '19'})</Text>
                  </View>
                </View>

                {/* Items Table */}
                <View style={styles.p140Table}>
                  <View style={styles.p140TableHead}>
                    <Text style={[styles.p140Th, { width: 22, textAlign: 'center' }]}>#</Text>
                    <Text style={[styles.p140Th, { flex: 2 }]}>ITEM</Text>
                    {customerType === 'wholesale' && <Text style={[styles.p140Th, { width: 40, textAlign: 'center' }]}>HSN</Text>}
                    <Text style={[styles.p140Th, { width: 35, textAlign: 'center' }]}>QTY</Text>
                    <Text style={[styles.p140Th, { width: 50, textAlign: 'right' }]}>RATE</Text>
                    <Text style={[styles.p140Th, { width: 45, textAlign: 'right' }]}>DISC</Text>
                    <Text style={[styles.p140Th, { width: 50, textAlign: 'right' }]}>TAXABLE</Text>
                    <Text style={[styles.p140Th, { width: 35, textAlign: 'center' }]}>GST</Text>
                    <Text style={[styles.p140Th, { width: 60, textAlign: 'right' }]}>TOTAL</Text>
                  </View>

                  {sampleData.items.map((it, idx) => {
                    const qty = Number(it.quantity || 1);
                    const raw = Number(it.unitPrice || 0) * qty;
                    const disc = Number(it.discount || 0);
                    const taxable = Math.max(0, raw - disc);
                    return (
                      <View key={idx} style={[styles.p140TableRow, idx % 2 === 1 && styles.p140TableRowAlt]}>
                        <Text style={[styles.p140Td, { width: 22, textAlign: 'center' }]}>{idx + 1}</Text>
                        <Text style={[styles.p140Td, { flex: 2, fontWeight: '600' }]}>{it.productName}</Text>
                        {customerType === 'wholesale' && <Text style={[styles.p140Td, { width: 40, textAlign: 'center' }]}>{it.hsn || '1006'}</Text>}
                        <Text style={[styles.p140Td, { width: 35, textAlign: 'center' }]}>{it.quantity} {it.unit || ''}</Text>
                        <Text style={[styles.p140Td, { width: 50, textAlign: 'right' }]}>{Number(it.unitPrice).toFixed(2)}</Text>
                        <Text style={[styles.p140Td, { width: 45, textAlign: 'right' }]}>{disc > 0 ? disc.toFixed(2) : '-'}</Text>
                        <Text style={[styles.p140Td, { width: 50, textAlign: 'right' }]}>{taxable.toFixed(2)}</Text>
                        <Text style={[styles.p140Td, { width: 35, textAlign: 'center' }]}>{it.gst || 5}%</Text>
                        <Text style={[styles.p140Td, { width: 60, textAlign: 'right', fontWeight: '700' }]}>{Number(it.total).toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Bottom Section */}
                <View style={styles.p140BottomGrid}>
                  <View style={{ flex: 1.2, paddingRight: 12 }}>
                    <View style={styles.p140WordsBox}>
                      <Text style={styles.p140WordsTitle}>Amount in Words:</Text>
                      <Text style={styles.p140WordsVal}>{words}</Text>
                    </View>

                    {customerType === 'wholesale' && (
                      <View style={styles.p140BankBox}>
                        <Text style={styles.p140BankTitle}>BANK DETAILS (NEFT/RTGS):</Text>
                        <Text style={styles.p140BankText}>Bank: <Text style={{ fontWeight: '700' }}>{business.bankName || 'HDFC Bank'}</Text></Text>
                        <Text style={styles.p140BankText}>A/C: <Text style={{ fontWeight: '700' }}>{business.accountNumber || '50200012345678'}</Text> | IFSC: <Text style={{ fontWeight: '700' }}>{business.ifscCode || 'HDFC0001234'}</Text></Text>
                      </View>
                    )}

                    <View style={styles.p140TermsBox}>
                      <Text style={styles.p140TermsHead}>Terms:</Text>
                      <Text style={styles.p140TermsText}>1. Goods once sold will not be exchanged. 2. Subject to local jurisdiction.</Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.p140TotalsTable}>
                      <View style={styles.p140TotalRow}>
                        <Text style={styles.p140TotalKey}>Subtotal:</Text>
                        <Text style={styles.p140TotalVal}>₹{sampleData.subtotal.toFixed(2)}</Text>
                      </View>
                      {!!sampleData.discount && (
                        <View style={styles.p140TotalRow}>
                          <Text style={styles.p140TotalKey}>Discount:</Text>
                          <Text style={[styles.p140TotalVal, { color: '#DC2626' }]}>-₹{Number(sampleData.discount).toFixed(2)}</Text>
                        </View>
                      )}
                      <View style={styles.p140TotalRow}>
                        <Text style={styles.p140TotalKey}>CGST + SGST:</Text>
                        <Text style={styles.p140TotalVal}>₹{(sampleData.gst || 60).toFixed(2)}</Text>
                      </View>
                      <View style={styles.p140GrandTotalRow}>
                        <Text style={styles.p140GrandTotalKey}>TOTAL AMOUNT:</Text>
                        <Text style={styles.p140GrandTotalVal}>₹{sampleData.total.toFixed(2)}</Text>
                      </View>
                      <View style={styles.p140TotalRow}>
                        <Text style={styles.p140TotalKey}>Received:</Text>
                        <Text style={[styles.p140TotalVal, { color: '#059669', fontWeight: '700' }]}>₹{sampleData.total.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* QR Code in 140x210 */}
                    <View style={styles.p140QrRow}>
                      <Image source={{ uri: QR_CODE_DATA_URI }} style={styles.p140QrImg} />
                      <View>
                        <Text style={styles.p140QrCaption}>Scan with UPI to Pay</Text>
                        <Text style={styles.p140QrUpi}>{business.upiId || '8617633023@okbizaxis'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Signatures */}
                <View style={styles.p140SignaturesRow}>
                  <View style={styles.p140SignBox}>
                    <View style={styles.p140SignLine} />
                    <Text style={styles.p140SignLabel}>Customer Signature</Text>
                  </View>
                  <View style={styles.p140SignBox}>
                    <Text style={styles.p140SignCompany}>For {business.businessName || 'Tarama Enterprise'}</Text>
                    <View style={styles.p140SignLine} />
                    <Text style={styles.p140SignLabel}>Authorized Signatory</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 2. 80 mm Thermal Slip Receipt Preview */}
          {(viewMode === 'all' || viewMode === '80mm') && (
            <View style={styles.previewBoxWrapper}>
              <View style={styles.previewBoxHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.previewTagDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.previewBoxTitle}>Thermal Receipt (80 mm Roll)</Text>
                  {is80Default && (
                    <View style={[styles.miniDefaultBadge, { backgroundColor: '#2563EB' }]}>
                      <Text style={styles.miniDefaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!is80Default && (
                    <TouchableOpacity
                      style={styles.setDefSmallBtn}
                      onPress={() => handleSetDefaultInDb('receipt')}
                    >
                      <Database size={11} color="#2563EB" />
                      <Text style={[styles.setDefSmallBtnText, { color: '#2563EB' }]}>Make Default in DB</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.testPrintSmallBtn, { backgroundColor: '#2563EB' }]}
                    onPress={() => handlePrintFormat('80mm')}
                  >
                    <Printer size={11} color="#FFFFFF" />
                    <Text style={styles.testPrintSmallBtnText}>Print 80mm</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 80mm Thermal Paper Slip */}
              <View style={styles.receiptSlip}>
                <Text style={styles.rcStoreName}>{business.businessName || 'Tarama Enterprise'}</Text>
                {business.tagline && <Text style={styles.rcTagline}>{business.tagline}</Text>}
                <Text style={styles.rcAddress}>{business.address || ''}</Text>
                <Text style={styles.rcContact}>Phone: {business.phone || ''}</Text>
                <Text style={[styles.rcContact, { fontWeight: '700' }]}>GSTIN: {business.gstin || ''}</Text>

                <Text style={styles.rcDashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                <Text style={styles.rcTitle}>
                  {customerType === 'wholesale' ? '*** WHOLESALE TAX INVOICE ***' : '*** RETAIL CASH RECEIPT ***'}
                </Text>

                <View style={styles.rcMetaRow}>
                  <Text style={styles.rcMetaText}>Inv: {sampleData.invoiceNumber}</Text>
                  <Text style={styles.rcMetaText}>Date: {sampleData.date}</Text>
                </View>
                <View style={styles.rcMetaRow}>
                  <Text style={styles.rcMetaText}>Cashier: {sampleData.biller}</Text>
                  <Text style={styles.rcMetaText}>Mode: {sampleData.paymentMethod?.toUpperCase()}</Text>
                </View>

                <View style={styles.rcCustBox}>
                  <Text style={styles.rcCustText}>
                    <Text style={{ fontWeight: '700' }}>Cust: </Text>{sampleData.customerName}
                  </Text>
                  {sampleData.customerPhone && (
                    <Text style={styles.rcCustText}>
                      <Text style={{ fontWeight: '700' }}>Phone: </Text>{sampleData.customerPhone}
                    </Text>
                  )}
                  {customerType === 'wholesale' && sampleData.customerGstin && (
                    <Text style={styles.rcCustText}>
                      <Text style={{ fontWeight: '700' }}>GSTIN: </Text>{sampleData.customerGstin}
                    </Text>
                  )}
                </View>

                <Text style={styles.rcDashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                <View style={styles.rcItemsHeader}>
                  <Text style={[styles.rcTh, { flex: 2 }]}>ITEM</Text>
                  <Text style={[styles.rcTh, { width: 35, textAlign: 'center' }]}>QTY</Text>
                  <Text style={[styles.rcTh, { width: 60, textAlign: 'right' }]}>RATE</Text>
                  <Text style={[styles.rcTh, { width: 65, textAlign: 'right' }]}>TOTAL</Text>
                </View>

                {sampleData.items.map((it, idx) => (
                  <View key={idx} style={styles.rcItemBlock}>
                    <Text style={styles.rcItemName}>{it.productName}</Text>
                    <View style={styles.rcItemDetails}>
                      <Text style={styles.rcItemSub}>
                        {it.discount ? `Disc: -₹${Number(it.discount).toFixed(2)}` : ''} GST {it.gst || 5}%
                      </Text>
                      <Text style={{ width: 35, textAlign: 'center', fontSize: 10 }}>{it.quantity}</Text>
                      <Text style={{ width: 60, textAlign: 'right', fontSize: 10 }}>{Number(it.unitPrice).toFixed(2)}</Text>
                      <Text style={{ width: 65, textAlign: 'right', fontWeight: '700', fontSize: 10.5 }}>
                        ₹{Number(it.total).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}

                <Text style={styles.rcDashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - -</Text>

                <View style={styles.rcRow}>
                  <Text style={styles.rcText}>Items Count: {sampleData.items.length}</Text>
                  <Text style={styles.rcText}>
                    Qty: {sampleData.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}
                  </Text>
                </View>
                <View style={styles.rcRow}>
                  <Text style={styles.rcText}>Subtotal:</Text>
                  <Text style={styles.rcText}>₹{sampleData.subtotal.toFixed(2)}</Text>
                </View>
                {!!sampleData.discount && (
                  <View style={styles.rcRow}>
                    <Text style={styles.rcText}>Discount:</Text>
                    <Text style={styles.rcText}>-₹{Number(sampleData.discount).toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.rcRow}>
                  <Text style={styles.rcText}>CGST + SGST:</Text>
                  <Text style={styles.rcText}>₹{(sampleData.gst || 60).toFixed(2)}</Text>
                </View>

                <Text style={styles.rcDoubleLine}>=============================</Text>

                <View style={styles.rcGrandTotalRow}>
                  <Text style={styles.rcGrandTotalLabel}>GRAND TOTAL:</Text>
                  <Text style={styles.rcGrandTotalVal}>₹{sampleData.total.toFixed(2)}</Text>
                </View>

                <Text style={styles.rcDoubleLine}>=============================</Text>

                <View style={styles.rcRow}>
                  <Text style={styles.rcText}>Amount Paid:</Text>
                  <Text style={[styles.rcText, { fontWeight: '700' }]}>₹{sampleData.total.toFixed(2)}</Text>
                </View>
                <View style={styles.rcRow}>
                  <Text style={styles.rcText}>Balance Due:</Text>
                  <Text style={styles.rcText}>₹0.00</Text>
                </View>

                <View style={styles.rcQrBox}>
                  <Image source={{ uri: QR_CODE_DATA_URI }} style={styles.rcQrImg} />
                  <Text style={styles.rcQrCaption}>Scan with UPI to Pay / Verify</Text>
                  <Text style={styles.rcUpiId}>{business.upiId || '8617633023@okbizaxis'}</Text>
                </View>

                <Text style={styles.rcFooterMsg}>{settings.footerMessage || 'Thank you for your business! Visit Again.'}</Text>
                <Text style={styles.rcTerms}>
                  * Goods once sold will not be exchanged.{'\n'}
                  * Subject to local jurisdiction.
                </Text>

                <Text style={styles.rcDashedLine}>- - - - - - - - - - - - - - - - - - - - - - - - -</Text>
                <Text style={styles.rcPoweredBy}>Printed via Billing System</Text>
              </View>
            </View>
          )}

          {/* 3. Half A4 Landscape (210 x 148.5 mm) Preview */}
          {(viewMode === 'all' || viewMode === 'halfA4Landscape') && (
            <View style={styles.previewBoxWrapper}>
              <View style={styles.previewBoxHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.previewTagDot, { backgroundColor: '#7C3AED' }]} />
                  <Text style={styles.previewBoxTitle}>Half A4 Landscape (210 mm × 148.5 mm)</Text>
                  {isLandscapeDefault && (
                    <View style={[styles.miniDefaultBadge, { backgroundColor: '#7C3AED' }]}>
                      <Text style={styles.miniDefaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!isLandscapeDefault && (
                    <TouchableOpacity
                      style={styles.setDefSmallBtn}
                      onPress={() => handleSetDefaultInDb('halfA4Landscape')}
                    >
                      <Database size={11} color="#7C3AED" />
                      <Text style={[styles.setDefSmallBtnText, { color: '#7C3AED' }]}>Make Default in DB</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.testPrintSmallBtn, { backgroundColor: '#7C3AED' }]}
                    onPress={() => handlePrintFormat('halfA4Landscape')}
                  >
                    <Printer size={11} color="#FFFFFF" />
                    <Text style={styles.testPrintSmallBtnText}>Print Half A4</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Landscape Sheet */}
              <View style={styles.landscapeSheet}>
                <View style={styles.invHeaderRow}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.invStoreTitle}>{business.businessName || 'Tarama Enterprise'}</Text>
                    {business.tagline && <Text style={styles.invStoreTagline}>{business.tagline}</Text>}
                    <Text style={styles.invStoreText}>{business.address || ''}</Text>
                    <Text style={styles.invStoreText}>Phone: {business.phone || ''}</Text>
                    <Text style={[styles.invStoreText, { fontWeight: '700', marginTop: 2 }]}>
                      GSTIN: {business.gstin || ''} | State: {business.state || 'West Bengal'} ({business.stateCode || '19'})
                    </Text>
                  </View>

                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={[styles.invTypeBadge, { backgroundColor: customerType === 'wholesale' ? '#1E293B' : '#047857' }]}>
                      <Text style={styles.invTypeBadgeText}>
                        {customerType === 'wholesale' ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH MEMO'}
                      </Text>
                    </View>
                    <Text style={styles.invOriginalText}>ORIGINAL FOR RECIPIENT</Text>

                    <View style={styles.invMetaGrid}>
                      <View style={styles.invMetaRow}>
                        <Text style={styles.invMetaKey}>Invoice No:</Text>
                        <Text style={styles.invMetaVal}>{sampleData.invoiceNumber}</Text>
                      </View>
                      <View style={styles.invMetaRow}>
                        <Text style={styles.invMetaKey}>Date:</Text>
                        <Text style={styles.invMetaVal}>{sampleData.date}</Text>
                      </View>
                      <View style={styles.invMetaRow}>
                        <Text style={styles.invMetaKey}>Mode:</Text>
                        <Text style={styles.invMetaVal}>{sampleData.paymentMethod?.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Table */}
                <View style={styles.invTable}>
                  <View style={styles.invTableHead}>
                    <Text style={[styles.invTh, { width: 25, textAlign: 'center' }]}>#</Text>
                    <Text style={[styles.invTh, { flex: 2 }]}>ITEM & DESCRIPTION</Text>
                    {customerType === 'wholesale' && <Text style={[styles.invTh, { width: 55, textAlign: 'center' }]}>HSN</Text>}
                    <Text style={[styles.invTh, { width: 40, textAlign: 'center' }]}>QTY</Text>
                    <Text style={[styles.invTh, { width: 45, textAlign: 'center' }]}>UNIT</Text>
                    <Text style={[styles.invTh, { width: 65, textAlign: 'right' }]}>RATE</Text>
                    <Text style={[styles.invTh, { width: 55, textAlign: 'right' }]}>DISC</Text>
                    <Text style={[styles.invTh, { width: 65, textAlign: 'right' }]}>TAXABLE</Text>
                    <Text style={[styles.invTh, { width: 45, textAlign: 'center' }]}>GST%</Text>
                    <Text style={[styles.invTh, { width: 75, textAlign: 'right' }]}>TOTAL</Text>
                  </View>

                  {sampleData.items.map((it, idx) => {
                    const qty = Number(it.quantity || 1);
                    const raw = Number(it.unitPrice || 0) * qty;
                    const disc = Number(it.discount || 0);
                    const taxable = Math.max(0, raw - disc);
                    return (
                      <View key={idx} style={[styles.invTableRow, idx % 2 === 1 && styles.invTableRowAlt]}>
                        <Text style={[styles.invTd, { width: 25, textAlign: 'center' }]}>{idx + 1}</Text>
                        <Text style={[styles.invTd, { flex: 2, fontWeight: '600' }]}>{it.productName}</Text>
                        {customerType === 'wholesale' && <Text style={[styles.invTd, { width: 55, textAlign: 'center' }]}>{it.hsn || '1006'}</Text>}
                        <Text style={[styles.invTd, { width: 40, textAlign: 'center' }]}>{it.quantity}</Text>
                        <Text style={[styles.invTd, { width: 45, textAlign: 'center' }]}>{it.unit || 'Pcs'}</Text>
                        <Text style={[styles.invTd, { width: 65, textAlign: 'right' }]}>{Number(it.unitPrice).toFixed(2)}</Text>
                        <Text style={[styles.invTd, { width: 55, textAlign: 'right' }]}>{disc > 0 ? disc.toFixed(2) : '-'}</Text>
                        <Text style={[styles.invTd, { width: 65, textAlign: 'right' }]}>{taxable.toFixed(2)}</Text>
                        <Text style={[styles.invTd, { width: 45, textAlign: 'center' }]}>{it.gst || 5}%</Text>
                        <Text style={[styles.invTd, { width: 75, textAlign: 'right', fontWeight: '700' }]}>{Number(it.total).toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Bottom Row */}
                <View style={styles.invBottomGrid}>
                  <View style={{ flex: 1.3, paddingRight: 14 }}>
                    <View style={styles.invWordsBox}>
                      <Text style={styles.invWordsTitle}>Amount in Words:</Text>
                      <Text style={styles.invWordsVal}>{words}</Text>
                    </View>
                    {customerType === 'wholesale' && (
                      <View style={styles.invBankBox}>
                        <Text style={styles.invBankHead}>BANK DETAILS FOR WIRE TRANSFER / NEFT:</Text>
                        <Text style={styles.invBankText}>Bank: {business.bankName || 'HDFC Bank'} | A/C: {business.accountNumber || '50200012345678'}</Text>
                        <Text style={styles.invBankText}>IFSC: {business.ifscCode || 'HDFC0001234'} | Branch: {business.branch || 'Market Yard Branch'}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.invTotalsTable}>
                      <View style={styles.invTotalRow}>
                        <Text style={styles.invTotalKey}>Subtotal:</Text>
                        <Text style={styles.invTotalVal}>₹{sampleData.subtotal.toFixed(2)}</Text>
                      </View>
                      <View style={styles.invGrandTotalRow}>
                        <Text style={styles.invGrandTotalKey}>TOTAL AMOUNT:</Text>
                        <Text style={styles.invGrandTotalVal}>₹{sampleData.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Fullscreen Preview Modal */}
      <ReceiptPrintPreviewModal
        visible={showModal}
        data={sampleData}
        initialFormat={modalFormat}
        initialCustomerType={customerType}
        initialColorMode={colorMode}
        onClose={() => setShowModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
    maxWidth: 1040,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  badgeDb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDbText: {
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    maxWidth: 1040,
  },
  toastText: {
    color: '#065F46',
    fontSize: 13.5,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 22,
    marginBottom: 22,
    maxWidth: 1040,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  templateChoiceCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 10,
    borderWidth: 2,
    padding: 16,
  },
  templateChoiceCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  choiceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  defaultPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  makeDefaultPrompt: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  makeDefaultPromptText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '600',
  },
  choiceCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  choiceCardSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  featureList: {
    gap: 4,
    marginBottom: 14,
  },
  featureItem: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  choiceCardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 'auto',
    alignItems: 'center',
  },
  selectDefaultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  selectDefaultBtnActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectDefaultBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  previewQuickBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Controls Bar */
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  segmentedGroup: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentedItemText: {
    fontSize: 11.5,
  },

  /* All Previews Layout in Main Content Area */
  allPreviewsContainer: {
    gap: 28,
  },
  previewBoxWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  previewBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  miniDefaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniDefaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  setDefSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },
  setDefSmallBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  testPrintSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
  },
  testPrintSmallBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* 140 mm x 210 mm Portrait Styling */
  portrait140Sheet: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
  },
  p140Tagline: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0284C7',
    marginBottom: 1,
  },
  p140StoreSub: {
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 12,
  },
  p140Badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  p140BadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  p140Original: {
    fontSize: 7.5,
    color: '#64748B',
    fontWeight: '700',
  },
  p140MetaKey: {
    fontSize: 8,
    color: '#64748B',
  },
  p140MetaVal: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  p140PartiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 4,
    marginBottom: 5,
  },
  p140SectionHead: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  p140CustName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  p140PartySub: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 11.5,
  },
  p140StatusPaid: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  p140Table: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 6,
  },
  p140TableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  p140Th: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  p140TableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  p140TableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  p140Td: {
    fontSize: 8,
    color: '#0F172A',
  },
  p140BottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  p140WordsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 2,
    padding: 3,
    marginBottom: 3,
  },
  p140WordsTitle: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#334155',
  },
  p140WordsVal: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: '#0F172A',
  },
  p140BankBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 2,
    padding: 3,
    marginBottom: 3,
  },
  p140BankTitle: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#166534',
  },
  p140BankText: {
    fontSize: 7.5,
    color: '#14532D',
  },
  p140TermsBox: {
    padding: 2,
  },
  p140TermsHead: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#64748B',
  },
  p140TermsText: {
    fontSize: 7,
    color: '#64748B',
    lineHeight: 10,
  },
  p140TotalsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    borderRadius: 2,
  },
  p140TotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  p140TotalKey: {
    fontSize: 8,
    color: '#64748B',
  },
  p140TotalVal: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0F172A',
  },
  p140GrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  p140GrandTotalKey: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  p140GrandTotalVal: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FACC15',
  },
  p140QrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 2,
    padding: 3,
    marginTop: 4,
  },
  p140QrImg: {
    width: 32,
    height: 32,
  },
  p140QrCaption: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  p140QrUpi: {
    fontSize: 7,
    color: '#64748B',
  },
  p140SignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  p140SignBox: {
    width: 110,
    alignItems: 'center',
  },
  p140SignLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 2,
    height: 12,
  },
  p140SignLabel: {
    fontSize: 7.5,
    color: '#64748B',
  },
  p140SignCompany: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1,
  },

  /* 80mm Thermal Styling */
  receiptSlip: {
    width: 320,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  rcStoreName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  rcTagline: {
    fontSize: 9.5,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 1,
  },
  rcAddress: {
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 12,
  },
  rcContact: {
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
  },
  rcDashedLine: {
    fontSize: 9,
    color: '#000000',
    letterSpacing: 1,
    marginVertical: 4,
    textAlign: 'center',
  },
  rcDoubleLine: {
    fontSize: 9,
    color: '#000000',
    letterSpacing: 1,
    marginVertical: 3,
    textAlign: 'center',
  },
  rcTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  rcMetaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  rcMetaText: {
    fontSize: 9.5,
    color: '#000000',
  },
  rcCustBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    padding: 4,
    marginVertical: 3,
  },
  rcCustText: {
    fontSize: 9.5,
    color: '#000000',
  },
  rcItemsHeader: {
    width: '100%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 3,
  },
  rcTh: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#000000',
  },
  rcItemBlock: {
    width: '100%',
    marginBottom: 4,
  },
  rcItemName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  rcItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  rcItemSub: {
    flex: 2,
    fontSize: 9,
    color: '#444444',
  },
  rcRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1.5,
  },
  rcText: {
    fontSize: 9.5,
    color: '#000000',
  },
  rcGrandTotalRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  rcGrandTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  rcGrandTotalVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  rcQrBox: {
    alignItems: 'center',
    marginVertical: 6,
  },
  rcQrImg: {
    width: 70,
    height: 70,
  },
  rcQrCaption: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#000000',
    marginTop: 3,
  },
  rcUpiId: {
    fontSize: 8,
    color: '#555555',
  },
  rcFooterMsg: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 4,
  },
  rcTerms: {
    fontSize: 8,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 2,
  },
  rcPoweredBy: {
    fontSize: 7.5,
    color: '#888888',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Landscape Sheet Styling */
  landscapeSheet: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  invHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    paddingBottom: 6,
    marginBottom: 6,
  },
  invStoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  invStoreTagline: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#7C3AED',
  },
  invStoreText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 13,
  },
  invTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    marginBottom: 2,
  },
  invTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  invOriginalText: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '700',
  },
  invMetaGrid: {
    width: 130,
    gap: 1.5,
    marginTop: 3,
  },
  invMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invMetaKey: {
    fontSize: 8.5,
    color: '#64748B',
  },
  invMetaVal: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  invTable: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 6,
  },
  invTableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  invTh: {
    fontSize: 8,
    fontWeight: '700',
    color: '#1E293B',
  },
  invTableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  invTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  invTd: {
    fontSize: 8.5,
    color: '#0F172A',
  },
  invBottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  invWordsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 2,
    padding: 3,
    marginBottom: 3,
  },
  invWordsTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#334155',
  },
  invWordsVal: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#0F172A',
  },
  invBankBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 2,
    padding: 3,
  },
  invBankHead: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#6B21A8',
  },
  invBankText: {
    fontSize: 7.5,
    color: '#581C87',
  },
  invTotalsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    borderRadius: 2,
  },
  invTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invTotalKey: {
    fontSize: 8,
    color: '#64748B',
  },
  invTotalVal: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0F172A',
  },
  invGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  invGrandTotalKey: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  invGrandTotalVal: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FACC15',
  },
});
