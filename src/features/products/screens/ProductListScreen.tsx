import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';
import { AdvancedTable } from '../../../shared/components/data-display/AdvancedTable';
import { SyncBadge } from '../../../shared/components/data-display/SyncBadge';
import { useSyncStore } from '../../../core/sync/useSyncStore';
import { ImportProductModal } from '../components/ImportProductModal';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import { 
  FileText, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronUp, 
  PlusCircle, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronDown 
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: ProductScreenType, productId?: string | number) => void;
}

export const ProductListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { products, isLoading, error, fetchProducts, deleteProduct } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (lastSyncedAt) {
      fetchProducts();
    }
  }, [lastSyncedAt, fetchProducts]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const localCats = await categoryRepository.getAll();
        if (localCats.length > 0) {
          const cMap: Record<string, string> = {};
          localCats.forEach((c: any) => {
            if (c.id && c.name) cMap[String(c.id)] = c.name;
          });
          setCategoryMap(cMap);
        } else {
          const catRes = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
          const catList = catRes.data?.data || catRes.data || [];
          if (Array.isArray(catList)) {
            const cMap: Record<string, string> = {};
            catList.forEach((c: any) => {
              if (c.id && c.name) cMap[String(c.id)] = c.name;
            });
            setCategoryMap(cMap);
          }
        }
      } catch (_) {}

      try {
        const localBrands = await brandRepository.getAll();
        if (localBrands.length > 0) {
          const bMap: Record<string, string> = {};
          localBrands.forEach((b: any) => {
            if (b.id && b.name) bMap[String(b.id)] = b.name;
          });
          setBrandMap(bMap);
        } else {
          const brRes = await apiClient.get(API_ENDPOINTS.BRANDS.BASE);
          const brList = brRes.data?.data || brRes.data || [];
          if (Array.isArray(brList)) {
            const bMap: Record<string, string> = {};
            brList.forEach((b: any) => {
              if (b.id && b.name) bMap[String(b.id)] = b.name;
            });
            setBrandMap(bMap);
          }
        }
      } catch (_) {}
    };

    loadLookups();
  }, []);

  const getCategoryName = (item: any) => {
    return item.category?.name || item.categoryName || categoryMap[String(item.categoryId)] || (item.categoryId ? `Category #${item.categoryId}` : 'N/A');
  };

  const getBrandName = (item: any) => {
    return item.brand?.name || item.brandName || brandMap[String(item.brandId)] || (item.brandId ? `Brand #${item.brandId}` : 'N/A');
  };

  const columns = [
    { key: 'sku', title: 'SKU', width: 110 },
    { 
      key: 'name', 
      title: 'Product Name', 
      flex: 2,
      minWidth: 180,
      render: (value: string, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: theme.colors.background }} />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>IMG</Text>
            </View>
          )}
          <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{value || item.name}</Text>
        </View>
      )
    },
    { 
      key: 'category', 
      title: 'Category', 
      flex: 1,
      minWidth: 130,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.textSecondary }}>{getCategoryName(item)}</Text>
      )
    },
    { 
      key: 'brand', 
      title: 'Brand', 
      flex: 1,
      minWidth: 120,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.textSecondary }}>{getBrandName(item)}</Text>
      )
    },
    { 
      key: 'purchasePrice', 
      title: 'Purchase (₹)', 
      width: 120,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.textSecondary }}>
          ₹{Number(item.purchasePrice ?? item.cost ?? 0).toFixed(2)}
        </Text>
      )
    },
    { 
      key: 'wholesalePrice', 
      title: 'Wholesale (₹)', 
      width: 125,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.textSecondary }}>
          ₹{Number(item.wholesalePrice ?? 0).toFixed(2)}
        </Text>
      )
    },
    { 
      key: 'retailPrice', 
      title: 'Retail (₹)', 
      width: 120,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
          ₹{Number(item.retailPrice ?? item.price ?? 0).toFixed(2)}
        </Text>
      )
    },
    { 
      key: 'unit', 
      title: 'Unit', 
      width: 80,
      render: (_: any, item: any) => (
        <Text style={{ color: theme.colors.textSecondary }}>
          {item.baseUnit?.shortName || item.unit || item.baseUnit?.name || 'Pc'}
        </Text>
      )
    },
    { 
      key: 'stockQuantity', 
      title: 'Qty', 
      width: 85,
      render: (_: any, item: any) => {
        const qty = Number(item.stockQuantity ?? item.openingStock ?? 0);
        const displayQty = Number(qty.toFixed(4));
        return (
          <Text style={{ 
            color: qty > 0 ? theme.colors.text : '#EF4444', 
            fontWeight: '700' 
          }}>
            {displayQty}
          </Text>
        );
      }
    },
    { 
      key: 'createdBy', 
      title: 'Created By', 
      flex: 1.2,
      minWidth: 130,
      render: (_: string, item: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {item.name ? item.name.substring(0, 1).toUpperCase() : 'A'}
            </Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary }}>Admin</Text>
        </View>
      )
    },
    { 
      key: 'syncStatus', 
      title: 'Sync', 
      width: 95,
      render: (value: string | undefined) => <SyncBadge status={value} />
    },
  ];

  const headerActions = (
    <>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileText size={16} color="#E11D48" />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <FileSpreadsheet size={16} color="#10B981" />
      </Pressable>
      <Pressable 
        style={[styles.iconButton, { borderColor: theme.colors.border }]}
        onPress={() => fetchProducts()}
      >
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
        <ChevronUp size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }]} 
        onPress={() => onNavigate('form')}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>Add Product</Text>
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }]} 
        onPress={() => onNavigate('import')}
      >
        <Download size={16} color="white" />
        <Text style={styles.primaryActionText}>Import Product</Text>
      </Pressable>
    </>
  );

  const filters = (
    <>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Category</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
      <View style={[styles.filterDropdown, { borderColor: theme.colors.border }]}>
        <Text style={{ color: theme.colors.text }}>Brand</Text>
        <ChevronDown size={14} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
      </View>
    </>
  );

  const handleDeleteProduct = (item: any) => {
    const doDelete = async () => {
      try {
        await deleteProduct(item.id);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to delete product');
      }
    };

    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(`Are you sure you want to delete "${item.name}"?`)) {
        void doDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => { void doDelete(); } 
        }
      ]
    );
  };

  const renderRowActions = (item: any) => (
    <>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('details', item.id)}>
        <Eye size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => onNavigate('form', item.id)}>
        <Edit size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable style={[styles.rowActionBtn, { borderColor: theme.colors.border }]} onPress={() => handleDeleteProduct(item)}>
        <Trash2 size={16} color="#EF4444" />
      </Pressable>
    </>
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || p.productCode || '').toLowerCase();
      const catName = getCategoryName(p).toLowerCase();
      const brandName = getBrandName(p).toLowerCase();
      return name.includes(q) || sku.includes(q) || catName.includes(q) || brandName.includes(q);
    });
  }, [products, searchQuery, categoryMap, brandMap]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AdvancedTable
        title="Product List"
        subtitle="Manage your products"
        headerActions={headerActions}
        columns={columns}
        data={filteredProducts}
        onSearch={setSearchQuery}
        filters={filters}
        renderRowActions={renderRowActions}
        isLoading={isLoading}
      />
      
      <ImportProductModal 
        visible={isImportModalVisible} 
        onClose={() => setIsImportModalVisible(false)} 
        onOpenImportScreen={() => onNavigate('import')}
        onSubmit={() => {
          setIsImportModalVisible(false);
          onNavigate('import');
        }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  iconButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    gap: 8,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: 'white',
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  }
});


