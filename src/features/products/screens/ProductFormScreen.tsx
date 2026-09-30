import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Pressable, Platform, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';

import { Product } from '../types';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { AppSelect } from '../../../shared/components/forms/AppSelect';
import { AppButton } from '../../../shared/components/inputs/AppButton';
import { AppRadio } from '../../../shared/components/forms/AppRadio';
import { AppCheckbox } from '../../../shared/components/forms/AppCheckbox';
import { 
  Info, 
  ChevronDown, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Minus, 
  LayoutGrid, 
  ArrowLeft, 
  Tag, 
  Layers, 
  Check, 
  Calculator,
  RefreshCw
} from 'lucide-react-native';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { productRepository } from '../../../core/repositories/ProductRepository';
import { unitRepository } from '../../../core/repositories/UnitRepository';
import { subUnitRepository } from '../../../core/repositories/SubUnitRepository';

interface Props {
  productId?: string | number | null;
  onNavigate: (screen: ProductScreenType, productId?: string | number) => void;
}

const ORANGE = '#FF9F43';
const BORDER = '#EBEBEB';
const TEXT_MAIN = '#333333';
const TEXT_MUTED = '#888888';
const RED = '#FF4C51';

const Card = ({ title, icon, children }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <ChevronDown size={20} color={TEXT_MUTED} />
    </View>
    <View style={styles.cardBody}>
      {children}
    </View>
  </View>
);

const FormGroup = ({ label, children, actionRight, width }: any) => (
  <View style={[styles.formGroup, width ? { width } : null]}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>
        {label} 
      </Text>
      {actionRight}
    </View>
    {children}
  </View>
);

const EditorField = ({ value, onChangeText }: { value?: string; onChangeText?: (text: string) => void }) => (
  <View style={styles.editorContainer}>
    <View style={styles.editorToolbar}>
      <Text style={styles.toolbarText}>Normal</Text>
      <ChevronDown size={14} color={TEXT_MAIN} style={{marginRight: 16}} />
      <Text style={styles.toolbarIcon}>B</Text>
      <Text style={[styles.toolbarIcon, {fontStyle: 'italic'}]}>I</Text>
      <Text style={[styles.toolbarIcon, {textDecorationLine: 'underline'}]}>U</Text>
      <Text style={styles.toolbarIcon}>🔗</Text>
      <Text style={styles.toolbarIcon}>≣</Text>
      <Text style={styles.toolbarIcon}>≡</Text>
      <Text style={styles.toolbarIcon}>Tx</Text>
    </View>
    <AppInput 
      style={styles.editorInput} 
      multiline={true} 
      containerStyle={{ marginBottom: 0 }} 
      value={value}
      onChangeText={onChangeText}
      placeholder="Type product description..."
    />
  </View>
);

