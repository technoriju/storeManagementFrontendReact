export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsn?: string;
  gst?: number;
  description?: string;
  price: number;
  cost: number;
  purchasePrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  mrp?: number;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  subUnitId?: string;
  conversionRate?: number;
  openingStock?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string; // For subcategories
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface UnitConversion {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}
