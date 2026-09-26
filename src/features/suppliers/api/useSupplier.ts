import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierRepository } from '../../../core/repositories/SupplierRepository';
import { Supplier } from '../../../types/models';

export const SUPPLIER_QUERY_KEY = ['suppliers'] as const;

export const useSuppliers = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: SUPPLIER_QUERY_KEY,
    queryFn: async () => {
      const localItems = await supplierRepository.getAll();

      void supplierRepository.fetchFromApi().then(async () => {
          queryClient.setQueryData(SUPPLIER_QUERY_KEY, await supplierRepository.getAll());
        }).catch(() => undefined);

      return localItems;
    },
  });
};

export const useAddSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      const newEntity: Supplier = {
        ...data,
        id: Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      };
      await supplierRepository.insert(newEntity, true);
      return newEntity;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(SUPPLIER_QUERY_KEY, (old: Supplier[] | undefined) => {
        return old ? [...old, newItem] : [newItem];
      });
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Supplier) => {
      const updatedEntity = {
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update' as const,
      };
      await supplierRepository.update(updatedEntity, true);
      return updatedEntity;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(SUPPLIER_QUERY_KEY, (old: Supplier[] | undefined) => {
        return old ? old.map(item => item.id === updatedItem.id ? updatedItem : item) : [updatedItem];
      });
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await supplierRepository.delete(id, true);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(SUPPLIER_QUERY_KEY, (old: Supplier[] | undefined) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY, refetchType: 'none' });
    },
  });
};



