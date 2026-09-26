import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { X, Calendar, ChevronDown, ScanLine } from 'lucide-react-native';
import { AppButton } from '../../../shared/components/inputs/AppButton';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddSalesModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add Sales</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: '#EF4444' }]}>
              <X size={16} color="white" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Table Header Row */}
            <View style={[styles.tableHeader, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.th, { flex: 2 }]}>Product</Text>
              <Text style={styles.th}>Qty</Text>
              <Text style={styles.th}>Purchase Price($)</Text>
              <Text style={styles.th}>Discount($)</Text>
              <Text style={styles.th}>Tax(%)</Text>
              <Text style={styles.th}>Tax Amount($)</Text>
              <Text style={styles.th}>Unit Cost($)</Text>
              <Text style={styles.th}>Total Cost(%)</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Customer Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWithAdd}>
                  <View style={[styles.selectInput, { borderColor: theme.colors.border, flex: 1 }]}>
                    <Text style={{ color: theme.colors.textSecondary }}>Select</Text>
                    <ChevronDown size={16} color={theme.colors.textSecondary} />
                  </View>
                  <Pressable style={[styles.addButton, { backgroundColor: '#1E1B4B' }]}>
                    <Text style={{ color: 'white', fontSize: 16 }}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
                <View style={[styles.selectInput, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>Choose</Text>
                  <Calendar size={16} color={theme.colors.textSecondary} />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Supplier <Text style={styles.required}>*</Text></Text>
                <View style={[styles.selectInput, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>Select</Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </View>
              </View>
            </View>

            <View style={styles.productField}>
              <Text style={styles.label}>Product <Text style={styles.required}>*</Text></Text>
              <View style={[styles.textInputContainer, { borderColor: theme.colors.border }]}>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Please type product code and select"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <ScanLine size={20} color={theme.colors.textSecondary} />
              </View>
            </View>

            {/* Summary Table & Bottom Fields */}
            <View style={styles.bottomSection}>
              <View style={styles.bottomFields}>
                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Order Tax <Text style={styles.required}>*</Text></Text>
                    <TextInput style={[styles.textInputContainer, { borderColor: theme.colors.border }]} value="0" />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Discount <Text style={styles.required}>*</Text></Text>
                    <TextInput style={[styles.textInputContainer, { borderColor: theme.colors.border }]} value="0" />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Shipping <Text style={styles.required}>*</Text></Text>
                    <TextInput style={[styles.textInputContainer, { borderColor: theme.colors.border }]} value="0" />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Status <Text style={styles.required}>*</Text></Text>
                    <View style={[styles.selectInput, { borderColor: theme.colors.border }]}>
                      <Text style={{ color: theme.colors.textSecondary }}>Select</Text>
                      <ChevronDown size={16} color={theme.colors.textSecondary} />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.summaryTable}>
                <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={styles.summaryLabel}>Order Tax</Text>
                  <Text style={styles.summaryValue}>$ 0.00</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={styles.summaryValue}>$ 0.00</Text>
                </View>
                <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={styles.summaryValue}>$ 0.00</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Grand Total</Text>
                  <Text style={styles.summaryValue}>$ 0.00</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <View style={styles.footerButtons}>
              <AppButton title="Cancel" variant="outline" onPress={onClose} style={styles.cancelButton} />
              <AppButton title="Submit" onPress={onClose} style={styles.submitButton} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 1000,
    maxHeight: '90%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  th: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  field: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    color: '#334155',
  },
  required: {
    color: '#EF4444',
  },
  inputWithAdd: {
    flexDirection: 'row',
    gap: 8,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productField: {
    marginBottom: 24,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
  },
  textInput: {
    flex: 1,
    height: '100%',
  },
  bottomSection: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 20,
  },
  bottomFields: {
    flex: 2,
  },
  summaryTable: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  summaryValue: {
    fontWeight: '500',
    color: '#334155',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#1E293B',
    borderWidth: 0,
  },
  submitButton: {
    backgroundColor: '#F97316',
  },
});


