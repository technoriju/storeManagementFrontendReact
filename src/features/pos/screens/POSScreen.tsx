import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { usePOSStore } from '../store/posStore';
import { useKeyboardShortcut } from '../../../shared/hooks/useKeyboardShortcut';
import { Product } from '../../products/types';
import { useProductStore } from '../../products/store/productStore';
import { useCreateSale } from '../api/useSales';
import { ReceiptPrintPreviewModal, ReceiptPrintData } from '../components/ReceiptPrintPreviewModal';
import { getProductPriceByType } from '../utils/priceUtils';

export const POSScreen = () => {
  const {
    cart,
    customer,
    priceType,
    setPriceType,
    addToCart,
    toggleCartItemUnit,
    updateCartItem,
    removeFromCart,
    clearCart,
    holdCurrentSale,
    getSubtotal,
    getTotalDiscount,
    getTotalGST,
    getGrandTotal,
  } = usePOSStore();

  const { products, fetchProducts } = useProductStore();
  const createSaleMutation = useCreateSale();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState<ReceiptPrintData | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.includes(query)) ||
            (p.sku && p.sku.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  // Barcode scanner behavior: when scanning, it often presses Enter rapidly
  const handleSearchSubmit = () => {
    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0], isReturnMode ? -1 : 1);
      setSearchQuery(''); // clear after scan
      searchInputRef.current?.focus();
    }
  };

  const handleCompleteSale = async () => {
    if (isSubmitting || createSaleMutation.isPending) return;
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart first.');
      return;
    }

    try {
      setIsSubmitting(true);
      const invNum = `POS-${Date.now().toString().slice(-6)}`;
      const sub = getSubtotal();
      const disc = getTotalDiscount();
      const gTax = getTotalGST();
      const gTotal = getGrandTotal();

      const receiptItems = cart.map((item) => {
        const rawSubtotal = item.price * item.quantity;
        const netSubtotal = Math.max(0, rawSubtotal - (item.discount || 0));
        const taxAmt = netSubtotal * ((item.gstRate || 0) / 100);
        return {
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount || 0,
          gst: item.gstRate || 0,
          taxAmount: taxAmt,
          unitCost: item.unitCost || 0,
          total: netSubtotal + taxAmt,
          unit: item.unit,
          unitType: item.unitType,
          conversionRate: item.conversionRate,
          hsn: (item.product as any).hsn || (item.product as any).sku || '',
        };
      });

      await createSaleMutation.mutateAsync({
        sale: {
          invoiceNumber: invNum,
          reference: invNum,
          customerId: customer?.id || 1,
          customerName: customer?.name || 'Walk-in Customer',
          date: new Date().toISOString().split('T')[0],
          subtotal: sub,
          discount: disc,
          gst: gTax,
          total: gTotal,
          paid: gTotal,
          due: 0,
          status: 'Completed',
          paymentStatus: 'Paid',
          orderTax: 0,
          shipping: 0,
          biller: 'POS Cashier',
          notes: `[${priceType === 'wholesale' ? 'Wholesale' : 'Retail'}]`,
        },
        items: receiptItems,
      });

      // Prepare receipt data for print preview
      const receiptData: ReceiptPrintData = {
        invoiceNumber: invNum,
        reference: invNum,
        date: new Date().toISOString().split('T')[0],
        customerName: customer?.name || 'Walk-in Customer',
        customerPhone: customer?.phone || '',
        customerType: priceType,
        biller: 'POS Cashier',
        subtotal: sub,
        discount: disc,
        gst: gTax,
        total: gTotal,
        paid: gTotal,
        due: 0,
        paymentMethod: 'Cash',
        items: receiptItems,
      };

      setPrintReceiptData(receiptData);
      setShowPrintModal(true);
      clearCart();
      fetchProducts().catch(() => {});
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  useKeyboardShortcut('F2', () => {
    Alert.alert('Customer', 'Customer selection modal would open here.');
  });

  useKeyboardShortcut('F4', () => {
    Alert.alert('Discount', 'Apply discount modal would open here.');
  });

  useKeyboardShortcut('F8', () => {
    Alert.alert('Payment', 'Payment modal would open here.');
  });

  useKeyboardShortcut('F12', () => {
    handleCompleteSale();
  });

  const renderProduct = ({ item }: { item: Product }) => {
    const activePrice = getProductPriceByType(item, priceType);
    const cRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
    const hasSubUnit = !!(item.subUnitId || item.subunitId || cRate > 1);
    const subUnitName = item.subUnitName || 'Pcs';
    const baseUnitName = item.baseUnitName || item.unit || 'Box';
    const subPrice = cRate > 0 ? (activePrice / cRate).toFixed(2) : activePrice.toFixed(2);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => addToCart(item, isReturnMode ? -1 : 1)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[styles.productName, { flex: 1, marginRight: 6 }]} numberOfLines={1}>{item.name}</Text>
          <View
            style={{
              backgroundColor: priceType === 'wholesale' ? '#DCFCE7' : '#DBEAFE',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                color: priceType === 'wholesale' ? '#15803D' : '#1D4ED8',
                fontSize: 10,
                fontWeight: '700',
              }}
            >
              {priceType === 'wholesale' ? 'Wholesale' : 'Retail'}
            </Text>
          </View>
        </View>
        <Text style={styles.productPrice}>
          ₹{activePrice.toFixed(2)} / {baseUnitName}
        </Text>
        {hasSubUnit && (
          <Text style={{ fontSize: 11, color: '#0284C7', marginBottom: 2 }}>
            ₹{subPrice} / {subUnitName}
          </Text>
        )}
        <Text style={styles.productStock}>
          Stock: {Number(Number(item.stockQuantity || 0).toFixed(4))} {baseUnitName}
          {hasSubUnit ? ` (${Number((Number(item.stockQuantity || 0) * cRate).toFixed(2))} ${subUnitName})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }: { item: any; index: number }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <Text style={styles.cartItemPrice}>
            ₹{item.price.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: item.unitType === 'sub' ? '#3B82F6' : '#F97316',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
            onPress={() => toggleCartItemUnit(item.id)}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>
              {item.unit || 'Unit'} ⇄
            </Text>
          </TouchableOpacity>
        </View>
        {item.conversionRate && item.conversionRate > 1 ? (
          <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>
            1 {item.baseUnitName || 'Box'} = {item.conversionRate} {item.subUnitName || 'Pcs'}
          </Text>
        ) : null}
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => {
            const current = parseFloat(String(item.quantity)) || 1;
            if (current > 1) {
              updateCartItem(item.id, { quantity: Number((current - 1).toFixed(4)) });
            } else {
              removeFromCart(item.id);
            }
          }}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <TextInput
          style={[
            styles.qtyText,
            {
              minWidth: 40,
              height: 28,
              textAlign: 'center',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 4,
              paddingVertical: 0,
              paddingHorizontal: 2,
              color: '#1E293B',
              backgroundColor: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
            },
          ]}
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={item.quantity === 0 ? '' : String(item.quantity)}
          onChangeText={(v) => {
            const clean = v.replace(/[^0-9.]/g, '');
            const parts = clean.split('.');
            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
            const parsed = parseFloat(sanitized);
            updateCartItem(item.id, { quantity: isNaN(parsed) ? (sanitized === '' ? 0 : (sanitized as any)) : parsed });
          }}
          onBlur={() => {
            const parsed = parseFloat(String(item.quantity));
            if (isNaN(parsed) || parsed <= 0) {
              updateCartItem(item.id, { quantity: 1 });
            } else {
              updateCartItem(item.id, { quantity: parsed });
            }
          }}
        />
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => {
            const current = parseFloat(String(item.quantity)) || 0;
            updateCartItem(item.id, { quantity: Number((current + 1).toFixed(4)) });
          }}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>
        ₹{((item.price * item.quantity) - item.discount).toFixed(2)}
      </Text>
    </View>
  );


  return (
    <View style={styles.container}>
      {/* Left side: Products */}
      <View style={styles.productsSection}>
        {/* Wholesale vs Retailer Mode Switcher */}
        <View style={styles.priceTypeSelectorRow}>
          <Text style={styles.priceTypeLabel}>Pricing Mode:</Text>
          <View style={styles.priceTypeGroup}>
            <TouchableOpacity
              style={[
                styles.priceTypeBtn,
                priceType === 'wholesale' && styles.priceTypeBtnActiveWholesale,
              ]}
              onPress={() => setPriceType('wholesale')}
            >
              <Text
                style={[
                  styles.priceTypeBtnText,
                  priceType === 'wholesale' && styles.priceTypeBtnTextActive,
                ]}
              >
                Wholesale (Default)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priceTypeBtn,
                priceType === 'retail' && styles.priceTypeBtnActiveRetail,
              ]}
              onPress={() => setPriceType('retail')}
            >
              <Text
                style={[
                  styles.priceTypeBtnText,
                  priceType === 'retail' && styles.priceTypeBtnTextActive,
                ]}
              >
                Retailer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={`Search product (${priceType} price) or scan barcode...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          numColumns={Platform.OS === 'web' ? 4 : 2}
          contentContainerStyle={styles.productList}
        />
      </View>

      {/* Right side: Cart */}
      <View style={styles.cartSection}>
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Current Sale {isReturnMode && '(RETURN)'}</Text>
          <View style={styles.cartActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setIsReturnMode(!isReturnMode)}>
              <Text style={styles.actionBtnText}>Return</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => holdCurrentSale()}>
              <Text style={styles.actionBtnText}>Hold</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => clearCart()}>
              <Text style={styles.actionBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={cart}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCartItem}
          style={styles.cartList}
        />

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{getSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text style={styles.totalValue}>-₹{getTotalDiscount().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST</Text>
            <Text style={styles.totalValue}>₹{getTotalGST().toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>₹{getGrandTotal().toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.shortcutsContainer}>
          <View style={styles.shortcutRow}>
            <Text style={styles.shortcutText}>F2 Customer</Text>
            <Text style={styles.shortcutText}>F4 Discount</Text>
          </View>
          <View style={styles.shortcutRow}>
            <Text style={styles.shortcutText}>F8 Payment</Text>
            <Text style={styles.shortcutText}>F12 Complete</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, (isSubmitting || createSaleMutation.isPending) && { opacity: 0.6 }]}
          onPress={handleCompleteSale}
          disabled={isSubmitting || createSaleMutation.isPending}
        >
          <Text style={styles.checkoutBtnText}>
            {isSubmitting || createSaleMutation.isPending ? 'Processing...' : 'Checkout (F12)'}
          </Text>
        </TouchableOpacity>
      </View>

      <ReceiptPrintPreviewModal
        visible={showPrintModal}
        data={printReceiptData}
        onClose={() => {
          setShowPrintModal(false);
          setPrintReceiptData(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: '#f5f5f5',
  },
  productsSection: {
    flex: 1,
    padding: 16,
  },
  priceTypeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  priceTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  priceTypeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  priceTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  priceTypeBtnActiveWholesale: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  priceTypeBtnActiveRetail: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  priceTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  priceTypeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productList: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    minWidth: 150,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  cartSection: {
    width: Platform.OS === 'web' ? 400 : '100%',
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'column',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
  },
  actionBtnText: {
    fontSize: 14,
    color: '#333',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  qtyBtn: {
    backgroundColor: '#eee',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyText: {
    marginHorizontal: 12,
    fontSize: 16,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  totalsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  shortcutsContainer: {
    padding: 16,
    backgroundColor: '#eee',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  shortcutText: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  checkoutBtn: {
    backgroundColor: '#1976d2',
    padding: 20,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


