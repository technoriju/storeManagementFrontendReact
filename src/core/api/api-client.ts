import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Env } from '../env';
import { API_ENDPOINTS } from './api-urls';

export const apiClient = axios.create({
  baseURL: Env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

export const setupInterceptors = (onUnauthorized: () => void) => {
  apiClient.interceptors.request.use(
    async (config) => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers || {};
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
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
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest._retry = true;
              if (originalRequest.headers) {
                if (typeof originalRequest.headers.set === 'function') {
                  originalRequest.headers.set('Authorization', `Bearer ${token}`);
                } else {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                }
              }
              return apiClient(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Try to refresh token
          const { data } = await axios.post(`${Env.API_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
            refreshToken,
          });

          const newAccessToken = data?.accessToken || data?.token || data?.data?.token || data?.data?.accessToken;
          const newRefreshToken = data?.refreshToken || data?.data?.refreshToken;

          if (!newAccessToken) {
            throw new Error('Refresh failed, no access token in response');
          }

          await AsyncStorage.setItem('accessToken', newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
          }

          processQueue(null, newAccessToken);

          // Retry the original request
          if (originalRequest.headers) {
            if (typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
            } else {
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            }
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // Refresh token failed
          await Promise.all([
            AsyncStorage.removeItem('accessToken'),
            AsyncStorage.removeItem('refreshToken'),
            AsyncStorage.removeItem('user')
          ]);
          onUnauthorized();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};
