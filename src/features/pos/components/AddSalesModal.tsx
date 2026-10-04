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
  ShoppingCart,
  AlertCircle,
} from 'lucide-react-native';
import { useCustomers } from '../../customers/api/useCustomer';
import { useSuppliers } from '../../suppliers/api/useSupplier';
import { useProductStore } from '../../products/store/productStore';
import { useCreateSale } from '../api/useSales';
import { useUnits } from '../../units/api/useUnit';
import { useSubUnits } from '../../sub_units/api/useSubUnit';
import { Product } from '../../products/types';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from './ReceiptPrintPreviewModal';
import { PriceType, getProductPriceByType } from '../utils/priceUtils';

interface SaleItemRow {
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
  baseCost?: number;
  subCost?: number;
  unitCost?: number;
  wholesalePrice?: number;
  retailPrice?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AddSalesModal: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Queries & Mutations
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const { products, fetchProducts } = useProductStore();
  const { data: unitList = [] } = useUnits();
  const { data: subUnitList = [] } = useSubUnits();
  const createSaleMutation = useCreateSale();

  // Form State
  const [customerId, setCustomerId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>(() => `SL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<'Completed' | 'Pending' | 'Ordered'>('Completed');
  const [orderTax, setOrderTax] = useState<string>('0');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [shipping, setShipping] = useState<string>('0');
  const [biller, setBiller] = useState<string>('Admin');
  const [notes, setNotes] = useState<string>('');
  const [priceType, setPriceType] = useState<PriceType>('wholesale');

  // Product Search & Items Table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printData, setPrintData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      if (products.length === 0) {
        fetchProducts().catch(() => {});
      }
      setDate(new Date().toISOString().split('T')[0]);
      setReference(`SL-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMessage(null);
      setPriceType('wholesale');
    }
  }, [visible, products.length, fetchProducts]);

  // Handle Wholesale vs Retail Price Type Switching
  const handlePriceTypeChange = (newType: PriceType) => {
    if (newType === priceType) return;
    setPriceType(newType);

    setItems((prevItems) =>
      prevItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const wholesaleP = prod ? getProductPriceByType(prod, 'wholesale') : (item.wholesalePrice || item.basePrice || 0);
        const retailP = prod ? getProductPriceByType(prod, 'retail') : (item.retailPrice || item.basePrice || 0);
        const newBasePrice = newType === 'wholesale' ? wholesaleP : retailP;
        const cRate = item.conversionRate && item.conversionRate > 0 ? item.conversionRate : 1;
        const newSubPrice = cRate > 0 ? Number((newBasePrice / cRate).toFixed(2)) : newBasePrice;
        const newUnitPrice = item.unitType === 'sub' ? newSubPrice : newBasePrice;

        return {
          ...item,
          wholesalePrice: wholesaleP,
          retailPrice: retailP,
          basePrice: newBasePrice,
          subPrice: newSubPrice,
          unitPrice: newUnitPrice,
        };
      })
    );
  };

  // Customer & Supplier Options
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [customers]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [suppliers]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => String(c.id) === String(customerId));
  }, [customers, customerId]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => String(s.id) === String(supplierId));
  }, [suppliers, supplierId]);

  const statusOptions = [
    { label: 'Completed', value: 'Completed' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Ordered', value: 'Ordered' },
  ];

  // Filtered Products for Live Search
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
      const wholesaleP = getProductPriceByType(product, 'wholesale');
      const retailP = getProductPriceByType(product, 'retail');
      const basePrice = priceType === 'wholesale' ? wholesaleP : retailP;
      const baseCost = product.cost || product.purchasePrice || 0;
      const cRate = product.conversionRate && Number(product.conversionRate) > 0 ? Number(product.conversionRate) : 1;

      const baseUnit = unitList.find((u: any) => String(u.id) === String(product.unitId || product.baseUnitId) || String(u.backendId) === String(product.unitId || product.baseUnitId));
      const subUnit = subUnitList.find((s: any) => String(s.id) === String(product.subUnitId || product.subunitId) || String(s.backendId) === String(product.subUnitId || product.subunitId));

      const baseUnitName = baseUnit?.name || baseUnit?.shortName || 'Box';
      const subUnitName = subUnit?.name || 'Pcs';

      // Default for sales: sell pcs-wise if sub-unit exists
      const hasSubUnit = !!(product.subUnitId || product.subunitId || cRate > 1);
      const initialType: 'base' | 'sub' = hasSubUnit ? 'sub' : 'base';
      const initialUnit = initialType === 'sub' ? subUnitName : baseUnitName;

      const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;
      const subCost = cRate > 0 ? Number((baseCost / cRate).toFixed(4)) : baseCost;

      const initialPrice = initialType === 'sub' ? subPrice : basePrice;
      const initialCost = initialType === 'sub' ? subCost : baseCost;

      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: initialPrice,
          basePrice,
          subPrice,
          baseCost,
          subCost,
          unitCost: initialCost,
          discount: 0,
          gst: product.gst || 0,
          unit: initialUnit,
          unitType: initialType,
          baseUnitName,
          subUnitName,
          conversionRate: cRate,
          wholesalePrice: wholesaleP,
          retailPrice: retailP,
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
    const nextCost = nextType === 'base' ? (item.baseCost || 0) : (item.subCost || Number(((item.baseCost || 0) / (item.conversionRate || 1)).toFixed(4)));

    const updated = [...items];
    updated[index] = {
      ...item,
      unitType: nextType,
      unit: nextUnit,
      unitPrice: nextPrice,
      unitCost: nextCost,
    };
    setItems(updated);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof SaleItemRow, value: number) => {
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
      return {
        ...item,
        taxAmount,
        total,
      };
    });
  }, [items]);

  // Order Totals Calculations
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
    if (!customerId) {
      setErrorMessage('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one product to the sale.');
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        sale: {
          invoiceNumber: reference || `SL-${Date.now().toString().slice(-6)}`,
          reference: reference || `SL-${Date.now().toString().slice(-6)}`,
          customerId: Number(customerId),
          customerName: selectedCustomer?.name || 'Walk-in Customer',
          supplierId: supplierId ? Number(supplierId) : undefined,
          supplierName: selectedSupplier?.name || undefined,
          date: date || new Date().toISOString().split('T')[0],
          subtotal: itemsSubtotal,
          discount: totalDiscount,
          orderTax: orderTaxNum,
          shipping: shippingNum,
          gst: itemsTax,
          total: grandTotal,
          paid: status === 'Completed' ? grandTotal : 0,
          due: status === 'Completed' ? 0 : grandTotal,
          status,
          paymentStatus: status === 'Completed' ? 'Paid' : 'Unpaid',
          biller: biller || 'Admin',
          notes: notes || undefined,
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
          total: item.total,
          unit: item.unit,
          unitType: item.unitType,
          conversionRate: item.conversionRate,
        })),
      });

      const customerObj = customers.find((c) => String(c.id) === customerId);

      const receiptData: ReceiptPrintData = {
        invoiceNumber: reference,
        reference,
        date,
        customerName: customerObj?.name || 'Walk-in Customer',
        customerPhone: customerObj?.phone || '',
        customerAddress: customerObj?.address || '',
        customerGstin: customerObj?.gstin || '',
        customerType: priceType, // 'wholesale' | 'retail' based on user selection
        biller,
        subtotal: itemsSubtotal,
        discount: totalDiscount,
        gst: itemsTax + orderTaxNum,
        shipping: shippingNum,
        total: grandTotal,
        paid: status === 'Completed' ? grandTotal : 0,
        due: status === 'Completed' ? 0 : grandTotal,
        paymentMethod: 'Cash',
        notes: notes ? `${notes} [${priceType === 'wholesale' ? 'Wholesale' : 'Retail'}]` : `[${priceType === 'wholesale' ? 'Wholesale' : 'Retail'}]`,
        items: calculatedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          gst: item.gst,
          taxAmount: item.taxAmount,
          total: item.total,
          unit: item.unit,
        })),
      };

      // Reset & Close
      setItems([]);
      setCustomerId('');
      setSupplierId('');
      setSearchQuery('');
      setNotes('');
      onClose();

      setPrintData(receiptData);
      setShowPrintModal(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save sale.');
    }
  };

  return (
    <>
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
              <ShoppingCart size={20} color="#F97316" />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
                Add Sales
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

              {/* Row 1: Customer Name, Date, Supplier */}
              <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                {/* Customer */}
                <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <AppSelect
                      label="Customer Name *"
                      placeholder={customers.length === 0 ? 'No customers available' : 'Select Customer'}
                      options={customerOptions}
                      value={customerId}
                      onSelect={(val) => setCustomerId(String(val))}
                      searchable
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.plusBtn, { marginTop: 24 }]}
                    onPress={() => {
                      Alert.alert(
                        'Customer Info',
                        customers.length === 0
                          ? 'No customers found. Please add customer in Customers module first.'
                          : `Total customers loaded: ${customers.length}`
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

                {/* Supplier */}
                <View style={{ flex: 1 }}>
                  <AppSelect
                    label="Supplier (Optional)"
                    placeholder="Select Supplier"
                    options={supplierOptions}
                    value={supplierId}
                    onSelect={(val) => setSupplierId(String(val))}
                    searchable
                  />
                </View>
              </View>

              {/* Pricing Mode Toggle (Wholesale vs Retailer) */}
              <View style={[styles.tierRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <View>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                      Pricing Mode *
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      By default, wholesale price is applied. Toggle anytime to switch.
                    </Text>
                  </View>
                  <View style={styles.tierButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.tierButton,
                        priceType === 'wholesale' && styles.tierButtonActiveWholesale,
                      ]}
                      onPress={() => handlePriceTypeChange('wholesale')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tierButtonText,
                          priceType === 'wholesale' && styles.tierButtonTextActive,
                        ]}
                      >
                        Wholesale (Default)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.tierButton,
                        priceType === 'retail' && styles.tierButtonActiveRetail,
                      ]}
                      onPress={() => handlePriceTypeChange('retail')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tierButtonText,
                          priceType === 'retail' && styles.tierButtonTextActive,
                        ]}
                      >
                        Retailer
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Row 2: Live Product Search */}
              <View style={{ zIndex: 100, elevation: Platform.OS === 'android' ? 5 : undefined }}>
                <Text style={{ color: theme.colors.text, marginBottom: 6, fontWeight: '500' }}>
                  Search & Add Product * ({priceType === 'wholesale' ? 'Wholesale Price' : 'Retailer Price'})
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
                    placeholder={`Search by product name, SKU or barcode (${priceType} price)...`}
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

                {/* Search Results Dropdown */}
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
                        const activePrice = getProductPriceByType(p, priceType);
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
                                SKU: {p.sku || 'N/A'} | Tax: {p.gst || 0}% | Stock: {p.stockQuantity}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                              <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                                ₹{Number(activePrice).toFixed(2)}
                              </Text>
                              <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                                {priceType === 'wholesale' ? 'Wholesale Price' : 'Retailer Price'}
                              </Text>
                              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600', marginTop: 2 }}>+ Add Item</Text>
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
                  <View style={{ minWidth: 880 }}>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.th, { width: 170 }]}>Product</Text>
                      <Text style={[styles.th, { width: 120 }]}>Unit</Text>
                      <Text style={[styles.th, { width: 70 }]}>Qty</Text>
                      <Text style={[styles.th, { width: 105 }]}>{priceType === 'wholesale' ? 'Wholesale (₹)' : 'Retailer (₹)'}</Text>
                      <Text style={[styles.th, { width: 85 }]}>Discount (₹)</Text>
                      <Text style={[styles.th, { width: 75 }]}>Tax (%)</Text>
                      <Text style={[styles.th, { width: 85 }]}>Tax Amt (₹)</Text>
                      <Text style={[styles.th, { width: 95 }]}>Total (₹)</Text>
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
                          {/* Product */}
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
                          <View style={{ width: 120, paddingRight: 6, justifyContent: 'center' }}>
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

                          {/* Sale Price */}
                          <View style={{ width: 100, paddingRight: 6 }}>
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
                          <View style={{ width: 85, paddingRight: 6 }}>
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
                          <View style={{ width: 75, paddingRight: 6 }}>
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

                          {/* Tax Amount */}
                          <View style={{ width: 85, justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                              ₹{item.taxAmount.toFixed(2)}
                            </Text>
                          </View>

                          {/* Total */}
                          <View style={{ width: 95, justifyContent: 'center' }}>
                            <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                              ₹{item.total.toFixed(2)}
                            </Text>
                          </View>

                          {/* Delete Action */}
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
                {/* Notes & Reference */}
                <View style={{ flex: 1.5, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <AppInput
                        label="Reference / Invoice #"
                        placeholder="e.g. SL-001"
                        value={reference}
                        onChangeText={setReference}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppInput
                        label="Biller / Cashier"
                        placeholder="Admin"
                        value={biller}
                        onChangeText={setBiller}
                      />
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.text, marginBottom: 4, fontWeight: '500' }}>
                    Sale Notes
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
                    placeholder="Add sale notes..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={notes}
                    onChangeText={setNotes}
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
              title={createSaleMutation.isPending ? 'Saving...' : 'Submit Sale'}
              onPress={handleSubmit}
              disabled={createSaleMutation.isPending}
              style={{ backgroundColor: '#F97316', borderWidth: 0, minWidth: 140 }}
            />
          </View>
        </View>
      </View>
    </Modal>

    <ReceiptPrintPreviewModal
      visible={showPrintModal}
      data={printData}
      onClose={() => setShowPrintModal(false)}
    />
  </>
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
  tierRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  tierButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  tierButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  tierButtonActiveWholesale: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tierButtonActiveRetail: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tierButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tierButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
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
    height: 70,
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
