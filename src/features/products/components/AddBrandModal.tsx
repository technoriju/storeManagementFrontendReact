import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X } from 'lucide-react-native';

interface AddBrandModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (brandName: string) => void | Promise<void>;
}

export const AddBrandModal: React.FC<AddBrandModalProps> = ({ visible, onClose, onSubmit }) => {
  const [brandName, setBrandName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = brandName.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBrandName('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Add Brand</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.body}>
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ color: '#333', fontSize: 14 }}>Brand Name </Text>
                  <Text style={{ color: 'red', fontSize: 14 }}>*</Text>
                </View>
                <AppInput 
                  value={brandName}
                  onChangeText={setBrandName}
                  placeholder="Enter brand name"
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
                  isLoading={isSubmitting}
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
    paddingHorizontal: 20,
  },
  submitBtn: {
    backgroundColor: '#FFA033',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  }
});
