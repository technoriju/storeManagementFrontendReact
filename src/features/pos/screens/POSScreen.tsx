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

export const POSScreen = () => {
  const {
    cart,
    customer,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    holdCurrentSale,
    getSubtotal,
    getTotalDiscount,
    getTotalGST,
    getGrandTotal,
  } = usePOSStore();

  const { products } = useProductStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
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
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart first.');
      return;
    }
    Alert.alert('Complete', 'Sale completed successfully!');
    clearCart();
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(item, isReturnMode ? -1 : 1)}
    >
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
      <Text style={styles.productStock}>Stock: {item.stockQuantity}</Text>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>₹{item.price.toFixed(2)} / {item.unit}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => {
            if (item.quantity > 1) {
              updateCartItem(item.id, { quantity: item.quantity - 1 });
            } else {
              removeFromCart(item.id);
            }
          }}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
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
        <View style={styles.searchContainer}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search product or scan barcode..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
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
          keyExtractor={(item) => item.id}
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

        <TouchableOpacity style={styles.checkoutBtn} onPress={() => {
          if (cart.length > 0) Alert.alert('Checkout', 'Proceeding to payment');
        }}>
          <Text style={styles.checkoutBtnText}>Checkout (F12)</Text>
        </TouchableOpacity>
      </View>
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
