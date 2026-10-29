import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { Category } from '../../../types/models';

export const CATEGORY_QUERY_KEY = ['categories'];

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: async () => {
      try {
        // Return full API result. Local DB can lag during multi-row sync.
        const apiCategories = await categoryRepository.fetchFromApi();
        if (apiCategories.length > 0) return apiCategories;
      } catch (_) {
        // Fall back to local data while offline.
      }
      return categoryRepository.getAll();
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      return await categoryRepository.createDirect(data);
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [newCategory];
        return [...oldData, newCategory];
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Category> }) => {
      return await categoryRepository.updateDirect(id, data);
    },
    onSuccess: (updatedCategory) => {
      const syncedCategory = { ...updatedCategory, syncStatus: 'synced' as const };
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [syncedCategory];
        return oldData.map(c => String(c.id) === String(syncedCategory.id) ? syncedCategory : c);
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Category) => {
      await categoryRepository.delete(category);
      return category.id;
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(c => String(c.id) !== String(deletedId));
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};




