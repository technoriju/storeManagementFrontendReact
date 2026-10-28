import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incomeCategoryRepository } from '../../../core/repositories/IncomeCategoryRepository';
import { IncomeCategory } from '../../../types/models';

export const INCOME_CATEGORIES_QUERY_KEY = ['income_categories'];

export const useIncomeCategories = () => {
  return useQuery({
    queryKey: INCOME_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiCategories = await incomeCategoryRepository.fetchFromApi();
        if (apiCategories.length > 0) return apiCategories;
      } catch (_) {}
      return incomeCategoryRepository.getAll();
    },
  });
};

export const useAddIncomeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<IncomeCategory>) => {
      const newCategory: IncomeCategory = {
        name: data.name || '',
        description: data.description || '',
        status: data.status || 'ACTIVE',
        ...data,
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      } as IncomeCategory;
      await incomeCategoryRepository.insert(newCategory);
      return newCategory;
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData(INCOME_CATEGORIES_QUERY_KEY, (oldData: IncomeCategory[] | undefined) => {
        if (!oldData) return [newCategory];
        return [...oldData, newCategory];
      });
      queryClient.invalidateQueries({ queryKey: INCOME_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateIncomeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IncomeCategory> }) => {
      const existing = await incomeCategoryRepository.getById(id);
      const updated: IncomeCategory = {
        ...(existing || {}),
        id,
        ...data,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
      } as IncomeCategory;

      await incomeCategoryRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(INCOME_CATEGORIES_QUERY_KEY, (oldData: IncomeCategory[] | undefined) => {
        if (!oldData) return [updated];
        return oldData.map((item) => (item.id === updated.id ? updated : item));
      });
      queryClient.invalidateQueries({ queryKey: INCOME_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteIncomeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await incomeCategoryRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(INCOME_CATEGORIES_QUERY_KEY, (oldData: IncomeCategory[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: INCOME_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};
