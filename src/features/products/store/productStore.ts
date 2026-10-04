import { create } from 'zustand';
import { Product, Category, Brand, Unit, UnitConversion } from '../types';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { productRepository } from '../../../core/repositories/ProductRepository';

interface ProductState {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  unitConversions: UnitConversion[];
  isLoading: boolean;
  error: string | null;

  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: number) => Promise<void>;

  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;

  setBrands: (brands: Brand[]) => void;
  addBrand: (brand: Brand) => void;

  setUnits: (units: Unit[]) => void;
  addUnit: (unit: Unit) => void;

  setUnitConversions: (conversions: UnitConversion[]) => void;
  addUnitConversion: (conversion: UnitConversion) => void;

  fetchProducts: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  units: [],
  unitConversions: [],
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [product, ...state.products] })),
  updateProduct: (updated) => set((state) => ({
    products: state.products.map((p) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)),
  })),
  deleteProduct: async (id: number) => {
    set((state) => ({
      products: state.products.filter((p) => String(p.id) !== String(id)),
    }));
    try {
      await productRepository.delete(id);
    } catch (_) {}
    try {
      await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(id));
    } catch (_) {}
  },

  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),

  setBrands: (brands) => set({ brands }),
  addBrand: (brand) => set((state) => ({ brands: [...state.brands, brand] })),

  setUnits: (units) => set({ units }),
  addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),

  setUnitConversions: (unitConversions) => set({ unitConversions }),
  addUnitConversion: (conversion) => set((state) => ({ unitConversions: [...state.unitConversions, conversion] })),

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE);
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        const normalized: Product[] = data.map((item: any) => {
          const purchasePrice = item.purchasePrice !== undefined && item.purchasePrice !== null ? Number(item.purchasePrice) : Number(item.cost ?? 0);
          const wholesalePrice = item.wholesalePrice !== undefined && item.wholesalePrice !== null ? Number(item.wholesalePrice) : 0;
          const retailPrice = item.retailPrice !== undefined && item.retailPrice !== null ? Number(item.retailPrice) : Number(item.price ?? 0);
          const stockQuantity = Number(item.stockQuantity ?? item.openingStock ?? 0);
          const categoryName = item.category?.name || item.categoryName || undefined;
          const brandName = item.brand?.name || item.brandName || undefined;

          return {
            ...item,
            id: Number(item.id),
            price: retailPrice,
            cost: purchasePrice,
            purchasePrice,
            wholesalePrice,
            retailPrice,
            stockQuantity,
            categoryName,
            brandName,
            category: item.category ? { id: Number(item.category.id), name: item.category.name } : undefined,
            brand: item.brand ? { id: Number(item.brand.id), name: item.brand.name } : undefined,
          };
        });
        set({ products: normalized, isLoading: false });
        productRepository.fetchFromApi().catch(() => {});
        return;
      }
    } catch (error: any) {
      console.warn('Network fetchProducts failed, falling back to local SQLite:', error.message);
    }

    try {
      const localProducts = await productRepository.getAll();
      set({ products: localProducts as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch products', isLoading: false });
    }
  },
}));

