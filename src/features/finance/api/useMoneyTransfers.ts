import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moneyTransferRepository } from '../../../core/repositories/MoneyTransferRepository';
import { MoneyTransfer } from '../../../types/models';
import { BANK_ACCOUNTS_QUERY_KEY } from './useBankAccounts';

export const MONEY_TRANSFERS_QUERY_KEY = ['money_transfers'];

export const useMoneyTransfers = (query?: any) => {
  return useQuery({
    queryKey: [...MONEY_TRANSFERS_QUERY_KEY, query],
    queryFn: async () => {
      try {
        const apiTransfers = await moneyTransferRepository.fetchFromApi();
        if (apiTransfers.length > 0) return apiTransfers;
      } catch (_) {}
      return moneyTransferRepository.getAll();
    },
  });
};

export const useAddMoneyTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<MoneyTransfer>) => {
      const newTransfer: MoneyTransfer = {
        fromAccountId: Number(data.fromAccountId),
        toAccountId: Number(data.toAccountId),
        fromAccountName: data.fromAccountName || '',
        toAccountName: data.toAccountName || '',
        amount: Number(data.amount) || 0,
        transferDate: data.transferDate || new Date().toISOString().slice(0, 10),
        reference: data.reference || '',
        description: data.description || '',
        status: data.status || 'COMPLETED',
        ...data,
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      } as MoneyTransfer;
      await moneyTransferRepository.insert(newTransfer);
      return newTransfer;
    },
    onSuccess: (newTransfer) => {
      queryClient.setQueryData(MONEY_TRANSFERS_QUERY_KEY, (oldData: MoneyTransfer[] | undefined) => {
        if (!oldData) return [newTransfer];
        return [newTransfer, ...oldData];
      });
      queryClient.invalidateQueries({ queryKey: MONEY_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });
    },
  });
};

export const useDeleteMoneyTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await moneyTransferRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(MONEY_TRANSFERS_QUERY_KEY, (oldData: MoneyTransfer[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: MONEY_TRANSFERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });
    },
  });
};
