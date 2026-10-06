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
  categoryName?: string;
  brandName?: string;
  category?: { id?: number; name?: string };
  brand?: { id?: number; name?: string };
  unitId?: number;
  baseUnitId?: number;
  baseUnit?: { id?: number; name?: string; shortName?: string };
  subUnit?: { id?: number; name?: string };
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
  backendId?: number;
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
  paymentStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Partial';
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
  paymentStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Partial';
  biller?: string;
  notes?: string;
  previousDue?: number;
  advancePayment?: number;
  showPreviousBalance?: boolean;
  items?: SaleItem[];
}

export interface SaleReturnItem {
  id?: number;
  saleReturnId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxAmount?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface SaleReturn extends BaseEntity {
  saleId?: number;
  returnNumber: string;
  reference?: string;
  customerId?: number;
  customerName?: string;
  date: string;
  subtotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  totalAmount: number;
  status: 'Received' | 'Pending';
  reason?: string;
  items?: SaleReturnItem[];
}

export interface PurchaseReturnItem {
  id?: number;
  purchaseReturnId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxAmount?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface PurchaseReturn extends BaseEntity {
  purchaseId?: number;
  returnNumber: string;
  reference?: string;
  supplierId?: number;
  supplierName?: string;
  date: string;
  subtotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  totalAmount: number;
  status: 'Received' | 'Pending';
  reason?: string;
  items?: PurchaseReturnItem[];
}

export interface QuotationItem {
  id?: number;
  quotationId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxAmount?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface Quotation extends BaseEntity {
  quotationNumber: string;
  customerId: number;
  customerName?: string;
  date: string;
  expiryDate?: string;
  subtotal: number;
  discount: number;
  taxTotal: number;
  shipping: number;
  grandTotal: number;
  status: 'Sent' | 'Ordered' | 'Pending' | 'Expired' | 'Accepted';
  notes?: string;
  items?: QuotationItem[];
}

export interface PurchaseOrderItem {
  id?: number;
  purchaseOrderId?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxAmount?: number;
  unit?: string;
  unitType?: string;
  conversionRate?: number;
  total: number;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface PurchaseOrder extends BaseEntity {
  orderNumber: string;
  supplierId: number;
  supplierName?: string;
  orderDate: string;
  expectedDate?: string;
  subtotal: number;
  discount: number;
  taxTotal: number;
  shipping: number;
  grandTotal: number;
  status: 'Ordered' | 'Pending' | 'Received' | 'Cancelled';
  notes?: string;
  items?: PurchaseOrderItem[];
}



