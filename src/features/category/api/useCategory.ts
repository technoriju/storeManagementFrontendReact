import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { Category } from '../../../types/models';

export const CATEGORY_QUERY_KEY = ['categories'];

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiCategories = await categoryRepository.fetchFromApi();
        if (apiCategories.length > 0) return apiCategories;
      } catch (error) {
        console.error("Fetch from API failed, returning local data", error);
      }
      return categoryRepository.getAll();
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const newCategory = {
        ...data,
        id: data.id || Math.random().toString(36).substring(7), // Simple ID gen if not provided
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert'
      } as Category;
      await categoryRepository.insert(newCategory);
      return newCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      const existing = await categoryRepository.getById(id);
      if (!existing) throw new Error("Category not found");
      
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update'
      } as Category;
      
      await categoryRepository.update(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await categoryRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};
