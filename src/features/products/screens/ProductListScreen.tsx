import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Image, Alert, Platform } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
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
  ChevronDown,
  X
} from 'lucide-react-native';

interface Props {
  onNavigate: (screen: ProductScreenType, productId?: string | number) => void;
}

export const ProductListScreen: React.FC<Props> = ({ onNavigate }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { deleteProduct, fetchPaginatedProducts } = useProductStore();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableProducts, setTableProducts] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: string | number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string | number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  const loadData = useCallback(async (
    targetPage: number, 
    targetLimit: number, 
    targetSearch: string,
    targetCat?: string,
    targetBrand?: string
  ) => {
    setIsLoadingData(true);
    try {
      const catId = targetCat ? Number(targetCat) : undefined;
      const bId = targetBrand ? Number(targetBrand) : undefined;
      const res = await fetchPaginatedProducts({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
        categoryId: catId && !isNaN(catId) ? catId : undefined,
        brandId: bId && !isNaN(bId) ? bId : undefined,
      });
      setTableProducts(res.data);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.warn('Failed to load paginated products:', e);
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchPaginatedProducts]);

  useEffect(() => {
    loadData(page, rowsPerPage, searchQuery, selectedCategory, selectedBrand);
  }, [loadData, page, rowsPerPage, searchQuery, selectedCategory, selectedBrand]);

  useEffect(() => {
    if (lastSyncedAt) {
      loadData(page, rowsPerPage, searchQuery, selectedCategory, selectedBrand);
    }
  }, [loadData, lastSyncedAt, page, rowsPerPage, searchQuery, selectedCategory, selectedBrand]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const localCats = await categoryRepository.getAll();
        const catRes = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE).catch(() => null);
        const apiCats = catRes?.data?.data || catRes?.data || [];
        const rawCats = Array.isArray(apiCats) && apiCats.length > 0 ? apiCats : localCats;

        const cMap: Record<string, string> = {};
        const catList: { id: string | number; name: string }[] = [];
        const seenCat = new Set<string>();

        (rawCats || []).forEach((c: any) => {
          if (c.id && c.name) {
            const idStr = String(c.id);
            cMap[idStr] = c.name;
            if (!seenCat.has(idStr)) {
              seenCat.add(idStr);
              catList.push({ id: c.id, name: c.name });
            }
          }
        });
        setCategoryMap(cMap);
        setCategories(catList);
      } catch (_) {}

      try {
        const localBrands = await brandRepository.getAll();
        const brRes = await apiClient.get(API_ENDPOINTS.BRANDS.BASE).catch(() => null);
        const apiBrands = brRes?.data?.data || brRes?.data || [];
        const rawBrands = Array.isArray(apiBrands) && apiBrands.length > 0 ? apiBrands : localBrands;

        const bMap: Record<string, string> = {};
        const brList: { id: string | number; name: string }[] = [];
        const seenBrand = new Set<string>();

        (rawBrands || []).forEach((b: any) => {
          if (b.id && b.name) {
            const idStr = String(b.id);
            bMap[idStr] = b.name;
            if (!seenBrand.has(idStr)) {
              seenBrand.add(idStr);
              brList.push({ id: b.id, name: b.name });
            }
          }
        });
        setBrandMap(bMap);
        setBrands(brList);
      } catch (_) {}
    };

    loadLookups();
  }, []);

  const categoryOptions = useMemo(() => {
    const opts = [{ label: 'All Categories', value: '' }];
    categories.forEach(c => opts.push({ label: c.name, value: String(c.id) }));
    return opts;
  }, [categories]);

  const brandOptions = useMemo(() => {
    const opts = [{ label: 'All Brands', value: '' }];
    brands.forEach(b => opts.push({ label: b.name, value: String(b.id) }));
    return opts;
  }, [brands]);

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

  const handleCategoryChange = (val: any) => {
    const nextVal = val ? String(val) : '';
    setSelectedCategory(nextVal);
    setPage(1);
  };

  const handleBrandChange = (val: any) => {
    const nextVal = val ? String(val) : '';
    setSelectedBrand(nextVal);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setPage(1);
  };

  const headerActions = (
    <View style={styles.headerActionsWrapper}>
      {!isMobile && (
        <>
          <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
            <FileText size={16} color="#E11D48" />
          </Pressable>
          <Pressable style={[styles.iconButton, { borderColor: theme.colors.border }]}>
            <FileSpreadsheet size={16} color="#10B981" />
          </Pressable>
        </>
      )}
      <Pressable 
        style={[styles.iconButton, { borderColor: theme.colors.border }]}
        onPress={() => loadData(page, rowsPerPage, searchQuery, selectedCategory, selectedBrand)}
      >
        <RefreshCw size={16} color={theme.colors.textSecondary} />
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#F97316' }, isMobile && styles.primaryActionBtnMobile]} 
        onPress={() => onNavigate('form')}
      >
        <PlusCircle size={16} color="white" />
        <Text style={styles.primaryActionText}>{isMobile ? 'Add' : 'Add Product'}</Text>
      </Pressable>
      <Pressable 
        style={[styles.primaryActionBtn, { backgroundColor: '#1E3A8A' }, isMobile && styles.primaryActionBtnMobile]} 
        onPress={() => onNavigate('import')}
      >
        <Download size={16} color="white" />
        <Text style={styles.primaryActionText}>{isMobile ? 'Import' : 'Import Product'}</Text>
      </Pressable>
    </View>
  );

  const filters = (
    <View style={styles.filtersWrapper}>
      <AppSelect
        placeholder="All Categories"
        value={selectedCategory}
        options={categoryOptions}
        onSelect={handleCategoryChange}
        clearable
        searchable
        containerStyle={[styles.filterSelect, { minWidth: isMobile ? 130 : 150 }]}
      />
      <AppSelect
        placeholder="All Brands"
        value={selectedBrand}
        options={brandOptions}
        onSelect={handleBrandChange}
        clearable
        searchable
        containerStyle={[styles.filterSelect, { minWidth: isMobile ? 120 : 140 }]}
      />
      {(!!selectedCategory || !!selectedBrand) && (
        <Pressable
          style={[styles.clearFilterBtn, { borderColor: theme.colors.border }]}
          onPress={handleClearFilters}
        >
          <X size={14} color="#EF4444" />
          <Text style={styles.clearFilterText}>Reset</Text>
        </Pressable>
      )}
    </View>
  );

  const handleDeleteProduct = (item: any) => {
    const doDelete = async () => {
      try {
        await deleteProduct(item.id);
        await loadData(page, rowsPerPage, searchQuery, selectedCategory, selectedBrand);
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

  const renderProductCard = (item: any) => {
    const qty = Number(item.stockQuantity ?? item.openingStock ?? 0);
    const displayQty = Number(qty.toFixed(4));
    const retailPrice = Number(item.retailPrice ?? item.price ?? 0).toFixed(2);

    return (
      <View style={[styles.mobileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardTopRow}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.cardThumb} />
          ) : (
            <View style={[styles.cardThumbPlaceholder, { backgroundColor: theme.colors.background }]}>
              <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>IMG</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.cardSku, { color: theme.colors.textSecondary }]}>
              SKU: {item.sku || 'N/A'}
            </Text>
          </View>
          <SyncBadge status={item.syncStatus} />
        </View>

        <View style={[styles.cardTagRow, { borderColor: theme.colors.divider }]}>
          <View style={[styles.cardTag, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.cardTagText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {getCategoryName(item)}
            </Text>
          </View>
          <View style={[styles.cardTag, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.cardTagText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {getBrandName(item)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Retail Price</Text>
            <Text style={[styles.cardPrice, { color: theme.colors.text }]}>₹{retailPrice}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Stock</Text>
            <Text style={[styles.cardStock, { color: qty > 0 ? theme.colors.text : '#EF4444' }]}>
              {displayQty} {item.baseUnit?.shortName || item.unit || 'Pc'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => onNavigate('details', item.id)}
            >
              <Eye size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => onNavigate('form', item.id)}
            >
              <Edit size={15} color={theme.colors.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.rowActionBtn, { borderColor: theme.colors.border }]}
              onPress={() => handleDeleteProduct(item)}
            >
              <Trash2 size={15} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: isMobile ? 8 : 16 }]}>
      <AdvancedTable
        title="Product List"
        subtitle="Manage your products"
        headerActions={headerActions}
        columns={columns}
        data={tableProducts}
        searchValue={searchQuery}
        onSearch={handleSearch}
        debounceSearchMs={400}
        filters={filters}
        renderRowActions={renderRowActions}
        renderMobileCard={renderProductCard}
        isLoading={isLoadingData}
        page={page}
        rowsPerPage={rowsPerPage}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRows) => {
          setRowsPerPage(newRows);
          setPage(1);
        }}
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
  container: { flex: 1 },
  headerActionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
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
  primaryActionBtnMobile: {
    paddingHorizontal: 10,
    gap: 4,
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  filtersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterSelect: {
    marginBottom: 0,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  rowActionBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  mobileCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  cardThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSku: {
    fontSize: 12,
    marginTop: 2,
  },
  cardTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cardTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardTagText: {
    fontSize: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardStock: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
});


