import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Alert, Platform } from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, CloudUpload, FileSpreadsheet, CheckCircle2 } from 'lucide-react-native';

interface ImportProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (file?: any) => void;
  onOpenImportScreen?: () => void;
}

export const ImportProductModal: React.FC<ImportProductModalProps> = ({ 
  visible, 
  onClose, 
  onSubmit,
  onOpenImportScreen,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handlePickFile = async () => {
    if (onOpenImportScreen) {
      onClose();
      onOpenImportScreen();
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const doc = (globalThis as any).document;
        if (!doc) return;
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = '.csv, .xlsx, .xls';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            setSelectedFileName(file.name);
          }
        };
        input.click();
      } catch (e) {
        Alert.alert('Error', 'Failed to pick file');
      }
      return;
    }

    try {
      const res = await DocumentPicker.pickSingle({
        presentationStyle: 'fullScreen',
        type: [types.xls, types.xlsx, types.csv],
      });
      setSelectedFileName(res.name || 'Selected File');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const handleSubmit = () => {
    if (onOpenImportScreen) {
      onClose();
      onOpenImportScreen();
      return;
    }
    onSubmit();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={20} color="#1E3A8A" />
                  <Text style={styles.title}>Import Products from CSV / Excel</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>
                <Text style={styles.infoText}>
                  Upload your product CSV or Excel spreadsheet. No additional fields are needed. Product name is required. All missing numeric fields default to 0 and text fields default to NULL. Categories and Units will be auto-synced.
                </Text>

                <TouchableOpacity style={styles.uploadArea} onPress={handlePickFile}>
                  <CloudUpload size={44} color="#F97316" style={{ marginBottom: 10 }} />
                  {selectedFileName ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.uploadText, { fontWeight: '600', color: '#10B981' }]}>
                        {selectedFileName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Tap to change file</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.uploadText}>
                        Tap to select <Text style={{ color: '#F97316', fontWeight: '600' }}>CSV or Excel file</Text>
                      </Text>
                      <Text style={styles.helperText}>Supports .csv, .xlsx, .xls</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <AppButton 
                  title="Cancel" 
                  onPress={onClose} 
                  style={styles.cancelBtn} 
                  textStyle={{ color: '#FFF' }}
                />
                <AppButton 
                  title="Proceed to Import" 
                  onPress={handleSubmit} 
                  style={styles.submitBtn} 
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  closeButton: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  infoText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FDBA74',
    borderRadius: 10,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 16,
  },
  uploadText: {
    color: '#334155',
    fontSize: 14,
    textAlign: 'center',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#0F2847',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 18,
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  }
});
