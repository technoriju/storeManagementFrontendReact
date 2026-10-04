import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleReturnRepository } from '../../../core/repositories/SaleReturnRepository';
import { SaleReturn, SaleReturnItem } from '../../../types/models';

export const SALE_RETURN_QUERY_KEY = ['sale_returns'] as const;

export const useSalesReturns = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: SALE_RETURN_QUERY_KEY,
    queryFn: async () => {
      const local = await saleReturnRepository.getAll();
      void saleReturnRepository
        .fetchFromApi()
        .then(async () => {
          const fresh = await saleReturnRepository.getAll();
          queryClient.setQueryData(SALE_RETURN_QUERY_KEY, fresh);
        })
        .catch((err) => {
          console.warn('[useSalesReturns] fetchFromApi error (offline):', err);
        });
      return local;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const useSaleReturn = (id: number | null | undefined) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...SALE_RETURN_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const local = await saleReturnRepository.getById(id);
      if (/^\d+$/.test(String(id)) && Number(id) > 0) {
        void saleReturnRepository
          .fetchByIdFromApi(id)
          .then((fresh) => {
            if (fresh) {
              queryClient.setQueryData([...SALE_RETURN_QUERY_KEY, id], fresh);
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

export const useCreateSaleReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleReturn,
      items,
    }: {
      saleReturn: Omit<SaleReturn, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<SaleReturnItem, 'id' | 'saleReturnId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await saleReturnRepository.createSaleReturnWithItems(saleReturn, items);
    },
    onSuccess: (newReturn) => {
      queryClient.setQueryData(SALE_RETURN_QUERY_KEY, (old: SaleReturn[] | undefined) => {
        return old ? [newReturn, ...old] : [newReturn];
      });
      queryClient.invalidateQueries({ queryKey: SALE_RETURN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteSaleReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await saleReturnRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(SALE_RETURN_QUERY_KEY, (old: SaleReturn[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: SALE_RETURN_QUERY_KEY });
    },
  });
};
