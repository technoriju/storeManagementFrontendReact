export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    PERMISSIONS: '/auth/permissions',
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
