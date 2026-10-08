import { create } from 'zustand';

import { Product } from '../../products/types';
import { PriceType, getProductPriceByType } from '../utils/priceUtils';

export interface CartItem {
  id: number; // unique id for the cart item
  product: Product;
  quantity: number | string;
  unit: string; // The unit used for this sale
  unitType?: 'base' | 'sub';
  baseUnitName?: string;
  subUnitName?: string;
  conversionRate?: number;
  basePrice?: number;
  subPrice?: number;
  baseCost?: number;
  subCost?: number;
  unitCost?: number; // Cost of 1 unit sold (COGS)
  price: number; // Selling price used
  discount: number; // Discount amount per unit or total for the item
  gstRate: number; // e.g. 5, 12, 18, 28
  wholesalePrice?: number;
  retailPrice?: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface HoldSale {
  id: number;
  timestamp: number;
  items: CartItem[];
  customer: Customer | null;
  name: string; // Name to remember the hold sale, e.g. "Customer waiting"
}

interface POSState {
  cart: CartItem[];
  customer: Customer | null;
  holdSales: HoldSale[];
  priceType: PriceType;
  
  // Actions
  setPriceType: (type: PriceType) => void;
  addToCart: (product: Product, quantity?: number, unit?: string, preferredUnitType?: 'base' | 'sub') => void;
  toggleCartItemUnit: (id: number) => void;
  updateCartItem: (id: number, updates: Partial<CartItem>) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  
  holdCurrentSale: (name?: string) => void;
  resumeSale: (holdSaleid: number) => void;
  
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
  priceType: 'wholesale',

  setPriceType: (type: PriceType) => {
    set((state) => {
      if (state.priceType === type) return state;
      const newCart = state.cart.map((item) => {
        const basePrice = getProductPriceByType(item.product, type);
        const cRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
        const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;
        const price = item.unitType === 'sub' ? subPrice : basePrice;

        return {
          ...item,
          basePrice,
          subPrice,
          price,
        };
      });

      return {
        priceType: type,
        cart: newCart,
      };
    });
  },

  addToCart: (product, quantity = 1, unit = '', preferredUnitType) => {
    set((state) => {
      const wholesaleP = getProductPriceByType(product, 'wholesale');
      const retailP = getProductPriceByType(product, 'retail');
      const basePrice = state.priceType === 'wholesale' ? wholesaleP : retailP;
      const baseCost = product.cost || product.purchasePrice || 0;
      const cRate = product.conversionRate && Number(product.conversionRate) > 0 ? Number(product.conversionRate) : 1;
      const hasSubUnit = !!(product.subUnitId || product.subunitId || cRate > 1);

      const unitType: 'base' | 'sub' = preferredUnitType || 'base';
      const baseUnitName = product.baseUnitName || product.unit || 'Box';
      const subUnitName = product.subUnitName || 'Pcs';
      const selectedUnit = unit || (unitType === 'sub' ? subUnitName : baseUnitName);

      const subPrice = cRate > 0 ? Number((basePrice / cRate).toFixed(2)) : basePrice;
      const subCost = cRate > 0 ? Number((baseCost / cRate).toFixed(4)) : baseCost;

      const price = unitType === 'sub' ? subPrice : basePrice;
      const unitCost = unitType === 'sub' ? subCost : baseCost;

      // Check if product already exists in cart with same unit
      const existingItemIndex = state.cart.findIndex(
        item => item.product.id === product.id && item.unit === selectedUnit
      );

      if (existingItemIndex >= 0) {
        const newCart = [...state.cart];
        const existingQty = parseFloat(String(newCart[existingItemIndex].quantity)) || 0;
        newCart[existingItemIndex].quantity = Number((existingQty + quantity).toFixed(4));
        return { cart: newCart };
      }

      // Add new item
      const newItem: CartItem = {
        id: Math.floor(Math.random() * -1000000000),
        product,
        quantity,
        unit: selectedUnit,
        unitType,
        baseUnitName,
        subUnitName,
        conversionRate: cRate,
        basePrice,
        subPrice,
        baseCost,
        subCost,
        unitCost,
        price,
        discount: 0,
        gstRate: product.gst || 0,
        wholesalePrice: wholesaleP,
        retailPrice: retailP,
      };

      return { cart: [...state.cart, newItem] };
    });
  },

  toggleCartItemUnit: (id) => {
    set((state) => {
      const newCart = state.cart.map((item) => {
        if (item.id !== id) return item;
        const nextType: 'base' | 'sub' = item.unitType === 'base' ? 'sub' : 'base';
        const nextUnit = nextType === 'base' ? (item.baseUnitName || 'Box') : (item.subUnitName || 'Pcs');
        const nextPrice = nextType === 'base' ? (item.basePrice || item.price) : (item.subPrice || (item.conversionRate ? Number((item.price / item.conversionRate).toFixed(2)) : item.price));
        const nextCost = nextType === 'base' ? (item.baseCost || 0) : (item.subCost || (item.conversionRate ? Number(((item.baseCost || 0) / item.conversionRate).toFixed(4)) : 0));

        return {
          ...item,
          unitType: nextType,
          unit: nextUnit,
          price: nextPrice,
          unitCost: nextCost,
        };
      });
      return { cart: newCart };
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
        id: Math.floor(Math.random() * -1000000000),
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
    return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (parseFloat(String(item.quantity)) || 0)), 0);
  },

  getTotalDiscount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + (parseFloat(String(item.discount)) || 0), 0);
  },

  getTotalGST: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => {
      const qty = parseFloat(String(item.quantity)) || 0;
      const taxableAmount = ((Number(item.price) || 0) * qty) - (parseFloat(String(item.discount)) || 0);
      return sum + (taxableAmount * ((Number(item.gstRate) || 0) / 100));
    }, 0);
  },

  getGrandTotal: () => {
    const { getSubtotal, getTotalDiscount, getTotalGST } = get();
    return getSubtotal() - getTotalDiscount() + getTotalGST();
  },
}));


