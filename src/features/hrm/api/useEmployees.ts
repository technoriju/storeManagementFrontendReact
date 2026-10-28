import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeRepository } from '../../../core/repositories/EmployeeRepository';
import { Employee } from '../../../types/models';

export const EMPLOYEES_QUERY_KEY = ['hrm_employees'];

export const useEmployees = () => {
  return useQuery({
    queryKey: EMPLOYEES_QUERY_KEY,
    queryFn: async () => {
      return employeeRepository.getAll();
    },
  });
};

export const useAddEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const newEmp: Employee = {
        employeeCode: data.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        departmentId: data.departmentId,
        departmentName: data.departmentName || '',
        designationId: data.designationId,
        designationName: data.designationName || '',
        shiftId: data.shiftId,
        shiftName: data.shiftName || '',
        joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
        salary: Number(data.salary || 0),
        employmentType: data.employmentType || 'FULL_TIME',
        status: data.status || 'ACTIVE',
        address: data.address || '',
        emergencyContact: data.emergencyContact || '',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await employeeRepository.insert(newEmp);
      return newEmp;
    },
    onSuccess: (newEmp) => {
      queryClient.setQueryData(EMPLOYEES_QUERY_KEY, (old: Employee[] = []) => [...old, newEmp]);
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Employee> }) => {
      const existing = await employeeRepository.getById(id);
      const updated: Employee = {
        ...(existing || {}),
        ...data,
        id,
        firstName: data.firstName ?? existing?.firstName ?? '',
        lastName: data.lastName ?? existing?.lastName ?? '',
        email: data.email ?? existing?.email ?? '',
        phone: data.phone ?? existing?.phone ?? '',
        salary: data.salary !== undefined ? Number(data.salary) : Number(existing?.salary || 0),
        status: data.status ?? existing?.status ?? 'ACTIVE',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await employeeRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(EMPLOYEES_QUERY_KEY, (old: Employee[] = []) =>
        old.map((e) => (e.id === updated.id ? updated : e))
      );
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await employeeRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(EMPLOYEES_QUERY_KEY, (old: Employee[] = []) =>
        old.filter((e) => e.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
    },
  });
};
