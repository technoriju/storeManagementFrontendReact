import { create } from 'zustand';
import { SubCategory } from '../types';

interface SubCategoryState {
  subCategories: SubCategory[];
  setSubCategories: (subCategories: SubCategory[]) => void;
  addSubCategory: (subCategory: SubCategory) => void;
  updateSubCategory: (id: string, subCategory: Partial<SubCategory>) => void;
  deleteSubCategory: (id: string) => void;
}

export const useSubCategoryStore = create<SubCategoryState>((set) => ({
  subCategories: [
    { id: '1', subCategory: 'Laptop', category: 'Computers', categoryCode: 'CT001', description: 'Efficient Productivity', status: 'Active' },
    { id: '2', subCategory: 'Desktop', category: 'Computers', categoryCode: 'CT002', description: 'Compact Design', status: 'Active' },
    { id: '3', subCategory: 'Sneakers', category: 'Shoe', categoryCode: 'CT003', description: 'Dynamic Grip', status: 'Active' },
    { id: '4', subCategory: 'Formals', category: 'Shoe', categoryCode: 'CT004', description: 'Stylish Comfort', status: 'Active' },
    { id: '5', subCategory: 'Wearables', category: 'Electronics', categoryCode: 'CT005', description: 'Seamless Connectivity', status: 'Active' },
    { id: '6', subCategory: 'Speakers', category: 'Electronics', categoryCode: 'CT006', description: 'Reliable Sound', status: 'Active' },
    { id: '7', subCategory: 'Handbags', category: 'Bags', categoryCode: 'CT007', description: 'Compact Carry', status: 'Active' },
    { id: '8', subCategory: 'Travel', category: 'Bags', categoryCode: 'CT008', description: 'Travel Ready', status: 'Active' },
    { id: '9', subCategory: 'Sofa', category: 'Furniture', categoryCode: 'CT009', description: 'Cozy Comfort', status: 'Active' },
    { id: '10', subCategory: 'Chair', category: 'Furniture', categoryCode: 'CT0010', description: 'Stylish Comfort', status: 'Active' },
  ],
  setSubCategories: (subCategories) => set({ subCategories }),
  addSubCategory: (subCategory) => set((state) => ({ subCategories: [subCategory, ...state.subCategories] })),
  updateSubCategory: (id, subCategory) => set((state) => ({
    subCategories: state.subCategories.map((c) => (c.id === id ? { ...c, ...subCategory } : c)),
  })),
  deleteSubCategory: (id) => set((state) => ({
    subCategories: state.subCategories.filter((c) => c.id !== id),
  })),
}));
