import { create } from 'zustand';
import { Supplier } from '../../../types/models';

interface SupplierState {
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
}

export const useSupplierStore = create<SupplierState>((set) => ({
  suppliers: [],
  setSuppliers: (suppliers) => set({ suppliers }),
  addSupplier: (s) => set((state) => ({ suppliers: [...state.suppliers, s] })),
  updateSupplier: (updated) => set((state) => ({
    suppliers: state.suppliers.map((s) => (s.id === updated.id ? updated : s)),
  })),
}));
