import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationRepository } from '../../../core/repositories/QuotationRepository';
import { Quotation, QuotationItem } from '../../../types/models';

export const QUOTATION_QUERY_KEY = ['quotations'] as const;

export const useQuotations = () => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: QUOTATION_QUERY_KEY,
    queryFn: async () => {
      const local = await quotationRepository.getAll();
      void quotationRepository
        .fetchFromApi()
        .then(async () => {
          const fresh = await quotationRepository.getAll();
          queryClient.setQueryData(QUOTATION_QUERY_KEY, fresh);
        })
        .catch((err) => {
          console.warn('[useQuotations] fetchFromApi error (offline):', err);
        });
      return local;
    },
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const useQuotation = (id: number | null | undefined) => {
  return useQuery({
    queryKey: [...QUOTATION_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return await quotationRepository.getById(id);
    },
    enabled: !!id,
    refetchOnMount: 'always',
    staleTime: 0,
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quotation,
      items,
    }: {
      quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>;
      items: Array<Omit<QuotationItem, 'id' | 'quotationId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await quotationRepository.createQuotationWithItems(quotation, items);
    },
    onSuccess: (newQuotation) => {
      queryClient.setQueryData(QUOTATION_QUERY_KEY, (old: Quotation[] | undefined) => {
        return old ? [newQuotation, ...old] : [newQuotation];
      });
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEY });
    },
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await quotationRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(QUOTATION_QUERY_KEY, (old: Quotation[] | undefined) => {
        return old ? old.filter((item) => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: QUOTATION_QUERY_KEY });
    },
  });
};
