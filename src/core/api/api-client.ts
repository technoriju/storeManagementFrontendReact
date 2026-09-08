import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Env } from '../env';

export const apiClient = axios.create({
  baseURL: Env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setupInterceptors = (onUnauthorized: () => void) => {
  apiClient.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Try to refresh token
          const { data } = await axios.post(`${Env.API_URL}/auth/refresh`, {
            refreshToken,
          });

          await AsyncStorage.setItem('accessToken', data.accessToken);
          if (data.refreshToken) {
            await AsyncStorage.setItem('refreshToken', data.refreshToken);
          }

          // Retry the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh token failed
          await Promise.all([
            AsyncStorage.removeItem('accessToken'),
            AsyncStorage.removeItem('refreshToken'),
            AsyncStorage.removeItem('user')
          ]);
          onUnauthorized();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};
