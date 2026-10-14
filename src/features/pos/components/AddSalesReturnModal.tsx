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
import { ProductSearchSelect } from '../../../shared/components/inputs/ProductSearchSelect';
import {
  X,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react-native';
import { useCustomers } from '../../customers/api/useCustomer';
import { useCreateSaleReturn } from '../api/useSalesReturns';
import { useSales } from '../api/useSales';
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

export const AddSalesReturnModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: customers = [] } = useCustomers();
  const { data: sales = [] } = useSales();
  const createSaleReturnMutation = useCreateSaleReturn();

  const [customerId, setCustomerId] = useState<string>('');
  const [saleId, setSaleId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [returnNumber, setReturnNumber] = useState<string>(() => `SRT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');

  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDate(new Date().toISOString().split('T')[0]);
      setReturnNumber(`SRT-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
    }
  }, [visible]);

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [customers]);

  const saleOptions = useMemo(() => {
    return sales.map((s) => ({
      label: `${s.invoiceNumber} - ${s.customerName || 'Customer'} (₹${s.total})`,
      value: String(s.id),
    }));
  }, [sales]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => String(c.id) === String(customerId));
  }, [customers, customerId]);

  const statusOptions = [
    { label: 'Received (Restock to inventory)', value: 'Received' },
    { label: 'Pending Inspection', value: 'Pending' },
  ];

  const handleSelectProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    const unitPrice = Number(product.retailPrice || product.price || 0);

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
      setErrorMessage('Please add at least one returned product.');
      return;
    }

    try {
      await createSaleReturnMutation.mutateAsync({
        saleReturn: {
          saleId: saleId ? Number(saleId) : undefined,
          returnNumber: returnNumber || `SRT-${Date.now().toString().slice(-6)}`,
          reference: returnNumber,
          customerId: customerId ? Number(customerId) : undefined,
          customerName: selectedCustomer?.name || 'Walk-in Customer',
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

      Alert.alert('Success', 'Sales return created and items restocked to inventory!');
      setItems([]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create sales return');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', padding: isMobile ? 8 : 16 }]}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '96%' : '80%', maxWidth: 850 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={20} color="#0EA5E9" />
              <Text style={[styles.title, { color: theme.colors.text }]}>Add Sales Return</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ padding: isMobile ? 12 : 20 }}>
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMessage}</Text>
              </View>
            )}

            {/* Row 1: Sale Reference, Customer, Return No */}
            <View style={[styles.formRow, isMobile && styles.formRowCol]}>
              <View style={styles.formCol}>
                <AppSelect
                  label="Select Sale Invoice"
                  placeholder="Choose Sale (optional)"
                  options={saleOptions}
                  value={saleId}
                  onSelect={setSaleId}
                />
              </View>
              <View style={styles.formCol}>
                <AppSelect
                  label="Customer"
                  placeholder="Select Customer"
                  options={customerOptions}
                  value={customerId}
                  onSelect={setCustomerId}
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
                  placeholder="e.g. Defective, Wrong Size"
                />
              </View>
            </View>

            {/* Product Search */}
            <View style={{ marginTop: 12, zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
              <ProductSearchSelect
                label="Add Returned Products *"
                priceType="retail"
                placeholder="Scan barcode or type product name/sku..."
                onSelectProduct={handleSelectProduct}
              />
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
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: 500 }}>
                      <View style={[styles.tableHeader, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.th, { flex: 2, minWidth: 160, color: theme.colors.text }]}>Product</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 90, color: theme.colors.text }]}>Unit Price (₹)</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 110, color: theme.colors.text }]}>Return Qty</Text>
                        <Text style={[styles.th, { flex: 1, minWidth: 100, color: theme.colors.text }]}>Refund Total (₹)</Text>
                        <Text style={[styles.th, { width: 40 }]}></Text>
                      </View>

                      {items.map((row, idx) => (
                        <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                          <Text style={{ flex: 2, minWidth: 160, color: theme.colors.text, fontWeight: '500' }}>{row.productName}</Text>
                          <Text style={{ flex: 1, minWidth: 90, color: theme.colors.textSecondary }}>₹{row.unitPrice.toFixed(2)}</Text>
                          <View style={{ flex: 1, minWidth: 110, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                          <Text style={{ flex: 1, minWidth: 100, color: theme.colors.text, fontWeight: '600' }}>₹{row.total.toFixed(2)}</Text>
                          <TouchableOpacity style={{ width: 40 }} onPress={() => handleRemoveItem(idx)}>
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Total Refund Summary */}
            <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
              <View style={[styles.totalsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, width: isMobile ? '100%' : 300 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Total Refund:</Text>
                  <Text style={{ color: '#0EA5E9', fontWeight: '700', fontSize: 20 }}>₹{totalReturnAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }, isMobile && { flexDirection: 'column-reverse', gap: 8 }]}>
            <AppButton
              title="Cancel"
              variant="outline"
              size="small"
              onPress={onClose}
              style={[isMobile && { width: '100%' }, { minWidth: 80, height: 34 }]}
            />
            <AppButton
              title={createSaleReturnMutation.isPending ? 'Processing...' : 'Submit Return'}
              size="small"
              onPress={handleSubmit}
              disabled={createSaleReturnMutation.isPending}
              style={[isMobile && { width: '100%' }, { minWidth: 120, height: 34, backgroundColor: '#0EA5E9' }]}
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
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center' },
  tableContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  qtyBtn: { width: 24, height: 24, borderWidth: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  totalsCard: { borderWidth: 1, borderRadius: 8, padding: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1 },
});
