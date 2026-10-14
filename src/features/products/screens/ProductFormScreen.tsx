import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Pressable, Platform, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/theme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useProductStore } from '../store/productStore';
import { ProductScreenType } from '../ProductsModule';

import { Product } from '../types';
import { AppInput } from '../../../shared/components/forms/AppInput';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { AddBrandModal } from '../components/AddBrandModal';
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
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import { subCategoryRepository } from '../../../core/repositories/SubCategoryRepository';
import { unitRepository } from '../../../core/repositories/UnitRepository';
import { subUnitRepository } from '../../../core/repositories/SubUnitRepository';
import { useSubCategoryStore } from '../../sub_category/store/subCategoryStore';
import { useBrandStore } from '../../brands/store/brandStore';

interface Props {
  productId?: string | number | null;
  onNavigate: (screen: ProductScreenType, productId?: string | number) => void;
}

const ORANGE = '#FF9F43';
const BORDER = '#EBEBEB';
const TEXT_MAIN = '#333333';
const TEXT_MUTED = '#888888';
const RED = '#FF4C51';

const Card = ({ title, icon, children }: any) => {
  const { isMobile } = useResponsive();
  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, isMobile && styles.cardHeaderMobile]}>
        <View style={styles.cardTitleRow}>
          {icon}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <ChevronDown size={20} color={TEXT_MUTED} />
      </View>
      <View style={[styles.cardBody, isMobile && styles.cardBodyMobile]}>
        {children}
      </View>
    </View>
  );
};

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
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.editorToolbar}
    >
      <Text style={styles.toolbarText}>Normal</Text>
      <ChevronDown size={14} color={TEXT_MAIN} style={{marginRight: 16}} />
      <Text style={styles.toolbarIcon}>B</Text>
      <Text style={[styles.toolbarIcon, {fontStyle: 'italic'}]}>I</Text>
      <Text style={[styles.toolbarIcon, {textDecorationLine: 'underline'}]}>U</Text>
      <Text style={styles.toolbarIcon}>🔗</Text>
      <Text style={styles.toolbarIcon}>≣</Text>
      <Text style={styles.toolbarIcon}>≡</Text>
      <Text style={styles.toolbarIcon}>Tx</Text>
    </ScrollView>
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

const dedupeOptions = <T extends { label: string; value: string }>(list: T[]): T[] => {
  const seen = new Set<string>();
  return list.filter(item => {
    if (!item || item.value === undefined || item.value === null) return false;
    const str = String(item.value);
    if (seen.has(str)) return false;
    seen.add(str);
    return true;
  });
};

