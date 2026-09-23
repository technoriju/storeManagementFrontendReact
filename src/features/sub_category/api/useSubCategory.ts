import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subCategoryRepository } from '../../../core/repositories/SubCategoryRepository';
import { SubCategory } from '../../../types/models';

export const useSubCategories = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const items = await subCategoryRepository.getAll();
      const hasPending = items.some(item => item.syncStatus !== 'synced');
      
      if (hasPending) {
        subCategoryRepository.fetchFromApi().then(() => {
          queryClient.invalidateQueries({ queryKey: ['subcategories'] });
        });
      }
      return items;
    },
  });
};

export const useAddSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      const newEntity: SubCategory = {
        ...data,
        id: Math.random().toString(36).substring(7),
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      };
      await subCategoryRepository.insert(newEntity, true);
      return newEntity;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(['subcategories'], (old: SubCategory[] | undefined) => {
        return old ? [...old, newItem] : [newItem];
      });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
};

export const useUpdateSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubCategory) => {
      const updatedEntity = {
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update' as const,
      };
      await subCategoryRepository.update(updatedEntity, true);
      return updatedEntity;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(['subcategories'], (old: SubCategory[] | undefined) => {
        return old ? old.map(item => item.id === updatedItem.id ? updatedItem : item) : [updatedItem];
      });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
};

export const useDeleteSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await subCategoryRepository.delete(id, true);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['subcategories'], (old: SubCategory[] | undefined) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
};
