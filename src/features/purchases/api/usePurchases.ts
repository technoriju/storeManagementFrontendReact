import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { Purchase, PurchaseItem } from '../../../types/models';
import { useProductStore } from '../../products/store/productStore';

export const PURCHASE_QUERY_KEY = ['purchases'] as const;

export const usePurchases = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: PURCHASE_QUERY_KEY,
    queryFn: async () => {
      const local = await purchaseRepository.getAll();
      void purchaseRepository
        .fetchFromApi()
        .then(async () => {
          const fresh = await purchaseRepository.getAll();
          queryClient.setQueryData(PURCHASE_QUERY_KEY, fresh);
        })
        .catch((err) => {
          console.warn('[usePurchases] fetchFromApi error (offline):', err);
        });
      return local;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const usePurchase = (id: number | null | undefined) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...PURCHASE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const local = await purchaseRepository.getById(id);
      if (/^\d+$/.test(String(id)) && Number(id) > 0) {
        void purchaseRepository
          .fetchByIdFromApi(id)
          .then((fresh) => {
            if (fresh) {
              queryClient.setQueryData([...PURCHASE_QUERY_KEY, id], fresh);
            }
          })
          .catch(() => undefined);
      }
      return local;
    },
    enabled: !!id,
    refetchOnMount: 'always',
    staleTime: 0,
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

export const useUpdatePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      purchase,
      items,
    }: {
      id: number;
      purchase: Partial<Purchase>;
      items: Array<Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await purchaseRepository.updatePurchaseWithItems(id, purchase, items);
    },
    onSuccess: (updatedPurchase) => {
      queryClient.setQueryData(PURCHASE_QUERY_KEY, (old: Purchase[] | undefined) => {
        if (!old) return [updatedPurchase];
        return old.map((item) => (item.id === updatedPurchase.id ? { ...item, ...updatedPurchase } : item));
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_QUERY_KEY });
      try {
        useProductStore.getState().fetchProducts().catch(() => {});
      } catch (_) {}
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
      try {
        useProductStore.getState().fetchProducts().catch(() => {});
      } catch (_) {}
    },
  });
};
