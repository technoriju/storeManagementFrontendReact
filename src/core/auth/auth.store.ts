import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setPermissions: (permissions) => set({ permissions }),
  
  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (userStr && accessToken) {
        set({ 
          user: JSON.parse(userStr), 
          isAuthenticated: true,
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
