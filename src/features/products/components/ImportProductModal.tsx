import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, CloudUpload } from 'lucide-react-native';

interface ImportProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const ImportProductModal: React.FC<ImportProductModalProps> = ({ visible, onClose, onSubmit }) => {
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  const renderLabel = (text: string, required = false) => (
    <View style={styles.labelContainer}>
      <Text style={styles.labelText}>{text} </Text>
      {required && <Text style={styles.requiredStar}>*</Text>}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Import Product</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>
                <View style={styles.fieldGroup}>
                  {renderLabel('Product', true)}
                  <AppSelect 
                    placeholder="Select"
                    value={product}
                    onSelect={setProduct}
                    options={[
                      { label: 'Product 1', value: '1' },
                      { label: 'Product 2', value: '2' },
                    ]}
                    containerStyle={styles.noMargin}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    {renderLabel('Category', true)}
                    <AppSelect 
                      placeholder="Select"
                      value={category}
                      onSelect={setCategory}
                      options={[
                        { label: 'Category 1', value: '1' }
                      ]}
                      containerStyle={styles.noMargin}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                    {renderLabel('Sub Category', true)}
                    <AppSelect 
                      placeholder="Select"
                      value={subCategory}
                      onSelect={setSubCategory}
                      options={[
                        { label: 'Sub Category 1', value: '1' }
                      ]}
                      containerStyle={styles.noMargin}
                    />
                  </View>
                </View>

                <View style={styles.downloadSampleContainer}>
                  <AppButton 
                    title="Download Sample File" 
                    onPress={() => {}} 
                    style={styles.downloadBtn} 
                    textStyle={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.labelText, { marginBottom: 8 }]}>Upload CSV File</Text>
                  <TouchableOpacity style={styles.uploadArea}>
                    <CloudUpload size={40} color="#F97316" style={{ marginBottom: 8 }} />
                    <Text style={styles.uploadText}>
                      Drag and drop a <Text style={{ color: '#F97316', fontWeight: '500' }}>file to upload</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  {renderLabel('Created by', true)}
                  <AppInput 
                    value={createdBy}
                    onChangeText={setCreatedBy}
                    containerStyle={styles.noMargin}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.labelText, { marginBottom: 8 }]}>Description</Text>
                  <AppInput 
                    value={description}
                    onChangeText={setDescription}
                    containerStyle={styles.noMargin}
                    multiline={true}
                    style={{ height: 80, textAlignVertical: 'top', paddingTop: 8 }}
                  />
                  <Text style={styles.helperText}>Maximum 60 Characters</Text>
                </View>
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
                  title="Submit" 
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
    borderRadius: 8,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2B3C',
  },
  closeButton: {
    backgroundColor: '#FF0000',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  labelText: {
    color: '#333',
    fontSize: 14,
  },
  requiredStar: {
    color: 'red',
    fontSize: 14,
  },
  noMargin: {
    marginBottom: 0,
  },
  downloadSampleContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  downloadBtn: {
    backgroundColor: '#FFA033', // Orange
    borderRadius: 6,
    height: 32,
    paddingHorizontal: 12,
  },
  uploadArea: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF', // White inside with dashed border
  },
  uploadText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: '#0F2847', // Dark navy blue
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  },
  submitBtn: {
    backgroundColor: '#FFA033', // Orange
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  }
});
