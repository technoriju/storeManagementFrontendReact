import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { FormErrorBanner } from '../../../shared/components/feedback/FormErrorBanner';
import { formatApiErrorMessage } from '../../../shared/utils/errorUtils';
import { X } from 'lucide-react-native';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string) => Promise<void> | void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose, onSubmit }) => {
  const { isMobile } = useResponsive();
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setError(null);
    setCategoryName('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(categoryName.trim());
      setCategoryName('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(formatApiErrorMessage(err, 'Failed to add category'));
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
              <Text style={styles.title}>Add Category</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <FormErrorBanner message={error} />
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#333', fontSize: 14 }}>Category </Text>
                <Text style={{ color: 'red', fontSize: 14 }}>*</Text>
              </View>
              <AppInput 
                value={categoryName}
                onChangeText={(val: string) => {
                  setCategoryName(val);
                  if (error) setError(null);
                }}
                containerStyle={{ marginBottom: 0 }}
                placeholder="Enter category name"
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
                disabled={isSubmitting}
                isLoading={isSubmitting}
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
