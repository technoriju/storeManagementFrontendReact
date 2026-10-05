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
  FileCheck,
  AlertCircle,
} from 'lucide-react-native';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { useProductStore } from '../../products/store/productStore';
import { useCreatePurchaseOrder } from '../api/usePurchaseOrders';
import { Product } from '../../products/types';

interface OrderItemRow {
  productId: number;
  productName: string;
  sku?: string;
  quantity: number | string;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  total: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddPurchaseOrderModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: suppliers = [] } = useSuppliers();
  const { products, fetchProducts } = useProductStore();
  const createPOMutation = useCreatePurchaseOrder();

  const [supplierId, setSupplierId] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>(() => `PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<'Ordered' | 'Pending' | 'Received'>('Ordered');
  const [shipping, setShipping] = useState<string>('0');
  const [discountTotal, setDiscountTotal] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setOrderDate(new Date().toISOString().split('T')[0]);
      setOrderNumber(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
    }
  }, [visible, products.length, fetchProducts]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [suppliers]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId));
  }, [suppliers, supplierId]);

  const statusOptions = [
    { label: 'Ordered', value: 'Ordered' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Received', value: 'Received' },
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
    const taxRate = Number(product.gst || 0);

    if (existingIndex >= 0) {
      const updated = [...items];
      const row = updated[existingIndex];
      const currQty = parseFloat(String(row.quantity)) || 0;
      const newQty = Number((currQty + 1).toFixed(4));
      const sub = newQty * row.unitPrice - row.discount;
      const tax = (Math.max(0, sub) * taxRate) / 100;
      updated[existingIndex] = {
        ...row,
        quantity: newQty,
        taxAmount: tax,
        total: Math.max(0, sub) + tax,
      };
      setItems(updated);
    } else {
      const sub = 1 * unitPrice;
      const tax = (sub * taxRate) / 100;
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice,
          discount: 0,
          taxAmount: tax,
          total: sub + tax,
        },
      ]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleUpdateQuantityRaw = (index: number, val: string) => {
    const updated = [...items];
    const row = updated[index];
    const qtyNum = parseFloat(val);
    const effectiveQty = !isNaN(qtyNum) && qtyNum > 0 ? qtyNum : 0;
    const sub = effectiveQty * row.unitPrice - row.discount;
    const prod = products.find((p) => p.id === row.productId);
    const taxRate = Number(prod?.gst || 0);
    const tax = (Math.max(0, sub) * taxRate) / 100;
    updated[index] = {
      ...row,
      quantity: val,
      taxAmount: tax,
      total: Math.max(0, sub) + tax,
    };
    setItems(updated);
  };

  const handleUpdateQuantity = (index: number, qty: number | string) => {
    const qtyNum = parseFloat(String(qty));
    if (isNaN(qtyNum) || qtyNum <= 0) return;
    const updated = [...items];
    const row = updated[index];
    const sub = qtyNum * row.unitPrice - row.discount;
    const prod = products.find((p) => p.id === row.productId);
    const taxRate = Number(prod?.gst || 0);
    const tax = (Math.max(0, sub) * taxRate) / 100;
    updated[index] = {
      ...row,
      quantity: qtyNum,
      taxAmount: tax,
      total: Math.max(0, sub) + tax,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const itemsSubtotal = useMemo(() => {
    return items.reduce((acc, row) => {
      const q = parseFloat(String(row.quantity));
      return acc + (!isNaN(q) && q > 0 ? q : 0) * row.unitPrice;
    }, 0);
  }, [items]);

  const itemsTax = useMemo(() => {
    return items.reduce((acc, row) => acc + row.taxAmount, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const ship = parseFloat(shipping) || 0;
    const disc = parseFloat(discountTotal) || 0;
    return Math.max(0, itemsSubtotal - disc + itemsTax + ship);
  }, [itemsSubtotal, itemsTax, shipping, discountTotal]);

  const handleSubmit = async () => {
    if (!supplierId && suppliers.length > 0) {
      setErrorMessage('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to the purchase order.');
      return;
    }

    try {
      await createPOMutation.mutateAsync({
        order: {
          orderNumber: orderNumber || `PO-${Date.now().toString().slice(-6)}`,
          supplierId: Number(supplierId) || 1,
          supplierName: selectedSupplier?.name || 'Supplier',
          orderDate: orderDate || new Date().toISOString().split('T')[0],
          expectedDate: expectedDate || undefined,
          subtotal: itemsSubtotal,
          discount: parseFloat(discountTotal) || 0,
          taxTotal: itemsTax,
          shipping: parseFloat(shipping) || 0,
          grandTotal,
          status,
          notes,
        },
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: parseFloat(String(i.quantity)) > 0 ? parseFloat(String(i.quantity)) : 1,
          unitPrice: i.unitPrice,
          discount: i.discount,
          taxAmount: i.taxAmount,
          total: i.total,
        })),
      });

      Alert.alert('Success', 'Purchase order created successfully');
      setItems([]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create purchase order');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '95%' : '80%', maxWidth: 900 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileCheck size={20} color="#F59E0B" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Add Purchase Order</Text>
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

            {/* Row 1: Supplier, Order Date, PO No */}
            <View style={[styles.formRow, isMobile && styles.formRowCol]}>
              <View style={styles.formCol}>
                <AppSelect
                  label="Supplier *"
                  placeholder="Select Supplier"
                  options={supplierOptions}
                  value={supplierId}
                  onSelect={setSupplierId}
                />
              </View>
              <View style={styles.formCol}>
                <AppInput
                  label="Order Date *"
                  value={orderDate}
                  onChangeText={setOrderDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formCol}>
                <AppInput
                  label="PO Number *"
                  value={orderNumber}
                  onChangeText={setOrderNumber}
                />
              </View>
            </View>

            {/* Row 2: Expected Date & Status */}
            <View style={[styles.formRow, isMobile && styles.formRowCol]}>
              <View style={styles.formCol}>
                <AppInput
                  label="Expected Delivery Date"
                  value={expectedDate}
                  onChangeText={setExpectedDate}
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
            </View>

            {/* Product Search */}
            <View style={{ marginTop: 12, zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Add Products to Order *</Text>
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
                        <Text style={{ color: '#F59E0B', fontWeight: '600', flexShrink: 0 }}>
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
              <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Order Items</Text>
              {items.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>No products added yet</Text>
                </View>
              ) : (
                <View style={[styles.tableContainer, { borderColor: theme.colors.border }]}>
                  <View style={[styles.tableHeader, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.th, { flex: 2, color: theme.colors.text }]}>Product</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Cost (₹)</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Qty</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Tax (₹)</Text>
                    <Text style={[styles.th, { flex: 1, color: theme.colors.text }]}>Total (₹)</Text>
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
                      <Text style={{ flex: 1, color: theme.colors.textSecondary }}>₹{row.taxAmount.toFixed(2)}</Text>
                      <Text style={{ flex: 1, color: theme.colors.text, fontWeight: '600' }}>₹{row.total.toFixed(2)}</Text>
                      <TouchableOpacity style={{ width: 40 }} onPress={() => handleRemoveItem(idx)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Totals & Notes */}
            <View style={[styles.formRow, { marginTop: 16 }]}>
              <View style={{ flex: 1, gap: 12 }}>
                <AppInput
                  label="Discount (₹)"
                  value={discountTotal}
                  onChangeText={setDiscountTotal}
                  keyboardType="numeric"
                />
                <AppInput
                  label="Shipping (₹)"
                  value={shipping}
                  onChangeText={setShipping}
                  keyboardType="numeric"
                />
                <AppInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Terms, supplier remarks, etc."
                />
              </View>

              <View style={[styles.totalsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={styles.totalRow}>
                  <Text style={{ color: theme.colors.textSecondary }}>Subtotal:</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '500' }}>₹{itemsSubtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={{ color: theme.colors.textSecondary }}>Tax:</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '500' }}>₹{itemsTax.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={{ color: theme.colors.textSecondary }}>Discount:</Text>
                  <Text style={{ color: '#EF4444', fontWeight: '500' }}>-₹{(parseFloat(discountTotal) || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={{ color: theme.colors.textSecondary }}>Shipping:</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '500' }}>+₹{(parseFloat(shipping) || 0).toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Grand Total:</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 18 }}>₹{grandTotal.toFixed(2)}</Text>
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
              title={createPOMutation.isPending ? 'Saving...' : 'Submit Order'}
              onPress={handleSubmit}
              disabled={createPOMutation.isPending}
              style={{ minWidth: 140, backgroundColor: '#F59E0B' }}
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
  searchInput: { flex: 1, fontSize: 14, height: 40 },
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
  totalsCard: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 16, borderTopWidth: 1 },
});
