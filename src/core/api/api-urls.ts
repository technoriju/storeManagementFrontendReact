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
  USERS: {
    BASE: '/users',
    BY_ID: (id: string | number) => `/users/${id}`,
  },
};
