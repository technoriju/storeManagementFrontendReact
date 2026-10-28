import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollRepository } from '../../../core/repositories/PayrollRepository';
import { Payroll } from '../../../types/models';

export const PAYROLL_QUERY_KEY = ['hrm_payroll'];

export const usePayroll = () => {
  return useQuery({
    queryKey: PAYROLL_QUERY_KEY,
    queryFn: async () => {
      return payrollRepository.getAll();
    },
  });
};

export const useAddPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Payroll>) => {
      const basic = Number(data.basicSalary || 0);
      const allowances = Number(data.allowances || 0);
      const deductions = Number(data.deductions || 0);
      const net = basic + allowances - deductions;

      const newPay: Payroll = {
        employeeId: data.employeeId || 0,
        employeeName: data.employeeName || '',
        departmentName: data.departmentName || '',
        designationName: data.designationName || '',
        month: data.month || 'October',
        year: Number(data.year || new Date().getFullYear()),
        basicSalary: basic,
        allowances,
        deductions,
        netSalary: net,
        paymentDate: data.paymentDate || null,
        paymentMethod: data.paymentMethod || null,
        status: data.status || 'PENDING',
        notes: data.notes || '',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await payrollRepository.insert(newPay);
      return newPay;
    },
    onSuccess: (newPay) => {
      queryClient.setQueryData(PAYROLL_QUERY_KEY, (old: Payroll[] = []) => [newPay, ...old]);
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
    },
  });
};

export const useMarkPayrollPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: number; paymentMethod: string }) => {
      const existing = await payrollRepository.getById(id);
      if (!existing) throw new Error('Payroll entry not found');
      const updated: Payroll = {
        ...existing,
        status: 'PAID',
        paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };
      await payrollRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PAYROLL_QUERY_KEY, (old: Payroll[] = []) =>
        old.map((p) => (p.id === updated.id ? updated : p))
      );
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
    },
  });
};

export const useDeletePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await payrollRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(PAYROLL_QUERY_KEY, (old: Payroll[] = []) =>
        old.filter((p) => p.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
    },
  });
};
