import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X } from 'lucide-react-native';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose, onSubmit }) => {
  const [categoryName, setCategoryName] = useState('');

  const handleSubmit = () => {
    onSubmit(categoryName);
    setCategoryName('');
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
                <Text style={styles.title}>Add Category</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ color: '#333', fontSize: 14 }}>Category </Text>
                  <Text style={{ color: 'red', fontSize: 14 }}>*</Text>
                </View>
                <AppInput 
                  value={categoryName}
                  onChangeText={setCategoryName}
                  containerStyle={{ marginBottom: 0 }}
                />
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
    color: '#1A2B3C', // Dark blueish text
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#0F2847', // Dark navy blue from screenshot
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  },
  submitBtn: {
    backgroundColor: '#FFA033', // Orange from screenshot
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  }
});
