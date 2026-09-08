import { apiClient } from '../api/api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth.store';

export const AuthService = {
  login: async (email: string, password: string) => {
    try {
      useAuthStore.getState().setLoading(true);
      
      const { data } = await apiClient.post('/auth/login', { email, password });
      
      await Promise.all([
        AsyncStorage.setItem('accessToken', data.accessToken),
        AsyncStorage.setItem('refreshToken', data.refreshToken),
        AsyncStorage.setItem('user', JSON.stringify(data.user)),
      ]);
      
      useAuthStore.getState().setUser(data.user);
      return data.user;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  },

  loadPermissions: async () => {
    try {
      // Assuming a permissions endpoint exists
      const { data } = await apiClient.get('/auth/permissions');
      useAuthStore.getState().setPermissions(data.permissions || []);
    } catch (e) {
      console.error('Failed to load permissions', e);
      // Even if permissions fail, we shouldn't necessarily block the app,
      // or we could throw depending on requirements
      useAuthStore.getState().setPermissions([]);
    }
  }
};
