import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderRepository } from '../../../core/repositories/PurchaseOrderRepository';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/models';

export const PURCHASE_ORDER_QUERY_KEY = ['purchase_orders'] as const;

export const usePurchaseOrders = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: PURCHASE_ORDER_QUERY_KEY,
    queryFn: async () => {
      const local = await purchaseOrderRepository.getAll();
      void purchaseOrderRepository
        .fetchFromApi()
        .then(async () => {
          const fresh = await purchaseOrderRepository.getAll();
          queryClient.setQueryData(PURCHASE_ORDER_QUERY_KEY, fresh);
        })
        .catch((err) => {
          console.warn('[usePurchaseOrders] fetchFromApi error (offline):', err);
        });
      return local;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const usePurchaseOrder = (id: number | null | undefined) => {
  return useQuery({
    queryKey: [...PURCHASE_ORDER_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return await purchaseOrderRepository.getById(id);
    },
    enabled: !!id,
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await purchaseOrderRepository.createPurchaseOrderWithItems(order, items);
    },
    onSuccess: (newOrder) => {
      queryClient.setQueryData(PURCHASE_ORDER_QUERY_KEY, (old: PurchaseOrder[] | undefined) => {
        return old ? [newOrder, ...old] : [newOrder];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_QUERY_KEY });
    },
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await purchaseOrderRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(PURCHASE_ORDER_QUERY_KEY, (old: PurchaseOrder[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_QUERY_KEY });
    },
  });
};
