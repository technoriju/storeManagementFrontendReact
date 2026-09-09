import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './auth.store';

export const AuthService = {
  login: async (username: string, password: string, deviceId: string = "string") => {
    try {
      useAuthStore.getState().setLoading(true);
      
      const { data } = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { username, password, deviceId });
      
      console.log('Login API Response:', data);
      const user = data?.user || { id: '1', name: username, email: '', role: 'user' };
      const accessToken = data?.accessToken || 'dummy_access';
      const refreshToken = data?.refreshToken || 'dummy_refresh';

      await Promise.all([
        AsyncStorage.setItem('accessToken', accessToken),
        AsyncStorage.setItem('refreshToken', refreshToken),
        AsyncStorage.setItem('user', JSON.stringify(user)),
      ]);
      
      useAuthStore.getState().setUser(user);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      useAuthStore.getState().setLoading(false);
    }
  },

  loadPermissions: async () => {
    try {
      // Assuming a permissions endpoint exists
      const { data } = await apiClient.get(API_ENDPOINTS.AUTH.PERMISSIONS);
      useAuthStore.getState().setPermissions(data.permissions || []);
    } catch (e) {
      console.error('Failed to load permissions', e);
      // Even if permissions fail, we shouldn't necessarily block the app,
      // or we could throw depending on requirements
      useAuthStore.getState().setPermissions([]);
    }
  }
};
