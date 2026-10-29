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
  Layers,
  Box,
  Check,
  ChevronDown,
  Tag,
  Grid,
} from 'lucide-react-native';

interface PrintBarcodeScreenProps {
  onNavigateTab?: (tab: string) => void;
}

export const PrintBarcodeScreen: React.FC<PrintBarcodeScreenProps> = ({ onNavigateTab }) => {
  const theme = useTheme();
  const { isDesktop } = useResponsive();
  const { products, categories, brands, fetchProducts } = useProductStore();

  // Print Queue
  const [items, setItems] = useState<BarcodePrintItem[]>([]);
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Label Configuration
  const [config, setConfig] = useState<BarcodeLabelConfig>(DEFAULT_LABEL_CONFIG);

  // Preview Modal
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.5);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered products for dropdown search
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' ||
        String(p.categoryId) === selectedCategory ||
        (p.category && String(p.category.id) === selectedCategory);

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

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
          mrp: product.mrp || product.price || 0,
          categoryName: product.categoryName || product.category?.name,
          brandName: product.brandName || product.brand?.name,
          quantity: qty,
        },
      ];
    });
    setSearchQuery('');
    setSearchDropdownOpen(false);
  };

  // Add all filtered products
  const handleAddAllFiltered = () => {
    filteredProducts.forEach((p) => handleAddProduct(p, 1));
  };

  // Modify quantity
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
        name: 'Organic Basmati Rice (1kg)',
        sku: 'RICE-001',
        barcode: '8901030382014',
        price: 149.0,
        mrp: 180.0,
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
            <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Print Barcode Labels</Text>
            <Text style={[styles.pageSubtitle, { color: theme.colors.textSecondary }]}>
              Generate & customize scannable product stickers for retail shelves & packaging
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
          
          {/* LEFT COLUMN: Product Selection & Queue */}
          <View style={[styles.leftColumn, { flex: isDesktop ? 6 : undefined }]}>
            
            {/* Search Box */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>1. Add Products to Print</Text>

              <View style={styles.searchRow}>
                <View style={[styles.searchInputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                  <Search size={18} color={theme.colors.textSecondary} />
                  <TextInput
                    placeholder="Search product by name, SKU or barcode..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={(txt) => {
                      setSearchQuery(txt);
                      setSearchDropdownOpen(true);
                    }}
                    onFocus={() => setSearchDropdownOpen(true)}
                    style={[styles.searchInput, { color: theme.colors.text }]}
                  />
                  {searchQuery ? (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <Trash2 size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>

                {/* Category filter */}
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
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <Pressable
                  onPress={handleAddAllFiltered}
                  disabled={filteredProducts.length === 0}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Plus size={15} color={theme.colors.primary} />
                  <Text style={[styles.btnTextSecondary, { color: theme.colors.primary, fontWeight: '600' }]}>
                    Add Filtered ({filteredProducts.length})
                  </Text>
                </Pressable>
              </View>

              {/* Autocomplete Dropdown List */}
              {searchDropdownOpen && searchQuery.trim() !== '' && (
                <View style={[styles.dropdownList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {filteredProducts.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <Text style={{ color: theme.colors.textSecondary }}>No matching products found</Text>
                    </View>
                  ) : (
                    filteredProducts.slice(0, 8).map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => handleAddProduct(p, 1)}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          {
                            borderBottomColor: theme.colors.border,
                            backgroundColor: pressed ? theme.colors.primary + '15' : 'transparent',
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dropdownItemName, { color: theme.colors.text }]}>{p.name}</Text>
                          <Text style={[styles.dropdownItemSub, { color: theme.colors.textSecondary }]}>
                            SKU: {p.sku || 'N/A'} • Barcode: {p.barcode || 'N/A'} • Price: {config.currency}{p.price}
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
                          <Plus size={14} color={theme.colors.primary} />
                          <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>Add</Text>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Queue Table */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Selected Products for Print</Text>
                  <Text style={[styles.cardSubTitle, { color: theme.colors.textSecondary }]}>
                    {items.length} products • {totalLabels} total labels
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
                      <Text style={{ color: '#DC2626', fontSize: 12 }}>Clear All</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyQueue}>
                  <Box size={40} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyQueueTitle, { color: theme.colors.text }]}>No products in print list</Text>
                  <Text style={[styles.emptyQueueSub, { color: theme.colors.textSecondary }]}>
                    Use the search bar above to select products, or click "Add Filtered" to bulk add.
                  </Text>
                </View>
              ) : (
                <View style={styles.queueTable}>
                  {/* Table header */}
                  <View style={[styles.tableHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.thCell, { flex: 4, color: theme.colors.textSecondary }]}>PRODUCT</Text>
                    <Text style={[styles.thCell, { flex: 2, color: theme.colors.textSecondary }]}>SKU / BARCODE</Text>
                    <Text style={[styles.thCell, { flex: 2, color: theme.colors.textSecondary }]}>PRICE / MRP</Text>
                    <Text style={[styles.thCell, { flex: 3, textAlign: 'center', color: theme.colors.textSecondary }]}>PRINT QUANTITY</Text>
                    <Text style={[styles.thCell, { width: 50, textAlign: 'center', color: theme.colors.textSecondary }]}>ACTION</Text>
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
                        <Text style={[styles.rowText, { color: theme.colors.text, fontFamily: 'monospace' }]}>
                          {it.barcode || it.sku}
                        </Text>
                      </View>

                      <View style={{ flex: 2 }}>
                        <Text style={[styles.rowText, { color: theme.colors.text, fontWeight: '700' }]}>
                          {config.currency}{Number(it.price).toFixed(2)}
                        </Text>
                        {it.mrp ? (
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
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <Pressable onPress={() => handleRemoveItem(it.productId)} style={styles.deleteRowBtn}>
                          <Trash2 size={16} color="#EF4444" />
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
                Size: {labelWidthMm}mm × {labelHeightMm}mm • {activePreset.columns} column(s) • Format: {config.symbology}
              </Text>
            </View>

            {/* Customization Settings */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Settings2 size={18} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Label Settings</Text>
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
                    marginBottom: '8px',
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

              {/* Symbology / Format */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Barcode Symbology</Text>
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

              {/* Store Name Customization */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Store / Business Name on Label</Text>
                <TextInput
                  value={config.storeName}
                  onChangeText={(val) => setConfig({ ...config, storeName: val })}
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="e.g. SUPER MART"
                />
              </View>

              {/* Field Visibility Toggles */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text, marginBottom: 8 }]}>Label Fields to Include</Text>
                <View style={styles.toggleGrid}>
                  {[
                    { key: 'showStoreName', label: 'Store Name' },
                    { key: 'showProductName', label: 'Product Name' },
                    { key: 'showBarcodeValue', label: 'Barcode Number' },
                    { key: 'showPrice', label: 'Selling Price' },
                    { key: 'showMrp', label: 'MRP (Strikethrough)' },
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
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  dropdownList: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'scroll' as any,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyQueue: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyQueueSub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 340,
  },
  queueTable: {
    marginTop: 8,
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
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 44,
    height: 28,
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
