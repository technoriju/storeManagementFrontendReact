import React, { useState } from 'react';
import { View, StyleSheet, Text, Modal, ScrollView, Pressable, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, Calendar, Search, ScanLine, Bold, Italic, Underline, Link2, List, ListOrdered, Type } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddPurchaseReturnModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [orderTax, setOrderTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');

  const supplierOptions = [{ label: 'Supplier 1', value: '1' }, { label: 'Supplier 2', value: '2' }];
  const statusOptions = [{ label: 'Pending', value: 'pending' }, { label: 'Completed', value: 'completed' }];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '95%' : '80%', maxWidth: 1000 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add Purchase Return</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <View style={styles.closeIconBg}>
                <X size={14} color="white" />
              </View>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
            {/* Row 1 */}
            <View style={[styles.row, isMobile && styles.col]}>
              <View style={styles.flex1}>
                <View style={styles.inputWithBtn}>
                  <AppSelect 
                    label="Supplier Name *" 
                    placeholder="Select" 
                    options={supplierOptions} 
                    value={supplier} 
                    onSelect={setSupplier} 
                    containerStyle={{ flex: 1, marginBottom: 0 }} 
                  />
                  <Pressable style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.flex1}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Date <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <AppInput 
                      placeholder="dd/mm/yyyy" 
                      value={date} 
                      onChangeText={setDate} 
                      containerStyle={{ marginBottom: 0, flex: 1 }} 
                      style={{ borderWidth: 0, height: 38 }}
                    />
                    <Calendar size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  </View>
                </View>
              </View>
              <View style={styles.flex1}>
                <AppInput 
                  label="Reference *" 
                  value={reference} 
                  onChangeText={setReference} 
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>

            {/* Row 2 */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Product <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <AppInput 
                    placeholder="Search Product" 
                    value={searchProduct} 
                    onChangeText={setSearchProduct} 
                    containerStyle={{ marginBottom: 0, flex: 1 }} 
                    style={{ borderWidth: 0, height: 38 }}
                  />
                  <ScanLine size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                </View>
              </View>
            </View>

            {/* Table Area */}
            <View style={[styles.tableContainer, { backgroundColor: theme.colors.background, marginTop: 24 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeader}>
                    {['Image', 'Date', 'Supplier', 'Reference', 'Status', 'Total ($)', 'Paid ($)', 'Due ($)', 'Payment Status'].map((col, idx) => (
                      <Text key={idx} style={[styles.th, { color: theme.colors.text }]}>{col}</Text>
                    ))}
                  </View>
                  {/* Empty state or rows go here */}
                  <View style={styles.tableRowEmpty}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: 20 }}>No products selected</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Row 3 */}
            <View style={[styles.row, isMobile && styles.col, { marginTop: 24 }]}>
              <View style={styles.flex1}>
                <AppInput label="Order Tax *" value={orderTax} onChangeText={setOrderTax} />
              </View>
              <View style={styles.flex1}>
                <AppInput label="Discount *" value={discount} onChangeText={setDiscount} />
              </View>
              <View style={styles.flex1}>
                <AppInput label="Shipping *" value={shipping} onChangeText={setShipping} />
              </View>
              <View style={styles.flex1}>
                <AppSelect label="Status *" placeholder="Select" options={statusOptions} value={status} onSelect={setStatus} />
              </View>
            </View>

            {/* Row 4 */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
              <View style={[styles.editorContainer, { borderColor: theme.colors.border }]}>
                <View style={[styles.editorToolbar, { borderBottomColor: theme.colors.border }]}>
                  <Text style={{ fontSize: 13, marginRight: 16 }}>Normal</Text>
                  <View style={styles.toolbarDivider} />
                  <Bold size={14} color="#666" style={styles.toolbarIcon} />
                  <Italic size={14} color="#666" style={styles.toolbarIcon} />
                  <Underline size={14} color="#666" style={styles.toolbarIcon} />
                  <Link2 size={14} color="#666" style={styles.toolbarIcon} />
                  <List size={14} color="#666" style={styles.toolbarIcon} />
                  <ListOrdered size={14} color="#666" style={styles.toolbarIcon} />
                  <Type size={14} color="#666" style={styles.toolbarIcon} />
                </View>
                <AppInput 
                  placeholder="Type your message" 
                  value={description} 
                  onChangeText={setDescription} 
                  multiline 
                  numberOfLines={4}
                  containerStyle={{ marginBottom: 0 }} 
                  style={{ borderWidth: 0, height: 100, textAlignVertical: 'top' }}
                />
              </View>
              <Text style={styles.editorFooter}>Maximum 60 Words</Text>
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton title="Cancel" variant="outline" onPress={onClose} style={styles.cancelBtn} textStyle={{ color: 'white' }} />
            <AppButton title="Submit" onPress={() => {}} style={styles.submitBtn} />
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
    padding: 20
  },
  dialog: {
    borderRadius: 8,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  closeBtn: {
    padding: 4
  },
  closeIconBg: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  body: {
    flex: 1
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    zIndex: 1
  },
  col: {
    flexDirection: 'column'
  },
  flex1: {
    flex: 1,
    zIndex: 2
  },
  inputWithBtn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 3
  },
  addBtn: {
    backgroundColor: '#1E3A8A',
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0
  },
  addBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '300'
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500'
  },
  required: {
    color: '#EF4444'
  },
  inputContainer: {
    flex: 1
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6
  },
  inputIcon: {
    marginRight: 12
  },
  tableContainer: {
    borderRadius: 8,
    padding: 16,
    minHeight: 100
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12
  },
  th: {
    fontWeight: '600',
    width: 100,
    marginRight: 16,
    fontSize: 13
  },
  tableRowEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 60
  },
  editorContainer: {
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden'
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    backgroundColor: '#FAFAFA'
  },
  toolbarDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginRight: 12
  },
  toolbarIcon: {
    marginRight: 12
  },
  editorFooter: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    gap: 12
  },
  cancelBtn: {
    backgroundColor: '#1E3A8A', // Dark blue in screenshot
    borderWidth: 0
  },
  submitBtn: {
    backgroundColor: '#F97316', // Orange
    borderWidth: 0
  }
});
