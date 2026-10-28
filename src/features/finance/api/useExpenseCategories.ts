import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseCategoryRepository } from '../../../core/repositories/ExpenseCategoryRepository';
import { ExpenseCategory } from '../../../types/models';

export const EXPENSE_CATEGORIES_QUERY_KEY = ['expense_categories'];

export const useExpenseCategories = () => {
  return useQuery({
    queryKey: EXPENSE_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiCategories = await expenseCategoryRepository.fetchFromApi();
        if (apiCategories.length > 0) return apiCategories;
      } catch (_) {}
      return expenseCategoryRepository.getAll();
    },
  });
};

export const useAddExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ExpenseCategory>) => {
      const newCategory: ExpenseCategory = {
        name: data.name || '',
        description: data.description || '',
        status: data.status || 'ACTIVE',
        ...data,
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      } as ExpenseCategory;
      await expenseCategoryRepository.insert(newCategory);
      return newCategory;
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData(EXPENSE_CATEGORIES_QUERY_KEY, (oldData: ExpenseCategory[] | undefined) => {
        if (!oldData) return [newCategory];
        return [...oldData, newCategory];
      });
      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ExpenseCategory> }) => {
      const existing = await expenseCategoryRepository.getById(id);
      const updated: ExpenseCategory = {
        ...(existing || {}),
        id,
        ...data,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
      } as ExpenseCategory;

      await expenseCategoryRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(EXPENSE_CATEGORIES_QUERY_KEY, (oldData: ExpenseCategory[] | undefined) => {
        if (!oldData) return [updated];
        return oldData.map((item) => (item.id === updated.id ? updated : item));
      });
      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await expenseCategoryRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(EXPENSE_CATEGORIES_QUERY_KEY, (oldData: ExpenseCategory[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY, refetchType: 'none' });
    },
  });
};
