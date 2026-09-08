import { API_URL, APP_NAME, ENVIRONMENT } from '@env';

export const Env = {
  API_URL: API_URL || 'http://localhost:3000',
  APP_NAME: APP_NAME || 'MobileApp',
  ENVIRONMENT: ENVIRONMENT || 'development',
  isDev: ENVIRONMENT === 'development',
  isProd: ENVIRONMENT === 'production',
};
