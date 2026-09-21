import { create } from 'zustand';
import { Category } from '../types';

interface CategoryState {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [
    { id: '1', name: 'Computers', slug: 'computers', createdAt: '24 Dec 2024', status: 'Active' },
    { id: '2', name: 'Electronics', slug: 'electronics', createdAt: '10 Dec 2024', status: 'Active' },
    { id: '3', name: 'Shoe', slug: 'shoe', createdAt: '27 Nov 2024', status: 'Active' },
    { id: '4', name: 'Cosmetics', slug: 'cosmetics', createdAt: '18 Nov 2024', status: 'Active' },
    { id: '5', name: 'Groceries', slug: 'groceries', createdAt: '06 Nov 2024', status: 'Active' },
    { id: '6', name: 'Furniture', slug: 'furniture', createdAt: '25 Oct 2024', status: 'Active' },
    { id: '7', name: 'Bags', slug: 'bags', createdAt: '14 Oct 2024', status: 'Active' },
    { id: '8', name: 'Phone', slug: 'phone', createdAt: '03 Oct 2024', status: 'Active' },
    { id: '9', name: 'Appliances', slug: 'appliances', createdAt: '20 Sep 2024', status: 'Active' },
    { id: '10', name: 'Clothing', slug: 'clothing', createdAt: '10 Sep 2024', status: 'Active' },
  ],
  setCategories: (categories) => set({ categories }),
  addCategory: (category) => set((state) => ({ categories: [category, ...state.categories] })),
  updateCategory: (id, category) => set((state) => ({
    categories: state.categories.map((c) => (c.id === id ? { ...c, ...category } : c)),
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter((c) => c.id !== id),
  })),
}));
