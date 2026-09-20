import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { FormGrid } from '../../../shared/components/forms/FormGrid';
import { X, Plus, Calendar, Type, Bold, Italic, Underline, Link2, List, ListOrdered, UploadCloud } from 'lucide-react-native';
import { AppButton } from '../../../shared/components/inputs/AppButton';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddPurchaseModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const mockOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[
          styles.dialog,
          { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg },
          { width: isMobile ? '95%' : '80%', maxWidth: 1000 }
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Add Purchase</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '80%' }}>
            <View style={{ padding: 24, gap: 20 }}>
              {/* Row 1 */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppSelect label="Supplier Name *" placeholder="Select" options={mockOptions} />
                  </View>
                  <TouchableOpacity style={[styles.plusBtn, { marginTop: 24 }]}>
                    <Plus size={16} color="white" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput 
                    label="Date *" 
                    placeholder="dd/mm/yyyy" 
                    style={{ paddingRight: 36 }}
                  />
                  <View style={styles.inputIcon}>
                    <Calendar size={18} color={theme.colors.textSecondary} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput label="Reference *" placeholder="" />
                </View>
              </View>

              {/* Row 2 */}
              <View>
                <AppInput label="Product *" placeholder="Search Product" />
              </View>

              {/* Table Area */}
              <View style={[styles.tableContainer, { backgroundColor: theme.colors.background }]}>
                <View style={styles.tableHeaderRow}>
                  {['Product', 'Qty', 'Purchase Price($)', 'Discount($)', 'Tax(%)', 'Tax Amount($)', 'Unit Cost($)', 'Total Cost(%)'].map(col => (
                    <Text key={col} style={[styles.tableHeader, { color: theme.colors.textSecondary, flex: col === 'Product' ? 1.5 : 1 }]}>
                      {col}
                    </Text>
                  ))}
                </View>
                <View style={[styles.tableFooter, { borderTopColor: theme.colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Row Per Page</Text>
                    <View style={styles.paginationSelect}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>10</Text>
                    </View>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Entries</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{'<'}</Text>
                    <View style={styles.pageCircle}>
                      <Text style={{ color: 'white', fontSize: 12 }}>1</Text>
                    </View>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{'>'}</Text>
                  </View>
                </View>
              </View>

              {/* Row 3 */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}><AppInput label="Order Tax *" placeholder="" /></View>
                <View style={{ flex: 1 }}><AppInput label="Discount *" placeholder="" /></View>
                <View style={{ flex: 1 }}><AppInput label="Shipping *" placeholder="" /></View>
                <View style={{ flex: 1 }}><AppSelect label="Status *" placeholder="Select" options={mockOptions} /></View>
              </View>

              {/* Description */}
              <View>
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '500' }}>Description</Text>
                <View style={[styles.editorContainer, { borderColor: theme.colors.border, backgroundColor: 'white' }]}>
                  <View style={[styles.editorToolbar, { borderBottomColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.textSecondary, marginRight: 16 }}>Normal</Text>
                    <View style={styles.toolbarDivider} />
                    <Bold size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <Italic size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <Underline size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <Link2 size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <List size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <ListOrdered size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                    <Type size={16} color={theme.colors.textSecondary} style={styles.toolbarIcon} />
                  </View>
                  <View style={{ height: 100, padding: 12 }}>
                  </View>
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>Maximum 60 Words</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton title="Cancel" variant="outline" onPress={onClose} style={{ backgroundColor: '#0F172A' }} textStyle={{ color: 'white' }} />
            <AppButton title="Submit" onPress={() => {}} style={{ backgroundColor: '#F97316', borderWidth: 0 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  closeBtn: { backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 16 },
  plusBtn: { width: 40, height: 40, backgroundColor: '#0F172A', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  inputIcon: { position: 'absolute', right: 12, top: 35 },
  tableContainer: { borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', padding: 16, backgroundColor: '#F1F5F9' },
  tableHeader: { fontSize: 13, fontWeight: '500' },
  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1 },
  paginationSelect: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  pageCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center' },
  editorContainer: { borderWidth: 1, borderRadius: 6 },
  editorToolbar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  toolbarDivider: { width: 1, height: 16, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  toolbarIcon: { marginHorizontal: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: 16, borderTopWidth: 1, gap: 12 }
});
