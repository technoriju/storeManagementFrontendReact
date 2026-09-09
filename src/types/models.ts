export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
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
  parentId?: string;
}

export interface Unit extends BaseEntity {
  name: string;
  abbreviation: string;
}

export interface Product extends BaseEntity {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  price: number;
  cost: number;
  categoryId?: string;
  unitId?: string;
  stockQuantity: number;
  lowStockThreshold?: number;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  outstandingBalance?: number;
}

export interface Supplier extends BaseEntity {
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
  customerId?: string;
  supplierId?: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}
