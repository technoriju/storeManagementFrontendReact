import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { Purchase, PurchaseItem } from '../../../types/models';
import { useProductStore } from '../../products/store/productStore';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';

export const PURCHASE_QUERY_KEY = ['purchases'] as const;

export interface PaginatedPurchasesResult {
  data: Purchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchPaginatedPurchases = async (params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedPurchasesResult> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const search = params.search || '';

  try {
    const response = await apiClient.get(API_ENDPOINTS.PURCHASES.BASE, {
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
    console.warn('[fetchPaginatedPurchases] API failed, falling back to SQLite:', err.message);
  }

  return await purchaseRepository.getPaginated({ page, limit, search });
};

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
