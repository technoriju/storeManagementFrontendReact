import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseReturnRepository } from '../../../core/repositories/PurchaseReturnRepository';
import { PurchaseReturn, PurchaseReturnItem } from '../../../types/models';

export const PURCHASE_RETURN_QUERY_KEY = ['purchase_returns'] as const;

export const usePurchaseReturns = () => {
  return useQuery({
    queryKey: PURCHASE_RETURN_QUERY_KEY,
    queryFn: async () => {
      const items = await purchaseReturnRepository.getAll();
      return items;
    },
  });
};

export const usePurchaseReturn = (id: number | null | undefined) => {
  return useQuery({
    queryKey: [...PURCHASE_RETURN_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return await purchaseReturnRepository.getById(id);
    },
    enabled: !!id,
  });
};

export const useCreatePurchaseReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseReturn,
      items,
    }: {
      purchaseReturn: Omit<PurchaseReturn, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<PurchaseReturnItem, 'id' | 'purchaseReturnId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await purchaseReturnRepository.createPurchaseReturnWithItems(purchaseReturn, items);
    },
    onSuccess: (newReturn) => {
      queryClient.setQueryData(PURCHASE_RETURN_QUERY_KEY, (old: PurchaseReturn[] | undefined) => {
        return old ? [newReturn, ...old] : [newReturn];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_RETURN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeletePurchaseReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await purchaseReturnRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(PURCHASE_RETURN_QUERY_KEY, (old: PurchaseReturn[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_RETURN_QUERY_KEY });
    },
  });
};
