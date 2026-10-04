import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useInvoiceSettingsStore, PaperSize } from '../store/invoiceSettings.store';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../../pos/components/ReceiptPrintPreviewModal';
import { Printer, FileText, Building2, User, CheckCircle2, Eye, Sliders } from 'lucide-react-native';

export const PrinterSettingsScreen = () => {
  const theme = useTheme();
  const { settings, updateSetting } = useInvoiceSettingsStore();

  const [previewData, setPreviewData] = useState<ReceiptPrintData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'80mm' | 'halfA4Landscape'>('80mm');
  const [previewCustomerType, setPreviewCustomerType] = useState<'retail' | 'wholesale'>('retail');

  // Sample data for checking Retail Print Preview
  const sampleRetailSale: ReceiptPrintData = {
    invoiceNumber: 'RET-2026-0891',
    reference: 'SL-884912',
    date: new Date().toISOString().split('T')[0],
    customerName: 'Aakash Verma (Walk-in)',
    customerPhone: '+91 98765 43210',
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

  // Sample data for checking Wholesale Print Preview
  const sampleWholesaleSale: ReceiptPrintData = {
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
    paid: 15000,
    due: 3480,
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

  const openPreview = (type: 'retail' | 'wholesale', format: '80mm' | 'halfA4Landscape') => {
    setPreviewFormat(format);
    setPreviewCustomerType(type);
    setPreviewData(type === 'retail' ? sampleRetailSale : sampleWholesaleSale);
    setShowPreviewModal(true);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Receipt & Printer Settings</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Configure printing formats for Retail and Wholesale customer receipts.
        </Text>
      </View>

      {/* Default Paper Size Configuration */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Printer size={20} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Default Receipt Format</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
          Choose your standard printer output. Both formats are responsive and can also be switched during print preview.
        </Text>

        <View style={styles.formatOptionsGrid}>
          {/* 80mm Thermal */}
          <TouchableOpacity
            style={[
              styles.formatOptionBox,
              settings.paperSize === '80mm' && styles.formatOptionBoxActive,
              { borderColor: settings.paperSize === '80mm' ? theme.colors.primary : theme.colors.border },
            ]}
            onPress={() => updateSetting('paperSize', '80mm')}
          >
            <View style={styles.formatBoxTop}>
              <View style={[styles.formatIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Printer size={20} color="#2563EB" />
              </View>
              {settings.paperSize === '80mm' && (
                <CheckCircle2 size={18} color="#2563EB" />
              )}
            </View>
            <Text style={[styles.formatTitle, { color: theme.colors.text }]}>Thermal Print (80 mm)</Text>
            <Text style={[styles.formatSubtitle, { color: theme.colors.textSecondary }]}>
              Standard 80mm roll width. Compact, high-contrast, fast thermal printer slip with barcode/QR.
            </Text>
          </TouchableOpacity>

          {/* Half A4 Landscape */}
          <TouchableOpacity
            style={[
              styles.formatOptionBox,
              settings.paperSize === 'halfA4Landscape' && styles.formatOptionBoxActive,
              { borderColor: settings.paperSize === 'halfA4Landscape' ? theme.colors.primary : theme.colors.border },
            ]}
            onPress={() => updateSetting('paperSize', 'halfA4Landscape')}
          >
            <View style={styles.formatBoxTop}>
              <View style={[styles.formatIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <FileText size={20} color="#7C3AED" />
              </View>
              {settings.paperSize === 'halfA4Landscape' && (
                <CheckCircle2 size={18} color="#7C3AED" />
              )}
            </View>
            <Text style={[styles.formatTitle, { color: theme.colors.text }]}>Regular Print (Half A4 Landscape)</Text>
            <Text style={[styles.formatSubtitle, { color: theme.colors.textSecondary }]}>
              Half of A4 sheet (210mm x 148.5mm / continuous landscape voucher). Detailed 2-column layout, GSTIN & bank details.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Print Preview Testing Section */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <Eye size={20} color="#059669" />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Test Print Preview</Text>
        </View>
        <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>
          Test and preview your receipt layouts before printing actual sales.
        </Text>

        <View style={styles.previewActionsGrid}>
          {/* Retail 80mm */}
          <View style={[styles.previewActionCard, { borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <User size={16} color="#059669" />
              <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Retail Receipt</Text>
            </View>
            <Text style={[styles.actionCardDesc, { color: theme.colors.textSecondary }]}>
              Walk-in / B2C customer receipt with clean product list, discounts, and UPI QR code.
            </Text>
            <View style={styles.actionCardButtons}>
              <TouchableOpacity
                style={styles.testBtnPrimary}
                onPress={() => openPreview('retail', '80mm')}
              >
                <Printer size={13} color="#FFFFFF" />
                <Text style={styles.testBtnText}>Preview 80mm Thermal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testBtnSecondary}
                onPress={() => openPreview('retail', 'halfA4Landscape')}
              >
                <FileText size={13} color="#334155" />
                <Text style={styles.testBtnSecText}>Preview Half A4</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wholesale Half A4 */}
          <View style={[styles.previewActionCard, { borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="#7C3AED" />
              <Text style={[styles.actionCardTitle, { color: theme.colors.text }]}>Wholesale Tax Invoice</Text>
            </View>
            <Text style={[styles.actionCardDesc, { color: theme.colors.textSecondary }]}>
              B2B commercial invoice with Buyer GSTIN, HSN codes, Tax breakups, Bank details, and Signatures.
            </Text>
            <View style={styles.actionCardButtons}>
              <TouchableOpacity
                style={[styles.testBtnPrimary, { backgroundColor: '#7C3AED' }]}
                onPress={() => openPreview('wholesale', 'halfA4Landscape')}
              >
                <FileText size={13} color="#FFFFFF" />
                <Text style={styles.testBtnText}>Preview Half A4 Landscape</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testBtnSecondary}
                onPress={() => openPreview('wholesale', '80mm')}
              >
                <Printer size={13} color="#334155" />
                <Text style={styles.testBtnSecText}>Preview 80mm Thermal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Receipt Print Preview Modal */}
      <ReceiptPrintPreviewModal
        visible={showPreviewModal}
        data={previewData}
        initialFormat={previewFormat}
        initialCustomerType={previewCustomerType}
        onClose={() => setShowPreviewModal(false)}
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
    marginBottom: 24,
    maxWidth: 800,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    maxWidth: 900,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  formatOptionsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  formatOptionBox: {
    flex: 1,
    minWidth: 260,
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  formatOptionBoxActive: {
    backgroundColor: '#F0F9FF',
  },
  formatBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formatIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  formatSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewActionsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  previewActionCard: {
    flex: 1,
    minWidth: 280,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionCardDesc: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 16,
  },
  actionCardButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  testBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  testBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  testBtnSecText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
  },
});
