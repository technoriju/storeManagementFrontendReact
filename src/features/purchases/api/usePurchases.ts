import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { Purchase, PurchaseItem } from '../../../types/models';

export const PURCHASE_QUERY_KEY = ['purchases'] as const;

export const usePurchases = () => {
  return useQuery({
    queryKey: PURCHASE_QUERY_KEY,
    queryFn: async () => {
      const items = await purchaseRepository.getAll();
      return items;
    },
  });
};

export const usePurchase = (id: number | null | undefined) => {
  return useQuery({
    queryKey: [...PURCHASE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return await purchaseRepository.getById(id);
    },
    enabled: !!id,
  });
};

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchase,
      items,
    }: {
      purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await purchaseRepository.createPurchaseWithItems(purchase, items);
    },
    onSuccess: (newPurchase) => {
      queryClient.setQueryData(PURCHASE_QUERY_KEY, (old: Purchase[] | undefined) => {
        return old ? [newPurchase, ...old] : [newPurchase];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_QUERY_KEY });
    },
  });
};

export const useDeletePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await purchaseRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(PURCHASE_QUERY_KEY, (old: Purchase[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_QUERY_KEY });
    },
  });
};
