import { create } from 'zustand';
import { Product, Category, Brand, Unit, UnitConversion } from '../types';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';

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
  deleteProduct: (id: string) => void;

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

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  categories: [],
  brands: [],
  units: [],
  unitConversions: [],
  isLoading: false,
  error: null,

  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (updated) => set((state) => ({
    products: state.products.map((p) => (p.id === updated.id ? updated : p)),
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter((p) => p.id !== id),
  })),

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
      // Assuming response.data contains the products array, or response.data.data
      const data = response.data?.data || response.data;
      set({ products: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch products', isLoading: false });
    }
  },
}));
