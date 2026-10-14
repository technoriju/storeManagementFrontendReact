import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { ProductSearchSelect } from '../../../shared/components/inputs/ProductSearchSelect';
import { X, Layers, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useProductStore } from '../../products/store/productStore';
import { useAddStock } from '../api/useStock';
import { Product } from '../../products/types';

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
  const { isMobile } = useResponsive();
  const { fetchProductById } = useProductStore();
  const addStockMutation = useAddStock();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [reason, setReason] = useState<string>('Direct Stock In');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const pid = preselectedProductId ? String(preselectedProductId) : '';
      setSelectedProductId(pid);
      if (pid) {
        fetchProductById(pid).then((p) => {
          if (p) {
            setSelectedProduct(p);
            const price = p.purchasePrice ?? p.cost ?? 0;
            setUnitCost(price > 0 ? String(price) : '');
          }
        }).catch(() => {});
      } else {
        setSelectedProduct(null);
      }
      setQuantity('');
      setReason('Direct Stock In');
      setReference(`STK-${Math.floor(100000 + Math.random() * 900000)}`);
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible, preselectedProductId, fetchProductById]);

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={{ width: '100%', alignItems: 'center' }} onPress={(e) => e?.stopPropagation?.()}>
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
                  <ProductSearchSelect
                    mode="select"
                    label="Select Product *"
                    priceType="purchase"
                    placeholder="Search product to restock..."
                    selectedProductId={selectedProductId}
                    selectedProduct={selectedProduct}
                    onSelectProduct={(p) => {
                      setSelectedProductId(String(p.id));
                      setSelectedProduct(p);
                      const price = p.purchasePrice ?? p.cost ?? 0;
                      setUnitCost(price > 0 ? String(price) : '');
                    }}
                    onClearSelection={() => {
                      setSelectedProductId('');
                      setSelectedProduct(null);
                      setUnitCost('');
                    }}
                  />
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
              <View style={[
                styles.footer,
                { borderTopColor: theme.colors.border },
                isMobile && { flexDirection: 'column-reverse', gap: 8 }
              ]}>
                <AppButton
                  title="Cancel"
                  size="small"
                  onPress={onClose}
                  style={[styles.cancelBtn, isMobile && { width: '100%' }]}
                  textStyle={{ color: '#FFF' }}
                />
                <AppButton
                  title="Add Stock"
                  size="small"
                  onPress={handleSubmit}
                  style={[styles.submitBtn, isMobile && { width: '100%' }]}
                  disabled={addStockMutation.isPending}
                  isLoading={addStockMutation.isPending}
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
    paddingVertical: 14,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: '#0F2847',
    borderRadius: 6,
    height: 34,
    paddingHorizontal: 16,
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 6,
    height: 34,
    paddingHorizontal: 18,
  },
});
