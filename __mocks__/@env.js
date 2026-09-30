export const API_URL = import.meta.env.VITE_ENVIRONMENT == "development" ? 
                       import.meta.env.VITE_API_URL : 
                       import.meta.env.VITE_API_URL_LIVE;
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'StoreManagement';
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';
