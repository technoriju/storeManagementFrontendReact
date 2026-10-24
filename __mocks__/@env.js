const resolveApiUrl = () => {
  if (import.meta.env.VITE_ENVIRONMENT !== "development") {
    return import.meta.env.VITE_API_URL_LIVE;
  }
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return url.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
  }
  return url;
};

export const API_URL = resolveApiUrl();
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'StoreManagement';
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';
