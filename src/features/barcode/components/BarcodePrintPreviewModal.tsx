import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { BarcodePrintItem, BarcodeLabelConfig, PAPER_PRESETS } from '../types';
import { BarcodeSingleLabel } from './BarcodeSingleLabel';
import { Printer, X, Building2, Check } from 'lucide-react-native';
import { useInvoiceSettingsStore } from '../../settings/store/invoiceSettings.store';

interface BarcodePrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  items: BarcodePrintItem[];
  config: BarcodeLabelConfig;
}

export function printBarcodeViaIframe(htmlContent: string) {
  const globalDoc: any = (globalThis as any).document;
  const globalWin: any = (globalThis as any).window;
  if (!globalDoc) return;

  const existingIframe = globalDoc.getElementById('barcode-hidden-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = globalDoc.createElement('iframe');
  iframe.id = 'barcode-hidden-print-iframe';
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
    const printWin = globalWin?.open('', '_blank', 'width=900,height=700');
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
      const printWin = globalWin?.open('', '_blank', 'width=900,height=700');
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
    }
  }, 350);
}

export const BarcodePrintPreviewModal: React.FC<BarcodePrintPreviewModalProps> = ({
  visible,
  onClose,
  items,
  config,
}) => {
  const theme = useTheme();
  const { settings } = useInvoiceSettingsStore();
  const business = settings?.businessProfile || {};

  const preset = PAPER_PRESETS[config.presetId] || PAPER_PRESETS.thermal_50x25;
  const isSheet = preset.type === 'sheet';

  // State to toggle company header on the first page (default enabled)
  const [includeCompanyHeader, setIncludeCompanyHeader] = useState<boolean>(true);

  const widthMm = config.presetId === 'custom' ? config.customWidthMm : preset.widthMm;
  const heightMm = config.presetId === 'custom' ? config.customHeightMm : preset.heightMm;
  const gapMm = config.presetId === 'custom' ? config.customGapMm : preset.gapMm;

  // Flatten items according to each item's requested print quantity
  const flatLabels: BarcodePrintItem[] = useMemo(() => {
    const result: BarcodePrintItem[] = [];
    items.forEach((it) => {
      const q = Math.max(1, it.quantity || 1);
      for (let i = 0; i < q; i++) {
        result.push(it);
      }
    });
    return result;
  }, [items]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const handlePrint = () => {
    if (Platform.OS !== 'web') {
      alert('Printing is only supported on Web/Desktop currently.');
      return;
    }

    const printableArea = typeof document !== 'undefined' ? document.getElementById('barcode-printable-area') : null;
    if (!printableArea) {
      alert('Printable area not found. Please try again.');
      return;
    }

    const contentHtml = printableArea.innerHTML;

    const isThermal = preset.type === 'thermal';
    const pageCssSize = isThermal ? `${widthMm}mm ${heightMm}mm` : 'A4 portrait';
    const pageMargin = isThermal ? '0mm' : '8mm 6mm 6mm 6mm';

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Barcode Labels - ${preset.name}</title>
  <style>
    @page {
      size: ${pageCssSize};
      margin: ${pageMargin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: auto !important;
      min-height: 100% !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .barcode-print-wrapper {
      width: 100%;
      height: auto !important;
      overflow: visible !important;
      margin: 0 auto;
    }
    .barcode-company-header {
      width: 100%;
      border-bottom: 2px solid #0f172a !important;
      padding-bottom: 8px !important;
      margin-bottom: 12px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .barcode-labels-grid {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: ${gapMm * 3.78}px !important;
      justify-content: ${isThermal ? 'center' : 'flex-start'} !important;
      align-items: flex-start !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }
    .barcode-single-label {
      border: 0.5px dashed #B0B0B0 !important;
      box-shadow: none !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: inline-flex !important;
      vertical-align: top !important;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="barcode-print-wrapper">
    ${contentHtml}
  </div>
</body>
</html>`;

    printBarcodeViaIframe(fullHtml);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        {/* Header bar */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Print Barcode Labels</Text>
            <Text style={[styles.subTitle, { color: theme.colors.textSecondary }]}>
              {preset.name} • {flatLabels.length} {flatLabels.length === 1 ? 'label' : 'labels'} ready to print
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Toggle Company Header */}
            <Pressable
              onPress={() => setIncludeCompanyHeader((prev) => !prev)}
              style={({ pressed }) => [
                styles.headerToggleBtn,
                {
                  backgroundColor: includeCompanyHeader ? `${theme.colors.primary}18` : theme.colors.background,
                  borderColor: includeCompanyHeader ? theme.colors.primary : theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Building2 size={16} color={includeCompanyHeader ? theme.colors.primary : theme.colors.textSecondary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: includeCompanyHeader ? theme.colors.primary : theme.colors.textSecondary,
                }}
              >
                {includeCompanyHeader ? 'Company Header: ON' : 'Company Header: OFF'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handlePrint}
              style={({ pressed }) => [
                styles.printButton,
                { backgroundColor: theme.colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Printer size={18} color="#FFFFFF" />
              <Text style={styles.printButtonText}>Print ({flatLabels.length})</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <X size={20} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Notice & Instructions banner */}
        <View style={[styles.banner, { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '30' }]}>
          <Text style={[styles.bannerText, { color: theme.colors.text }]}>
            💡 <Text style={{ fontWeight: '700' }}>Multi-Page Print Ready:</Text> All pages are covered automatically. In system print dialog, set Margins to{' '}
            <Text style={{ fontWeight: '700' }}>None</Text> and Scale to <Text style={{ fontWeight: '700' }}>100% / Actual Size</Text> for exact alignment.
          </Text>
        </View>

        {/* Scrollable preview stage */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
          <div
            id="barcode-printable-area"
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              maxWidth: isSheet ? '820px' : '100%',
              width: isSheet ? '100%' : 'auto',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              borderRadius: '6px',
              boxSizing: 'border-box',
            }}
          >
            {/* FIRST PAGE HEADER: Company Info like Sales Invoice */}
            {includeCompanyHeader && (
              <div
                className="barcode-company-header"
                style={{
                  width: '100%',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '10px',
                  marginBottom: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  {/* Left: Company / Business Details */}
                  <div style={{ flex: '1.4' }}>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '-0.3px',
                        lineHeight: 1.2,
                      }}
                    >
                      {business.businessName || 'Tarama Enterprise'}
                    </div>
                    {business.tagline ? (
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                        {business.tagline}
                      </div>
                    ) : null}
                    {business.address ? (
                      <div style={{ fontSize: '10.5px', color: '#334155', marginTop: '3px', lineHeight: 1.3 }}>
                        {business.address}
                      </div>
                    ) : null}
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '2px' }}>
                      <span>Phone: {business.phone || 'N/A'}</span>
                      {business.email ? <span> | Email: {business.email}</span> : null}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#0f172a', marginTop: '3px' }}>
                      <strong>GSTIN: {business.gstin || 'N/A'}</strong>
                      {business.state ? <span> | State: {business.state} ({business.stateCode || ''})</span> : null}
                    </div>
                  </div>

                  {/* Right: Badge & Batch Metadata */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '6px',
                      }}
                    >
                      PRODUCT BARCODE LABELS
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#334155', lineHeight: 1.4, textAlign: 'right' }}>
                      <span>Date: </span>
                      <strong style={{ color: '#0f172a' }}>{todayStr}</strong>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#334155', lineHeight: 1.4, textAlign: 'right' }}>
                      <span>Preset: </span>
                      <strong style={{ color: '#0f172a' }}>{preset.name}</strong>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#334155', lineHeight: 1.4, textAlign: 'right' }}>
                      <span>Total Stickers: </span>
                      <strong style={{ color: '#0f172a' }}>{flatLabels.length} Labels</strong>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#334155', lineHeight: 1.4, textAlign: 'right' }}>
                      <span>Items Count: </span>
                      <strong style={{ color: '#0f172a' }}>{items.length} Items</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Labels Grid */}
            <div
              className="barcode-labels-grid"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: `${gapMm * 3.78}px`,
                justifyContent: isSheet ? 'flex-start' : 'center',
                alignItems: 'flex-start',
                width: '100%',
              }}
            >
              {flatLabels.map((item, idx) => (
                <BarcodeSingleLabel
                  key={`${item.productId}-${idx}`}
                  item={item}
                  config={config}
                  widthMm={widthMm}
                  heightMm={heightMm}
                  scale={1}
                />
              ))}
            </div>
          </div>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  printButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
  },
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bannerText: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
});
