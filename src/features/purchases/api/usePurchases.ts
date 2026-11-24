import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseRepository } from '../../../core/repositories/PurchaseRepository';
import { Purchase, PurchaseItem } from '../../../types/models';
import { useProductStore } from '../../products/store/productStore';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { SUPPLIER_QUERY_KEY } from '../../suppliers/api/useSupplier';

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
    let serverData: Purchase[] = [];
    let serverTotal = 0;
    let serverTotalPages = 1;

    if (raw?.data && typeof raw.data === 'object' && Array.isArray(raw.data.data)) {
      const p = raw.data;
      serverData = p.data;
      serverTotal = Number(p.total ?? p.data.length);
      serverTotalPages = Number(p.totalPages ?? Math.max(1, Math.ceil(serverTotal / limit)));
    } else if (raw && typeof raw === 'object' && Array.isArray(raw.data) && (raw.total !== undefined || raw.totalPages !== undefined)) {
      serverData = raw.data;
      serverTotal = Number(raw.total ?? raw.data.length);
      serverTotalPages = Number(raw.totalPages ?? Math.max(1, Math.ceil(serverTotal / limit)));
    } else {
      const list = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : null);
      if (Array.isArray(list)) {
        const offset = (page - 1) * limit;
        serverData = list.slice(offset, offset + limit);
        serverTotal = list.length;
        serverTotalPages = Math.max(1, Math.ceil(list.length / limit));
      }
    }

    // Merge any local pending purchases that aren't on the server yet
    try {
      const localPending = await purchaseRepository.getPendingPurchases(search);
      if (localPending.length > 0) {
        const existingRefs = new Set(
          serverData.map((p: any) => String(p.invoiceNumber || p.reference || p.id).toUpperCase())
        );
        const missingLocals = localPending.filter(
          (p: any) => !existingRefs.has(String(p.invoiceNumber || p.reference || p.id).toUpperCase())
        );
        if (missingLocals.length > 0) {
          serverData = [...missingLocals, ...serverData];
          serverTotal += missingLocals.length;
          serverTotalPages = Math.max(1, Math.ceil(serverTotal / limit));
        }
      }
    } catch (_) {}

    serverData.sort((a: any, b: any) => {
      const timeA = new Date(a.date || a.purchaseDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.purchaseDate || b.createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      const cA = new Date(a.createdAt || 0).getTime();
      const cB = new Date(b.createdAt || 0).getTime();
      if (cB !== cA) return cB - cA;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    return {
      data: serverData,
      total: serverTotal,
      page,
      limit,
      totalPages: serverTotalPages,
    };
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
      let local = await purchaseRepository.getById(id);
      if (!local || !local.items || local.items.length === 0) {
        if (/^\d+$/.test(String(id)) && Number(id) > 0) {
          try {
            const fresh = await purchaseRepository.fetchByIdFromApi(id);
            if (fresh) return fresh;
          } catch (_) {}
        }
      } else if (/^\d+$/.test(String(id)) && Number(id) > 0) {
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
        if (!old) return [newPurchase];
        const filtered = old.filter(
          (item) =>
            item.id !== newPurchase.id &&
            item.reference !== newPurchase.reference
        );
        return [newPurchase, ...filtered];
      });
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
      // Update only modified items in product store in memory (avoids heavy 1,200+ product SQLite resync)
      try {
        const store = useProductStore.getState();
        if (newPurchase.items && Array.isArray(newPurchase.items)) {
          for (const it of newPurchase.items) {
            const pId = Number(it.productId);
            const found = store.products.find((p) => Number(p.id) === pId);
            if (found) {
              const conversion = Number(it.conversionRate || 1);
              const addedQty = it.unitType === 'base'
                ? Number(it.quantity || 0) * conversion
                : Number(it.quantity || 0);
              store.updateProduct({
                ...found,
                stockQuantity: Number(found.stockQuantity || 0) + addedQty,
              });
            }
          }
        }
      } catch (_) {}
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
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY });
    },
  });
};
