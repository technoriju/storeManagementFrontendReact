import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string | number;
  email?: string;
  name?: string;
  fullName?: string;
  username?: string;
  role: string;
  permissions?: string[];
  companyId?: number;
  branchId?: number | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  permissions: string[];
  setUser: (user: User | null) => void;
  setPermissions: (permissions: string[]) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  permissions: [],

  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: !!user,
      permissions: Array.isArray(user?.permissions) ? user.permissions : state.permissions,
    })),
  
  setPermissions: (permissions) => set({ permissions }),
  
  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (userStr && userStr !== 'undefined' && accessToken) {
        const user = JSON.parse(userStr);
        set({ 
          user, 
          isAuthenticated: true,
          permissions: Array.isArray(user?.permissions) ? user.permissions : [],
        });
      }
    } catch (e) {
      console.error('Failed to initialize auth state', e);
    } finally {
      set({ isInitializing: false });
    }
  },

  logout: async () => {
    await Promise.all([
      AsyncStorage.removeItem('accessToken'),
      AsyncStorage.removeItem('refreshToken'),
      AsyncStorage.removeItem('user')
    ]);
    set({ user: null, isAuthenticated: false, permissions: [] });
  },
}));
