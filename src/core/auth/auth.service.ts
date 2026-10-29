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
      const user = data?.user || data?.data?.user || { id: '1', name: username, email: '', role: 'user' };
      const accessToken = data?.accessToken || data?.token || data?.data?.token || data?.data?.accessToken || 'dummy_access';
      const refreshToken = data?.refreshToken || data?.data?.refreshToken || 'dummy_refresh';

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
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      const data = response.data?.data || response.data;
      if (data && Array.isArray(data.permissions)) {
        useAuthStore.getState().setPermissions(data.permissions);
        const currentUser = useAuthStore.getState().user;
        const updatedUser = {
          ...(currentUser || {}),
          ...data,
          permissions: data.permissions,
        };
        useAuthStore.getState().setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        return data.permissions;
      }
    } catch (e) {
      console.warn('Could not load profile from /auth/me, falling back to local user:', e);
    }

    const current = useAuthStore.getState().permissions;
    if (!current || current.length === 0) {
      const user = useAuthStore.getState().user;
      if (user?.permissions && Array.isArray(user.permissions)) {
        useAuthStore.getState().setPermissions(user.permissions);
      }
    }
    return useAuthStore.getState().permissions;
  }
};