export const ProductFormScreen: React.FC<Props> = ({ productId, onNavigate }) => {
  const { isMobile, isTablet } = useResponsive();
  const col2 = isMobile ? '100%' : '50%';
  const col3 = isMobile ? '100%' : (isTablet ? '50%' : '33.33%');
  const { products, addProduct, updateProduct, fetchProducts } = useProductStore();

  // Basic Information
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [barcodeSymbology, setBarcodeSymbology] = useState('CODE128');
  const [itemBarcode, setItemBarcode] = useState('');
  const [description, setDescription] = useState('');

  // Dropdown lists - initialized with store memory for instant rendering without flash
  const [categories, setCategories] = useState<{label: string, value: string}[]>(() => {
    const storeCats = useProductStore.getState().categories || [];
    if (storeCats.length > 0) {
      return dedupeOptions(storeCats.filter((c: any) => c && c.name).map((c: any) => ({
        label: c.name,
        value: String(c.id ?? (c as any).backendId)
      })));
    }
    return [{ label: 'Electronics', value: '1' }, { label: 'Groceries', value: '2' }];
  });
  const [subCategories, setSubCategories] = useState<{label: string, value: string}[]>([]);
  const [brands, setBrands] = useState<{label: string, value: string}[]>(() => {
    const storeBrands = useProductStore.getState().brands || useBrandStore.getState().brands || [];
    if (storeBrands.length > 0) {
      return dedupeOptions(storeBrands.filter((b: any) => b && (b.name || (b as any).brandName || (b as any).title)).map((b: any) => ({
        label: b.name || (b as any).brandName || (b as any).title,
        value: String(b.id ?? (b as any).backendId)
      })));
    }
    return [];
  });
  const [units, setUnits] = useState<{label: string, value: string}[]>(() => {
    const storeUnits = useProductStore.getState().units || [];
    if (storeUnits.length > 0) {
      return dedupeOptions(storeUnits.filter((u: any) => u && (u.name || (u as any).shortName)).map((u: any) => ({
        label: u.name || (u as any).shortName,
        value: String(u.id ?? (u as any).backendId)
      })));
    }
    return [{ label: 'Box', value: '1' }, { label: 'Dozen', value: '2' }, { label: 'Kg', value: '3' }, { label: 'Piece', value: '4' }];
  });
  const [subUnitsList, setSubUnitsList] = useState<{label: string, value: string; multiplier?: number}[]>([]);
  const [rawSubUnits, setRawSubUnits] = useState<any[]>([]);

  // Selected values
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  const categoriesRef = React.useRef(categories);
  categoriesRef.current = categories;

  const selectedSubCategoryRef = React.useRef(selectedSubCategory);
  selectedSubCategoryRef.current = selectedSubCategory;

  const selectedSubUnitRef = React.useRef<string>('');

  // PRICING (1. Purchase Price, Wholesale Price, Retail Price)
  const [purchasePrice, setPurchasePrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');

  // UNITS & SUB UNITS (Must be after sales related price!)
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedSubUnit, setSelectedSubUnit] = useState<string>('');
  selectedSubUnitRef.current = selectedSubUnit;

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
  const [isBrandModalVisible, setBrandModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [variants, setVariants] = useState([
    { id: Math.floor(Math.random() * -1000000000), variation: 'color', value: 'red', sku: '1234', qty: 2, price: '50000' }
  ]);

  const hasPopulatedRef = React.useRef<string | number | null>(null);

  // Load existing product if editing
  useEffect(() => {
    if (!productId) {
      hasPopulatedRef.current = null;
      return;
    }
    if (hasPopulatedRef.current === productId) return;

    const populateForm = (prod: any) => {
      setProductName(prod.name || '');
      setSlug((prod.name || '').toLowerCase().replace(/\s+/g, '-'));
      setSku(prod.sku || prod.productCode || '');
      setPurchasePrice(
        prod.purchasePrice !== undefined && prod.purchasePrice !== null ? String(prod.purchasePrice) :
        (prod.cost !== undefined && prod.cost !== null ? String(prod.cost) : '')
      );
      setWholesalePrice(
        prod.wholesalePrice !== undefined && prod.wholesalePrice !== null ? String(prod.wholesalePrice) : ''
      );
      setRetailPrice(
        prod.retailPrice !== undefined && prod.retailPrice !== null ? String(prod.retailPrice) :
        (prod.price !== undefined && prod.price !== null ? String(prod.price) : '')
      );
      setSelectedCategory(prod.categoryId ? String(prod.categoryId) : '');
      setSelectedSubCategory(
        prod.subCategoryId ? String(prod.subCategoryId) : 
        (prod.sub_category_id ? String(prod.sub_category_id) : '')
      );
      const brandVal = prod.brandId ? String(prod.brandId) : (prod.brand_id ? String(prod.brand_id) : (prod.brand?.id ? String(prod.brand?.id) : ''));
      setSelectedBrand(brandVal);
      const bName = prod.brandName || prod.brand?.name;
      if (brandVal && bName) {
        setBrands(prev => {
          if (!prev.some(b => String(b.value) === String(brandVal))) {
            return dedupeOptions([{ label: bName, value: String(brandVal) }, ...prev]);
          }
          return prev;
        });
      }
      
      const unitVal = prod.unitId || prod.baseUnitId || prod.unit_id || prod.base_unit_id;
      setSelectedUnit(unitVal ? String(unitVal) : '');
      
      const subUnitVal = prod.subUnitId || prod.subunitId || prod.sub_unit_id;
      setSelectedSubUnit(subUnitVal ? String(subUnitVal) : '');
      
      setConversionRate(prod.conversionRate ? String(prod.conversionRate) : '1');
      setQuantity(
        prod.stockQuantity !== undefined && prod.stockQuantity !== null ? String(prod.stockQuantity) :
        (prod.openingStock !== undefined && prod.openingStock !== null ? String(prod.openingStock) : '0')
      );
      setQuantityAlert(
        prod.lowStockThreshold !== undefined && prod.lowStockThreshold !== null ? String(prod.lowStockThreshold) :
        (prod.lowStockLevel !== undefined && prod.lowStockLevel !== null ? String(prod.lowStockLevel) : '5')
      );
      setItemBarcode(prod.barcode || prod.itemBarcode || '');
      setDescription(prod.description || '');

      if (prod.taxType) {
        setTaxType(prod.taxType === 'GST' || prod.taxType === 'Inclusive' ? 'Inclusive' : 'Exclusive');
      } else if (prod.isPriceInclusive !== undefined) {
        setTaxType(prod.isPriceInclusive ? 'Inclusive' : 'Exclusive');
      }
      if (prod.gst !== undefined && prod.gst !== null) {
        setTax(String(prod.gst));
      } else if (prod.tax !== undefined && prod.tax !== null) {
        setTax(String(prod.tax));
      }
      hasPopulatedRef.current = productId;
    };

    const found = products.find(p => String(p.id) === String(productId) || (p as any)._id === productId);
    if (found) {
      populateForm(found);
    } else {
      const fetchById = async () => {
        try {
          const res = await apiClient.get(API_ENDPOINTS.PRODUCTS.BY_ID(productId));
          const prodData = res.data?.data || res.data;
          if (prodData) {
            populateForm(prodData);
            return;
          }
        } catch (e) {}

        try {
          const localProd = await productRepository.getById(Number(productId));
          if (localProd) {
            populateForm(localProd);
          }
        } catch (e) {}
      };
      fetchById();
    }
  }, [productId, products]);

  // Fetch initial dropdown data
  useEffect(() => {
    let isMounted = true;

    const extractList = (raw: any): any[] => {
      if (Array.isArray(raw)) return raw;
      if (!raw || typeof raw !== 'object') return [];
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.results)) return raw.results;
      if (Array.isArray(raw.brands)) return raw.brands;
      if (Array.isArray(raw.categories)) return raw.categories;
      if (Array.isArray(raw.units)) return raw.units;
      for (const v of Object.values(raw)) {
        if (Array.isArray(v)) return v;
      }
      return [];
    };

    const loadDropdownData = async () => {
      // 1. Instant local read from SQLite repositories (Fast offline-first load)
      try {
        const [localCats, localBrands, localUnits] = await Promise.all([
          categoryRepository.getAll().catch(() => []),
          brandRepository.getAll().catch(() => []),
          unitRepository.getAll().catch(() => []),
        ]);

        if (isMounted) {
          if (localCats && localCats.length > 0) {
            setCategories(dedupeOptions(localCats.filter((c: any) => c && c.name).map((c: any) => ({
              label: c.name,
              value: String(c.id ?? c.backendId)
            }))));
          }
          if (localBrands && localBrands.length > 0) {
            setBrands(dedupeOptions(localBrands.filter((b: any) => b && b.name).map((b: any) => ({
              label: b.name,
              value: String(b.id ?? b.backendId)
            }))));
          }
          if (localUnits && localUnits.length > 0) {
            setUnits(dedupeOptions(localUnits.filter((u: any) => u && (u.name || u.shortName)).map((u: any) => ({
              label: u.name || u.shortName,
              value: String(u.id ?? u.backendId)
            }))));
          }
        }
      } catch (localErr) {
        console.warn('Error loading local dropdown data:', localErr);
      }

      // 2. Non-blocking background network fetch & sync
      try {
        const [catRes, brandRes, unitRes] = await Promise.allSettled([
          apiClient.get(API_ENDPOINTS.CATEGORIES.BASE),
          apiClient.get(API_ENDPOINTS.BRANDS.BASE),
          apiClient.get(API_ENDPOINTS.UNITS.BASE)
        ]);

        if (!isMounted) return;

        // Categories
        const catItems = catRes.status === 'fulfilled' ? extractList(catRes.value.data) : [];
        if (catItems.length > 0) {
          const apiCats = catItems
            .filter((c: any) => c && c.name)
            .map((c: any) => ({ label: c.name, value: String(c.id ?? c.backendId) }));
          if (apiCats.length > 0) {
            setCategories(prev => dedupeOptions([...prev, ...apiCats]));
          }
        }

        // Brands
        const brandItems = brandRes.status === 'fulfilled' ? extractList(brandRes.value.data) : [];
        if (brandItems.length > 0) {
          const apiBrands = brandItems
            .filter((b: any) => b && (b.name || b.brandName || b.title))
            .map((b: any) => ({ label: b.name || b.brandName || b.title, value: String(b.id ?? b.backendId) }));
          if (apiBrands.length > 0) {
            setBrands(prev => dedupeOptions([...prev, ...apiBrands]));
          }
        }

        // Units
        const unitItems = unitRes.status === 'fulfilled' ? extractList(unitRes.value.data) : [];
        if (unitItems.length > 0) {
          const apiUnits = unitItems
            .filter((u: any) => u && (u.name || u.shortName))
            .map((u: any) => ({ label: u.name || u.shortName, value: String(u.id ?? u.backendId) }));
          if (apiUnits.length > 0) {
            setUnits(prev => dedupeOptions([...prev, ...apiUnits]));
          }
        }
      } catch (error) {
        // Silently catch background network errors
      }
    };

    loadDropdownData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle category change
  const handleSelectCategory = (val: string) => {
    setSelectedCategory(val);
    setSelectedSubCategory('');
  };

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      return;
    }

    let isCurrent = true;

    const fetchSub = async () => {
      let allSubs: any[] = [];

      // 1. Fast local read: Zustand SubCategory store first
      try {
        const storeSubs = useSubCategoryStore.getState().subCategories;
        if (Array.isArray(storeSubs) && storeSubs.length > 0) {
          allSubs = storeSubs;
        }
      } catch (e) {}

      // 2. Fallback to local SQLite SubCategory repository
      if (allSubs.length === 0) {
        try {
          const localSubs = await subCategoryRepository.getAll();
          if (Array.isArray(localSubs) && localSubs.length > 0) {
            allSubs = localSubs;
          }
        } catch (e) {}
      }

      // Determine selected category label for name-based matching
      const currentCat = categoriesRef.current.find(c => String(c.value) === String(selectedCategory));
      const currentCatName = (currentCat?.label || '').trim().toLowerCase();

      const filterSubCats = (subsList: any[]) => {
        let matched = subsList.filter((item: any) => {
          const itemCatId = item.categoryId ?? item.category_id ?? item.parentId ?? item.parent_id ?? 
            (typeof item.category === 'object' && item.category !== null ? (item.category.id ?? item.category._id) : undefined);

          if (itemCatId !== undefined && itemCatId !== null && String(itemCatId).trim() !== '') {
            if (String(itemCatId).trim() === String(selectedCategory).trim()) {
              return true;
            }
          }

          if (currentCatName) {
            const itemCatName = (
              typeof item.category === 'string' ? item.category :
              (typeof item.category === 'object' && item.category?.name ? item.category.name :
              item.categoryName || item.category_name || '')
            ).trim().toLowerCase();

            if (itemCatName && (itemCatName === currentCatName || currentCatName.includes(itemCatName) || itemCatName.includes(currentCatName))) {
              return true;
            }
          }

          return false;
        });

        // Targeted fallback if category has no subcategories in database
        if (matched.length === 0) {
          if (String(selectedCategory) === '1' || currentCatName.includes('elect')) {
            matched = [
              { id: '101', name: 'Wearables' },
              { id: '102', name: 'Speakers' },
              { id: '103', name: 'Smart Watches' }
            ];
          } else if (String(selectedCategory) === '2' || currentCatName.includes('groc')) {
            matched = [
              { id: '201', name: 'Fresh Fruits' },
              { id: '202', name: 'Vegetables' },
              { id: '203', name: 'Dairy & Eggs' }
            ];
          } else if (currentCatName.includes('comp')) {
            matched = [
              { id: '301', name: 'Laptops' },
              { id: '302', name: 'Desktop' }
            ];
          } else if (currentCatName.includes('shoe')) {
            matched = [
              { id: '401', name: 'Sneakers' },
              { id: '402', name: 'Formals' }
            ];
          } else if (currentCatName.includes('bag')) {
            matched = [
              { id: '501', name: 'Handbags' },
              { id: '502', name: 'Travel' }
            ];
          } else if (currentCatName.includes('furn')) {
            matched = [
              { id: '601', name: 'Sofa' },
              { id: '602', name: 'Chair' }
            ];
          }
        }

        const subCategoryOptions = matched.map((c: any) => ({
          label: c.name || c.subCategory || c.sub_category_name || c.title || 'Unnamed SubCategory',
          value: String(c.id || c.backendId || c.subcategoryId || '')
        }));

        const curSubVal = selectedSubCategoryRef.current;
        if (curSubVal && !subCategoryOptions.some(opt => String(opt.value) === String(curSubVal))) {
          const found = subsList.find((c: any) => String(c.id) === String(curSubVal) || String(c.backendId) === String(curSubVal));
          if (found) {
            subCategoryOptions.unshift({
              label: found.name || 'SubCategory',
              value: String(found.id || found.backendId)
            });
          }
        }

        return dedupeOptions(subCategoryOptions);
      };

      // Set immediately from local data if available
      if (allSubs.length > 0 && isCurrent) {
        setSubCategories(filterSubCats(allSubs));
      }

      // Background network fetch
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.SUBCATEGORIES.BASE}?category_id=${selectedCategory}&categoryId=${selectedCategory}`);
        const parsed = res.data?.data || res.data?.subcategories || res.data || [];
        if (Array.isArray(parsed) && parsed.length > 0 && isCurrent) {
          setSubCategories(filterSubCats(parsed));
        }
      } catch (error) {
        if (allSubs.length === 0 && isCurrent) {
          setSubCategories(filterSubCats([]));
        }
      }
    };

    fetchSub();

    return () => {
      isCurrent = false;
    };
  }, [selectedCategory]);

  // Fetch sub-units when base unit changes
  useEffect(() => {
    if (!selectedUnit) {
      setSubUnitsList([]);
      setRawSubUnits([]);
      return;
    }

    let isCurrent = true;

    const fetchSubUnits = async () => {
      let subs: any[] = [];
      try {
        const localSubs = await subUnitRepository.getAll();
        const filtered = localSubs.filter((u: any) => 
          String(u.parentUnitId) === String(selectedUnit) || 
          String(u.backendId) === String(selectedUnit)
        );
        subs = filtered.length > 0 ? filtered : localSubs;
      } catch (e) {}

      const applySubs = (rawList: any[]) => {
        setRawSubUnits(rawList);
        const subOptions = rawList.map((u: any) => ({ 
          label: u.name, 
          value: u.id?.toString(),
          multiplier: u.multiplier || 1
        }));

        const curSubUnit = selectedSubUnitRef.current;
        if (curSubUnit && !subOptions.some(opt => String(opt.value) === String(curSubUnit))) {
          const foundSub = rawList.find((u: any) => String(u.id) === String(curSubUnit));
          if (foundSub) {
            subOptions.unshift({
              label: foundSub.name,
              value: String(foundSub.id),
              multiplier: foundSub.multiplier || 1
            });
          }
        }

        setSubUnitsList(dedupeOptions(subOptions));
      };

      if (subs.length > 0 && isCurrent) {
        applySubs(subs);
      }

      // Background API fetch
      try {
        const res = await apiClient.get(`${API_ENDPOINTS.SUBUNITS.BASE}?unit_id=${selectedUnit}`);
        const apiSubs = res.data?.data || res.data || [];
        if (Array.isArray(apiSubs) && apiSubs.length > 0 && isCurrent) {
          applySubs(apiSubs);
        }
      } catch (error) {}
    };

    fetchSubUnits();

    return () => {
      isCurrent = false;
    };
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
  const selectedUnitObj = units.find(u => String(u.value) === String(selectedUnit));
  const selectedSubUnitObj = rawSubUnits.find(u => String(u.id) === String(selectedSubUnit) || String(u.backendId) === String(selectedSubUnit));
  const baseUnitName = selectedUnitObj?.label || 'Base Unit';
  const subUnitName = selectedSubUnitObj?.name || subUnitsList.find(s => String(s.value) === String(selectedSubUnit))?.label || 'Sub Unit';

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

      const selectedCatObj = categories.find(c => String(c.value) === String(selectedCategory));
      const selectedBrandObj = brands.find(b => String(b.value) === String(selectedBrand));
      const stockQty = parseFloat(quantity) || 0;

      const now = new Date().toISOString();
      const existingProduct = productId ? products.find((p) => String(p.id) === String(productId)) : null;

      const productData: Product = {
        id: productId ? (isNaN(Number(productId)) ? Math.floor(Math.random() * -1000000000) : Number(productId)) : Math.floor(Math.random() * -1000000000),
        name: productName.trim(),
        productCode: sku.trim(),
        sku: sku.trim(),
        barcode: itemBarcode.trim() || undefined,
        description: description.trim() || undefined,
        price: rPrice || pPrice,
        cost: pPrice,
        purchasePrice: pPrice,
        wholesalePrice: wPrice,
        retailPrice: rPrice,
        categoryId: selectedCategory || undefined,
        subCategoryId: selectedSubCategory || undefined,
        brandId: selectedBrand || undefined,
        categoryName: selectedCatObj?.label,
        brandName: selectedBrandObj?.label,
        category: selectedCatObj ? { id: Number(selectedCatObj.value), name: selectedCatObj.label } : undefined,
        brand: selectedBrandObj ? { id: Number(selectedBrandObj.value), name: selectedBrandObj.label } : undefined,
        unitId: selectedUnit || undefined,
        baseUnitId: selectedUnit ? Number(selectedUnit) : 1,
        subUnitId: selectedSubUnit || undefined,
        subunitId: selectedSubUnit ? Number(selectedSubUnit) : undefined,
        conversionRate: cRate,
        openingStock: stockQty,
        stockQuantity: stockQty,
        lowStockThreshold: parseFloat(quantityAlert) || 5,
        createdAt: existingProduct?.createdAt || now,
        updatedAt: now,
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

      fetchProducts(true).catch(() => {});

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
      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        keyboardDismissMode="on-drag"
      >
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('list')}>
          <ArrowLeft size={20} color={TEXT_MAIN} />
          <Text style={styles.backButtonText}>Back to Product List</Text>
        </TouchableOpacity>

        {/* 1. PRODUCT INFORMATION CARD */}
        <Card title="Product Information" icon={<Info size={18} color={ORANGE} />}>
          <View style={styles.grid2}>
            <FormGroup width={col2} label="Product Name *">
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

            <FormGroup width={col2} label="Slug">
              <AppInput 
                placeholder="e.g. basmati-rice" 
                value={slug}
                onChangeText={setSlug}
                containerStyle={{ marginBottom: 0 }} 
              />
            </FormGroup>

            <FormGroup width={col2} label="SKU *">
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
              width={col2}
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
                onSelect={handleSelectCategory}
              />
            </FormGroup>

            {Boolean(selectedCategory) && (
              <FormGroup width={col2} label="Sub Category">
                <AppSelect 
                  options={subCategories} 
                  placeholder={subCategories.length > 0 ? "Select Subcategory" : "No Subcategory Found"} 
                  containerStyle={{ marginBottom: 0 }} 
                  value={selectedSubCategory}
                  onSelect={setSelectedSubCategory}
                />
              </FormGroup>
            )}

            <FormGroup 
              width={col2} 
              label="Brand"
              actionRight={
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => setBrandModalVisible(true)}>
                  <Plus size={14} color={ORANGE} />
                  <Text style={{color: ORANGE, fontSize: 13, marginLeft: 4}}>Add New</Text>
                </TouchableOpacity>
              }
            >
              <AppSelect 
                options={brands} 
                placeholder="Select Brand" 
                containerStyle={{ marginBottom: 0 }} 
                value={selectedBrand}
                onSelect={setSelectedBrand}
              />
            </FormGroup>

            <FormGroup width={col2} label="Barcode Symbology">
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

            <FormGroup width={col2} label="Item Barcode">
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
                <FormGroup width={col3} label="Purchase Price (₹) *">
                  <AppInput 
                    placeholder="₹ 0.00" 
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width={col3} label="Wholesale Price (Sales) (₹) *">
                  <AppInput 
                    placeholder="₹ 0.00" 
                    keyboardType="numeric"
                    value={wholesalePrice}
                    onChangeText={setWholesalePrice}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width={col3} label="Retail Price (Sales) (₹) *">
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
                <FormGroup width={col3} label="Base Unit *">
                  <AppSelect 
                    options={units} 
                    placeholder="Select Base Unit" 
                    containerStyle={{ marginBottom: 0 }} 
                    value={selectedUnit}
                    onSelect={setSelectedUnit}
                  />
                </FormGroup>

                <FormGroup width={col3} label="Sub Unit">
                  <AppSelect 
                    options={subUnitsList} 
                    placeholder={selectedUnit ? "Select Sub Unit" : "Select Base Unit First"} 
                    containerStyle={{ marginBottom: 0 }} 
                    value={selectedSubUnit}
                    onSelect={handleSelectSubUnit}
                  />
                </FormGroup>

                <FormGroup width={col3} label={`Conversion (1 ${baseUnitName} = ? ${subUnitName})`}>
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
                <View style={[styles.subUnitPriceCard, isMobile && styles.subUnitPriceCardMobile]}>
                  <View style={styles.subUnitPriceHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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

                  <View style={[styles.subUnitPriceGrid, isMobile && styles.subUnitPriceGridMobile]}>
                    <View style={[styles.priceStatBox, isMobile && styles.priceStatBoxMobile]}>
                      <Text style={styles.priceStatLabel}>Sub Unit Purchase Price</Text>
                      <Text style={styles.priceStatValue}>₹{autoSubPurchasePrice}</Text>
                      <Text style={styles.priceStatFormula}>(₹{purchasePrice || '0'} / {rateNumber})</Text>
                    </View>

                    <View style={[styles.priceStatBox, styles.priceStatBoxWholesale, isMobile && styles.priceStatBoxMobile]}>
                      <Text style={styles.priceStatLabel}>Sub Unit Wholesale Price</Text>
                      <Text style={[styles.priceStatValue, { color: '#0369A1' }]}>₹{autoSubWholesalePrice}</Text>
                      <Text style={styles.priceStatFormula}>(₹{wholesalePrice || '0'} / {rateNumber})</Text>
                    </View>

                    <View style={[styles.priceStatBox, styles.priceStatBoxRetail, isMobile && styles.priceStatBoxMobile]}>
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
                <View style={{ width: '100%', paddingHorizontal: isMobile ? 0 : 10, marginBottom: 20 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={[styles.variantTable, { minWidth: 620 }]}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, { flex: 1.8 }]}>Sub Unit</Text>
                        <Text style={[styles.tableCell, { flex: 1.4 }]}>Equal To ({baseUnitName})</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>Purchase Price</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>Wholesale Price</Text>
                        <Text style={[styles.tableCell, { flex: 1.5 }]}>Retail Price</Text>
                        <Text style={[styles.tableCell, { flex: 0.8 }]}></Text>
                      </View>
                      
                      {subUnits.map((item, index) => {
                        const itemRate = parseFloat(item.value) > 0 ? parseFloat(item.value) : 1;
                        const itemSubPurchase = (pPriceNum / itemRate).toFixed(2);
                        const itemSubWholesale = (wPriceNum / itemRate).toFixed(2);
                        const itemSubRetail = (rPriceNum / itemRate).toFixed(2);

                        return (
                          <View style={styles.tableRow} key={`subunit-row-${item.id}-${index}`}>
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
                  </ScrollView>
                </View>
              )}

              {/* INVENTORY & TAXES */}
              <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                <Layers size={16} color={ORANGE} />
                <Text style={styles.sectionHeaderText}>Stock & Taxes</Text>
              </View>

              <View style={styles.grid3}>
                <FormGroup width={col3} label="Quantity / Opening Stock">
                  <AppInput 
                    placeholder="0" 
                    keyboardType="decimal-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width={col3} label="Quantity Alert">
                  <AppInput 
                    placeholder="5" 
                    keyboardType="decimal-pad"
                    value={quantityAlert}
                    onChangeText={setQuantityAlert}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width={col3} label="Tax Type">
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
                
                <FormGroup width={col3} label="Tax (%)">
                  <AppInput 
                    placeholder="e.g. 18" 
                    keyboardType="numeric"
                    value={tax}
                    onChangeText={setTax}
                    containerStyle={{ marginBottom: 0 }} 
                  />
                </FormGroup>

                <FormGroup width={col3} label="Discount Type">
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

                <FormGroup width={col3} label="Discount Value">
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
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={[styles.variantTable, { minWidth: 580 }]}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, {flex: 1.5}]}>Variation</Text>
                    <Text style={[styles.tableCell, {flex: 1.5}]}>Variant Value</Text>
                    <Text style={[styles.tableCell, {flex: 1}]}>SKU</Text>
                    <Text style={[styles.tableCell, {flex: 1.2}]}>Quantity</Text>
                    <Text style={[styles.tableCell, {flex: 1.5}]}>Price</Text>
                    <Text style={[styles.tableCell, {flex: 0.8}]}></Text>
                  </View>
                  
                  {variants.map((item, index) => (
                    <View style={styles.tableRow} key={`variant-row-${item.id}-${index}`}>
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
              </ScrollView>
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
        <View style={[styles.submitRow, isMobile && styles.submitRowMobile]}>
          <AppButton 
            title={isSaving ? "Saving..." : (productId ? "Update Product" : "Save Product")} 
            onPress={handleSaveProduct} 
            isLoading={isSaving}
            style={[styles.saveBtn, isMobile && styles.btnFullMobile]}
          />
          <AppButton 
            title="Cancel" 
            variant="outline" 
            onPress={() => onNavigate('list')} 
            style={[styles.cancelBtn, isMobile && styles.btnFullMobile]}
          />
        </View>

        <View style={{height: 60}} />
        <AddCategoryModal 
          visible={isCategoryModalVisible} 
          onClose={() => setCategoryModalVisible(false)} 
          onSubmit={(name) => {
            setCategories(dedupeOptions([...categories, { label: name, value: Date.now().toString() }]));
            setCategoryModalVisible(false);
          }} 
        />
        <AddBrandModal 
          visible={isBrandModalVisible} 
          onClose={() => setBrandModalVisible(false)} 
          onSubmit={async (name) => {
            const tempId = Math.floor(Math.random() * -1000000000);
            const brandItem: any = {
              id: tempId,
              name,
              status: 'Active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending_insert' as const,
            };
            try {
              await brandRepository.insert(brandItem);
            } catch (e) {
              console.warn('Failed to insert brand locally:', e);
            }
            const val = String(brandItem.id);
            setBrands(prev => dedupeOptions([...prev, { label: name, value: val }]));
            setSelectedBrand(val);
            setBrandModalVisible(false);
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
  scrollContentMobile: {
    padding: 12,
    paddingBottom: 40,
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
  cardHeaderMobile: {
    padding: 12,
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
  cardBodyMobile: {
    padding: 12,
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
  subUnitPriceCardMobile: {
    marginHorizontal: 0,
    padding: 12,
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
  subUnitPriceGridMobile: {
    flexDirection: 'column',
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
  priceStatBoxMobile: {
    width: '100%',
    minWidth: '100%',
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
  submitRowMobile: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
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
  },
  btnFullMobile: {
    flex: 1,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
