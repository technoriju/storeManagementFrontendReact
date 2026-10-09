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
  deleteProduct: (id: number | string) => Promise<void>;

  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;

  setBrands: (brands: Brand[]) => void;
  addBrand: (brand: Brand) => void;

  setUnits: (units: Unit[]) => void;
  addUnit: (unit: Unit) => void;

  setUnitConversions: (conversions: UnitConversion[]) => void;
  addUnitConversion: (conversion: UnitConversion) => void;

  fetchProducts: (force?: boolean) => Promise<void>;
}

let inFlightFetchPromise: Promise<void> | null = null;
let lastProductFetchTime = 0;
const FETCH_COOLDOWN_MS = 8000;

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
  deleteProduct: async (id: number | string) => {
    const numId = Number(id);
    set((state) => ({
      products: state.products.filter((p) => String(p.id) !== String(id)),
    }));
    try {
      if (!isNaN(numId)) {
        await productRepository.delete(numId);
      }
    } catch (_) {}
    try {
      if (!isNaN(numId)) {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.BY_ID(numId));
      }
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

  fetchProducts: async (force?: boolean) => {
    // 1. Immediately hydrate from local SQLite if current products are empty
    try {
      const current = get().products;
      if (!current || current.length === 0) {
        const localProducts = await productRepository.getAll();
        if (localProducts && localProducts.length > 0) {
          set({ products: localProducts as any });
        }
      }
    } catch (_) {}

    // Deduplicate concurrent calls: return already running promise
    if (inFlightFetchPromise) {
      return inFlightFetchPromise;
    }

    // Cooldown check: prevent rapid repeated network requests
    const now = Date.now();
    if (!force && now - lastProductFetchTime < FETCH_COOLDOWN_MS) {
      return;
    }

    // 2. Sync fresh data from API in background
    inFlightFetchPromise = (async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE);
        lastProductFetchTime = Date.now();
        const data = response.data?.data || response.data;
        if (Array.isArray(data)) {
          const normalized = await productRepository.saveRawProducts(data);
          set({ products: normalized as any, isLoading: false });
          return;
        }
      } catch (error: any) {
        console.warn('Network fetchProducts failed, falling back to local SQLite:', error.message);
      } finally {
        inFlightFetchPromise = null;
      }

      try {
        const localProducts = await productRepository.getAll();
        set({ products: localProducts as any, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to fetch products', isLoading: false });
      }
    })();

    return inFlightFetchPromise;
  },
}));

