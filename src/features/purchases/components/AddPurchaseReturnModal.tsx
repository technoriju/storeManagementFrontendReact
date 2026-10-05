import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import {
  X,
  Search,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react-native';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { usePurchases } from '../api/usePurchases';
import { useProductStore } from '../../products/store/productStore';
import { useCreatePurchaseReturn } from '../api/usePurchaseReturns';
import { Product } from '../../products/types';

interface ReturnItemRow {
  productId: number;
  productName: string;
  sku?: string;
  quantity: number | string;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddPurchaseReturnModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const { products, fetchProducts } = useProductStore();
  const createPurchaseReturnMutation = useCreatePurchaseReturn();

  const [supplierId, setSupplierId] = useState<string>('');
  const [purchaseId, setPurchaseId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [returnNumber, setReturnNumber] = useState<string>(() => `PRT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setDate(new Date().toISOString().split('T')[0]);
      setReturnNumber(`PRT-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
    }
  }, [visible, products.length, fetchProducts]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [suppliers]);

  const purchaseOptions = useMemo(() => {
    return purchases.map((p) => ({
      label: `${p.invoiceNumber} - ${p.supplierName || 'Supplier'} (₹${p.total})`,
      value: String(p.id),
    }));
  }, [purchases]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId));
  }, [suppliers, supplierId]);

  const statusOptions = [
    { label: 'Received / Returned (Deduct from inventory)', value: 'Received' },
    { label: 'Pending Approval', value: 'Pending' },
  ];

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      return matchName || matchSku;
    }).slice(0, 10);
  }, [searchQuery, products]);

  const handleSelectProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    const unitPrice = Number(product.purchasePrice || product.cost || 0);

    if (existingIndex >= 0) {
      const updated = [...items];
      const curr = parseFloat(String(updated[existingIndex].quantity)) || 0;
      const nextQty = Number((curr + 1).toFixed(4));
      updated[existingIndex].quantity = nextQty;
      updated[existingIndex].total = nextQty * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice,
          taxAmount: 0,
          total: unitPrice,
        },
      ]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleUpdateQuantityRaw = (index: number, val: string) => {
    const updated = [...items];
    const qtyNum = parseFloat(val);
    const effectiveQty = !isNaN(qtyNum) && qtyNum > 0 ? qtyNum : 0;
    updated[index].quantity = val;
    updated[index].total = effectiveQty * updated[index].unitPrice;
    setItems(updated);
  };

  const handleUpdateQuantity = (index: number, qty: number | string) => {
    const qtyNum = parseFloat(String(qty));
    if (isNaN(qtyNum) || qtyNum <= 0) return;
    const updated = [...items];
    updated[index].quantity = qtyNum;
    updated[index].total = qtyNum * updated[index].unitPrice;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalReturnAmount = useMemo(() => {
    return items.reduce((acc, row) => acc + row.total, 0);
  }, [items]);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to return.');
      return;
    }

    try {
      await createPurchaseReturnMutation.mutateAsync({
        purchaseReturn: {
          purchaseId: purchaseId ? Number(purchaseId) : undefined,
          returnNumber: returnNumber || `PRT-${Date.now().toString().slice(-6)}`,
          reference: returnNumber,
          supplierId: supplierId ? Number(supplierId) : undefined,
          supplierName: selectedSupplier?.name || 'Supplier',
          date: date || new Date().toISOString().split('T')[0],
          subtotal: totalReturnAmount,
          taxTotal: 0,
          discountTotal: 0,
          totalAmount: totalReturnAmount,
          status,
          reason,
        },
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: parseFloat(String(i.quantity)) > 0 ? parseFloat(String(i.quantity)) : 1,
          unitPrice: i.unitPrice,
          taxAmount: i.taxAmount,
          total: i.total,
        })),
      });

      Alert.alert('Success', 'Purchase return created and inventory updated!');
      setItems([]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create purchase return');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '95%' : '80%', maxWidth: 850 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={20} color="#F97316" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Add Purchase Return</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ padding: 20 }}>
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMessage}</Text>
              </View>
            )}

            {/* Row 1: Purchase Reference, Supplier, Return No */}
            <View style={[styles.formRow, isMobile && styles.formRowCol]}>
              <View style={styles.formCol}>
                <AppSelect
                  label="Select Purchase Order/Bill"
                  placeholder="Choose Purchase (optional)"
                  options={purchaseOptions}
                  value={purchaseId}
                  onSelect={setPurchaseId}
                />
              </View>
              <View style={styles.formCol}>
                <AppSelect
                  label="Supplier"
                  placeholder="Select Supplier"
                  options={supplierOptions}
                  value={supplierId}
                  onSelect={setSupplierId}
                />
              </View>
              <View style={styles.formCol}>
                <AppInput
                  label="Return Reference *"
                  value={returnNumber}
                  onChangeText={setReturnNumber}
                />
              </View>
            </View>

            {/* Row 2: Date, Status, Reason */}
            <View style={[styles.formRow, isMobile && styles.formRowCol]}>
              <View style={styles.formCol}>
                <AppInput
                  label="Return Date *"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formCol}>
                <AppSelect
                  label="Status"
                  options={statusOptions}
                  value={status}
                  onSelect={(v: any) => setStatus(v)}
                />
              </View>
              <View style={styles.formCol}>
                <AppInput
                  label="Return Reason"
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. Damaged batch, Expired"
                />
              </View>
            </View>

            {/* Product Search */}
            <View style={{ marginTop: 12, zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Add Products to Return *</Text>
              <View style={[styles.searchWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                <Search size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Scan barcode or type product name/sku..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                />
              </View>

              {isSearching && filteredProducts.length > 0 && (
                <View style={[styles.searchDropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <ScrollView
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 260 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredProducts.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.searchDropdownItem, { borderBottomColor: theme.colors.border }]}
                        onPress={() => handleSelectProduct(p)}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: theme.colors.text, fontWeight: '500' }} numberOfLines={1}>{p.name}</Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>Stock: {p.stockQuantity} | SKU: {p.sku}</Text>
                        </View>
                        <Text style={{ color: '#F97316', fontWeight: '600', flexShrink: 0 }}>
                          ₹{Number(p.purchasePrice || p.cost || 0).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Items Table */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Returned Items</Text>
              {items.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>No products added yet</Text>
                </View>
              ) : (
                <View style={[styles.tableContainer, { borderColor: theme.colors.border }]}>
                  <View style={[styles.tableHeader, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.th, { flex: 2, color: theme.colors.text }]}>Product</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Unit Cost (₹)</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Return Qty</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Debit Total (₹)</Text>
                    <Text style={[styles.th, { width: 40 }]}></Text>
                  </View>

                  {items.map((row, idx) => (
                    <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                      <Text style={{ flex: 2, color: theme.colors.text, fontWeight: '500' }}>{row.productName}</Text>
                      <Text style={{ flex: 1, color: theme.colors.textSecondary }}>₹{row.unitPrice.toFixed(2)}</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, { borderColor: theme.colors.border }]}
                          onPress={() => {
                            const current = parseFloat(String(row.quantity)) || 1;
                            const next = Math.max(0.001, Number((current - 1).toFixed(4)));
                            handleUpdateQuantity(idx, next);
                          }}
                        >
                          <Text style={{ color: theme.colors.text }}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={{
                            minWidth: 44,
                            height: 28,
                            textAlign: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            borderRadius: 4,
                            color: theme.colors.text,
                            backgroundColor: theme.colors.surface,
                            paddingVertical: 0,
                            paddingHorizontal: 4,
                            fontWeight: '600',
                            fontSize: 13,
                          }}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                          value={row.quantity === 0 || row.quantity === '' ? '' : String(row.quantity)}
                          placeholder="1"
                          placeholderTextColor={theme.colors.textSecondary}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^0-9.]/g, '');
                            const parts = clean.split('.');
                            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                            handleUpdateQuantityRaw(idx, sanitized);
                          }}
                          onBlur={() => {
                            const parsed = parseFloat(String(row.quantity));
                            if (isNaN(parsed) || parsed <= 0) {
                              handleUpdateQuantity(idx, 1);
                            } else {
                              handleUpdateQuantity(idx, parsed);
                            }
                          }}
                        />
                        <TouchableOpacity
                          style={[styles.qtyBtn, { borderColor: theme.colors.border }]}
                          onPress={() => {
                            const current = parseFloat(String(row.quantity)) || 0;
                            const next = Number((current + 1).toFixed(4));
                            handleUpdateQuantity(idx, next);
                          }}
                        >
                          <Text style={{ color: theme.colors.text }}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ flex: 1, color: theme.colors.text, fontWeight: '600' }}>₹{row.total.toFixed(2)}</Text>
                      <TouchableOpacity style={{ width: 40 }} onPress={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Total Debit Summary */}
            <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
              <View style={[styles.totalsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, width: isMobile ? '100%' : 300 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Total Debit Note:</Text>
                  <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 20 }}>₹{totalReturnAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ minWidth: 100 }}
            />
            <AppButton
              title={createPurchaseReturnMutation.isPending ? 'Processing...' : 'Submit Return'}
              onPress={handleSubmit}
              disabled={createPurchaseReturnMutation.isPending}
              style={{ minWidth: 140, backgroundColor: '#F97316' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { borderRadius: 12, maxHeight: '90%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  formRowCol: { flexDirection: 'column', gap: 8 },
  formCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, height: '100%', fontSize: 13 },
  searchDropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    elevation: 10,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 9999,
    maxHeight: 260,
    overflow: 'hidden',
  },
  searchDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center' },
  tableContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  qtyBtn: { width: 24, height: 24, borderWidth: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  totalsCard: { borderWidth: 1, borderRadius: 8, padding: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1 },
});
