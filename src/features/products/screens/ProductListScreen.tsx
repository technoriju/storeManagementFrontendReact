import React, { useEffect } from 'react';
import { View, StyleSheet, Text, FlatList } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';

interface Props {
  onNavigate: (screen: ProductScreenType, productId?: string) => void;
}

export const ProductListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { products, isLoading, error } = useProductStore();

  useEffect(() => {
    // Load products from DB here when repository is implemented
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Products</Text>
        <View style={styles.actions}>
          <AppButton title="Categories" onPress={() => onNavigate('categories')} variant="outline" />
          <AppButton title="Brands" onPress={() => onNavigate('brands')} variant="outline" style={styles.actionBtn} />
          <AppButton title="Units" onPress={() => onNavigate('units')} variant="outline" style={styles.actionBtn} />
          <AppButton title="Import" onPress={() => onNavigate('import')} variant="outline" style={styles.actionBtn} />
          <AppButton title="Add Product" onPress={() => onNavigate('form')} style={styles.actionBtn} />
        </View>
      </View>

      {isLoading ? (
        <Text style={{ color: theme.colors.textSecondary, padding: 20 }}>Loading products...</Text>
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: theme.colors.textSecondary }}>No products found. Add one to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>${item.price.toFixed(2)}</Text>
              </View>
              <Text style={{ color: theme.colors.textSecondary }}>SKU: {item.sku}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>Stock: {item.stockQuantity}</Text>
              <View style={styles.cardActions}>
                <AppButton title="Edit" onPress={() => onNavigate('form', item.id)} variant="outline" size="small" />
                <AppButton title="Details" onPress={() => onNavigate('details', item.id)} size="small" style={{ marginLeft: 10 }} />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { marginLeft: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 18, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }
});
