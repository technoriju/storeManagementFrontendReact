import { create } from 'zustand';
import { Product, Category, Brand, Unit, UnitConversion } from '../types';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { productRepository } from '../../../core/repositories/ProductRepository';

export interface PaginatedProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  fetchPaginatedProducts: (params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    brandId?: number;
  }) => Promise<PaginatedProductsResponse>;
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
  addProduct: (product) => set((state) => ({
    products: [product, ...state.products.filter((p) => String(p.id) !== String(product.id))],
  })),
  updateProduct: (updated) => set((state) => {
    const existing = state.products.find((p) => String(p.id) === String(updated.id));
    const merged = existing ? { ...existing, ...updated } : updated;
    const remaining = state.products.filter((p) => String(p.id) !== String(updated.id));
    return {
      products: [merged, ...remaining],
    };
  }),
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
    lastProductFetchTime = now;

    // 2. Sync fresh data from API in background
    inFlightFetchPromise = (async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE);
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

  fetchPaginatedProducts: async (params) => {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const search = params.search || '';

    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          categoryId: params.categoryId || undefined,
          brandId: params.brandId || undefined,
        },
      });

      const raw = response.data;

      // Handle TransformInterceptor wrapped paginated object: { statusCode, data: { data: [...], total, page, limit, totalPages } }
      if (raw?.data && typeof raw.data === 'object' && Array.isArray(raw.data.data)) {
        const p = raw.data;
        return {
          data: p.data as Product[],
          total: Number(p.total ?? p.data.length),
          page: Number(p.page ?? page),
          limit: Number(p.limit ?? limit),
          totalPages: Number(p.totalPages ?? Math.max(1, Math.ceil((p.total ?? p.data.length) / limit))),
        };
      }

      // Handle direct paginated object: { data: [...], total, page, limit, totalPages }
      if (raw && typeof raw === 'object' && Array.isArray(raw.data) && (raw.total !== undefined || raw.totalPages !== undefined)) {
        return {
          data: raw.data as Product[],
          total: Number(raw.total ?? raw.data.length),
          page: Number(raw.page ?? page),
          limit: Number(raw.limit ?? limit),
          totalPages: Number(raw.totalPages ?? Math.max(1, Math.ceil((raw.total ?? raw.data.length) / limit))),
        };
      }

      // Handle wrapped or unwrapped array (unpaginated backend response): slice by page & limit
      const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : null);
      if (Array.isArray(list)) {
        const sortedList = [...list].sort((a: any, b: any) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.id || 0) - Number(a.id || 0);
        });
        const offset = (page - 1) * limit;
        return {
          data: sortedList.slice(offset, offset + limit) as Product[],
          total: sortedList.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(sortedList.length / limit)),
        };
      }
    } catch (err: any) {
      console.warn('API fetchPaginatedProducts failed, falling back to SQLite:', err.message);
    }

    const localResult = await productRepository.getPaginated({
      page,
      limit,
      search,
    });
    return localResult as PaginatedProductsResponse;
  },
}));

