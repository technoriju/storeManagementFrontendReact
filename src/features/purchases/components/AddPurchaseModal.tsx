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
  Plus,
  Calendar,
  Search,
  Trash2,
  PackageCheck,
  AlertCircle,
} from 'lucide-react-native';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { useProductStore } from '../../products/store/productStore';
import { useCreatePurchase } from '../api/usePurchases';
import { useUnits } from '../../units/api/useUnit';
import { useSubUnits } from '../../sub_units/api/useSubUnit';
import { Product } from '../../products/types';

interface PurchaseItemRow {
  productId: number;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  unit?: string;
  unitType?: 'base' | 'sub';
  baseUnitName?: string;
  subUnitName?: string;
  conversionRate?: number;
  basePrice?: number;
  subPrice?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddPurchaseModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Suppliers & Products
  const { data: suppliers = [] } = useSuppliers();
  const { products, fetchProducts } = useProductStore();
  const { data: unitList = [] } = useUnits();
  const { data: subUnitList = [] } = useSubUnits();
  const createPurchaseMutation = useCreatePurchase();

  // Form State
  const [supplierId, setSupplierId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>(() => `PO-${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<'Received' | 'Pending' | 'Ordered'>('Received');
  const [orderTax, setOrderTax] = useState<string>('0');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [shipping, setShipping] = useState<string>('0');
  const [description, setDescription] = useState<string>('');

  // Product Search & Items Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      // Reset form on open
      setDate(new Date().toISOString().split('T')[0]);
      setReference(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
    }
  }, [visible, products.length, fetchProducts]);

  // Supplier options
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
    { label: 'Received', value: 'Received' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Ordered', value: 'Ordered' },
  ];

  // Filtered products for live search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(query);
      const matchSku = p.sku?.toLowerCase().includes(query);
      const matchBarcode = p.barcode?.toLowerCase().includes(query);
      return matchName || matchSku || matchBarcode;
    }).slice(0, 10);
  }, [searchQuery, products]);

  // Add Product to Table
  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      const basePrice = product.purchasePrice || product.cost || product.price || 0;
      const cRate = product.conversionRate && Number(product.conversionRate) > 0 ? Number(product.conversionRate) : 1;
      const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;

      const baseUnit = unitList.find((u: any) => String(u.id) === String(product.unitId || product.baseUnitId) || String(u.backendId) === String(product.unitId || product.baseUnitId));
      const subUnit = subUnitList.find((s: any) => String(s.id) === String(product.subUnitId || product.subunitId) || String(s.backendId) === String(product.subUnitId || product.subunitId));

      const baseUnitName = baseUnit?.name || baseUnit?.shortName || 'Box';
      const subUnitName = subUnit?.name || 'Pcs';

      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: basePrice,
          basePrice,
          subPrice,
          discount: 0,
          gst: product.gst || 0,
          unit: baseUnitName,
          unitType: 'base',
          baseUnitName,
          subUnitName,
          conversionRate: cRate,
        },
      ]);
    }
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleToggleUnit = (index: number) => {
    const item = items[index];
    const nextType: 'base' | 'sub' = item.unitType === 'base' ? 'sub' : 'base';
    const nextUnit = nextType === 'base' ? (item.baseUnitName || 'Box') : (item.subUnitName || 'Pcs');
    const nextPrice = nextType === 'base' ? (item.basePrice || item.unitPrice) : (item.subPrice || Number((item.unitPrice / (item.conversionRate || 1)).toFixed(2)));
    const updated = [...items];
    updated[index] = {
      ...item,
      unitType: nextType,
      unit: nextUnit,
      unitPrice: nextPrice,
    };
    setItems(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof PurchaseItemRow, value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculated Line Items
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const rawSubtotal = item.quantity * item.unitPrice;
      const netSubtotal = Math.max(0, rawSubtotal - (item.discount || 0));
      const taxAmount = netSubtotal * ((item.gst || 0) / 100);
      const total = netSubtotal + taxAmount;
      const unitCost = item.quantity > 0 ? total / item.quantity : 0;
      return {
        ...item,
        taxAmount,
        unitCost,
        total,
      };
    });
  }, [items]);

  // Calculated Order Totals
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const itemsDiscount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.discount || 0), 0);
  }, [items]);

  const itemsTax = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
  }, [calculatedItems]);

  const orderTaxNum = parseFloat(orderTax) || 0;
  const orderDiscountNum = parseFloat(orderDiscount) || 0;
  const shippingNum = parseFloat(shipping) || 0;

  const totalDiscount = itemsDiscount + orderDiscountNum;
  const grandTotal = Math.max(
    0,
    itemsSubtotal - totalDiscount + itemsTax + orderTaxNum + shippingNum
  );

  // Submit Handler
  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!supplierId) {
      setErrorMessage('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to the purchase.');
      return;
    }

    try {
      await createPurchaseMutation.mutateAsync({
        purchase: {
          invoiceNumber: reference || `PO-${Date.now().toString().slice(-6)}`,
          reference: reference || `PO-${Date.now().toString().slice(-6)}`,
          supplierId: Number(supplierId),
          supplierName: selectedSupplier?.name || 'Unknown Supplier',
          date: date || new Date().toISOString().split('T')[0],
          subtotal: itemsSubtotal,
          discount: totalDiscount,
          orderTax: orderTaxNum,
          shipping: shippingNum,
          gst: itemsTax,
          total: grandTotal,
          paid: status === 'Received' ? grandTotal : 0,
          due: status === 'Received' ? 0 : grandTotal,
          status,
          paymentStatus: status === 'Received' ? 'Paid' : 'Unpaid',
          notes: description || undefined,
        },
        items: calculatedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          gst: item.gst,
          taxAmount: item.taxAmount,
          unitCost: item.unitCost,
          unit: item.unit,
          unitType: item.unitType,
          conversionRate: item.conversionRate,
          total: item.total,
        })),
      });

      // Reset & Close
      setItems([]);
      setSupplierId('');
      setSearchQuery('');
      setDescription('');
      onClose();
      Alert.alert('Success', 'Purchase created successfully!');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save purchase.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              width: isMobile ? '95%' : '85%',
              maxWidth: 1050,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PackageCheck size={20} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                Add Purchase
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '80%' }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: 20, gap: 16 }}>
              {/* Error banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Row 1: Supplier, Date, Reference */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                {/* Supplier */}
                <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppSelect
                      label="Supplier Name *"
                      placeholder={suppliers.length === 0 ? 'No suppliers available' : 'Select Supplier'}
                      options={supplierOptions}
                      value={supplierId}
                      onSelect={(val) => setSupplierId(String(val))}
                      searchable
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.plusBtn, { marginTop: 24 }]}
                    onPress={() => {
                      Alert.alert(
                        'Supplier Info',
                        suppliers.length === 0
                          ? 'No suppliers found. Please add suppliers from the Suppliers module first.'
                          : `Total suppliers loaded: ${suppliers.length}`
                      );
                    }}
                  >
                    <Plus size={16} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Date */}
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Date *"
                    placeholder="YYYY-MM-DD"
                    value={date}
                    onChangeText={setDate}
                    style={{ paddingRight: 36 }}
                  />
                  <View style={styles.inputIcon}>
                    <Calendar size={18} color={theme.colors.textSecondary} />
                  </View>
                </View>

                {/* Reference */}
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Reference / Invoice #"
                    placeholder="e.g. PO-001"
                    value={reference}
                    onChangeText={setReference}
                  />
                </View>
              </View>

              {/* Row 2: Live Product Search */}
              <View style={{ zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
                <Text style={{ color: theme.colors.text, marginBottom: 6, fontWeight: '500' }}>
                  Search & Add Product *
                </Text>
                <View
                  style={[
                    styles.searchBar,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <Search size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search by product name, SKU or barcode..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={(q) => {
                      setSearchQuery(q);
                      setIsSearching(true);
                    }}
                    onFocus={() => setIsSearching(true)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Product Search Results Dropdown */}
                {isSearching && filteredProducts.length > 0 && (
                  <View
                    style={[
                      styles.searchResultsDropdown,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 260 }}
                      showsVerticalScrollIndicator={true}
                    >
                      {filteredProducts.map((p) => {
                        const cost = p.purchasePrice || p.cost || p.price || 0;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[
                              styles.searchResultItem,
                              { borderBottomColor: theme.colors.border },
                            ]}
                            onPress={() => handleAddProduct(p)}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                                SKU: {p.sku || 'N/A'} | Tax: {p.gst || 0}% | In Stock: {p.stockQuantity}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                              <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                                ₹{Number(cost).toFixed(2)}
                              </Text>
                              <Text style={{ color: '#10B981', fontSize: 11 }}>+ Add Item</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {isSearching && searchQuery.trim().length > 0 && filteredProducts.length === 0 && (
                  <View
                    style={[
                      styles.searchResultsDropdown,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        padding: 12,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                      No matching products found.
                    </Text>
                  </View>
                )}
              </View>

              {/* Table Area: Added Products List */}
              <View
                style={[
                  styles.tableContainer,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 990 }}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.th, { width: 170 }]}>Product</Text>
                      <Text style={[styles.th, { width: 110 }]}>Unit</Text>
                      <Text style={[styles.th, { width: 70 }]}>Qty</Text>
                      <Text style={[styles.th, { width: 110 }]}>Price (₹)</Text>
                      <Text style={[styles.th, { width: 90 }]}>Discount (₹)</Text>
                      <Text style={[styles.th, { width: 80 }]}>Tax (%)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Tax Amt (₹)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Unit Cost (₹)</Text>
                      <Text style={[styles.th, { width: 100 }]}>Total Cost (₹)</Text>
                      <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>Act</Text>
                    </View>

                    {/* Table Rows */}
                    {calculatedItems.length === 0 ? (
                      <View style={styles.emptyTable}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                          No products added yet. Use the search bar above to add products.
                        </Text>
                      </View>
                    ) : (
                      calculatedItems.map((item, index) => (
                        <View
                          key={`${item.productId}-${index}`}
                          style={[
                            styles.tableRow,
                            { borderBottomColor: theme.colors.border },
                          ]}
                        >
                          {/* Product Name */}
                          <View style={{ width: 170, paddingRight: 8 }}>
                            <Text
                              style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}
                              numberOfLines={1}
                            >
                              {item.productName}
                            </Text>
                            {item.sku && (
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                                {item.sku}
                              </Text>
                            )}
                          </View>

                          {/* Unit Selector Toggle */}
                          <View style={{ width: 110, paddingRight: 6, justifyContent: 'center' }}>
                            <TouchableOpacity
                              style={{
                                backgroundColor: item.unitType === 'sub' ? '#3B82F6' : '#F97316',
                                paddingHorizontal: 6,
                                paddingVertical: 4,
                                borderRadius: 4,
                                alignItems: 'center',
                              }}
                              onPress={() => handleToggleUnit(index)}
                            >
                              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                                {item.unit || item.baseUnitName || 'Unit'} ⇄
                              </Text>
                              {item.conversionRate && item.conversionRate > 1 ? (
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9 }}>
                                  1 {item.baseUnitName || 'Box'} = {item.conversionRate} {item.subUnitName || 'Pcs'}
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          </View>

                          {/* Qty */}
                          <View style={{ width: 70, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="numeric"
                              value={String(item.quantity)}
                              onChangeText={(v) => {
                                const val = Math.max(1, parseInt(v, 10) || 1);
                                handleUpdateItem(index, 'quantity', val);
                              }}
                            />
                          </View>

                          {/* Purchase Price */}
                          <View style={{ width: 110, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              value={String(item.unitPrice)}
                              onChangeText={(v) => {
                                const val = Math.max(0, parseFloat(v) || 0);
                                handleUpdateItem(index, 'unitPrice', val);
                              }}
                            />
                          </View>

                          {/* Discount */}
                          <View style={{ width: 90, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              value={String(item.discount)}
                              onChangeText={(v) => {
                                const val = Math.max(0, parseFloat(v) || 0);
                                handleUpdateItem(index, 'discount', val);
                              }}
                            />
                          </View>

                          {/* Tax % */}
                          <View style={{ width: 80, paddingRight: 6 }}>
                            <TextInput
                              style={[
                                styles.cellInput,
                                {
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                  backgroundColor: theme.colors.surface,
                                },
                              ]}
                              keyboardType="decimal-pad"
                              value={String(item.gst)}
                              onChangeText={(v) => {
                                const val = Math.max(0, parseFloat(v) || 0);
                                handleUpdateItem(index, 'gst', val);
                              }}
                            />
                          </View>

                          {/* Tax Amount (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.taxAmount.toFixed(2)}
                            </Text>
                          </View>

                          {/* Unit Cost (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.unitCost.toFixed(2)}
                            </Text>
                          </View>

                          {/* Total Cost (Calculated) */}
                          <View style={{ width: 100, justifyContent: 'center' }}>
                            <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                              ₹{item.total.toFixed(2)}
                            </Text>
                          </View>

                          {/* Action Delete */}
                          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                              <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Row 3: Order Tax, Discount, Shipping, Status */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Order Tax (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={orderTax}
                    onChangeText={setOrderTax}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Order Discount (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={orderDiscount}
                    onChangeText={setOrderDiscount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Shipping (₹)"
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={shipping}
                    onChangeText={setShipping}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppSelect
                    label="Status *"
                    placeholder="Select Status"
                    options={statusOptions}
                    value={status}
                    onSelect={(val) => setStatus(val)}
                  />
                </View>
              </View>

              {/* Bottom Section: Notes & Live Grand Total Summary */}
              <View style={[styles.summarySection, isMobile && { flexDirection: 'column' }]}>
                {/* Notes */}
                <View style={{ flex: 1.5 }}>
                  <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: '500' }}>
                    Notes / Description
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.background,
                      },
                    ]}
                    placeholder="Add purchase notes..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Calculation Summary Card */}
                <View
                  style={[
                    styles.summaryCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Items Subtotal</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      ₹{itemsSubtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Total Discount</Text>
                    <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>
                      -₹{totalDiscount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Tax (Items + Order)</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      +₹{(itemsTax + orderTaxNum).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Shipping</Text>
                    <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 13 }}>
                      +₹{shippingNum.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryLine,
                      {
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                        paddingTop: 8,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                      Grand Total
                    </Text>
                    <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 17 }}>
                      ₹{grandTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <AppButton
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ backgroundColor: '#0F172A', minWidth: 100 }}
              textStyle={{ color: 'white' }}
            />
            <AppButton
              title={createPurchaseMutation.isPending ? 'Saving...' : 'Submit Purchase'}
              onPress={handleSubmit}
              disabled={createPurchaseMutation.isPending}
              style={{ backgroundColor: '#F97316', borderWidth: 0, minWidth: 140 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: 14 },
  plusBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: { position: 'absolute', right: 12, top: 35 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, height: 40, fontSize: 14 },
  searchResultsDropdown: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    zIndex: 9999,
    maxHeight: 260,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  tableContainer: { borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
  },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  emptyTable: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  cellInput: {
    borderWidth: 1,
    borderRadius: 4,
    height: 32,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  summarySection: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 6,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
});
