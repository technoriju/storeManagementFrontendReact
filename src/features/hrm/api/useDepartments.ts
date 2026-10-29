import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentRepository } from '../../../core/repositories/DepartmentRepository';
import { Department } from '../../../types/models';

export const DEPARTMENTS_QUERY_KEY = ['hrm_departments'];

export const useDepartments = () => {
  return useQuery({
    queryKey: DEPARTMENTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiData = await departmentRepository.fetchFromApi();
        if (apiData && apiData.length > 0) return apiData;
      } catch (_) {}
      return departmentRepository.getAll();
    },
  });
};

export const useAddDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Department>) => {
      const newDept: Department = {
        name: data.name || '',
        code: data.code || `DEP-${Date.now().toString().slice(-4)}`,
        description: data.description || '',
        managerName: data.managerName || '',
        status: data.status || 'ACTIVE',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await departmentRepository.insert(newDept);
      return newDept;
    },
    onSuccess: (newDept) => {
      queryClient.setQueryData(DEPARTMENTS_QUERY_KEY, (old: Department[] = []) => [...old, newDept]);
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Department> }) => {
      const existing = await departmentRepository.getById(id);
      const updated: Department = {
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
      await departmentRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(DEPARTMENTS_QUERY_KEY, (old: Department[] = []) =>
        old.map((d) => (d.id === updated.id ? updated : d))
      );
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await departmentRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(DEPARTMENTS_QUERY_KEY, (old: Department[] = []) =>
        old.filter((d) => d.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_QUERY_KEY });
    },
  });
};
