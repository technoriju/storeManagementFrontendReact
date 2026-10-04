import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { Sale, SaleItem } from '../../../types/models';

export const SALE_QUERY_KEY = ['sales'] as const;

export const useSales = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: SALE_QUERY_KEY,
    queryFn: async () => {
      const local = await saleRepository.getAll();
      void saleRepository
        .fetchFromApi()
        .then(async () => {
          const fresh = await saleRepository.getAll();
          queryClient.setQueryData(SALE_QUERY_KEY, fresh);
        })
        .catch((err) => {
          console.warn('[useSales] fetchFromApi error (offline):', err);
        });
      return local;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const useSale = (id: number | null | undefined) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...SALE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const local = await saleRepository.getById(id);
      if (/^\d+$/.test(String(id)) && Number(id) > 0) {
        void saleRepository
          .fetchByIdFromApi(id)
          .then((fresh) => {
            if (fresh) {
              queryClient.setQueryData([...SALE_QUERY_KEY, id], fresh);
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

export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sale,
      items,
    }: {
      sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<SaleItem, 'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await saleRepository.createSaleWithItems(sale, items);
    },
    onSuccess: (newSale) => {
      queryClient.setQueryData(SALE_QUERY_KEY, (old: Sale[] | undefined) => {
        return old ? [newSale, ...old] : [newSale];
      });
      queryClient.invalidateQueries({ queryKey: SALE_QUERY_KEY });
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await saleRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(SALE_QUERY_KEY, (old: Sale[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: SALE_QUERY_KEY });
    },
  });
};
