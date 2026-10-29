import React from 'react';
import { View, StyleSheet, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { BarcodePrintItem, BarcodeLabelConfig, PAPER_PRESETS } from '../types';
import { BarcodeSingleLabel } from './BarcodeSingleLabel';
import { Printer, X, Download, Sliders, CheckCircle2 } from 'lucide-react-native';

interface BarcodePrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  items: BarcodePrintItem[];
  config: BarcodeLabelConfig;
}

export const BarcodePrintPreviewModal: React.FC<BarcodePrintPreviewModalProps> = ({
  visible,
  onClose,
  items,
  config,
}) => {
  const theme = useTheme();
  const preset = PAPER_PRESETS[config.presetId] || PAPER_PRESETS.thermal_50x25;

  const widthMm = config.presetId === 'custom' ? config.customWidthMm : preset.widthMm;
  const heightMm = config.presetId === 'custom' ? config.customHeightMm : preset.heightMm;
  const columns = config.presetId === 'custom' ? config.customColumns : preset.columns;
  const gapMm = config.presetId === 'custom' ? config.customGapMm : preset.gapMm;

  // Flatten items according to each item's requested print quantity
  const flatLabels: BarcodePrintItem[] = React.useMemo(() => {
    const result: BarcodePrintItem[] = [];
    items.forEach((it) => {
      const q = Math.max(1, it.quantity || 1);
      for (let i = 0; i < q; i++) {
        result.push(it);
      }
    });
    return result;
  }, [items]);

  const handlePrint = () => {
    if (Platform.OS !== 'web') {
      alert('Printing is only supported on Web/Desktop currently.');
      return;
    }

    // Prepare print style element
    const styleId = 'barcode-print-page-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const isThermal = preset.type === 'thermal';
    const pageCss = isThermal
      ? `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`
      : `@page { size: A4 portrait; margin: 5mm; }`;

    styleEl.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #barcode-printable-area, #barcode-printable-area * {
          visibility: visible !important;
        }
        #barcode-printable-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #FFFFFF !important;
        }
        .barcode-single-label {
          border: none !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        ${pageCss}
      }
    `;

    setTimeout(() => {
      window.print();
    }, 150);
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
            💡 <Text style={{ fontWeight: '700' }}>Printer Tip:</Text> In system print dialog, set Margins to{' '}
            <Text style={{ fontWeight: '700' }}>None</Text> and Scale to <Text style={{ fontWeight: '700' }}>100% / Actual Size</Text> for exact alignment.
          </Text>
        </View>

        {/* Scrollable preview stage */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
          <div
            id="barcode-printable-area"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: `${gapMm * 3.78}px`,
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '16px',
              maxWidth: preset.type === 'sheet' ? '794px' : '100%', // 794px = A4 96dpi approx
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              borderRadius: '6px',
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
