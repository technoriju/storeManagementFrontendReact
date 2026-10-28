import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designationRepository } from '../../../core/repositories/DesignationRepository';
import { Designation } from '../../../types/models';

export const DESIGNATIONS_QUERY_KEY = ['hrm_designations'];

export const useDesignations = () => {
  return useQuery({
    queryKey: DESIGNATIONS_QUERY_KEY,
    queryFn: async () => {
      return designationRepository.getAll();
    },
  });
};

export const useAddDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Designation>) => {
      const newDesig: Designation = {
        name: data.name || '',
        code: data.code || `DES-${Date.now().toString().slice(-4)}`,
        departmentId: data.departmentId,
        departmentName: data.departmentName || '',
        description: data.description || '',
        status: data.status || 'ACTIVE',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await designationRepository.insert(newDesig);
      return newDesig;
    },
    onSuccess: (newDesig) => {
      queryClient.setQueryData(DESIGNATIONS_QUERY_KEY, (old: Designation[] = []) => [...old, newDesig]);
      queryClient.invalidateQueries({ queryKey: DESIGNATIONS_QUERY_KEY });
    },
  });
};

export const useUpdateDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Designation> }) => {
      const existing = await designationRepository.getById(id);
      const updated: Designation = {
        ...(existing || {}),
        ...data,
        id,
        name: data.name ?? existing?.name ?? '',
        code: data.code ?? existing?.code ?? '',
        status: data.status ?? existing?.status ?? 'ACTIVE',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await designationRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(DESIGNATIONS_QUERY_KEY, (old: Designation[] = []) =>
        old.map((d) => (d.id === updated.id ? updated : d))
      );
      queryClient.invalidateQueries({ queryKey: DESIGNATIONS_QUERY_KEY });
    },
  });
};

export const useDeleteDesignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await designationRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(DESIGNATIONS_QUERY_KEY, (old: Designation[] = []) =>
        old.filter((d) => d.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: DESIGNATIONS_QUERY_KEY });
    },
  });
};
