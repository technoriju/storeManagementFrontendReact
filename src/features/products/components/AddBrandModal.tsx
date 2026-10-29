import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { FormErrorBanner } from '../../../shared/components/feedback/FormErrorBanner';
import { formatApiErrorMessage } from '../../../shared/utils/errorUtils';
import { X } from 'lucide-react-native';

interface AddBrandModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (brandName: string) => void | Promise<void>;
}

export const AddBrandModal: React.FC<AddBrandModalProps> = ({ visible, onClose, onSubmit }) => {
  const { isMobile } = useResponsive();
  const [brandName, setBrandName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setError(null);
    setBrandName('');
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = brandName.trim();
    if (!trimmed) {
      setError('Brand name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBrandName('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(formatApiErrorMessage(err, 'Failed to add brand'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={{ width: '100%', alignItems: 'center' }} onPress={(e) => e?.stopPropagation?.()}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Brand</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <FormErrorBanner message={error} />
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#333', fontSize: 14 }}>Brand Name </Text>
                <Text style={{ color: 'red', fontSize: 14 }}>*</Text>
              </View>
              <AppInput 
                value={brandName}
                onChangeText={(val: string) => {
                  setBrandName(val);
                  if (error) setError(null);
                }}
                placeholder="Enter brand name"
                containerStyle={{ marginBottom: 0 }}
              />
            </View>

            {/* Footer */}
            <View style={[
              styles.footer,
              isMobile && { flexDirection: 'column-reverse', gap: 8 }
            ]}>
              <AppButton 
                title="Cancel" 
                onPress={handleClose} 
                style={[styles.cancelBtn, isMobile && { width: '100%' }]} 
                textStyle={{ color: '#FFF' }}
              />
              <AppButton 
                title="Submit" 
                onPress={handleSubmit} 
                isLoading={isSubmitting}
                disabled={isSubmitting}
                style={[styles.submitBtn, isMobile && { width: '100%' }]} 
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
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
    backgroundColor: '#E74C3C',
    borderRadius: 50,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  cancelBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 6,
  },
  submitBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 6,
  },
});