export const ProductFormScreen: React.FC<Props> = ({ productId, onNavigate }) => {
  const { products, addProduct, updateProduct } = useProductStore();

  // Basic Information
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [barcodeSymbology, setBarcodeSymbology] = useState('CODE128');
  const [itemBarcode, setItemBarcode] = useState('');
  const [description, setDescription] = useState('');

  // Dropdown lists
  const [categories, setCategories] = useState<{label: string, value: string}[]>([]);
  const [subCategories, setSubCategories] = useState<{label: string, value: string}[]>([]);
  const [brands, setBrands] = useState<{label: string, value: string}[]>([]);
  const [units, setUnits] = useState<{label: string, value: string}[]>([]);
  const [subUnitsList, setSubUnitsList] = useState<{label: string, value: string; multiplier?: number}[]>([]);
  const [rawSubUnits, setRawSubUnits] = useState<any[]>([]);

  // Selected values
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // PRICING (1. Purchase Price, Wholesale Price, Retail Price)
  const [purchasePrice, setPurchasePrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');

  // UNITS & SUB UNITS (Must be after sales related price!)
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>('');
  const [conversionRate, setConversionRate] = useState<string>('1');
  const [hasMultipleUnits, setHasMultipleUnits] = useState(false);
  const [subUnits, setSubUnits] = useState<{ id: number; unit: string; value: string }[]>([]);

  // Stock & Inventory
  const [productType, setProductType] = useState<'single' | 'variable'>('single');
  const [quantity, setQuantity] = useState('0');
  const [quantityAlert, setQuantityAlert] = useState('5');
  const [taxType, setTaxType] = useState('Exclusive');
  const [tax, setTax] = useState('');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState('');

  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [variants, setVariants] = useState([
    { id: Math.floor(Math.random() * -1000000000), variation: 'color', value: 'red', sku: '1234', qty: 2, price: '50000' }
  ]);

  // Load existing product if editing
  useEffect(() => {
    if (productId) {
      const prod = products.find(p => p.id === Number(productId));
      if (prod) {
        setProductName(prod.name || '');
        setSlug((prod.name || '').toLowerCase().replace(/\s+/g, '-'));
        setSku(prod.sku || '');
        setPurchasePrice(prod.purchasePrice !== undefined ? String(prod.purchasePrice) : (prod.cost !== undefined ? String(prod.cost) : ''));
        setWholesalePrice(prod.wholesalePrice !== undefined ? String(prod.wholesalePrice) : '');
        setRetailPrice(prod.retailPrice !== undefined ? String(prod.retailPrice) : (prod.price !== undefined ? String(prod.price) : ''));
        setSelectedCategory(prod.categoryId ? String(prod.categoryId) : '');
        setSelectedBrand(prod.brandId ? String(prod.brandId) : '');
        setSelectedUnit(prod.unitId ? String(prod.unitId) : '');
        setSelectedSubUnit(prod.subUnitId ? String(prod.subUnitId) : '');
        setConversionRate(prod.conversionRate ? String(prod.conversionRate) : '1');
        setQuantity(prod.stockQuantity !== undefined ? String(prod.stockQuantity) : '0');
        setQuantityAlert(prod.lowStockThreshold !== undefined ? String(prod.lowStockThreshold) : '5');
        setItemBarcode(prod.barcode || '');
        setDescription(prod.description || '');
      }
    }
  }, [productId, products]);

  // Fetch initial dropdown data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [catRes, brandRes, unitRes] = await Promise.allSettled([
          apiClient.get(API_ENDPOINTS.CATEGORIES.BASE),
          apiClient.get(API_ENDPOINTS.BRANDS.BASE),
          apiClient.get(API_ENDPOINTS.UNITS.BASE)
        ]);
        
        const getList = (res: PromiseSettledResult<any>) => {
          if (res.status === 'fulfilled') {
            return res.value.data?.data || res.value.data || [];
          }
          return [];
        };
        
        let cats = getList(catRes).map((c: any) => ({ label: c.name, value: c.id?.toString() }));
        if (cats.length === 0) cats = [{label: 'Electronics', value: '1'}, {label: 'Groceries', value: '2'}];
        
        let brnds = getList(brandRes).map((b: any) => ({ label: b.name, value: b.id?.toString() }));
        if (brnds.length === 0) brnds = [{label: 'Generic', value: '1'}];
        
        let unts = getList(unitRes).map((u: any) => ({ label: u.name || u.shortName, value: u.id?.toString() }));
        if (unts.length === 0) {
          // Check local unitRepository
          try {
            const localUnits = await unitRepository.getAll();
            if (localUnits.length > 0) {
              unts = localUnits.map((u: any) => ({ label: u.name || u.shortName, value: u.id?.toString() }));
            }
          } catch (e) {}
        }
        if (unts.length === 0) {
          unts = [{label: 'Box', value: '1'}, {label: 'Dozen', value: '2'}, {label: 'Kg', value: '3'}, {label: 'Piece', value: '4'}];
        }
        
        setCategories(cats);
        setBrands(brnds);
        setUnits(unts);
      } catch (error) {
        console.error("Error fetching form data:", error);
        setCategories([{label: 'Electronics', value: '1'}, {label: 'Groceries', value: '2'}]);
        setBrands([{label: 'Generic', value: '1'}]);
        setUnits([{label: 'Box', value: '1'}, {label: 'Dozen', value: '2'}, {label: 'Kg', value: '3'}, {label: 'Piece', value: '4'}]);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      return;
    }
    const fetchSub = async () => {
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.SUBCATEGORIES.BASE}?category_id=${selectedCategory}`);
        const list = res.data?.data || res.data || [];
        let subs = list.map((c: any) => ({ label: c.name, value: c.id?.toString() }));
        setSubCategories(subs);
      } catch (error) {
        setSubCategories([]);
      }
    };
    fetchSub();
  }, [selectedCategory]);

  // Fetch sub-units when base unit changes
  useEffect(() => {
    if (!selectedUnit) {
      setSubUnitsList([]);
      setRawSubUnits([]);
      return;
    }
    const fetchSubUnits = async () => {
      let subs: any[] = [];
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.SUBUNITS.BASE}?unit_id=${selectedUnit}`);
        subs = res.data?.data || res.data || [];
      } catch (error) {
        // Fallback to local subUnitRepository
        try {
          const localSubs = await subUnitRepository.getAll();
          subs = localSubs.filter((u: any) => 
            String(u.parentUnitId) === String(selectedUnit) || 
            String(u.backendId) === String(selectedUnit)
          );
          if (subs.length === 0) subs = localSubs;
        } catch (e) {}
      }

      if (subs.length === 0) {
        subs = [
          { id: 1, name: 'Piece', multiplier: 10, parentUnitId: Number(selectedUnit) },
          { id: 2, name: 'Pouch', multiplier: 12, parentUnitId: Number(selectedUnit) },
          { id: 3, name: 'Gram', multiplier: 1000, parentUnitId: Number(selectedUnit) },
        ];
      }

      setRawSubUnits(subs);
      setSubUnitsList(subs.map((u: any) => ({ 
        label: u.name, 
        value: u.id?.toString(),
        multiplier: u.multiplier || 1
      })));
    };
    fetchSubUnits();
  }, [selectedUnit]);

  // Handle SKU Generation
  const handleGenerateSku = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    setSku(`SKU-${randomCode}`);
  };

  // Handle Barcode Generation
  const handleGenerateBarcode = () => {
    const randomCode = Math.floor(100000000000 + Math.random() * 900000000000);
    setItemBarcode(`${randomCode}`);
  };

  // When choosing sub-unit, automatically retrieve multiplier & calculate price
  const handleSelectSubUnit = (val: string) => {
    setSelectedSubUnit(val);
    const sub = rawSubUnits.find(u => String(u.id) === String(val) || String(u.backendId) === String(val));
    if (sub && sub.multiplier && sub.multiplier > 0) {
      setConversionRate(String(sub.multiplier));
    } else if (!conversionRate || conversionRate === '1') {
      setConversionRate('1');
    }
  };

  // Multiple subunits table handlers
  const handleAddSubUnit = () => {
    setSubUnits([
      ...subUnits,
      { id: Math.floor(Math.random() * -1000000000), unit: '', value: '1' }
    ]);
  };

  const handleRemoveSubUnit = (id: number) => {
    setSubUnits(subUnits.filter(u => u.id !== id));
  };

  const handleUpdateSubUnit = (id: number, field: string, val: any) => {
    setSubUnits(subUnits.map(u => {
      if (u.id === id) {
        const updated = { ...u, [field]: val };
        if (field === 'unit') {
          const match = rawSubUnits.find(s => String(s.id) === String(val) || String(s.backendId) === String(val));
          if (match && match.multiplier) {
            updated.value = String(match.multiplier);
          }
        }
        return updated;
      }
      return u;
    }));
  };

  // Variant handlers
  const handleAddVariant = () => {
    setVariants([...variants, { id: Math.floor(Math.random() * -1000000000), variation: '', value: '', sku: '', qty: 1, price: '' }]);
  };

  const handleRemoveVariant = (id: number) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleUpdateVariant = (id: number, field: string, val: any) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: val } : v));
  };

  // Calculations for auto-displaying sub-unit price
  const selectedUnitObj = units.find(u => u.value === selectedUnit);
  const selectedSubUnitObj = rawSubUnits.find(u => String(u.id) === String(selectedSubUnit) || String(u.backendId) === String(selectedSubUnit));
  const baseUnitName = selectedUnitObj?.label || 'Base Unit';
  const subUnitName = selectedSubUnitObj?.name || subUnitsList.find(s => s.value === selectedSubUnit)?.label || 'Sub Unit';

  const rateNumber = parseFloat(conversionRate) > 0 ? parseFloat(conversionRate) : 1;
  const pPriceNum = parseFloat(purchasePrice) || 0;
  const wPriceNum = parseFloat(wholesalePrice) || 0;
  const rPriceNum = parseFloat(retailPrice) || 0;

  // Sub Unit Prices (Auto-calculated)
  const autoSubPurchasePrice = rateNumber > 0 ? (pPriceNum / rateNumber).toFixed(2) : '0.00';
  const autoSubWholesalePrice = rateNumber > 0 ? (wPriceNum / rateNumber).toFixed(2) : '0.00';
  const autoSubRetailPrice = rateNumber > 0 ? (rPriceNum / rateNumber).toFixed(2) : '0.00';

  // Save product
  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      Alert.alert('Validation Error', 'Please enter product name');
      return;
    }
    if (!sku.trim()) {
      Alert.alert('Validation Error', 'Please enter or generate SKU');
      return;
    }
    if (!retailPrice && !purchasePrice) {
      Alert.alert('Validation Error', 'Please enter Retail Price or Purchase Price');
      return;
    }

    setIsSaving(true);
    try {
      const pPrice = parseFloat(purchasePrice) || 0;
      const wPrice = parseFloat(wholesalePrice) || 0;
      const rPrice = parseFloat(retailPrice) || 0;
      const cRate = parseFloat(conversionRate) || 1;

      const productData: Product = {
        id: productId ? Number(productId) : Math.floor(Math.random() * -1000000000),
        name: productName.trim(),
        sku: sku.trim(),
        barcode: itemBarcode.trim() || undefined,
        description: description.trim() || undefined,
        price: rPrice || pPrice,
        cost: pPrice,
        purchasePrice: pPrice,
        wholesalePrice: wPrice,
        retailPrice: rPrice,
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        unitId: selectedUnit || undefined,
        subUnitId: selectedSubUnit || undefined,
        conversionRate: cRate,
        stockQuantity: parseFloat(quantity) || 0,
        lowStockThreshold: parseFloat(quantityAlert) || 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      if (productId) {
        updateProduct(productData);
      } else {
        addProduct(productData);
      }

      // Persist to offline repository
      try {
        if (productId) {
          await productRepository.update(productData as any);
        } else {
          await productRepository.insert(productData as any);
        }
      } catch (repoErr) {
        console.warn('Repository save warning:', repoErr);
      }

      Alert.alert('Success', `Product ${productId ? 'updated' : 'added'} successfully!`);
      onNavigate('list');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('list')}>
          <ArrowLeft size={20} color={TEXT_MAIN} />
          <Text style={styles.backButtonText}>Back to Product List</Text>
        </TouchableOpacity>

        {/* 1. PRODUCT INFORMATION CARD */}
        <Card title="Product Information" icon={<Info size={18} color={ORANGE} />}>
          <View style={styles.grid2}>
            <FormGroup width="50%" label="Product Name *">
              <AppInput 
                placeholder="e.g. Basmati Rice" 
                value={productName}
                onChangeText={(val: string) => {
                  setProductName(val);
                  if (!slug || slug === productName.toLowerCase().replace(/\s+/g, '-')) {
                    setSlug(val.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                containerStyle={{ marginBottom: 0 }} 
              />
            </FormGroup>

            <FormGroup width="50%" label="Slug">
              <AppInput 
                placeholder="e.g. basmati-rice" 
                value={slug}
                onChangeText={setSlug}
                containerStyle={{ marginBottom: 0 }} 
              />
            </FormGroup>

            <FormGroup width="50%" label="SKU *">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppInput 
                    placeholder="e.g. SKU-12345" 
                    value={sku}
                    onChangeText={setSku}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </View>
                <AppButton 
                  title="Generate" 
                  onPress={handleGenerateSku}
                  style={{ borderRadius: 6, height: 40 }} 
                />
              </View>
            </FormGroup>

            <FormGroup 
              width="50%"
              label="Category" 
              actionRight={
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => setCategoryModalVisible(true)}>
                  <Plus size={14} color={ORANGE} />
                  <Text style={{color: ORANGE, fontSize: 13, marginLeft: 4}}>Add New</Text>
                </TouchableOpacity>
              }
            >
              <AppSelect 
                options={categories} 
                placeholder="Select Category" 
                containerStyle={{ marginBottom: 0 }} 
                value={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </FormGroup>

            <FormGroup width="50%" label="Sub Category">
              <AppSelect 
                options={subCategories} 
                placeholder="Select Subcategory" 
                containerStyle={{ marginBottom: 0 }} 
                value={selectedSubCategory}
                onSelect={setSelectedSubCategory}
              />
            </FormGroup>

            <FormGroup width="50%" label="Brand">
              <AppSelect 
                options={brands} 
                placeholder="Select Brand" 
                containerStyle={{ marginBottom: 0 }} 
                value={selectedBrand}
                onSelect={setSelectedBrand}
              />
            </FormGroup>

            <FormGroup width="50%" label="Barcode Symbology">
              <AppSelect 
                options={[
                  {label: 'CODE128', value: 'CODE128'}, 
                  {label: 'EAN13', value: 'EAN13'},
                  {label: 'UPC', value: 'UPC'}
                ]} 
                placeholder="Select" 
                value={barcodeSymbology}
                onSelect={setBarcodeSymbology}
                containerStyle={{ marginBottom: 0 }} 
              />
            </FormGroup>

            <FormGroup width="50%" label="Item Barcode">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppInput 
                    placeholder="Scan or enter barcode" 
                    value={itemBarcode}
                    onChangeText={setItemBarcode}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </View>
                <AppButton 
                  title="Generate" 
                  onPress={handleGenerateBarcode}
                  style={{ borderRadius: 6, height: 40 }} 
                />
              </View>
            </FormGroup>
          </View>

          <FormGroup label="Description">
            <EditorField value={description} onChangeText={setDescription} />
            <Text style={styles.hintText}>Maximum 60 Words</Text>
          </FormGroup>
        </Card>

        {/* 2. PRICING, UNITS & STOCKS CARD */}
        <Card title="Pricing & Stocks" icon={<LayoutGrid size={18} color={ORANGE} />}>
          <FormGroup label="Product Type">
            <View style={styles.radioGroup}>
              <AppRadio label="Single Product" selected={productType === 'single'} onPress={() => setProductType('single')} />
              <AppRadio label="Variable Product" selected={productType === 'variable'} onPress={() => setProductType('variable')} />
            </View>
          </FormGroup>

          {productType === 'single' ? (
            <View>
              {/* SECTION: 1. PURCHASE PRICE, WHOLESALE PRICE, RETAIL PRICE */}
              <View style={styles.sectionHeaderRow}>
                <Tag size={16} color={ORANGE} />
                <Text style={styles.sectionHeaderText}>Price Settings</Text>
              </View>

              <View style={styles.grid3}>
                <FormGroup width="33.33%" label="Purchase Price (₹) *">
                  <AppInput 
                    placeholder="₹ 0.00" 
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Wholesale Price (Sales) (₹) *">
                  <AppInput 
                    placeholder="₹ 0.00" 
                    keyboardType="numeric"
                    value={wholesalePrice}
                    onChangeText={setWholesalePrice}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Retail Price (Sales) (₹) *">
                  <AppInput 
                    placeholder="₹ 0.00" 
                    keyboardType="numeric"
                    value={retailPrice}
                    onChangeText={setRetailPrice}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>
              </View>

              {/* SECTION: 2. UNIT MUST BE AFTER SALES RELATED PRICE */}
              <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                <Layers size={16} color={ORANGE} />
                <Text style={styles.sectionHeaderText}>Units & Sub Units</Text>
              </View>

              <View style={styles.grid3}>
                <FormGroup width="33.33%" label="Base Unit *">
                  <AppSelect 
                    options={units} 
                    placeholder="Select Base Unit" 
                    containerStyle={{ marginBottom: 0 }} 
                    value={selectedUnit}
                    onSelect={setSelectedUnit}
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Sub Unit">
                  <AppSelect 
                    options={subUnitsList} 
                    placeholder={selectedUnit ? "Select Sub Unit" : "Select Base Unit First"} 
                    containerStyle={{ marginBottom: 0 }} 
                    value={selectedSubUnit}
                    onSelect={handleSelectSubUnit}
                  />
                </FormGroup>

                <FormGroup width="33.33%" label={`Conversion (1 ${baseUnitName} = ? ${subUnitName})`}>
                  <AppInput 
                    placeholder="e.g. 10" 
                    keyboardType="numeric"
                    value={conversionRate}
                    onChangeText={setConversionRate}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>
              </View>

              {/* 3. WHEN CHOOSE SUB UNIT THEN AUTOMATICALLY SHOW PRICE */}
              {selectedSubUnit ? (
                <View style={styles.subUnitPriceCard}>
                  <View style={styles.subUnitPriceHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calculator size={16} color="#0D9488" />
                      <Text style={styles.subUnitPriceTitle}>
                        Automatically Calculated Sub Unit Prices ({subUnitName})
                      </Text>
                    </View>
                    <View style={styles.conversionBadge}>
                      <Text style={styles.conversionBadgeText}>
                        1 {baseUnitName} = {rateNumber} {subUnitName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subUnitPriceGrid}>
                    <View style={styles.priceStatBox}>
                      <Text style={styles.priceStatLabel}>Sub Unit Purchase Price</Text>
                      <Text style={styles.priceStatValue}>₹{autoSubPurchasePrice}</Text>
                      <Text style={styles.priceStatFormula}>(₹{purchasePrice || '0'} / {rateNumber})</Text>
                    </View>

                    <View style={[styles.priceStatBox, styles.priceStatBoxWholesale]}>
                      <Text style={styles.priceStatLabel}>Sub Unit Wholesale Price</Text>
                      <Text style={[styles.priceStatValue, { color: '#0369A1' }]}>₹{autoSubWholesalePrice}</Text>
                      <Text style={styles.priceStatFormula}>(₹{wholesalePrice || '0'} / {rateNumber})</Text>
                    </View>

                    <View style={[styles.priceStatBox, styles.priceStatBoxRetail]}>
                      <Text style={styles.priceStatLabel}>Sub Unit Retail Price</Text>
                      <Text style={[styles.priceStatValue, { color: '#15803D' }]}>₹{autoSubRetailPrice}</Text>
                      <Text style={styles.priceStatFormula}>(₹{retailPrice || '0'} / {rateNumber})</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Multiple Sub Units Option */}
              <View style={{ paddingHorizontal: 10, marginTop: 4, marginBottom: 16 }}>
                <AppCheckbox 
                  label="Enable multiple sub units table" 
                  checked={hasMultipleUnits} 
                  onPress={() => setHasMultipleUnits(!hasMultipleUnits)} 
                />
              </View>

              {hasMultipleUnits && (
                <View style={{ width: '100%', paddingHorizontal: 10, marginBottom: 20 }}>
                  <View style={styles.variantTable}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1.8 }]}>Sub Unit</Text>
                      <Text style={[styles.tableCell, { flex: 1.4 }]}>Equal To ({baseUnitName})</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>Purchase Price</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>Wholesale Price</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>Retail Price</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}></Text>
                    </View>
                    
                    {subUnits.map((item) => {
                      const itemRate = parseFloat(item.value) > 0 ? parseFloat(item.value) : 1;
                      const itemSubPurchase = (pPriceNum / itemRate).toFixed(2);
                      const itemSubWholesale = (wPriceNum / itemRate).toFixed(2);
                      const itemSubRetail = (rPriceNum / itemRate).toFixed(2);

                      return (
                        <View style={styles.tableRow} key={item.id}>
                          <View style={[styles.tableCell, { flex: 1.8 }]}>
                            <AppSelect 
                              options={subUnitsList} 
                              placeholder="Select" 
                              containerStyle={{ marginBottom: 0 }} 
                              value={item.unit}
                              onSelect={(val: string) => handleUpdateSubUnit(item.id, 'unit', val)}
                            />
                          </View>
                          <View style={[styles.tableCell, { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                            <Text style={{ color: '#888888' }}>=</Text>
                            <View style={{ flex: 1 }}>
                              <AppInput 
                                containerStyle={{ marginBottom: 0 }} 
                                placeholder="e.g. 10" 
                                keyboardType="numeric"
                                value={item.value} 
                                onChangeText={(val: string) => handleUpdateSubUnit(item.id, 'value', val)} 
                              />
                            </View>
                          </View>
                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT_MAIN }}>₹{itemSubPurchase}</Text>
                          </View>
                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0369A1' }}>₹{itemSubWholesale}</Text>
                          </View>
                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#15803D' }}>₹{itemSubRetail}</Text>
                          </View>
                          <View style={[styles.tableCell, { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                            <TouchableOpacity style={styles.iconBoxOutline} onPress={handleAddSubUnit}>
                              <Plus size={14} color="#333333" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBoxOutline} onPress={() => handleRemoveSubUnit(item.id)}>
                              <Trash2 size={14} color="#333333" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {subUnits.length === 0 && (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 8 }}>No extra sub units added yet.</Text>
                        <AppButton title="+ Add Sub Unit Row" onPress={handleAddSubUnit} variant="outline" style={{ height: 36 }} />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* INVENTORY & TAXES */}
              <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                <Layers size={16} color={ORANGE} />
                <Text style={styles.sectionHeaderText}>Stock & Taxes</Text>
              </View>

              <View style={styles.grid3}>
                <FormGroup width="33.33%" label="Quantity / Opening Stock">
                  <AppInput 
                    placeholder="0" 
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Quantity Alert">
                  <AppInput 
                    placeholder="5" 
                    keyboardType="numeric"
                    value={quantityAlert}
                    onChangeText={setQuantityAlert}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Tax Type">
                  <AppSelect 
                    options={[
                      {label: 'Exclusive', value: 'Exclusive'}, 
                      {label: 'Inclusive', value: 'Inclusive'}
                    ]} 
                    placeholder="Select" 
                    value={taxType}
                    onSelect={setTaxType}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>
                
                <FormGroup width="33.33%" label="Tax (%)">
                  <AppInput 
                    placeholder="e.g. 18" 
                    keyboardType="numeric"
                    value={tax}
                    onChangeText={setTax}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Discount Type">
                  <AppSelect 
                    options={[
                      {label: 'Percentage', value: 'Percentage'}, 
                      {label: 'Fixed Amount', value: 'Fixed'}
                    ]} 
                    placeholder="Select" 
                    value={discountType}
                    onSelect={setDiscountType}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width="33.33%" label="Discount Value">
                  <AppInput 
                    placeholder="0" 
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>
              </View>
            </View>
          ) : (
            <View>
              <FormGroup label="Variant Attribute">
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={{flex: 1}}>
                    <AppSelect options={[{label: 'Color', value: 'color'}, {label: 'Size', value: 'size'}]} placeholder="Choose" containerStyle={{ marginBottom: 0 }} />
                  </View>
                  <TouchableOpacity style={styles.addVariantBtn} onPress={handleAddVariant}>
                    <Plus size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </FormGroup>

              {/* Variant Table */}
              <View style={styles.variantTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Variation</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Variant Value</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>SKU</Text>
                  <Text style={[styles.tableCell, {flex: 1.2}]}>Quantity</Text>
                  <Text style={[styles.tableCell, {flex: 1.5}]}>Price</Text>
                  <Text style={[styles.tableCell, {flex: 0.8}]}></Text>
                </View>
                
                {variants.map((item) => (
                  <View style={styles.tableRow} key={item.id}>
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.variation} onChangeText={(val: string) => handleUpdateVariant(item.id, 'variation', val)} /></View>
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.value} onChangeText={(val: string) => handleUpdateVariant(item.id, 'value', val)} /></View>
                    <View style={[styles.tableCell, {flex: 1}]}><AppInput containerStyle={{marginBottom: 0}} value={item.sku} onChangeText={(val: string) => handleUpdateVariant(item.id, 'sku', val)} /></View>
                    
                    <View style={[styles.tableCell, {flex: 1.2}]}>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity onPress={() => handleUpdateVariant(item.id, 'qty', Math.max(0, item.qty - 1))}>
                          <Minus size={14} color={TEXT_MAIN} />
                        </TouchableOpacity>
                        <Text style={{marginHorizontal: 8}}>{item.qty}</Text>
                        <TouchableOpacity onPress={() => handleUpdateVariant(item.id, 'qty', item.qty + 1)}>
                          <Plus size={14} color={TEXT_MAIN} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={[styles.tableCell, {flex: 1.5}]}><AppInput containerStyle={{marginBottom: 0}} value={item.price} onChangeText={(val: string) => handleUpdateVariant(item.id, 'price', val)} /></View>
                    
                    <View style={[styles.tableCell, {flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8}]}>
                      <TouchableOpacity style={styles.iconBoxOutline} onPress={handleAddVariant}><Plus size={14} color={TEXT_MAIN} /></TouchableOpacity>
                      <TouchableOpacity style={styles.iconBoxOutline} onPress={() => handleRemoveVariant(item.id)}><Trash2 size={14} color={TEXT_MAIN} /></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* 3. IMAGES CARD */}
        <Card title="Images" icon={<ImageIcon size={18} color={ORANGE} />}>
          <View style={styles.imageGallery}>
            <TouchableOpacity style={styles.addImagesBox}>
              <Plus size={20} color={TEXT_MUTED} />
              <Text style={styles.addImagesText}>Add Images</Text>
            </TouchableOpacity>

            {[1, 2].map((_, i) => (
              <View key={i} style={styles.imageThumbnail}>
                <View style={styles.imagePlaceholder}>
                  <View style={[styles.phoneMockup, { backgroundColor: '#E3001B' }]} />
                </View>
                <TouchableOpacity style={styles.removeImageBtn}>
                  <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Card>

        {/* SUBMIT / ACTIONS ROW */}
        <View style={styles.submitRow}>
          <AppButton 
            title={isSaving ? "Saving..." : (productId ? "Update Product" : "Save Product")} 
            onPress={handleSaveProduct} 
            isLoading={isSaving}
            style={styles.saveBtn}
          />
          <AppButton 
            title="Cancel" 
            variant="outline" 
            onPress={() => onNavigate('list')} 
            style={styles.cancelBtn}
          />
        </View>

        <View style={{height: 60}} />
        <AddCategoryModal 
          visible={isCategoryModalVisible} 
          onClose={() => setCategoryModalVisible(false)} 
          onSubmit={(name) => {
            setCategories([...categories, { label: name, value: Date.now().toString() }]);
            setCategoryModalVisible(false);
          }} 
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: TEXT_MAIN,
    fontWeight: '500',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    marginHorizontal: 'auto',
    width: '100%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  cardBody: {
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  formGroup: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: TEXT_MAIN,
    fontWeight: '400',
  },
  hintText: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 8,
  },
  editorContainer: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  editorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  toolbarText: {
    fontSize: 14,
    marginRight: 4,
  },
  toolbarIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
    color: '#555',
  },
  editorInput: {
    height: 100,
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 14,
    backgroundColor: 'white',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  addVariantBtn: {
    backgroundColor: '#1E293B',
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  variantTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    paddingRight: 8,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  iconBoxOutline: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  // SUB UNIT PRICE CARD
  subUnitPriceCard: {
    marginHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 16,
  },
  subUnitPriceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  subUnitPriceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  conversionBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#5EEAD4',
  },
  conversionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  subUnitPriceGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  priceStatBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
  },
  priceStatBoxWholesale: {
    borderColor: '#BAE6FD',
  },
  priceStatBoxRetail: {
    borderColor: '#BBF7D0',
  },
  priceStatLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
    fontWeight: '500',
  },
  priceStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  priceStatFormula: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  // IMAGES
  imageGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  addImagesBox: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  addImagesText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 8,
    position: 'relative',
    backgroundColor: 'white',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 4,
  },
  phoneMockup: {
    width: 40,
    height: 70,
    borderRadius: 6,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  submitRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingHorizontal: 0,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 6,
    paddingHorizontal: 24,
    height: 44,
  },
  cancelBtn: {
    borderRadius: 6,
    paddingHorizontal: 20,
    height: 44,
  }
});
