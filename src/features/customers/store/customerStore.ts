import { create } from 'zustand';
import { Customer } from '../../../types/models';

interface CustomerState {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  setCustomers: (customers) => set({ customers }),
  addCustomer: (c) => set((state) => ({ customers: [...state.customers, c] })),
  updateCustomer: (updated) => set((state) => ({
    customers: state.customers.map((c) => (c.id === updated.id ? updated : c)),
  })),
}));
