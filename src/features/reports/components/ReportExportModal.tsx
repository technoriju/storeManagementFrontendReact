import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { FileText, FileSpreadsheet, Printer, Download, Check, X } from 'lucide-react-native';

interface ReportExportModalProps {
  visible: boolean;
  onClose: () => void;
  reportTitle: string;
  totalRecords: number;
  dateRangeLabel?: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  visible,
  onClose,
  reportTitle,
  totalRecords,
  dateRangeLabel = 'Current Period',
}) => {
  const theme = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv' | 'print'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    }, 1000);
  };

  const formats = [
    { id: 'pdf', title: 'PDF Document', subtitle: 'Standard printable document (.pdf)', icon: FileText, color: '#EF4444', bg: '#FEF2F2' },
    { id: 'excel', title: 'Excel Workbook', subtitle: 'Complete data with formulas (.xlsx)', icon: FileSpreadsheet, color: '#10B981', bg: '#ECFDF5' },
    { id: 'csv', title: 'CSV Raw Data', subtitle: 'Comma separated values file (.csv)', icon: Download, color: '#2563EB', bg: '#EFF6FF' },
    { id: 'print', title: 'Direct Thermal / A4 Print', subtitle: 'Send to connected POS printer', icon: Printer, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Export Report</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                {reportTitle} • {totalRecords} records ({dateRangeLabel})
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Format selection */}
          <View style={styles.body}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>CHOOSE FORMAT</Text>
            
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
                      isSelected && { backgroundColor: theme.colors.primary + '0D' }
                    ]}
                    onPress={() => setSelectedFormat(fmt.id as any)}
                  >
                    <View style={[styles.formatIconBox, { backgroundColor: fmt.bg }]}>
                      <IconComponent size={20} color={fmt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formatTitle, { color: theme.colors.text }]}>{fmt.title}</Text>
                      <Text style={[styles.formatSub, { color: theme.colors.textSecondary }]}>{fmt.subtitle}</Text>
                    </View>
                    <View style={[
                      styles.radioCircle,
                      { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                      isSelected && { backgroundColor: theme.colors.primary }
                    ]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Footer actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
            <Pressable
              style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
              onPress={onClose}
              disabled={isExporting}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: theme.colors.primary },
                (isExporting || isSuccess) && { opacity: 0.9 }
              ]}
              onPress={handleExport}
              disabled={isExporting || isSuccess}
            >
              {isExporting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Generating...</Text>
                </View>
              ) : isSuccess ? (
                <View style={styles.btnRow}>
                  <Check size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Export Ready!</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Download size={16} color="#FFF" style={{ marginRight: 6 }} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  body: {
    padding: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  formatList: {
    gap: 10,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 14,
  },
  formatIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  formatSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
