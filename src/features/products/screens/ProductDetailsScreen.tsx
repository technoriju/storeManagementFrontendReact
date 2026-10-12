import React from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
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
  const { isMobile } = useResponsive();
  const { products, deleteProduct } = useProductStore();
  
  const product = products.find(p => String(p.id) === String(productId));

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text, marginBottom: 16 }}>Product not found.</Text>
        <AppButton title="Back" onPress={() => onNavigate('list')} />
      </View>
    );
  }

  const handleDelete = () => {
    const doDelete = async () => {
      await deleteProduct(productId);
      onNavigate('list');
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete "${product.name}"?`)) {
        void doDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { void doDelete(); },
        },
      ]
    );
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
        <AppButton title="Back" onPress={() => onNavigate('list')} variant="outline" size="small" />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
          
          <InfoRow label="Current Stock" value={Number(Number(product.stockQuantity ?? product.openingStock ?? 0).toFixed(4))} />
          <InfoRow label="Opening Stock" value={product.openingStock !== undefined ? Number(Number(product.openingStock).toFixed(4)) : '-'} />

          <View style={[styles.actions, isMobile && styles.actionsMobile]}>
            <AppButton 
              title="Delete Product" 
              onPress={handleDelete} 
              variant="outline" 
              style={[styles.deleteBtn, isMobile && { width: '100%' }]} 
              textStyle={{ color: '#EF4444' }}
            />
            <AppButton 
              title="Edit Product" 
              onPress={() => onNavigate('form', productId)} 
              style={[styles.editBtn, isMobile && { width: '100%' }]} 
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1 
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  scrollContent: { padding: 16, alignItems: 'center' },
  card: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 20, 
    width: '100%', 
    maxWidth: 700 
  },
  productName: { fontSize: 22, fontWeight: 'bold' },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
  actions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 12, 
    marginTop: 24 
  },
  actionsMobile: {
    flexDirection: 'column-reverse',
    gap: 10,
    alignItems: 'stretch',
  },
  editBtn: {
    backgroundColor: '#F97316',
    minWidth: 130,
    height: 40,
    borderRadius: 6,
  },
  deleteBtn: {
    borderColor: '#EF4444',
    minWidth: 130,
    height: 40,
    borderRadius: 6,
  },
});



