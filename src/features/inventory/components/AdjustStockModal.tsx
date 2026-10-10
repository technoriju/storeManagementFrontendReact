import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, SlidersHorizontal, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useProductStore } from '../../products/store/productStore';
import { useAdjustStock } from '../api/useStock';

interface AdjustStockModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedProductId?: number | string | null;
  onSuccess?: () => void;
}

type AdjustmentType = 'SET' | 'ADD' | 'SUBTRACT';

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  visible,
  onClose,
  preselectedProductId,
  onSuccess,
}) => {
  const theme = useTheme();
  const { products, fetchProducts } = useProductStore();
  const adjustStockMutation = useAdjustStock();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('SET');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('Physical Inventory Recount');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setSelectedProductId(preselectedProductId ? String(preselectedProductId) : '');
      setAdjustmentType('SET');
      setQuantity('');
      setReason('Physical Inventory Recount');
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible, preselectedProductId, products.length, fetchProducts]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.id) === String(selectedProductId)) || null;
  }, [selectedProductId, products]);

  const currentStock = Number(
    selectedProduct?.stockQuantity ?? selectedProduct?.openingStock ?? 0,
  );
  const unitName = selectedProduct?.unit || 'pcs';

  // Preview calculations
  const parsedQty = parseFloat(quantity) || 0;
  let targetStock = currentStock;
  let delta = 0;

  if (adjustmentType === 'SET') {
    targetStock = parsedQty;
    delta = parsedQty - currentStock;
  } else if (adjustmentType === 'ADD') {
    targetStock = currentStock + parsedQty;
    delta = parsedQty;
  } else if (adjustmentType === 'SUBTRACT') {
    targetStock = Math.max(0, currentStock - parsedQty);
    delta = -Math.min(currentStock, parsedQty);
  }

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      label: `${p.name} (${p.sku || p.productCode || 'No SKU'})`,
      value: String(p.id),
    }));
  }, [products]);

  const reasonPresets = [
    'Physical Inventory Recount',
    'Damaged / Broken Goods',
    'Expired Stock',
    'Internal Consumption',
    'Stock Found During Audit',
    'Correction / Error Entry',
  ];

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!selectedProductId) {
      setErrorMessage('Please select a product');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty < 0) {
      setErrorMessage('Please enter a valid positive quantity');
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        productId: Number(selectedProductId),
        adjustmentType,
        quantity: numQty,
        reason: reason.trim() || 'Stock Adjustment',
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to adjust stock');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e?.stopPropagation?.()}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.headerIcon}>
                    <SlidersHorizontal size={18} color="#1E3A8A" />
                  </View>
                  <Text style={[styles.title, { color: theme.colors.text }]}>Stock Adjustment</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {errorMessage && (
                  <View style={styles.errorAlert}>
                    <AlertCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Product Select */}
                <View style={{ marginBottom: 16 }}>
                  <AppSelect
                    label={
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Select Product</Text>
                        <Text style={styles.required}> *</Text>
                      </View>
                    }
                    placeholder="Choose product to adjust..."
                    options={productOptions}
                    value={selectedProductId}
                    onSelect={(val) => setSelectedProductId(String(val))}
                    searchable
                  />
                </View>

                {/* Adjustment Mode Selector */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>
                    Adjustment Type
                  </Text>
                  <View style={styles.typeSelectorContainer}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        adjustmentType === 'SET' && styles.typeButtonActive,
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setAdjustmentType('SET')}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          adjustmentType === 'SET' && styles.typeButtonTextActive,
                          { color: adjustmentType === 'SET' ? '#FFF' : theme.colors.text }
                        ]}
                      >
                        Set Exact Count
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        adjustmentType === 'ADD' && styles.typeButtonActiveAdd,
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setAdjustmentType('ADD')}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          adjustmentType === 'ADD' && styles.typeButtonTextActive,
                          { color: adjustmentType === 'ADD' ? '#FFF' : theme.colors.text }
                        ]}
                      >
                        Add (+)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        adjustmentType === 'SUBTRACT' && styles.typeButtonActiveSub,
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setAdjustmentType('SUBTRACT')}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          adjustmentType === 'SUBTRACT' && styles.typeButtonTextActive,
                          { color: adjustmentType === 'SUBTRACT' ? '#FFF' : theme.colors.text }
                        ]}
                      >
                        Deduct (-)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quantity Input */}
                <View style={{ marginBottom: 16 }}>
                  <AppInput
                    label={
                      adjustmentType === 'SET'
                        ? 'New Physical Count *'
                        : adjustmentType === 'ADD'
                        ? 'Quantity to Add *'
                        : 'Quantity to Deduct *'
                    }
                    placeholder="Enter quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Real-time Calculation Card */}
                {selectedProduct && (
                  <View style={[styles.previewCard, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.previewCol}>
                      <Text style={styles.previewLabel}>Current</Text>
                      <Text style={[styles.previewVal, { color: theme.colors.text }]}>
                        {currentStock} {unitName}
                      </Text>
                    </View>

                    <View style={styles.previewDivider}>
                      <ArrowRight size={16} color={theme.colors.textSecondary} />
                      <Text
                        style={[
                          styles.deltaText,
                          { color: delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : theme.colors.textSecondary }
                        ]}
                      >
                        {delta > 0 ? `+${delta}` : `${delta}`}
                      </Text>
                    </View>

                    <View style={styles.previewCol}>
                      <Text style={styles.previewLabel}>Resulting Stock</Text>
                      <Text style={[styles.previewValBold, { color: targetStock > 0 ? '#10B981' : '#EF4444' }]}>
                        {targetStock} {unitName}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Reason Presets */}
                <View style={{ marginBottom: 16, marginTop: 12 }}>
                  <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Reason</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {reasonPresets.map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.presetPill,
                            reason === preset
                              ? { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }
                              : { borderColor: theme.colors.border, backgroundColor: theme.colors.background }
                          ]}
                          onPress={() => setReason(preset)}
                        >
                          <Text
                            style={[
                              styles.presetText,
                              { color: reason === preset ? '#FFF' : theme.colors.text }
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <AppInput
                    placeholder="Or enter custom reason"
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>

                {/* Notes */}
                <AppInput
                  label="Remarks / Audit Notes"
                  placeholder="Additional details..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>

              {/* Footer */}
              <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <AppButton
                  title="Cancel"
                  onPress={onClose}
                  style={styles.cancelBtn}
                  textStyle={{ color: '#FFF' }}
                />
                <AppButton
                  title="Apply Adjustment"
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                  disabled={adjustStockMutation.isPending}
                  isLoading={adjustStockMutation.isPending}
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
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
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
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  required: {
    color: '#EF4444',
    fontSize: 14,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  typeButtonActiveAdd: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonActiveSub: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: 6,
  },
  previewCol: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  previewVal: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewValBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewDivider: {
    alignItems: 'center',
    gap: 2,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#0F2847',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 20,
  },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 22,
  },
});
