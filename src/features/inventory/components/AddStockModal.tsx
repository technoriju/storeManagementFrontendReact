import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { X, Layers, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useProductStore } from '../../products/store/productStore';
import { useAddStock } from '../api/useStock';

interface AddStockModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedProductId?: number | string | null;
  onSuccess?: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  visible,
  onClose,
  preselectedProductId,
  onSuccess,
}) => {
  const theme = useTheme();
  const { products, fetchProducts } = useProductStore();
  const addStockMutation = useAddStock();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [reason, setReason] = useState<string>('Direct Stock In');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setSelectedProductId(preselectedProductId ? String(preselectedProductId) : '');
      setQuantity('');
      setReason('Direct Stock In');
      setReference(`STK-${Math.floor(100000 + Math.random() * 900000)}`);
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible, preselectedProductId, products.length, fetchProducts]);

  // Selected product object
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.id) === String(selectedProductId)) || null;
  }, [selectedProductId, products]);

  // When product changes, pre-fill cost
  useEffect(() => {
    if (selectedProduct) {
      const price = selectedProduct.purchasePrice ?? selectedProduct.cost ?? 0;
      setUnitCost(price > 0 ? String(price) : '');
    }
  }, [selectedProduct]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      label: `${p.name} (${p.sku || p.productCode || 'No SKU'})`,
      value: String(p.id),
    }));
  }, [products]);

  const reasonPresets = [
    'Direct Stock In',
    'Initial Opening Stock',
    'Vendor Restock',
    'Warehouse Receipt',
    'Customer Return Restock',
  ];

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!selectedProductId) {
      setErrorMessage('Please select a product');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage('Please enter a valid quantity greater than 0');
      return;
    }

    try {
      await addStockMutation.mutateAsync({
        productId: Number(selectedProductId),
        quantity: numQty,
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        reason: reason.trim() || 'Direct Stock In',
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to add stock');
    }
  };

  const currentStock = Number(
    selectedProduct?.stockQuantity ?? selectedProduct?.openingStock ?? 0,
  );
  const unitName = selectedProduct?.unit || 'pcs';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.headerIcon}>
                    <Layers size={18} color="#F97316" />
                  </View>
                  <Text style={[styles.title, { color: theme.colors.text }]}>Add Stock</Text>
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
                    placeholder="Choose product to restock..."
                    options={productOptions}
                    value={selectedProductId}
                    onSelect={(val) => setSelectedProductId(String(val))}
                    searchable
                  />

                  {/* Product Stock Preview Card */}
                  {selectedProduct && (
                    <View style={[styles.stockCard, { backgroundColor: theme.colors.background }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.productNameText, { color: theme.colors.text }]}>
                          {selectedProduct.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                          SKU: {selectedProduct.sku || 'N/A'} | Category: {selectedProduct.categoryName || 'General'}
                        </Text>
                      </View>
                      <View style={styles.stockBadgeContainer}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Current Stock</Text>
                        <Text style={[
                          styles.stockBadgeValue,
                          { color: currentStock > 0 ? '#10B981' : '#EF4444' }
                        ]}>
                          {currentStock} {unitName}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Quantity and Unit Price row */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Quantity to Add *"
                      placeholder="e.g. 50"
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Unit Cost (₹)"
                      placeholder="e.g. 150.00"
                      value={unitCost}
                      onChangeText={setUnitCost}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Reason Presets */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Reason / Source</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {reasonPresets.map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.presetPill,
                            reason === preset
                              ? { backgroundColor: '#F97316', borderColor: '#F97316' }
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

                {/* Reference No */}
                <AppInput
                  label="Reference No / Batch No"
                  placeholder="e.g. STK-123456"
                  value={reference}
                  onChangeText={setReference}
                />

                {/* Notes */}
                <AppInput
                  label="Remarks / Notes"
                  placeholder="Optional notes or supplier info..."
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
                  title="Add Stock"
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                  disabled={addStockMutation.isPending}
                  isLoading={addStockMutation.isPending}
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
    backgroundColor: '#FFF7ED',
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
  stockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  stockBadgeContainer: {
    alignItems: 'flex-end',
  },
  stockBadgeValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: '#F97316',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 22,
  },
});
