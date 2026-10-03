import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { Sale, SaleItem } from '../../../types/models';

export const SALE_QUERY_KEY = ['sales'] as const;

export const useSales = () => {
  return useQuery({
    queryKey: SALE_QUERY_KEY,
    queryFn: async () => {
      const items = await saleRepository.getAll();
      return items;
    },
  });
};

export const useSale = (id: number | null | undefined) => {
  return useQuery({
    queryKey: [...SALE_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return await saleRepository.getById(id);
    },
    enabled: !!id,
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
