import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleRepository } from '../../../core/repositories/SaleRepository';
import { Sale, SaleItem } from '../../../types/models';
import { useProductStore } from '../../products/store/productStore';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';

export const SALE_QUERY_KEY = ['sales'] as const;

export interface PaginatedSalesResult {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchPaginatedSales = async (params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedSalesResult> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const search = params.search || '';

  try {
    const response = await apiClient.get(API_ENDPOINTS.SALES.BASE, {
      params: {
        page,
        limit,
        search: search.trim() || undefined,
      },
    });

    const raw = response.data;
    if (raw?.data && typeof raw.data === 'object' && Array.isArray(raw.data.data)) {
      const p = raw.data;
      return {
        data: p.data,
        total: Number(p.total ?? p.data.length),
        page: Number(p.page ?? page),
        limit: Number(p.limit ?? limit),
        totalPages: Number(p.totalPages ?? Math.max(1, Math.ceil((p.total ?? p.data.length) / limit))),
      };
    }

    if (raw && typeof raw === 'object' && Array.isArray(raw.data) && (raw.total !== undefined || raw.totalPages !== undefined)) {
      return {
        data: raw.data,
        total: Number(raw.total ?? raw.data.length),
        page: Number(raw.page ?? page),
        limit: Number(raw.limit ?? limit),
        totalPages: Number(raw.totalPages ?? Math.max(1, Math.ceil((raw.total ?? raw.data.length) / limit))),
      };
    }

    const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : null);
    if (Array.isArray(list)) {
      const offset = (page - 1) * limit;
      return {
        data: list.slice(offset, offset + limit),
        total: list.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(list.length / limit)),
      };
    }
  } catch (err: any) {
    console.warn('[fetchPaginatedSales] API failed, falling back to SQLite:', err.message);
  }

  return await saleRepository.getPaginated({ page, limit, search });
};

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
        if (!old) return [newSale];
        const filtered = old.filter(
          (item) =>
            item.id !== newSale.id &&
            item.invoiceNumber !== newSale.invoiceNumber &&
            (!newSale.reference || item.reference !== newSale.reference)
        );
        return [newSale, ...filtered];
      });
      queryClient.invalidateQueries({ queryKey: SALE_QUERY_KEY });
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      sale,
      items,
    }: {
      id: number;
      sale: Partial<Sale>;
      items: Array<Omit<SaleItem, 'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>;
    }) => {
      return await saleRepository.updateSaleWithItems(id, sale, items);
    },
    onSuccess: (updatedSale) => {
      queryClient.setQueryData(SALE_QUERY_KEY, (old: Sale[] | undefined) => {
        if (!old) return [updatedSale];
        return old.map((item) => (item.id === updatedSale.id ? { ...item, ...updatedSale } : item));
      });
      queryClient.invalidateQueries({ queryKey: SALE_QUERY_KEY });
      try {
        useProductStore.getState().fetchProducts().catch(() => {});
      } catch (_) {}
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
      try {
        useProductStore.getState().fetchProducts().catch(() => {});
      } catch (_) {}
    },
  });
};
