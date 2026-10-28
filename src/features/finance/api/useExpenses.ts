import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseRepository } from '../../../core/repositories/ExpenseRepository';
import { Expense } from '../../../types/models';

export const EXPENSES_QUERY_KEY = ['expenses'];

export const useExpenses = () => {
  return useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiExpenses = await expenseRepository.fetchFromApi();
        if (apiExpenses.length > 0) return apiExpenses;
      } catch (_) {}
      return expenseRepository.getAll();
    },
  });
};

export const useAddExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Expense>) => {
      const newExpense: Expense = {
        category: data.category || 'General',
        amount: Number(data.amount) || 0,
        date: data.date || new Date().toISOString().slice(0, 10),
        description: data.description || '',
        reference: data.reference || '',
        ...data,
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      } as Expense;
      await expenseRepository.insert(newExpense);
      return newExpense;
    },
    onSuccess: (newExpense) => {
      queryClient.setQueryData(EXPENSES_QUERY_KEY, (oldData: Expense[] | undefined) => {
        if (!oldData) return [newExpense];
        return [newExpense, ...oldData];
      });
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Expense> }) => {
      const existing = await expenseRepository.getById(id);
      const updated: Expense = {
        ...(existing || {}),
        id,
        ...data,
        amount: data.amount !== undefined ? Number(data.amount) : (existing?.amount || 0),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
      } as Expense;

      await expenseRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(EXPENSES_QUERY_KEY, (oldData: Expense[] | undefined) => {
        if (!oldData) return [updated];
        return oldData.map((item) => (item.id === updated.id ? updated : item));
      });
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await expenseRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(EXPENSES_QUERY_KEY, (oldData: Expense[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY, refetchType: 'none' });
    },
  });
};
