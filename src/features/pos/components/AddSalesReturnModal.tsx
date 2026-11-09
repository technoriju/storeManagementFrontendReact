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
import {
  X,
  Trash2,
  RotateCcw,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Calendar,
  User,
  Package,
} from 'lucide-react-native';
import { useCustomers } from '../../customers/api/useCustomer';
import { useCreateSaleReturn } from '../api/useSalesReturns';
import { useSales } from '../api/useSales';
import { useProductStore } from '../../products/store/productStore';
import { enrichSaleItemsWithProductMeta } from '../utils/enrichSaleItems';
import { Sale, SaleItem } from '../../../types/models';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { saleReturnRepository } from '../../../core/repositories/SaleReturnRepository';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from './ReceiptPrintPreviewModal';

export interface ReturnItemRow {
  productId: number;
  productUnitId?: number;
  productName: string;
  sku?: string;
  unit?: string;
  unitType?: 'base' | 'sub';
  conversionRate?: number;
  soldQuantity: number;
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
  initialSaleId?: number | string | null;
  initialInvoiceNumber?: string | null;
}

export const AddSalesReturnModal: React.FC<Props> = ({
  visible,
  onClose,
  initialSaleId,
  initialInvoiceNumber,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const { data: customers = [] } = useCustomers();
  const { data: sales = [] } = useSales();
  const createSaleReturnMutation = useCreateSaleReturn();

  const [customerId, setCustomerId] = useState<string>('');
  const [saleId, setSaleId] = useState<string>('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [invoiceSearchInput, setInvoiceSearchInput] = useState<string>('');
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);

  const [date, setDate] = useState<string>(() => getLocalDateString());
  const [returnNumber, setReturnNumber] = useState<string>(() => `SRT-${Math.floor(100000 + Math.random() * 900000)}`);
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'Received' | 'Pending'>('Received');

  const [items, setItems] = useState<ReturnItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Print Preview after Return Creation
  const [printData, setPrintData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

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
      setReturnNumber(`SRT-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
      setItems([]);
      setSelectedSale(null);
      setSaleId('');
      setCustomerId('');
      setInvoiceSearchInput('');

      if (initialInvoiceNumber) {
        setInvoiceSearchInput(initialInvoiceNumber);
        void handleLookupInvoice(initialInvoiceNumber);
      } else if (initialSaleId) {
        setSaleId(String(initialSaleId));
        void handleSelectSale(String(initialSaleId));
      }
    }
  }, [visible, initialSaleId, initialInvoiceNumber]);

  // Options for selecting sale invoice
  const saleOptions = useMemo(() => {
    return sales.map((s) => ({
      label: `${s.invoiceNumber || s.reference || `#${s.id}`} • ${s.customerName || 'Walk-in'} (₹${Number(s.total || 0).toFixed(2)}) • ${s.date || ''}`,
      value: String(s.id),
    }));
  }, [sales]);

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [customers]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => String(c.id) === String(customerId));
  }, [customers, customerId]);

  const statusOptions = [
    { label: 'Received (Restock to inventory)', value: 'Received' },
    { label: 'Pending Inspection', value: 'Pending' },
  ];

  // Core loader: Retrieves verified sale directly from server API or local SQLite with productStore cross-validation
  const loadSaleForReturn = async (targetIdOrInvoice: string) => {
    const term = (targetIdOrInvoice || '').trim();
    if (!term) {
      setSaleId('');
      setSelectedSale(null);
      setItems([]);
      return;
    }

    setIsLoadingInvoice(true);
    setErrorMessage(null);

    try {
      let sale: Sale | null = null;

      // 1. Fetch verified sale from server first (supports numeric id or invoiceNumber string)
      try {
        sale = await saleRepository.fetchByIdFromApi(term);
      } catch (apiErr) {
        console.warn('fetchByIdFromApi error, trying fallback:', apiErr);
      }

      // 2. If not found, search in-memory sales
      if (!sale) {
        sale =
          sales.find(
            (s) =>
              String(s.id) === term ||
              s.invoiceNumber?.trim().toLowerCase() === term.toLowerCase() ||
              s.reference?.trim().toLowerCase() === term.toLowerCase()
          ) || null;
      }

      // 3. Fallback to SQLite by invoice number or ID
      if (!sale) {
        sale = await saleRepository.getByInvoiceNumber(term);
      }
      if (!sale && Number(term) > 0) {
        sale = await saleRepository.getById(Number(term));
      }

      if (!sale) {
        setErrorMessage(`Sale invoice not found for reference "${term}". Please verify invoice number.`);
        setIsLoadingInvoice(false);
        return;
      }

      setSelectedSale(sale);
      setSaleId(String(sale.id));
      if (sale.customerId) {
        setCustomerId(String(sale.customerId));
      }

      // 1. Get raw items: prefer server-verified sale.items, else SQLite getItemsForSale
      let rawItems: any[] = sale.items || [];
      if (!rawItems || rawItems.length === 0) {
        rawItems = await saleRepository.getItemsForSale(sale.id);
      }

      // 2. Enrich items with product metadata (brand, unit, subunit, conversionRate)
      const enrichedItems = await enrichSaleItemsWithProductMeta(rawItems);

      if (!enrichedItems || enrichedItems.length === 0) {
        setErrorMessage(`No items found in sale invoice ${sale.invoiceNumber}.`);
        setItems([]);
        setIsLoadingInvoice(false);
        return;
      }

      // 3. Fetch previously returned quantities for this sale
      const returnedMap = await saleReturnRepository.getReturnedQuantitiesForSale(sale.id);

      // 4. Cross-reference with global productStore to guarantee 100% accurate product names
      const productStoreList = useProductStore.getState().products || [];

      const mappedRows: ReturnItemRow[] = enrichedItems.map((si: any) => {
        const pId = Number(si.productId);
        const rawPuId = si.productUnitId || si.product_unit_id || (si.productUnit && si.productUnit.id);
        const resolvedPuId = rawPuId ? Number(rawPuId) : undefined;
        const soldQty = Number(si.quantity || 0);
        const alreadyReturned = Number(returnedMap[pId] || 0);
        const maxReturnable = Math.max(0, Number((soldQty - alreadyReturned).toFixed(4)));
        const unitPrice = Number(si.unitPrice || 0);
        const discount = Number(si.discount || 0);
        const taxAmount = Number(si.taxAmount || 0);
        const unitDiscount = soldQty > 0 ? discount / soldQty : 0;
        const unitTax = soldQty > 0 ? taxAmount / soldQty : 0;

        // Guaranteed accurate product name: product object -> product store by ID -> item.productName
        const matchedProd = productStoreList.find((p) => Number(p.id) === pId);
        const resolvedName =
          si.product?.name ||
          matchedProd?.name ||
          (si.productName && !si.productName.startsWith('Product #') ? si.productName : null) ||
          `Product #${pId}`;
        const resolvedSku = si.sku || si.product?.sku || matchedProd?.sku || (si as any).productSku || '';

        const resolvedUnitType = (si.unitType as any) || (si.unit && matchedProd?.subUnitName && si.unit === matchedProd.subUnitName ? 'sub' : 'base');
        const resolvedConvRate = Number(si.conversionRate || matchedProd?.conversionRate || 1);

        const defaultQty = maxReturnable;
        const netUnitPrice = Math.max(0, unitPrice - unitDiscount);
        const rowTotal = defaultQty > 0 ? Number((defaultQty * netUnitPrice + defaultQty * unitTax).toFixed(2)) : 0;

        return {
          productId: pId,
          productUnitId: resolvedPuId,
          productName: resolvedName,
          sku: resolvedSku,
          unit: si.unit || si.unitName || (typeof matchedProd?.unit === 'string' ? matchedProd?.unit : (matchedProd as any)?.unit?.name) || matchedProd?.baseUnitName || '',
          unitType: resolvedUnitType,
          conversionRate: resolvedConvRate,
          soldQuantity: soldQty,
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
      console.error('Failed to load sale details for return:', err);
      setErrorMessage(err?.message || 'Failed to load sale invoice');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const handleSelectSale = async (targetSaleId: string) => {
    await loadSaleForReturn(targetSaleId);
  };

  const handleLookupInvoice = async (invoiceQuery: string) => {
    await loadSaleForReturn(invoiceQuery);
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

    if (qtyNum > row.maxReturnableQuantity) {
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
    const boundedQty = Math.min(row.maxReturnableQuantity, Math.max(0, Number(qtyNum.toFixed(4))));
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

  // Submit Sales Return
  const handleSubmit = async () => {
    if (!saleId) {
      setErrorMessage('Please choose or enter a valid Sale Invoice.');
      return;
    }

    const validReturnItems = items.filter((row) => {
      const q = parseFloat(String(row.quantity));
      return !isNaN(q) && q > 0;
    });

    if (validReturnItems.length === 0) {
      setErrorMessage('Please specify a return quantity greater than 0 for at least one item.');
      return;
    }

    // Double check that no item exceeds return limit
    for (const item of validReturnItems) {
      const q = parseFloat(String(item.quantity));
      if (q > item.maxReturnableQuantity) {
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

      const createdReturn = await createSaleReturnMutation.mutateAsync({
        saleReturn: {
          saleId: Number(saleId),
          returnNumber: returnNumber || `SRT-${Date.now().toString().slice(-6)}`,
          reference: returnNumber,
          customerId: customerId ? Number(customerId) : (selectedSale?.customerId || undefined),
          customerName: selectedSale?.customerName || selectedCustomer?.name || 'Walk-in Customer',
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
          productUnitId: i.productUnitId,
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

      // Prepare receipt data for thermal / PDF / share
      const receiptPayload: ReceiptPrintData = {
        invoiceNumber: returnNumber,
        reference: selectedSale?.invoiceNumber ? `Invoice: ${selectedSale.invoiceNumber}` : returnNumber,
        date: date || getLocalDateString(),
        customerName: selectedSale?.customerName || selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: (selectedSale as any)?.customerPhone || selectedCustomer?.phone || '',
        customerAddress: (selectedSale as any)?.customerAddress || selectedCustomer?.address || '',
        customerGstin: (selectedSale as any)?.customerGstin || (selectedCustomer as any)?.taxNumber || (selectedCustomer as any)?.gstin || '',
        items: validReturnItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          unit: i.unit,
          unitType: i.unitType,
          conversionRate: i.conversionRate,
          quantity: parseFloat(String(i.quantity)),
          unitPrice: i.unitPrice,
          discount: Number((parseFloat(String(i.quantity)) * i.unitDiscount).toFixed(2)),
          taxAmount: Number((parseFloat(String(i.quantity)) * i.unitTax).toFixed(2)),
          total: i.total,
        })),
        subtotal: subtotalTotal,
        discount: discountTotal,
        gst: taxTotal,
        total: returnTotal,
        notes: `Sales Return against Invoice #${selectedSale?.invoiceNumber || saleId}.${reason ? ` Reason: ${reason}` : ''}`,
      };

      setPrintData(receiptPayload);
      setShowPrintModal(true);

      Alert.alert(
        'Return Processed',
        `Sales return ${returnNumber} created successfully. Products restocked to inventory and sale balance adjusted.`
      );
    } catch (err: any) {
      console.error('Failed to submit sales return:', err);
      setErrorMessage(err?.message || 'Failed to create sales return');
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', padding: isMobile ? 8 : 16 }]}>
          <View style={[styles.dialog, { backgroundColor: theme.colors.surface, width: isMobile ? '98%' : '85%', maxWidth: 900 }]}>
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

            <ScrollView style={styles.body} contentContainerStyle={{ padding: isMobile ? 12 : 18 }}>
              {errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontSize: 13, flex: 1 }}>{errorMessage}</Text>
                </View>
              )}

              {/* Step 1: Invoice Lookup (by number or select) */}
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FileText size={16} color="#0EA5E9" />
                  <Text style={{ fontWeight: '700', fontSize: 14, color: theme.colors.text }}>
                    Select or Enter Sale Invoice
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
                        placeholder="e.g. SL-464480 or SL-730267"
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
                        style={{ height: 38, minWidth: 64, backgroundColor: '#0EA5E9' }}
                      />
                    </View>
                  </View>

                  {/* Option B: Dropdown select from recent sales */}
                  <View style={{ flex: 1.8 }}>
                    <AppSelect
                      label="Or Choose from Invoices List"
                      placeholder="Select Sale Invoice..."
                      options={saleOptions}
                      value={saleId}
                      onSelect={(val) => {
                        setSaleId(val);
                        void handleSelectSale(val);
                      }}
                      searchable
                      clearable
                    />
                  </View>
                </View>

                {isLoadingInvoice && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <ActivityIndicator size="small" color="#0EA5E9" />
                    <Text style={{ fontSize: 13, color: '#0EA5E9' }}>Loading invoice products and previous returns...</Text>
                  </View>
                )}

                {/* Selected Sale Details Banner */}
                {selectedSale && !isLoadingInvoice && (
                  <View style={[styles.invoiceInfoBanner, { borderColor: '#38BDF8', backgroundColor: '#F0F9FF' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <CheckCircle2 size={16} color="#0284C7" />
                      <Text style={{ fontWeight: '700', color: '#0369A1', fontSize: 14 }}>
                        Invoice #{selectedSale.invoiceNumber || selectedSale.reference} Linked
                      </Text>
                    </View>
                    <View style={[styles.infoGrid, isMobile && { flexDirection: 'column', gap: 4 }]}>
                      <Text style={{ fontSize: 12, color: '#0F172A' }}>
                        <Text style={{ fontWeight: '600' }}>Customer: </Text>
                        {selectedSale.customerName || selectedCustomer?.name || 'Walk-in'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#0F172A' }}>
                        <Text style={{ fontWeight: '600' }}>Date: </Text>
                        {selectedSale.date}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#0F172A' }}>
                        <Text style={{ fontWeight: '600' }}>Invoice Total: </Text>
                        ₹{Number(selectedSale.total || 0).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#0F172A' }}>
                        <Text style={{ fontWeight: '600' }}>Current Due: </Text>
                        ₹{Number(selectedSale.due || 0).toFixed(2)} ({selectedSale.paymentStatus || 'Unpaid'})
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Step 2: Return Details (Reference, Date, Status, Reason) */}
              <View style={[styles.formRow, isMobile && styles.formRowCol, { marginTop: 12 }]}>
                <View style={styles.formCol}>
                  <AppInput
                    label="Return Reference No. *"
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
                    label="Return Status"
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

              {/* Step 3: Products from Invoice */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Package size={16} color="#0EA5E9" />
                    <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>
                      Products Purchased on this Invoice
                    </Text>
                  </View>

                  {items.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={handleReturnAll} style={[styles.quickActionBtn, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={{ color: '#0369A1', fontSize: 12, fontWeight: '600' }}>Return All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleClearAll} style={[styles.quickActionBtn, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>Clear Quantities</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {items.length === 0 ? (
                  <View style={[styles.emptyBox, { borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                      {selectedSale
                        ? 'No products available to return for this invoice.'
                        : 'Choose or search a Sale Invoice above to display purchased products for easy return.'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.tableContainer, { borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ minWidth: 700 }}>
                        <View style={[styles.tableHeader, { backgroundColor: theme.colors.background }]}>
                          <Text style={[styles.th, { flex: 2.2, minWidth: 170, color: theme.colors.text }]}>Product Name & SKU</Text>
                          <Text style={[styles.th, { width: 85, textAlign: 'center', color: theme.colors.text }]}>Invoiced Qty</Text>
                          <Text style={[styles.th, { width: 85, textAlign: 'center', color: theme.colors.text }]}>Prev. Returned</Text>
                          <Text style={[styles.th, { width: 90, textAlign: 'center', color: theme.colors.text }]}>Returnable</Text>
                          <Text style={[styles.th, { width: 130, textAlign: 'center', color: theme.colors.text }]}>Return Qty</Text>
                          <Text style={[styles.th, { width: 95, textAlign: 'right', color: theme.colors.text }]}>Unit Price</Text>
                          <Text style={[styles.th, { width: 105, textAlign: 'right', color: theme.colors.text }]}>Refund Total</Text>
                          <Text style={[styles.th, { width: 45 }]}></Text>
                        </View>

                        {items.map((row, idx) => {
                          const isFullyReturned = row.maxReturnableQuantity <= 0;
                          const currentQtyNum = parseFloat(String(row.quantity)) || 0;

                          return (
                            <View
                              key={idx}
                              style={[
                                styles.tableRow,
                                {
                                  borderBottomColor: theme.colors.border,
                                  backgroundColor: isFullyReturned ? '#F8FAFC' : 'transparent',
                                },
                              ]}
                            >
                              {/* Product Info */}
                              <View style={{ flex: 2.2, minWidth: 170, paddingRight: 8 }}>
                                <Text style={{ color: isFullyReturned ? theme.colors.textSecondary : theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                                  {row.productName}
                                </Text>
                                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                                  SKU: {row.sku || 'N/A'}{row.unit ? ` • ${row.unit}` : ''}
                                </Text>
                              </View>

                              {/* Invoiced Qty */}
                              <Text style={{ width: 85, textAlign: 'center', color: theme.colors.textSecondary, fontSize: 13 }}>
                                {row.soldQuantity}
                              </Text>

                              {/* Prev Returned */}
                              <Text style={{ width: 85, textAlign: 'center', color: row.alreadyReturnedQuantity > 0 ? '#F59E0B' : theme.colors.textSecondary, fontSize: 13, fontWeight: row.alreadyReturnedQuantity > 0 ? '600' : '400' }}>
                                {row.alreadyReturnedQuantity}
                              </Text>

                              {/* Available Returnable */}
                              <View style={{ width: 90, alignItems: 'center' }}>
                                {isFullyReturned ? (
                                  <View style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>Returned</Text>
                                  </View>
                                ) : (
                                  <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>
                                    {row.maxReturnableQuantity}
                                  </Text>
                                )}
                              </View>

                              {/* Return Qty Controls */}
                              <View style={{ width: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <TouchableOpacity
                                  disabled={isFullyReturned}
                                  style={[
                                    styles.qtyBtn,
                                    { borderColor: theme.colors.border, opacity: isFullyReturned ? 0.3 : 1 },
                                  ]}
                                  onPress={() => {
                                    const next = Math.max(0, Number((currentQtyNum - 1).toFixed(4)));
                                    handleUpdateQuantity(idx, next);
                                  }}
                                >
                                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>-</Text>
                                </TouchableOpacity>

                                <TextInput
                                  ref={(el) => {
                                    qtyInputRefs.current[idx] = el;
                                  }}
                                  editable={!isFullyReturned}
                                  style={{
                                    width: 48,
                                    height: 28,
                                    textAlign: 'center',
                                    borderWidth: 1,
                                    borderColor: currentQtyNum > 0 ? '#0EA5E9' : theme.colors.border,
                                    borderRadius: 4,
                                    color: theme.colors.text,
                                    backgroundColor: isFullyReturned ? '#E2E8F0' : theme.colors.surface,
                                    paddingVertical: 0,
                                    paddingHorizontal: 2,
                                    fontWeight: '700',
                                    fontSize: 13,
                                  }}
                                  keyboardType="decimal-pad"
                                  selectTextOnFocus
                                  value={row.quantity === '' ? '' : String(row.quantity)}
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
                                  disabled={isFullyReturned}
                                  style={[
                                    styles.qtyBtn,
                                    { borderColor: theme.colors.border, opacity: isFullyReturned ? 0.3 : 1 },
                                  ]}
                                  onPress={() => {
                                    const next = Math.min(row.maxReturnableQuantity, Number((currentQtyNum + 1).toFixed(4)));
                                    handleUpdateQuantity(idx, next);
                                  }}
                                >
                                  <Text style={{ color: theme.colors.text, fontWeight: '700' }}>+</Text>
                                </TouchableOpacity>
                              </View>

                              {/* Unit Price */}
                              <Text style={{ width: 95, textAlign: 'right', color: theme.colors.textSecondary, fontSize: 13 }}>
                                ₹{row.unitPrice.toFixed(2)}
                              </Text>

                              {/* Refund Line Total */}
                              <Text style={{ width: 105, textAlign: 'right', color: currentQtyNum > 0 ? '#0EA5E9' : theme.colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                                ₹{row.total.toFixed(2)}
                              </Text>

                              {/* Remove Line */}
                              <TouchableOpacity
                                style={{ width: 45, alignItems: 'center' }}
                                onPress={() => handleRemoveItem(idx)}
                              >
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

              {/* Step 4: Summary Card */}
              {items.length > 0 && (
                <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                  <View style={[styles.totalsCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, width: isMobile ? '100%' : 360 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Items to Return:</Text>
                      <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                        {activeReturnItemsCount} product{activeReturnItemsCount !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    {selectedSale && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Original Sale Due:</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                          ₹{Number(selectedSale.due || 0).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 6 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>Total Refund Amount:</Text>
                      <Text style={{ color: '#0EA5E9', fontWeight: '800', fontSize: 20 }}>
                        ₹{totalReturnAmount.toFixed(2)}
                      </Text>
                    </View>

                    {selectedSale && totalReturnAmount > 0 && (
                      <Text style={{ fontSize: 11, color: '#059669', marginTop: 4, textAlign: 'right' }}>
                        Sale due will reduce to ₹{Math.max(0, Number((selectedSale.due || 0) - totalReturnAmount)).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={[styles.footer, { borderTopColor: theme.colors.border }, isMobile && { flexDirection: 'column-reverse', gap: 8 }]}>
              <AppButton
                title="Cancel"
                variant="outline"
                size="small"
                onPress={onClose}
                style={[isMobile && { width: '100%' }, { minWidth: 80, height: 36 }]}
              />
              <AppButton
                title={createSaleReturnMutation.isPending ? 'Processing Return...' : `Submit Return (₹${totalReturnAmount.toFixed(2)})`}
                size="small"
                onPress={handleSubmit}
                disabled={createSaleReturnMutation.isPending || activeReturnItemsCount === 0}
                style={[
                  isMobile && { width: '100%' },
                  {
                    minWidth: 160,
                    height: 36,
                    backgroundColor: activeReturnItemsCount === 0 ? '#94A3B8' : '#0EA5E9',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Receipt Print/Share Preview Modal */}
      {printData && (
        <ReceiptPrintPreviewModal
          visible={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setPrintData(null);
            onClose();
          }}
          data={printData}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dialog: { borderRadius: 12, maxHeight: '92%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 8, padding: 12 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  formRowCol: { flexDirection: 'column', gap: 8 },
  formCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, height: 38, fontSize: 13 },
  invoiceInfoBanner: { borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 10 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  quickActionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center' },
  tableContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  th: { fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1 },
  qtyBtn: { width: 26, height: 26, borderWidth: 1, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  totalsCard: { borderWidth: 1, borderRadius: 8, padding: 14 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1 },
});