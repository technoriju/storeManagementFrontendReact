import { create } from 'zustand';
import { Brand } from '../types';

interface BrandState {
  brands: Brand[];
  addBrand: (brand: Brand) => void;
}

export const useBrandStore = create<BrandState>((set) => ({
  brands: [
    { id: '1', name: 'Lenovo', createdAt: '24 Dec 2024', status: 'Active' },
    { id: '2', name: 'Beats', createdAt: '10 Dec 2024', status: 'Active' },
    { id: '3', name: 'Nike', createdAt: '27 Nov 2024', status: 'Active' },
    { id: '4', name: 'Apple', createdAt: '18 Nov 2024', status: 'Active' },
    { id: '5', name: 'Amazon', createdAt: '06 Nov 2024', status: 'Active' },
  ],
  addBrand: (brand) => set((state) => ({ brands: [brand, ...state.brands] })),
}));
