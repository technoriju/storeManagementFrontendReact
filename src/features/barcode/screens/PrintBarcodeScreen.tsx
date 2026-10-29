import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useProductStore } from '../../products/store/productStore';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import {
  BarcodePrintItem,
  BarcodeLabelConfig,
  BarcodeSymbology,
  PaperPresetId,
  PAPER_PRESETS,
  DEFAULT_LABEL_CONFIG,
} from '../types';
import { BarcodeSingleLabel } from '../components/BarcodeSingleLabel';
import { BarcodePrintPreviewModal } from '../components/BarcodePrintPreviewModal';
import {
  Printer,
  Search,
  Plus,
  Minus,
  Trash2,
  Settings2,
  Eye,
  RefreshCw,
  Box,
  Check,
  Tag,
  Filter,
  CheckCircle2,
  QrCode,
  Layers,
} from 'lucide-react-native';

interface PrintBarcodeScreenProps {
  onNavigateTab?: (tab: string) => void;
}

interface CategoryOption {
  id: string;
  name: string;
}

export const PrintBarcodeScreen: React.FC<PrintBarcodeScreenProps> = ({ onNavigateTab }) => {
  const theme = useTheme();
  const { isDesktop, windowWidth } = useResponsive();
  const { products, fetchProducts } = useProductStore();

  // Categories list
  const [categoryList, setCategoryList] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Print Queue
  const [items, setItems] = useState<BarcodePrintItem[]>([]);
  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Label Configuration
  const [config, setConfig] = useState<BarcodeLabelConfig>(DEFAULT_LABEL_CONFIG);

  // Preview Modal
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.5);

  // Load products & categories on mount
  useEffect(() => {
    fetchProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const map = new Map<string, string>();

    // 1. Load from CategoryRepository (local SQLite)
    try {
      const localCats = await categoryRepository.getAll();
      if (Array.isArray(localCats)) {
        localCats.forEach((c: any) => {
          if (c && c.name) {
            map.set(String(c.id || c.name), c.name);
          }
        });
      }
    } catch (e) {
      // ignore
    }

    // 2. Load from API
    try {
      const res = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE).catch(() => null);
      const apiCats = res?.data?.data || res?.data || [];
      if (Array.isArray(apiCats)) {
        apiCats.forEach((c: any) => {
          if (c && c.name) {
            map.set(String(c.id || c.name), c.name);
          }
        });
      }
    } catch (e) {
      // ignore
    }

    // 3. Fallback: extract from products already loaded
    if (products && products.length > 0) {
      products.forEach((p) => {
        const catId = p.categoryId || p.category?.id;
        const catName = p.categoryName || p.category?.name;
        if (catName) {
          map.set(String(catId || catName), catName);
        }
      });
    }

    const options: CategoryOption[] = Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    setCategoryList(options);
  };

  // Re-extract categories when products change if categoryList is small
  useEffect(() => {
    if (products.length > 0 && categoryList.length === 0) {
      loadCategories();
    }
  }, [products]);

  // Filter products based on selected Category and Search Query
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    return products.filter((p) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Category matching
      if (selectedCategory === 'all') return true;

      const pCatId = String(p.categoryId || p.category?.id || '');
      const pCatName = String(p.categoryName || p.category?.name || '').toLowerCase();

      // Find selected category name if selectedCategory is ID
      const chosenCat = categoryList.find((c) => c.id === selectedCategory);
      const chosenCatName = chosenCat ? chosenCat.name.toLowerCase() : selectedCategory.toLowerCase();

      return (
        pCatId === selectedCategory ||
        pCatName === chosenCatName ||
        pCatName === selectedCategory.toLowerCase()
      );
    });
  }, [products, searchQuery, selectedCategory, categoryList]);

  // Add product to queue
  const handleAddProduct = (product: any, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => String(item.productId) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.productId) === String(product.id)
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku || `SKU-${product.id}`,
          barcode: product.barcode || product.sku || String(product.id),
          price: product.retailPrice || product.price || 0,
          mrp: product.mrp || product.retailPrice || product.price || 0,
          categoryName: product.categoryName || product.category?.name,
          brandName: product.brandName || product.brand?.name,
          quantity: qty,
        },
      ];
    });
  };

  // Add all filtered products to queue
  const handleAddAllFiltered = () => {
    filteredProducts.forEach((p) => handleAddProduct(p, 1));
  };

  // Modify queue quantity
  const handleUpdateQty = (productId: string | number, qty: number) => {
    setItems((prev) =>
      prev
        .map((it) => (String(it.productId) === String(productId) ? { ...it, quantity: Math.max(1, qty) } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  // Remove single item
  const handleRemoveItem = (productId: string | number) => {
    setItems((prev) => prev.filter((it) => String(it.productId) !== String(productId)));
  };

  // Set all quantities to stock
  const handleSetQtyToStock = () => {
    setItems((prev) =>
      prev.map((it) => {
        const prod = products.find((p) => String(p.id) === String(it.productId));
        const stock = prod?.stockQuantity ? Math.max(1, Math.round(prod.stockQuantity)) : 1;
        return { ...it, quantity: stock };
      })
    );
  };

  // Check if item is already in queue
  const isProductInQueue = (productId: string | number) => {
    return items.some((it) => String(it.productId) === String(productId));
  };

  // Totals
  const totalLabels = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [items]);

  const activePreset = PAPER_PRESETS[config.presetId] || PAPER_PRESETS.thermal_50x25;
  const labelWidthMm = config.presetId === 'custom' ? config.customWidthMm : activePreset.widthMm;
  const labelHeightMm = config.presetId === 'custom' ? config.customHeightMm : activePreset.heightMm;

  // First item for live preview card
  const previewItem: BarcodePrintItem = items.length > 0
    ? items[0]
    : {
        productId: 'DEMO',
        name: 'Fresh Premium Milk 1L',
        sku: 'MILK-1001',
        barcode: '8901234567890',
        price: 65.0,
        mrp: 75.0,
        quantity: 1,
        packedDate: new Date().toLocaleDateString('en-GB'),
      };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.titleRow}>
          <Tag size={24} color={theme.colors.primary} />
          <View>
            <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Print Barcode & QR Labels</Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Filter by category, search items, customize label fields, and print thermal rolls or A4 sheets
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <Pressable
            onPress={() => setConfig(DEFAULT_LABEL_CONFIG)}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <RefreshCw size={15} color={theme.colors.text} />
            <Text style={[styles.btnTextSecondary, { color: theme.colors.text }]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={() => setPreviewVisible(true)}
            disabled={items.length === 0}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: items.length === 0 ? theme.colors.border : theme.colors.primary,
                opacity: pressed && items.length > 0 ? 0.8 : 1,
              },
            ]}
          >
            <Printer size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              Print Labels ({totalLabels})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.mainLayout}>
        <View style={[styles.columnsContainer, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          
          {/* LEFT COLUMN: Product Category Filter, Product List & Print Queue */}
          <View style={[styles.leftColumn, { flex: isDesktop ? 6 : undefined }]}>
            
            {/* Category Filter & Search Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Filter size={18} color={theme.colors.primary} />
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>1. Browse & Filter Products</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                  Showing {filteredProducts.length} of {products.length} products
                </Text>
              </View>

              {/* Filter controls row */}
              <View style={styles.searchRow}>
                {/* Category Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '180px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                    CATEGORY
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">📁 All Categories ({products.length})</option>
                    {categoryList.map((c) => {
                      const count = products.filter(
                        (p) =>
                          String(p.categoryId || p.category?.id) === c.id ||
                          String(p.categoryName || p.category?.name).toLowerCase() === c.name.toLowerCase()
                      ).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Search Text Input */}
                <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                    SEARCH PRODUCT
                  </label>
                  <View style={[styles.searchInputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                    <Search size={18} color={theme.colors.textSecondary} />
                    <TextInput
                      placeholder="Search by name, SKU or barcode..."
                      placeholderTextColor={theme.colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={[styles.searchInput, { color: theme.colors.text }]}
                    />
                    {searchQuery ? (
                      <Pressable onPress={() => setSearchQuery('')}>
                        <Trash2 size={16} color={theme.colors.textSecondary} />
                      </Pressable>
                    ) : null}
                  </View>
                </div>

                {/* Bulk Add Button */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Pressable
                    onPress={handleAddAllFiltered}
                    disabled={filteredProducts.length === 0}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      {
                        borderColor: theme.colors.primary,
                        backgroundColor: theme.colors.primary + '10',
                        opacity: pressed ? 0.7 : 1,
                        height: 42,
                      },
                    ]}
                  >
                    <Plus size={16} color={theme.colors.primary} />
                    <Text style={[styles.btnTextSecondary, { color: theme.colors.primary, fontWeight: '700' }]}>
                      Add All ({filteredProducts.length})
                    </Text>
                  </Pressable>
                </div>
              </View>

              {/* Category Quick Chips */}
              {categoryList.length > 0 && (
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => setSelectedCategory('all')}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCategory === 'all' ? theme.colors.primary : theme.colors.background,
                        borderColor: selectedCategory === 'all' ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selectedCategory === 'all' ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      All ({products.length})
                    </Text>
                  </Pressable>

                  {categoryList.slice(0, 8).map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: isSelected ? '#FFFFFF' : theme.colors.text },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* PRODUCTS LIST TABLE (Filtered by Category & Search) */}
              <View style={[styles.productListBox, { borderColor: theme.colors.border }]}>
                {filteredProducts.length === 0 ? (
                  <View style={styles.emptyProducts}>
                    <Box size={32} color={theme.colors.textSecondary} />
                    <Text style={{ marginTop: 8, color: theme.colors.textSecondary, fontSize: 13 }}>
                      No products found in this category.
                    </Text>
                  </View>
                ) : (
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredProducts.map((p) => {
                      const inQueue = isProductInQueue(p.id);
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderBottom: `1px solid ${theme.colors.border}`,
                            backgroundColor: inQueue ? `${theme.colors.primary}08` : 'transparent',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.text }}>
                                {p.name}
                              </span>
                              {(p.categoryName || p.category?.name) && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: `${theme.colors.primary}18`,
                                    color: theme.colors.primary,
                                    fontWeight: 500,
                                  }}
                                >
                                  {p.categoryName || p.category?.name}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                              SKU: <span style={{ fontFamily: 'monospace' }}>{p.sku || 'N/A'}</span> • Barcode:{' '}
                              <span style={{ fontFamily: 'monospace' }}>{p.barcode || p.sku || 'N/A'}</span> • Stock:{' '}
                              <span style={{ fontWeight: 600 }}>{p.stockQuantity ?? 0}</span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', marginRight: '16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: theme.colors.text }}>
                              {config.currency}
                              {Number(p.retailPrice || p.price || 0).toFixed(2)}
                            </div>
                            {p.mrp && p.mrp > (p.retailPrice || p.price || 0) ? (
                              <div
                                style={{
                                  fontSize: '11px',
                                  textDecoration: 'line-through',
                                  color: theme.colors.textSecondary,
                                }}
                              >
                                MRP: {config.currency}
                                {Number(p.mrp).toFixed(2)}
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddProduct(p, 1)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: inQueue ? `1px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
                              backgroundColor: inQueue ? theme.colors.primary : theme.colors.background,
                              color: inQueue ? '#FFFFFF' : theme.colors.text,
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {inQueue ? <Check size={13} color="#FFFFFF" /> : <Plus size={13} />}
                            {inQueue ? 'Added' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </View>
            </View>

            {/* Print Queue Table */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>2. Print Queue</Text>
                  <Text style={[styles.cardSubTitle, { color: theme.colors.textSecondary }]}>
                    {items.length} items in batch • {totalLabels} total stickers to print
                  </Text>
                </View>

                {items.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={handleSetQtyToStock}
                      style={({ pressed }) => [
                        styles.smallBtn,
                        { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 12 }}>Set Qty = Stock</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setItems([])}
                      style={({ pressed }) => [
                        styles.smallBtn,
                        { backgroundColor: '#FEE2E2', borderColor: '#FECACA', opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Trash2 size={13} color="#DC2626" />
                      <Text style={{ color: '#DC2626', fontSize: 12 }}>Clear Queue</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyQueue}>
                  <Box size={36} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyQueueTitle, { color: theme.colors.text }]}>Print queue is empty</Text>
                  <Text style={[styles.emptyQueueSub, { color: theme.colors.textSecondary }]}>
                    Click "+ Add" on products above or "Add All" to populate print list.
                  </Text>
                </View>
              ) : (
                <View style={styles.queueTable}>
                  {/* Table header */}
                  <View style={[styles.tableHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.thCell, { flex: 4, color: theme.colors.textSecondary }]}>PRODUCT</Text>
                    <Text style={[styles.thCell, { flex: 2, color: theme.colors.textSecondary }]}>SKU / CODE</Text>
                    <Text style={[styles.thCell, { flex: 2, color: theme.colors.textSecondary }]}>PRICE</Text>
                    <Text style={[styles.thCell, { flex: 3, textAlign: 'center', color: theme.colors.textSecondary }]}>QTY</Text>
                    <Text style={[styles.thCell, { width: 44, textAlign: 'center', color: theme.colors.textSecondary }]}>DEL</Text>
                  </View>

                  {/* Table rows */}
                  {items.map((it) => (
                    <View key={it.productId} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                      <View style={{ flex: 4 }}>
                        <Text style={[styles.rowProductName, { color: theme.colors.text }]}>{it.name}</Text>
                        {it.categoryName && (
                          <Text style={[styles.rowSubText, { color: theme.colors.textSecondary }]}>{it.categoryName}</Text>
                        )}
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={[styles.rowText, { color: theme.colors.text, fontFamily: 'monospace', fontSize: 12 }]}>
                          {it.barcode || it.sku}
                        </Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={[styles.rowText, { color: theme.colors.text, fontWeight: '700' }]}>
                          {config.currency}{Number(it.price).toFixed(2)}
                        </Text>
                        {it.mrp && it.mrp > it.price ? (
                          <Text style={[styles.rowSubText, { color: theme.colors.textSecondary, textDecorationLine: 'line-through' }]}>
                            {config.currency}{Number(it.mrp).toFixed(2)}
                          </Text>
                        ) : null}
                      </View>

                      {/* Quantity stepper */}
                      <View style={[styles.qtyStepper, { flex: 3 }]}>
                        <Pressable
                          onPress={() => handleUpdateQty(it.productId, it.quantity - 1)}
                          style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                        >
                          <Minus size={14} color={theme.colors.text} />
                        </Pressable>

                        <TextInput
                          value={String(it.quantity)}
                          keyboardType="numeric"
                          onChangeText={(txt) => {
                            const val = parseInt(txt, 10);
                            handleUpdateQty(it.productId, isNaN(val) ? 1 : val);
                          }}
                          style={[styles.qtyInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        />

                        <Pressable
                          onPress={() => handleUpdateQty(it.productId, it.quantity + 1)}
                          style={[styles.stepperBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                        >
                          <Plus size={14} color={theme.colors.text} />
                        </Pressable>
                      </View>

                      {/* Remove Button */}
                      <View style={{ width: 44, alignItems: 'center' }}>
                        <Pressable onPress={() => handleRemoveItem(it.productId)} style={styles.deleteRowBtn}>
                          <Trash2 size={15} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* RIGHT COLUMN: Settings & Live Preview */}
          <View style={[styles.rightColumn, { flex: isDesktop ? 4 : undefined }]}>
            
            {/* Live Preview Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Eye size={18} color={theme.colors.primary} />
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Live Label Preview</Text>
                </View>

                {/* Zoom toggles */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1.0, 1.5, 2.0].map((z) => (
                    <Pressable
                      key={z}
                      onPress={() => setPreviewZoom(z)}
                      style={[
                        styles.zoomBtn,
                        {
                          backgroundColor: previewZoom === z ? theme.colors.primary : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 11, color: previewZoom === z ? '#FFFFFF' : theme.colors.text }}>
                        {z * 100}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.previewStage, { backgroundColor: theme.colors.background }]}>
                <BarcodeSingleLabel
                  item={previewItem}
                  config={config}
                  widthMm={labelWidthMm}
                  heightMm={labelHeightMm}
                  scale={previewZoom}
                />
              </View>

              <Text style={[styles.previewDimensionNote, { color: theme.colors.textSecondary }]}>
                {activePreset.name} • Format: <Text style={{ fontWeight: '700' }}>{config.symbology}</Text>
              </Text>
            </View>

            {/* Customization Settings */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Settings2 size={18} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Label Settings</Text>
              </View>

              {/* Barcode / QR Symbology Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Barcode / QR Format</Text>
                <View style={styles.symbologyRow}>
                  {(['CODE128', 'EAN13', 'CODE39', 'UPC', 'QR'] as BarcodeSymbology[]).map((fmt) => (
                    <Pressable
                      key={fmt}
                      onPress={() => setConfig({ ...config, symbology: fmt })}
                      style={[
                        styles.symbologyBtn,
                        {
                          backgroundColor: config.symbology === fmt ? theme.colors.primary : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      {fmt === 'QR' && <QrCode size={13} color={config.symbology === fmt ? '#FFFFFF' : theme.colors.text} style={{ marginRight: 4 }} />}
                      <Text
                        style={[
                          styles.symbologyBtnText,
                          { color: config.symbology === fmt ? '#FFFFFF' : theme.colors.text },
                        ]}
                      >
                        {fmt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Paper Layout Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Paper Layout / Sheet Preset</Text>
                <select
                  value={config.presetId}
                  onChange={(e) => setConfig({ ...config, presetId: e.target.value as PaperPresetId })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    marginBottom: '6px',
                  }}
                >
                  {Object.values(PAPER_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{activePreset.description}</Text>
              </View>

              {/* Store Name Customization */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Store / Brand Name on Sticker</Text>
                <TextInput
                  value={config.storeName}
                  onChangeText={(val) => setConfig({ ...config, storeName: val })}
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="e.g. SUPER STORE"
                />
              </View>

              {/* Field Visibility Toggles */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Fields to Include on Label</Text>
                <View style={styles.toggleGrid}>
                  {[
                    { key: 'showStoreName', label: 'Store Name' },
                    { key: 'showProductName', label: 'Product Name' },
                    { key: 'showBarcodeValue', label: 'Code String' },
                    { key: 'showPrice', label: 'Selling Price' },
                    { key: 'showMrp', label: 'MRP Strike' },
                    { key: 'showDate', label: 'Date (Mfg/Exp)' },
                  ].map((field) => {
                    const isChecked = Boolean((config as any)[field.key]);
                    return (
                      <Pressable
                        key={field.key}
                        onPress={() => setConfig({ ...config, [field.key]: !isChecked })}
                        style={[
                          styles.toggleItem,
                          {
                            backgroundColor: isChecked ? theme.colors.primary + '15' : theme.colors.background,
                            borderColor: isChecked ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              backgroundColor: isChecked ? theme.colors.primary : 'transparent',
                              borderColor: isChecked ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                        >
                          {isChecked && <Check size={12} color="#FFFFFF" />}
                        </View>
                        <Text style={[styles.toggleText, { color: theme.colors.text }]}>{field.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Custom Dimensions if Custom selected */}
              {config.presetId === 'custom' && (
                <View style={[styles.customBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Text style={[styles.subHeading, { color: theme.colors.text }]}>Custom Dimensions (mm)</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tinyLabel, { color: theme.colors.textSecondary }]}>Width (mm)</Text>
                      <TextInput
                        value={String(config.customWidthMm)}
                        keyboardType="numeric"
                        onChangeText={(txt) => setConfig({ ...config, customWidthMm: Number(txt) || 50 })}
                        style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tinyLabel, { color: theme.colors.textSecondary }]}>Height (mm)</Text>
                      <TextInput
                        value={String(config.customHeightMm)}
                        keyboardType="numeric"
                        onChangeText={(txt) => setConfig({ ...config, customHeightMm: Number(txt) || 25 })}
                        style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tinyLabel, { color: theme.colors.textSecondary }]}>Columns</Text>
                      <TextInput
                        value={String(config.customColumns)}
                        keyboardType="numeric"
                        onChangeText={(txt) => setConfig({ ...config, customColumns: Number(txt) || 1 })}
                        style={[styles.smallInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

          </View>
        </View>
      </ScrollView>

      {/* Print Preview & Print Modal */}
      <BarcodePrintPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        items={items}
        config={config}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnTextSecondary: {
    fontSize: 13,
    fontWeight: '500',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  mainLayout: {
    padding: 24,
  },
  columnsContainer: {
    gap: 20,
  },
  leftColumn: {},
  rightColumn: {},
  card: {
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  productListBox: {
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyProducts: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQueue: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyQueueSub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 320,
  },
  queueTable: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  rowProductName: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  rowText: {
    fontSize: 13,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 40,
    height: 26,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
    outlineStyle: 'none',
  } as any,
  deleteRowBtn: {
    padding: 6,
  },
  previewStage: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 10,
  },
  previewDimensionNote: {
    fontSize: 12,
    textAlign: 'center',
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  symbologyRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  symbologyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  symbologyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '600',
  },
  tinyLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  smallInput: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 13,
    outlineStyle: 'none',
  } as any,
});
