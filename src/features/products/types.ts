export interface Product {
  id: number;
  name: string;
  productCode?: string;
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
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  baseUnitId?: number | string;
  subUnitId?: number | string;
  subunitId?: number | string;
  unit?: string;
  baseUnitName?: string;
  subUnitName?: string;
  conversionRate?: number;
  openingStock?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: string; // For subcategories
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface Unit {
  id: number;
  name: string;
  shortName: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

export interface UnitConversion {
  id: number;
  fromUnitid: number;
  toUnitid: number;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}

