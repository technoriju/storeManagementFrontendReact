import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../../products/types';

export interface CartItem {
  id: string; // unique id for the cart item
  product: Product;
  quantity: number;
  unit: string; // The unit used for this sale
  price: number; // Selling price used
  discount: number; // Discount amount per unit or total for the item
  gstRate: number; // e.g. 5, 12, 18, 28
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

interface HoldSale {
  id: string;
  timestamp: number;
  items: CartItem[];
  customer: Customer | null;
  name: string; // Name to remember the hold sale, e.g. "Customer waiting"
}

interface POSState {
  cart: CartItem[];
  customer: Customer | null;
  holdSales: HoldSale[];
  
  // Actions
  addToCart: (product: Product, quantity?: number, unit?: string) => void;
  updateCartItem: (id: string, updates: Partial<CartItem>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  
  holdCurrentSale: (name?: string) => void;
  resumeSale: (holdSaleId: string) => void;
  
  // Computed values getters
  getSubtotal: () => number;
  getTotalGST: () => number;
  getTotalDiscount: () => number;
  getGrandTotal: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  customer: null,
  holdSales: [],

  addToCart: (product, quantity = 1, unit = '') => {
    set((state) => {
      // Check if product already exists in cart with same unit
      const existingItemIndex = state.cart.findIndex(
        item => item.product.id === product.id && item.unit === unit
      );

      if (existingItemIndex >= 0) {
        const newCart = [...state.cart];
        newCart[existingItemIndex].quantity += quantity;
        return { cart: newCart };
      }

      // Add new item
      const newItem: CartItem = {
        id: uuidv4(),
        product,
        quantity,
        unit: unit || product.unitId || '',
        price: product.price || 0, // Fallback
        discount: 0,
        gstRate: product.gst || 0, // Fallback
      };

      return { cart: [...state.cart, newItem] };
    });
  },

  updateCartItem: (id, updates) => {
    set((state) => ({
      cart: state.cart.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  },

  removeFromCart: (id) => {
    set((state) => ({
      cart: state.cart.filter(item => item.id !== id)
    }));
  },

  clearCart: () => {
    set({ cart: [], customer: null });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  holdCurrentSale: (name = 'Hold Sale') => {
    set((state) => {
      if (state.cart.length === 0) return state;

      const newHoldSale: HoldSale = {
        id: uuidv4(),
        timestamp: Date.now(),
        items: [...state.cart],
        customer: state.customer,
        name
      };

      return {
        holdSales: [...state.holdSales, newHoldSale],
        cart: [],
        customer: null
      };
    });
  },

  resumeSale: (holdSaleId) => {
    set((state) => {
      const saleIndex = state.holdSales.findIndex(s => s.id === holdSaleId);
      if (saleIndex === -1) return state;

      const sale = state.holdSales[saleIndex];
      const newHoldSales = [...state.holdSales];
      newHoldSales.splice(saleIndex, 1);

      return {
        cart: sale.items,
        customer: sale.customer,
        holdSales: newHoldSales
      };
    });
  },

  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getTotalDiscount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  },

  getTotalGST: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => {
      const taxableAmount = (item.price * item.quantity) - (item.discount || 0);
      return sum + (taxableAmount * (item.gstRate / 100));
    }, 0);
  },

  getGrandTotal: () => {
    const { getSubtotal, getTotalDiscount, getTotalGST } = get();
    return getSubtotal() - getTotalDiscount() + getTotalGST();
  },
}));
