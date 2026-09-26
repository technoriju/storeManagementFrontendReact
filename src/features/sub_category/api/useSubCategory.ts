import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subCategoryRepository } from '../../../core/repositories/SubCategoryRepository';
import { SubCategory } from '../../../types/models';

export const SUBCATEGORY_QUERY_KEY = ['subcategories'] as const;

export const useSubCategories = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: SUBCATEGORY_QUERY_KEY,
    queryFn: async () => {
      const localItems = await subCategoryRepository.getAll();

      // Render local data first. Pull server data in background.
      void subCategoryRepository.fetchFromApi().then(async (serverItems) => {
        const latestLocalItems = await subCategoryRepository.getAll();
        queryClient.setQueryData(
          SUBCATEGORY_QUERY_KEY,
          latestLocalItems.length > 0 ? latestLocalItems : serverItems,
        );
      });

      return localItems;
    },
  });
};

export const useAddSubCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      const newEntity: SubCategory = {
        ...data,
        id: Math.floor(Math.random() * -1000000000),
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      };
      await subCategoryRepository.insert(newEntity, true);
      return newEntity;
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
      const updatedEntity = {
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update' as const,
      };
      await subCategoryRepository.update(updatedEntity, true);
      return updatedEntity;
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


