import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { Category } from '../types';

export const categoryService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get(API_ENDPOINTS.CATEGORIES.BASE);
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  },

  addCategory: async (categoryData: { name: string; description?: string }): Promise<Category> => {
    const response = await apiClient.post(API_ENDPOINTS.CATEGORIES.BASE, categoryData);
    return response.data;
  },

  updateCategory: async (id: number, categoryData: Partial<Category>): Promise<Category> => {
    const response = await apiClient.patch(API_ENDPOINTS.CATEGORIES.BY_ID(id), categoryData);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
  },
};
