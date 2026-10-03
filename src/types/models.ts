export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  parentId?: number;
  /** Backend primary key. Local id can be temporary while offline. */
  backendId?: number;
}

export interface SubCategory extends BaseEntity {
  name: string;
  description?: string;
  categoryId: number;
  status?: 'active' | 'inactive';
  backendId?: number;
}

export interface Unit extends BaseEntity {
  name: string;
  shortName: string;
  backendId?: number;
}

export interface Brand extends BaseEntity {
  name: string;
  description?: string;
  status?: string;
  backendId?: number;
}

export interface SubUnit extends BaseEntity {
  name: string;
  parentUnitId?: number;
  multiplier?: number;
  status?: string;
  backendId?: number;
}

export interface Product extends BaseEntity {
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
  categoryId?: number;
  subCategoryId?: number;
  brandId?: number;
  unitId?: number;
  baseUnitId?: number;
  subunitId?: number;
  subUnitId?: number | string;
  conversionRate?: number;
  openingStock?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  backendId?: number;
}

export interface Customer extends BaseEntity {
  backendId?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  gstin?: string;
  outstandingBalance?: number;
}

export interface Supplier extends BaseEntity {
  backendId?: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  outstandingBalance?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'other' | 'split';
export type PaymentType = 'receive' | 'pay';

export interface Payment extends BaseEntity {
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string;
  notes?: string;
  customerId?: number;
  supplierId?: number;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id?: number;
  purchaseId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  taxAmount: number;
  unitCost?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface Purchase extends BaseEntity {
  invoiceNumber: string;
  reference?: string;
  supplierId: number;
  supplierName?: string;
  date: string;
  subtotal: number;
  discount: number;
  orderTax: number;
  shipping: number;
  gst: number;
  total: number;
  paid: number;
  due: number;
  status: 'Received' | 'Pending' | 'Ordered';
  paymentStatus: 'Paid' | 'Unpaid' | 'Overdue';
  notes?: string;
  items?: PurchaseItem[];
}

export interface SaleItem {
  id?: number;
  saleId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gst: number;
  taxAmount: number;
  unitCost?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface Sale extends BaseEntity {
  invoiceNumber: string;
  reference?: string;
  customerId?: number;
  customerName?: string;
  supplierId?: number;
  supplierName?: string;
  date: string;
  subtotal: number;
  discount: number;
  orderTax: number;
  shipping: number;
  gst: number;
  total: number;
  paid: number;
  due: number;
  status: 'Completed' | 'Pending' | 'Ordered';
  paymentStatus: 'Paid' | 'Unpaid' | 'Overdue';
  biller?: string;
  notes?: string;
  items?: SaleItem[];
}


