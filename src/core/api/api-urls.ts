export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    PERMISSIONS: '/auth/permissions',
  },
  BRANDS: {
    BASE: '/brands',
    BY_ID: (id: string | number) => `/brands/${id}`,
  },
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id: string | number) => `/categories/${id}`,
  },
  CUSTOMERS: {
    BASE: '/customers',
    BY_ID: (id: string | number) => `/customers/${id}`,
  },
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string | number) => `/products/${id}`,
    BULK_IMPORT: '/products/bulk-import',
  },
  SETTINGS: {
    BASE: '/settings',
    BY_KEY: (key: string) => `/settings/${key}`,
  },
  SUBCATEGORIES: {
    BASE: '/subcategories',
    BY_ID: (id: string | number) => `/subcategories/${id}`,
  },
  SUBUNITS: {
    BASE: '/sub-units',
    BY_ID: (id: string | number) => `/sub-units/${id}`,
  },
  SUPPLIERS: {
    BASE: '/suppliers',
    BY_ID: (id: string | number) => `/suppliers/${id}`,
  },
  UNITS: {
    BASE: '/units',
    BY_ID: (id: string | number) => `/units/${id}`,
  },
  SALES: {
    BASE: '/sales',
    BY_ID: (id: string | number) => `/sales/${id}`,
  },
  PURCHASES: {
    BASE: '/purchases',
    BY_ID: (id: string | number) => `/purchases/${id}`,
  },
  QUOTATIONS: {
    BASE: '/quotations',
    BY_ID: (id: string | number) => `/quotations/${id}`,
  },
  PURCHASE_ORDERS: {
    BASE: '/purchase-orders',
    BY_ID: (id: string | number) => `/purchase-orders/${id}`,
  },
  SALES_RETURNS: {
    BASE: '/sale-returns',
    BY_ID: (id: string | number) => `/sale-returns/${id}`,
  },
  PURCHASE_RETURNS: {
    BASE: '/purchase-returns',
    BY_ID: (id: string | number) => `/purchase-returns/${id}`,
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string | number) => `/users/${id}`,
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id: string | number) => `/payments/${id}`,
  },
};
