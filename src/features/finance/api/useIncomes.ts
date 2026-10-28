import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incomeRepository } from '../../../core/repositories/IncomeRepository';
import { Income } from '../../../types/models';

export const INCOMES_QUERY_KEY = ['incomes'];

export const useIncomes = () => {
  return useQuery({
    queryKey: INCOMES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiIncomes = await incomeRepository.fetchFromApi();
        if (apiIncomes.length > 0) return apiIncomes;
      } catch (_) {}
      return incomeRepository.getAll();
    },
  });
};

export const useAddIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Income>) => {
      const newIncome: Income = {
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
      } as Income;
      await incomeRepository.insert(newIncome);
      return newIncome;
    },
    onSuccess: (newIncome) => {
      queryClient.setQueryData(INCOMES_QUERY_KEY, (oldData: Income[] | undefined) => {
        if (!oldData) return [newIncome];
        return [newIncome, ...oldData];
      });
      queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Income> }) => {
      const existing = await incomeRepository.getById(id);
      const updated: Income = {
        ...(existing || {}),
        id,
        ...data,
        amount: data.amount !== undefined ? Number(data.amount) : (existing?.amount || 0),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
      } as Income;

      await incomeRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(INCOMES_QUERY_KEY, (oldData: Income[] | undefined) => {
        if (!oldData) return [updated];
        return oldData.map((item) => (item.id === updated.id ? updated : item));
      });
      queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await incomeRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(INCOMES_QUERY_KEY, (oldData: Income[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: INCOMES_QUERY_KEY, refetchType: 'none' });
    },
  });
};
