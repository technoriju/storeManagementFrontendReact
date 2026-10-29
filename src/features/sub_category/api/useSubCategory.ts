import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subCategoryRepository } from '../../../core/repositories/SubCategoryRepository';
import { SubCategory } from '../../../types/models';

export const SUBCATEGORY_QUERY_KEY = ['subcategories'] as const;

export const useSubCategories = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: SUBCATEGORY_QUERY_KEY,
    queryFn: async () => {
      try { await subCategoryRepository.fetchFromApi(); } catch (_) {}
      return subCategoryRepository.getAll();
    },
  });
};

export const useAddSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      return await subCategoryRepository.createDirect(data);
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(SUBCATEGORY_QUERY_KEY, (old: SubCategory[] | undefined) => {
        return old ? [...old, newItem] : [newItem];
      });
      queryClient.invalidateQueries({ queryKey: SUBCATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubCategory) => {
      return await subCategoryRepository.updateDirect(data);
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(SUBCATEGORY_QUERY_KEY, (old: SubCategory[] | undefined) => {
        return old ? old.map(item => item.id === updatedItem.id ? updatedItem : item) : [updatedItem];
      });
      queryClient.invalidateQueries({ queryKey: SUBCATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await subCategoryRepository.delete(id, true);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(SUBCATEGORY_QUERY_KEY, (old: SubCategory[] | undefined) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: SUBCATEGORY_QUERY_KEY, refetchType: 'none' });
    },
  });
};


