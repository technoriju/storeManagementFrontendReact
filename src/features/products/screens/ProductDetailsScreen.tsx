import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';

interface Props {
  productId: number | string;
  onNavigate: (screen: ProductScreenType, productId?: number | string) => void;
}

export const ProductDetailsScreen: React.FC<Props> = ({ productId, onNavigate }) => {
  const theme = useTheme();
  const { products, deleteProduct } = useProductStore();
  
  const product = products.find(p => String(p.id) === String(productId));

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Product not found.</Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} />
      </View>
    );
  }

  const handleDelete = () => {
    deleteProduct(Number(productId));
    onNavigate('list');
  };

  const InfoRow = ({ label, value }: { label: string, value: string | number | undefined }) => (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value !== undefined ? value : '-'}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Product Details</Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} variant="outline" />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.productName, { color: theme.colors.text, flex: 1 }]}>{product.name}</Text>
            <SyncBadge status={product.syncStatus || 'synced'} />
          </View>
          
          <InfoRow label="SKU" value={product.sku || (product as any).productCode} />
          <InfoRow label="Barcode" value={product.barcode} />
          <InfoRow label="Category" value={product.category?.name || product.categoryName || (product.categoryId ? `Category #${product.categoryId}` : '-')} />
          <InfoRow label="Brand" value={product.brand?.name || product.brandName || (product.brandId ? `Brand #${product.brandId}` : '-')} />
          <InfoRow label="HSN Code" value={product.hsn || (product as any).hsnCode} />
          <InfoRow label="GST (%)" value={product.gst} />
          
          <InfoRow label="Purchase Price" value={`₹${Number(product.purchasePrice ?? product.cost ?? 0).toFixed(2)}`} />
          <InfoRow label="Wholesale Price" value={`₹${Number(product.wholesalePrice ?? 0).toFixed(2)}`} />
          <InfoRow label="Retail Price" value={`₹${Number(product.retailPrice ?? product.price ?? 0).toFixed(2)}`} />
          <InfoRow label="MRP" value={product.mrp !== undefined && product.mrp !== null ? `₹${Number(product.mrp).toFixed(2)}` : '-'} />
          
          <InfoRow label="Current Stock" value={Number(product.stockQuantity ?? product.openingStock ?? 0)} />
          <InfoRow label="Opening Stock" value={product.openingStock !== undefined ? Number(product.openingStock) : '-'} />
        </View>

        <View style={styles.actions}>
          <AppButton title="Edit Product" onPress={() => onNavigate('form', productId)} style={styles.actionBtn} />
          <AppButton title="Delete" onPress={handleDelete} variant="outline" style={styles.actionBtn} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 20 },
  productName: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 16 },
  value: { fontSize: 16, fontWeight: '500' },
  actions: { flexDirection: 'column', gap: 12 },
  actionBtn: { marginBottom: 12 }
});



