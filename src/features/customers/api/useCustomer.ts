import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerRepository } from '../../../core/repositories/CustomerRepository';
import { Customer } from '../../../types/models';

export const CUSTOMER_QUERY_KEY = ['customers'] as const;

export const useCustomers = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: CUSTOMER_QUERY_KEY,
    queryFn: async () => {
      const localItems = await customerRepository.getAll();

      void customerRepository.fetchFromApi().then(async () => {
          queryClient.setQueryData(CUSTOMER_QUERY_KEY, await customerRepository.getAll());
        }).catch(() => undefined);

      return localItems;
    },
  });
};

export const useAddCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>) => {
      const newEntity: Customer = {
        ...data,
        id: Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      };
      await customerRepository.insert(newEntity, true);
      return newEntity;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, (old: Customer[] | undefined) => {
        return old ? [...old, newItem] : [newItem];
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Customer) => {
      const updatedEntity = {
        ...data,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update' as const,
      };
      await customerRepository.update(updatedEntity, true);
      return updatedEntity;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, (old: Customer[] | undefined) => {
        return old ? old.map(item => item.id === updatedItem.id ? updatedItem : item) : [updatedItem];
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await customerRepository.delete(id, true);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(CUSTOMER_QUERY_KEY, (old: Customer[] | undefined) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEY, refetchType: 'none' });
    },
  });
};



