import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { FileText, FileSpreadsheet, Printer, Download, Check, X, Share2, MessageCircle } from 'lucide-react-native';
import {
  ReportColumnDef,
  exportReportToExcel,
  printOrSavePdfReport,
  shareReportToWhatsApp,
} from '../utils/reportExportUtils';

interface ReportExportModalProps {
  visible: boolean;
  onClose: () => void;
  reportTitle: string;
  totalRecords: number;
  dateRangeLabel?: string;
  data?: any[];
  columns?: ReportColumnDef[];
  summary?: any;
  customerPhone?: string;
  partyName?: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  visible,
  onClose,
  reportTitle,
  totalRecords,
  dateRangeLabel = 'Current Period',
  data = [],
  columns = [],
  summary,
  customerPhone,
  partyName,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'print' | 'whatsapp'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const exportOptions = {
        title: reportTitle,
        dateRangeLabel,
        columns: columns.length > 0 ? columns : [
          { key: 'invoiceNumber', title: 'Invoice / Doc #' },
          { key: 'date', title: 'Date' },
          { key: 'customerName', title: 'Customer / Party' },
          { key: 'total', title: 'Total (₹)' },
          { key: 'paymentStatus', title: 'Status' },
        ],
        data,
        summary,
        phone: customerPhone,
        partyName,
      };

      if (selectedFormat === 'excel') {
        exportReportToExcel(exportOptions);
      } else if (selectedFormat === 'pdf' || selectedFormat === 'print') {
        printOrSavePdfReport(exportOptions);
      } else if (selectedFormat === 'whatsapp') {
        shareReportToWhatsApp(exportOptions);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formats = [
    {
      id: 'excel',
      title: 'Excel Workbook (.xlsx)',
      subtitle: `Download ${totalRecords} records formatted with formulas`,
      icon: FileSpreadsheet,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      id: 'pdf',
      title: 'PDF Document',
      subtitle: 'Printable formatted report document with summary',
      icon: FileText,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
    {
      id: 'print',
      title: 'Direct Thermal / A4 Print',
      subtitle: 'Send formatted report to connected printer',
      icon: Printer,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      id: 'whatsapp',
      title: 'Share to WhatsApp',
      subtitle: 'Send formatted summary & figures directly via WhatsApp',
      icon: MessageCircle,
      color: '#16A34A',
      bg: '#DCFCE7',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, isMobile && { padding: 12 }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Export & Share Report</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {reportTitle} • {totalRecords} records ({dateRangeLabel})
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Format selection */}
          <View style={styles.body}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>CHOOSE ACTION / FORMAT</Text>

            <View style={styles.formatList}>
              {formats.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                const IconComponent = fmt.icon;
                return (
                  <Pressable
                    key={fmt.id}
                    style={[
                      styles.formatOption,
                      { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                      isSelected && { backgroundColor: theme.colors.primary + '0D' },
                    ]}
                    onPress={() => setSelectedFormat(fmt.id as any)}
                  >
                    <View style={[styles.formatIconBox, { backgroundColor: fmt.bg }]}>
                      <IconComponent size={18} color={fmt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formatTitle, { color: theme.colors.text }]}>{fmt.title}</Text>
                      <Text style={[styles.formatSub, { color: theme.colors.textSecondary }]}>{fmt.subtitle}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                        isSelected && { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Footer actions */}
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.colors.divider },
              isMobile && { flexDirection: 'column-reverse', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
            ]}
          >
            <Pressable
              style={[
                styles.cancelBtn,
                { borderColor: theme.colors.border },
                isMobile && { width: '100%', alignItems: 'center', justifyContent: 'center' },
              ]}
              onPress={onClose}
              disabled={isExporting}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: selectedFormat === 'whatsapp' ? '#16A34A' : theme.colors.primary },
                (isExporting || isSuccess) && { opacity: 0.9 },
                isMobile && { width: '100%', alignItems: 'center', justifyContent: 'center' },
              ]}
              onPress={handleExport}
              disabled={isExporting || isSuccess}
            >
              {isExporting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Processing...</Text>
                </View>
              ) : isSuccess ? (
                <View style={styles.btnRow}>
                  <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Done!</Text>
                </View>
              ) : selectedFormat === 'whatsapp' ? (
                <View style={styles.btnRow}>
                  <MessageCircle size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Open in WhatsApp</Text>
                </View>
              ) : selectedFormat === 'print' ? (
                <View style={styles.btnRow}>
                  <Printer size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Print Report</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Download size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Download {selectedFormat.toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  formatList: {
    gap: 8,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  formatIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  formatSub: {
    fontSize: 11,
    marginTop: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
