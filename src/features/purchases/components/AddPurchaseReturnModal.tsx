import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getLocalDateString } from '../../../shared/utils/dateUtils';
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
  ActivityIndicator,
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
  FileText,
  CheckCircle2,
  Package,
} from 'lucide-react-native';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { usePurchases } from '../api/usePurchases';
import { useProductStore } from '../../products/store/productStore';
import { useBrands } from '../../brands/api/useBrand';
import { useCreatePurchaseReturn } from '../api/usePurchaseReturns';
import { Product } from '../../products/types';
import { Purchase } from '../../../types/models';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { purchaseReturnRepository } from '../../../core/repositories/PurchaseReturnRepository';

export interface ReturnItemRow {
  productId: number;
  productUnitId?: number;
  productName: string;
  sku?: string;
  unit?: string;
  unitType?: 'base' | 'sub';
  conversionRate?: number;
  purchasedQuantity: number;
  alreadyReturnedQuantity: number;
  maxReturnableQuantity: number;
  quantity: number | string;
  unitPrice: number;
  unitDiscount: number;
  unitTax: number;
  total: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPurchaseId?: number | string | null;
  initialInvoiceNumber?: string | null;
}

export const AddPurchaseReturnModal: React.FC<Props> = ({
  visible,
  onClose,
  initialPurchaseId,
  initialInvoiceNumber,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const { data: brandsList = [] } = useBrands();
  const createPurchaseReturnMutation = useCreatePurchaseReturn();

  const [supplierId, setSupplierId] = useState<string>('');
  const [purchaseId, setPurchaseId] = useState<string>('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [invoiceSearchInput, setInvoiceSearchInput] = useState<string>('');
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);

  const [date, setDate] = useState<string>(() => getLocalDateString());
  const [returnNumber, setReturnNumber] = useState<string>(() => `PRT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');

  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const qtyInputRefs = useRef<(any | null)[]>([]);

  const focusQtyInput = (index: number) => {
    const target = qtyInputRefs.current[index];
    if (target) {
      try {
        (target as any)?.focus?.();
      } catch {}
      try {
        (target as any)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      } catch {}
      setTimeout(() => {
        try {
          (target as any)?.select?.();
        } catch {}
      }, 0);
    }
  };

  const handleQtyKeyPress = (index: number, e: any) => {
    const key = e?.nativeEvent?.key || e?.key;
    if (key === 'ArrowUp' || key === 'Up') {
      e?.preventDefault?.();
      e?.nativeEvent?.preventDefault?.();
      if (index > 0) focusQtyInput(index - 1);
    } else if (key === 'ArrowDown' || key === 'Down') {
      e?.preventDefault?.();
      e?.nativeEvent?.preventDefault?.();
      if (index < items.length - 1) focusQtyInput(index + 1);
    }
  };

  // Reset form on open
  useEffect(() => {
    if (visible) {
      setDate(getLocalDateString());
      setReturnNumber(`PRT-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
      setItems([]);
      setSelectedPurchase(null);
      setPurchaseId('');
      setSupplierId('');
      setInvoiceSearchInput('');
      setReason('');

      if (initialInvoiceNumber) {
        setInvoiceSearchInput(initialInvoiceNumber);
        void handleLookupInvoice(initialInvoiceNumber);
      } else if (initialPurchaseId) {
        setPurchaseId(String(initialPurchaseId));
        void handleSelectPurchase(String(initialPurchaseId));
      }
    }
  }, [visible, initialPurchaseId, initialInvoiceNumber]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [suppliers]);

  const purchaseOptions = useMemo(() => {
    return purchases.map((p) => ({
      label: `${p.invoiceNumber || p.reference || `#${p.id}`} • ${p.supplierName || 'Supplier'} (₹${Number(p.total || 0).toFixed(2)}) • ${p.date || ''}`,
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

  // Core loader: Retrieves verified purchase and populates items with purchase pricing and return limits
  const loadPurchaseForReturn = async (targetIdOrInvoice: string) => {
    const term = (targetIdOrInvoice || '').trim();
    if (!term) {
      setPurchaseId('');
      setSelectedPurchase(null);
      setItems([]);
      return;
    }

    setIsLoadingInvoice(true);
    setErrorMessage(null);

    try {
      let purchase: Purchase | null = null;

      // 1. Fetch verified purchase from server first
      try {
        purchase = await purchaseRepository.fetchByIdFromApi(term);
      } catch (apiErr) {
        console.warn('fetchByIdFromApi error, trying fallback:', apiErr);
      }

      // 2. If not found, search in-memory purchases
      if (!purchase) {
        purchase =
          purchases.find(
            (p) =>
              String(p.id) === term ||
              p.invoiceNumber?.trim().toLowerCase() === term.toLowerCase() ||
              p.reference?.trim().toLowerCase() === term.toLowerCase()
          ) || null;
      }

      // 3. Fallback to SQLite by invoice number or ID
      if (!purchase) {
        purchase = await purchaseRepository.getByInvoiceNumber(term);
      }
      if (!purchase && Number(term) > 0) {
        purchase = await purchaseRepository.getById(Number(term));
      }

      if (!purchase) {
        setErrorMessage(`Purchase bill not found for reference "${term}". Please verify invoice number.`);
        setIsLoadingInvoice(false);
        return;
      }

      setSelectedPurchase(purchase);
      setPurchaseId(String(purchase.id));
      if (purchase.supplierId) {
        setSupplierId(String(purchase.supplierId));
      }

      // 1. Get raw items: prefer server-verified purchase.items, else SQLite getItemsForPurchase
      let rawItems: any[] = purchase.items || [];
      if (!rawItems || rawItems.length === 0) {
        rawItems = await purchaseRepository.getItemsForPurchase(purchase.id);
      }

      if (!rawItems || rawItems.length === 0) {
        setErrorMessage(`No items found in purchase invoice ${purchase.invoiceNumber}.`);
        setItems([]);
        setIsLoadingInvoice(false);
        return;
      }

      // 2. Fetch previously returned quantities for this purchase
      const returnedMap = await purchaseReturnRepository.getReturnedQuantitiesForPurchase(purchase.id);

      // 3. Cross-reference with global productStore for names, sku, units
      const productStoreList = useProductStore.getState().products || [];

      const mappedRows: ReturnItemRow[] = rawItems.map((pi: any) => {
        const pId = Number(pi.productId);
        const rawPuId = pi.productUnitId || (pi.productUnit && pi.productUnit.id);
        const resolvedPuId = rawPuId ? Number(rawPuId) : undefined;
        const purchasedQty = Number(pi.quantity || 0);
        const alreadyReturned = Number(returnedMap[pId] || 0);
        const maxReturnable = Math.max(0, Number((purchasedQty - alreadyReturned).toFixed(4)));
        const unitPrice = Number(pi.unitPrice || 0);
        const discount = Number(pi.discount || 0);
        const taxAmount = Number(pi.taxAmount || 0);
        const unitDiscount = purchasedQty > 0 ? discount / purchasedQty : 0;
        const unitTax = purchasedQty > 0 ? taxAmount / purchasedQty : 0;

        const matchedProd = productStoreList.find((p) => Number(p.id) === pId);
        const resolvedName =
          matchedProd?.name ||
          (pi.productName && !pi.productName.startsWith('Product #') ? pi.productName : null) ||
          `Product #${pId}`;
        const resolvedSku = pi.sku || matchedProd?.sku || '';
        const resolvedUnit =
          pi.unit ||
          (typeof matchedProd?.unit === 'string' ? matchedProd?.unit : (matchedProd as any)?.unit?.name) ||
          matchedProd?.baseUnitName ||
          'Pcs';
        const resolvedUnitType = (pi.unitType as any) || 'base';
        const resolvedConvRate = Number(pi.conversionRate || matchedProd?.conversionRate || 1);

        const defaultQty = maxReturnable;
        const netUnitPrice = Math.max(0, unitPrice - unitDiscount);
        const rowTotal = defaultQty > 0 ? Number((defaultQty * netUnitPrice + defaultQty * unitTax).toFixed(2)) : 0;

        return {
          productId: pId,
          productUnitId: resolvedPuId,
          productName: resolvedName,
          sku: resolvedSku,
          unit: resolvedUnit,
          unitType: resolvedUnitType,
          conversionRate: resolvedConvRate,
          purchasedQuantity: purchasedQty,
          alreadyReturnedQuantity: alreadyReturned,
          maxReturnableQuantity: maxReturnable,
          quantity: defaultQty,
          unitPrice,
          unitDiscount,
          unitTax,
          total: rowTotal,
        };
      });

      setItems(mappedRows);
    } catch (err: any) {
      console.error('Failed to load purchase details for return:', err);
      setErrorMessage(err?.message || 'Failed to load purchase invoice');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const handleSelectPurchase = async (targetPurchaseId: string) => {
    await loadPurchaseForReturn(targetPurchaseId);
  };

  const handleLookupInvoice = async (invoiceQuery: string) => {
    await loadPurchaseForReturn(invoiceQuery);
  };

  // Recalculate row total
  const computeRowTotal = (row: ReturnItemRow, qty: number): number => {
    const netUnitPrice = Math.max(0, row.unitPrice - row.unitDiscount);
    return Number((qty * netUnitPrice + qty * row.unitTax).toFixed(2));
  };

  // Update quantity with strict boundary check (0 <= qty <= maxReturnableQuantity)
  const handleUpdateQuantityRaw = (index: number, val: string) => {
    const updated = [...items];
    const row = updated[index];
    const qtyNum = parseFloat(val);

    if (val === '') {
      row.quantity = '';
      row.total = 0;
      setItems(updated);
      return;
    }

    if (isNaN(qtyNum)) return;

    if (row.maxReturnableQuantity > 0 && qtyNum > row.maxReturnableQuantity) {
      Alert.alert(
        'Return Limit Exceeded',
        `Cannot return more than available purchased quantity (${row.maxReturnableQuantity}). Available return quantity was capped.`
      );
      row.quantity = row.maxReturnableQuantity;
      row.total = computeRowTotal(row, row.maxReturnableQuantity);
    } else {
      const effectiveQty = Math.max(0, qtyNum);
      row.quantity = val;
      row.total = computeRowTotal(row, effectiveQty);
    }
    setItems(updated);
  };

  const handleUpdateQuantity = (index: number, qty: number | string) => {
    const qtyNum = parseFloat(String(qty));
    if (isNaN(qtyNum)) return;
    const updated = [...items];
    const row = updated[index];
    const boundedQty = row.maxReturnableQuantity > 0
      ? Math.min(row.maxReturnableQuantity, Math.max(0, Number(qtyNum.toFixed(4))))
      : Math.max(0, Number(qtyNum.toFixed(4)));
    row.quantity = boundedQty;
    row.total = computeRowTotal(row, boundedQty);
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick action: Return all available quantities
  const handleReturnAll = () => {
    setItems((prev) =>
      prev.map((row) => ({
        ...row,
        quantity: row.maxReturnableQuantity,
        total: computeRowTotal(row, row.maxReturnableQuantity),
      }))
    );
  };

  // Quick action: Reset all return quantities to 0
  const handleClearAll = () => {
    setItems((prev) =>
      prev.map((row) => ({
        ...row,
        quantity: 0,
        total: 0,
      }))
    );
  };

  // Manual product addition (optional ad-hoc item)
  const handleSelectProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    const unitPrice = Number(product.purchasePrice || product.cost || 0);

    if (existingIndex >= 0) {
      const updated = [...items];
      const curr = parseFloat(String(updated[existingIndex].quantity)) || 0;
      const nextQty = Number((curr + 1).toFixed(4));
      if (updated[existingIndex].maxReturnableQuantity > 0 && nextQty > updated[existingIndex].maxReturnableQuantity) {
        Alert.alert(
          'Return Limit Exceeded',
          `Cannot return more than available purchased quantity (${updated[existingIndex].maxReturnableQuantity}).`
        );
        return;
      }
      updated[existingIndex].quantity = nextQty;
      updated[existingIndex].total = computeRowTotal(updated[existingIndex], nextQty);
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: typeof product.unit === 'string' ? product.unit : (product as any)?.unit?.name || product.baseUnitName || 'Pcs',
          unitType: 'base',
          conversionRate: 1,
          purchasedQuantity: 0,
          alreadyReturnedQuantity: 0,
          maxReturnableQuantity: 999999,
          quantity: 1,
          unitPrice,
          unitDiscount: 0,
          unitTax: 0,
          total: unitPrice,
        },
      ]);
    }
  };

  const totalReturnAmount = useMemo(() => {
    return Number(
      items
        .reduce((acc, row) => {
          const q = parseFloat(String(row.quantity));
          if (!isNaN(q) && q > 0) {
            return acc + row.total;
          }
          return acc;
        }, 0)
        .toFixed(2)
    );
  }, [items]);

  const activeReturnItemsCount = useMemo(() => {
    return items.filter((row) => {
      const q = parseFloat(String(row.quantity));
      return !isNaN(q) && q > 0;
    }).length;
  }, [items]);

  const handleSubmit = async () => {
    const validReturnItems = items.filter((row) => {
      const q = parseFloat(String(row.quantity));
      return !isNaN(q) && q > 0;
    });

    if (validReturnItems.length === 0) {
      setErrorMessage('Please specify a return quantity greater than 0 for at least one item.');
      return;
    }

    for (const item of validReturnItems) {
      const q = parseFloat(String(item.quantity));
      if (item.maxReturnableQuantity > 0 && q > item.maxReturnableQuantity) {
        setErrorMessage(
          `Item "${item.productName}" exceeds allowed return quantity (${item.maxReturnableQuantity}).`
        );
        return;
      }
    }

    try {
      const returnTotal = totalReturnAmount;
      const subtotalTotal = validReturnItems.reduce((acc, i) => acc + (parseFloat(String(i.quantity)) * i.unitPrice), 0);
      const discountTotal = validReturnItems.reduce((acc, i) => acc + (parseFloat(String(i.quantity)) * i.unitDiscount), 0);
      const taxTotal = validReturnItems.reduce((acc, i) => acc + (parseFloat(String(i.quantity)) * i.unitTax), 0);

      await createPurchaseReturnMutation.mutateAsync({
        purchaseReturn: {
          purchaseId: purchaseId ? Number(purchaseId) : undefined,
          returnNumber: returnNumber || `PRT-${Date.now().toString().slice(-6)}`,
          reference: returnNumber,
          supplierId: supplierId ? Number(supplierId) : (selectedPurchase?.supplierId || undefined),
          supplierName: selectedPurchase?.supplierName || selectedSupplier?.name || 'Supplier',
          date: date || getLocalDateString(),
          subtotal: Number(subtotalTotal.toFixed(2)),
          taxTotal: Number(taxTotal.toFixed(2)),
          discountTotal: Number(discountTotal.toFixed(2)),
          totalAmount: returnTotal,
          status,
          reason,
        },
        items: validReturnItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: parseFloat(String(i.quantity)),
          unitPrice: i.unitPrice,
          discount: Number((parseFloat(String(i.quantity)) * i.unitDiscount).toFixed(2)),
          taxAmount: Number((parseFloat(String(i.quantity)) * i.unitTax).toFixed(2)),
          unit: i.unit,
          unitType: i.unitType || 'base',
          conversionRate: i.conversionRate || 1,
          total: i.total,
        })),
      });

      try {
        await useProductStore.getState().fetchProducts(true);
      } catch (_) {}

      Alert.alert('Success', 'Purchase return created! Products restocked from inventory and supplier balance adjusted.');
      setItems([]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create purchase return');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', padding: isMobile ? 8 : 16 }]}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '98%' : '85%', maxWidth: 920 }]}>
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

          <ScrollView style={styles.body} contentContainerStyle={{ padding: isMobile ? 12 : 18 }}>
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMessage}</Text>
              </View>
            )}

            {/* Step 1: Purchase Invoice Lookup (Scan / Enter or Dropdown) */}
            <View style={[styles.sectionCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileText size={16} color="#F97316" />
                <Text style={{ fontWeight: '700', fontSize: 14, color: theme.colors.text }}>
                  Select or Enter Purchase Order/Bill
                </Text>
              </View>

              <View style={[styles.formRow, isMobile && styles.formRowCol]}>
                {/* Option A: Quick search/scan by Invoice Number */}
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Scan / Enter Invoice No.</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.text,
                        },
                      ]}
                      placeholder="e.g. PO-169887"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={invoiceSearchInput}
                      onChangeText={setInvoiceSearchInput}
                      onSubmitEditing={() => handleLookupInvoice(invoiceSearchInput)}
                    />
                    <AppButton
                      title={isLoadingInvoice ? 'Finding...' : 'Find'}
                      size="small"
                      onPress={() => handleLookupInvoice(invoiceSearchInput)}
                      disabled={isLoadingInvoice || !invoiceSearchInput.trim()}
                      style={{ height: 38, minWidth: 64, backgroundColor: '#F97316' }}
                    />
                  </View>
                </View>

                {/* Option B: Dropdown select from recent purchases */}
                <View style={{ flex: 1.8 }}>
                  <AppSelect
                    label="Or Choose from Purchases List"
                    placeholder="Select Purchase Order/Bill..."
                    options={purchaseOptions}
                    value={purchaseId}
                    onSelect={(val) => {
                      setPurchaseId(val);
                      void handleSelectPurchase(val);
                    }}
                    searchable
                    clearable
                  />
                </View>
              </View>

              {isLoadingInvoice && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={{ fontSize: 13, color: '#F97316' }}>Loading purchase products and previous returns...</Text>
                </View>
              )}

              {/* Selected Purchase Details Banner */}
              {selectedPurchase && !isLoadingInvoice && (
                <View style={[styles.invoiceInfoBanner, { borderColor: '#FDBA74', backgroundColor: '#FFF7ED' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CheckCircle2 size={16} color="#EA580C" />
                    <Text style={{ fontWeight: '700', color: '#C2410C', fontSize: 14 }}>
                      Purchase #{selectedPurchase.invoiceNumber || selectedPurchase.reference} Linked
                    </Text>
                  </View>
                  <View style={[styles.infoGrid, isMobile && { flexDirection: 'column', gap: 4 }]}>
                    <Text style={{ fontSize: 12, color: '#0F172A' }}>
                      <Text style={{ fontWeight: '600' }}>Supplier: </Text>
                      {selectedPurchase.supplierName || selectedSupplier?.name || 'Supplier'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0F172A' }}>
                      <Text style={{ fontWeight: '600' }}>Date: </Text>
                      {selectedPurchase.date ? selectedPurchase.date.split('T')[0] : ''}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0F172A' }}>
                      <Text style={{ fontWeight: '600' }}>Invoice Total: </Text>
                      ₹{Number(selectedPurchase.total || 0).toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#0F172A' }}>
                      <Text style={{ fontWeight: '600' }}>Current Due: </Text>
                      ₹{Number(selectedPurchase.due || 0).toFixed(2)} ({selectedPurchase.paymentStatus || 'Unpaid'})
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Step 2: Return Details (Reference, Date, Status, Reason, Supplier) */}
            <View style={[styles.formRow, isMobile && styles.formRowCol, { marginTop: 12 }]}>
              <View style={styles.formCol}>
                <AppSelect
                  label="Supplier"
                  placeholder="Select Supplier"
                  options={supplierOptions}
                  value={supplierId}
                  onSelect={setSupplierId}
                  searchable
                  clearable
                />
              </View>
              <View style={styles.formCol}>
                <AppInput
                  label="Return Reference *"
                  value={returnNumber}
                  onChangeText={setReturnNumber}
                />
              </View>
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
            </View>

            <View style={{ marginTop: 8 }}>
              <AppInput
                label="Return Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Damaged goods, Quality defect, Excess shipment"
              />
            </View>

            {/* Optional Ad-hoc Product Search */}
            <View style={{ marginTop: 12, zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
              <ProductSearchSelect
                label="Add Extra Product to Return (Optional)"
                priceType="purchase"
                placeholder="Scan barcode or type product name/sku..."
                onSelectProduct={handleSelectProduct}
              />
            </View>

            {/* Items Table Section */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Package size={16} color={theme.colors.text} />
                  <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>
                    Purchased Items to Return ({items.length})
                  </Text>
                </View>

                {items.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={handleReturnAll}
                      style={[styles.smallActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#1D4ED8' }}>Return All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleClearAll}
                      style={[styles.smallActionBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {items.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    Select a purchase invoice above to auto-populate purchased items and return limits.
                  </Text>
                </View>
              ) : (
                <View style={[styles.tableContainer, { borderColor: theme.colors.border, width: '100%' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
                    <View style={{ minWidth: 740, width: '100%' }}>
                      <View style={[styles.tableHeader, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.th, { flex: 2.2, minWidth: 160, color: theme.colors.text }]}>Product Name & SKU</Text>
                        <Text style={[styles.th, { width: 90, color: theme.colors.text, textAlign: 'center' }]}>Purchased Qty</Text>
                        <Text style={[styles.th, { width: 90, color: theme.colors.text, textAlign: 'center' }]}>Prev Returned</Text>
                        <Text style={[styles.th, { width: 95, color: theme.colors.text, textAlign: 'center' }]}>Max Returnable</Text>
                        <Text style={[styles.th, { width: 135, color: theme.colors.text, textAlign: 'center' }]}>Return Qty</Text>
                        <Text style={[styles.th, { width: 100, color: theme.colors.text, textAlign: 'right' }]}>Unit Cost (₹)</Text>
                        <Text style={[styles.th, { width: 110, color: theme.colors.text, textAlign: 'right' }]}>Debit Total (₹)</Text>
                        <Text style={[styles.th, { width: 45 }]}></Text>
                      </View>

                      {items.map((row, idx) => {
                        const isOver = row.maxReturnableQuantity > 0 && Number(row.quantity) > row.maxReturnableQuantity;
                        return (
                          <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }, isOver && { backgroundColor: '#FEF2F2' }]}>
                            <View style={{ flex: 2.2, minWidth: 160, paddingRight: 8 }}>
                              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                                {row.productName}
                              </Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                                SKU: {row.sku || 'N/A'}{row.unit ? ` • ${row.unit}` : ''}
                              </Text>
                            </View>

                            <Text style={{ width: 90, color: theme.colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                              {row.purchasedQuantity > 0 ? row.purchasedQuantity : '-'}
                            </Text>

                            <Text style={{ width: 90, color: row.alreadyReturnedQuantity > 0 ? '#DC2626' : theme.colors.textSecondary, textAlign: 'center', fontSize: 13, fontWeight: row.alreadyReturnedQuantity > 0 ? '600' : '400' }}>
                              {row.alreadyReturnedQuantity > 0 ? row.alreadyReturnedQuantity : '0'}
                            </Text>

                            <View style={{ width: 95, alignItems: 'center' }}>
                              <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>
                                {row.maxReturnableQuantity < 999999 ? row.maxReturnableQuantity : 'Any'}
                              </Text>
                            </View>

                            <View style={{ width: 135, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <TouchableOpacity
                                style={[styles.qtyBtn, { borderColor: theme.colors.border }]}
                                onPress={() => {
                                  const current = parseFloat(String(row.quantity)) || 0;
                                  const next = Math.max(0, Number((current - 1).toFixed(4)));
                                  handleUpdateQuantity(idx, next);
                                }}
                              >
                                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>-</Text>
                              </TouchableOpacity>

                              <TextInput
                                ref={(el) => {
                                  qtyInputRefs.current[idx] = el;
                                }}
                                style={[
                                  styles.qtyInput,
                                  {
                                    borderColor: isOver ? '#EF4444' : theme.colors.border,
                                    color: isOver ? '#DC2626' : theme.colors.text,
                                    backgroundColor: theme.colors.surface,
                                  },
                                ]}
                                keyboardType="decimal-pad"
                                selectTextOnFocus
                                value={row.quantity === 0 || row.quantity === '' ? '' : String(row.quantity)}
                                placeholder="0"
                                placeholderTextColor={theme.colors.textSecondary}
                                onKeyPress={(e) => handleQtyKeyPress(idx, e)}
                                onChangeText={(v) => {
                                  const clean = v.replace(/[^0-9.]/g, '');
                                  const parts = clean.split('.');
                                  const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
                                  handleUpdateQuantityRaw(idx, sanitized);
                                }}
                                onBlur={() => {
                                  const parsed = parseFloat(String(row.quantity));
                                  if (isNaN(parsed) || parsed < 0) {
                                    handleUpdateQuantity(idx, 0);
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
                                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>+</Text>
                              </TouchableOpacity>
                            </View>

                            <Text style={{ width: 100, color: theme.colors.textSecondary, textAlign: 'right', fontSize: 13 }}>
                              ₹{row.unitPrice.toFixed(2)}
                            </Text>

                            <Text style={{ width: 110, color: theme.colors.text, fontWeight: '700', textAlign: 'right', fontSize: 13 }}>
                              ₹{row.total.toFixed(2)}
                            </Text>

                            <TouchableOpacity style={{ width: 45, alignItems: 'center' }} onPress={() => handleRemoveItem(idx)}>
                              <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Total Debit Summary */}
            <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
              <View style={[styles.totalsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, width: isMobile ? '100%' : 340 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Items Returning:</Text>
                  <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>{activeReturnItemsCount} of {items.length}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Total Debit Note:</Text>
                  <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 20 }}>₹{totalReturnAmount.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border, padding: isMobile ? 12 : 14 }, isMobile && { flexDirection: 'column-reverse', gap: 8 }]}>
            <AppButton
              title="Cancel"
              variant="outline"
              size="small"
              onPress={onClose}
              style={[{ minWidth: isMobile ? 90 : 80, height: 34 }, isMobile && { width: '100%' }]}
            />
            <AppButton
              title={createPurchaseReturnMutation.isPending ? 'Processing...' : 'Submit Return'}
              size="small"
              onPress={handleSubmit}
              disabled={createPurchaseReturnMutation.isPending}
              style={[{ minWidth: isMobile ? 120 : 120, height: 34, backgroundColor: '#F97316' }, isMobile && { width: '100%' }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { borderRadius: 12, maxHeight: '92%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 4 },
  invoiceInfoBanner: { borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 10 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  formRowCol: { flexDirection: 'column', gap: 8 },
  formCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { height: 38, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, fontSize: 13 },
  smallActionBtn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center' },
  tableContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', width: '100%' },
  tableHeader: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  qtyBtn: { width: 24, height: 26, borderWidth: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  qtyInput: {
    minWidth: 46,
    height: 26,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 0,
    paddingHorizontal: 4,
    fontWeight: '700',
    fontSize: 13,
  },
  totalsCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1 },
});
