import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRepository } from '../../../core/repositories/CategoryRepository';
import { Category } from '../../../types/models';

export const CATEGORY_QUERY_KEY = ['categories'];

export const useCategories = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const localCategories = await categoryRepository.getAll();
      void categoryRepository.fetchFromApi().then(async () => {
        queryClient.setQueryData(CATEGORY_QUERY_KEY, await categoryRepository.getAll());
      });
      return localCategories;
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
    onSuccess: (newCategory) => {
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [newCategory];
        return [...oldData, newCategory];
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      const existing = await categoryRepository.getById(id);
      
      const updated = {
        ...(existing || {}),
        id,
        ...data,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update'
      } as Category;
      
      await categoryRepository.update(updated);
      return updated;
    },
    onSuccess: (updatedCategory) => {
      const syncedCategory = { ...updatedCategory, syncStatus: 'synced' as const };
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [syncedCategory];
        return oldData.map(c => String(c.id) === String(syncedCategory.id) ? syncedCategory : c);
      });
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
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(CATEGORY_QUERY_KEY, (oldData: Category[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(c => c.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};
