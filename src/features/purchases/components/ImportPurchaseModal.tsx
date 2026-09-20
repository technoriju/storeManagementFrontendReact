import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { X, Plus, UploadCloud, Type, Bold, Italic, Underline, Link2, List, ListOrdered } from 'lucide-react-native';
import { AppButton } from '../../../shared/components/inputs/AppButton';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ImportPurchaseModal: React.FC<Props> = ({ visible, onClose }) => {
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
          isMobile ? { width: '95%' } : { width: 600 }
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Import Purchase</Text>
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
                  <AppSelect label="Status *" placeholder="Select" options={mockOptions} />
                </View>
              </View>

              {/* Row 2 */}
              <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity style={styles.downloadBtn}>
                  <Text style={{ color: 'white', fontWeight: '500' }}>Download Sample File</Text>
                </TouchableOpacity>
              </View>

              {/* Upload area */}
              <View>
                <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '500' }}>Upload CSV File</Text>
                <View style={[styles.uploadBox, { borderColor: theme.colors.border }]}>
                  <View style={styles.cloudIcon}>
                    <UploadCloud size={48} color="#F97316" />
                  </View>
                  <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                    Drag and drop a <Text style={{ color: '#F97316' }}>file to upload</Text>
                  </Text>
                </View>
              </View>

              {/* Row 4 */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}><AppInput label="Order Tax *" placeholder="" /></View>
                <View style={{ flex: 1 }}><AppInput label="Discount *" placeholder="" /></View>
                <View style={{ flex: 1 }}><AppInput label="Shipping *" placeholder="" /></View>
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
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Maximum 60 Characters</Text>
                  </View>
                </View>
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
  downloadBtn: { backgroundColor: '#F97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  uploadBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 40, alignItems: 'center', backgroundColor: '#FAFAFA' },
  cloudIcon: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center' },
  editorContainer: { borderWidth: 1, borderRadius: 6 },
  editorToolbar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  toolbarDivider: { width: 1, height: 16, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  toolbarIcon: { marginHorizontal: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', padding: 16, borderTopWidth: 1, gap: 12 }
});
