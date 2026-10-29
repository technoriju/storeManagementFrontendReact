import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveRepository, leaveTypeRepository } from '../../../core/repositories/LeaveRepository';
import { LeaveRequest, LeaveType } from '../../../types/models';

export const LEAVES_QUERY_KEY = ['hrm_leaves'];
export const LEAVE_TYPES_QUERY_KEY = ['hrm_leave_types'];

export const useLeaves = () => {
  return useQuery({
    queryKey: LEAVES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiData = await leaveRepository.fetchFromApi();
        if (apiData && apiData.length > 0) return apiData;
      } catch (_) {}
      return leaveRepository.getAll();
    },
  });
};

export const useLeaveTypes = () => {
  return useQuery({
    queryKey: LEAVE_TYPES_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiData = await leaveTypeRepository.fetchFromApi();
        if (apiData && apiData.length > 0) return apiData;
      } catch (_) {}
      return leaveTypeRepository.getAll();
    },
  });
};

export const useAddLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LeaveRequest>) => {
      const newLeave: LeaveRequest = {
        employeeId: data.employeeId || 0,
        employeeName: data.employeeName || '',
        departmentName: data.departmentName || '',
        leaveTypeId: data.leaveTypeId || 0,
        leaveTypeName: data.leaveTypeName || 'Casual Leave',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date().toISOString().split('T')[0],
        totalDays: Number(data.totalDays || 1),
        reason: data.reason || '',
        status: data.status || 'PENDING',
        appliedAt: new Date().toISOString(),
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await leaveRepository.insert(newLeave);
      return newLeave;
    },
    onSuccess: (newLeave) => {
      queryClient.setQueryData(LEAVES_QUERY_KEY, (old: LeaveRequest[] = []) => [newLeave, ...old]);
      queryClient.invalidateQueries({ queryKey: LEAVES_QUERY_KEY });
    },
  });
};

export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'APPROVED' | 'REJECTED' | 'PENDING' }) => {
      const existing = await leaveRepository.getById(id);
      if (!existing) throw new Error('Leave request not found');
      const updated: LeaveRequest = {
        ...existing,
        status,
        updatedAt: new Date().toISOString(),
      };
      await leaveRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(LEAVES_QUERY_KEY, (old: LeaveRequest[] = []) =>
        old.map((l) => (l.id === updated.id ? updated : l))
      );
      queryClient.invalidateQueries({ queryKey: LEAVES_QUERY_KEY });
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await leaveRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(LEAVES_QUERY_KEY, (old: LeaveRequest[] = []) =>
        old.filter((l) => l.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: LEAVES_QUERY_KEY });
    },
  });
};

export const useAddLeaveType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LeaveType>) => {
      const newType: LeaveType = {
        name: data.name || '',
        daysAllowed: Number(data.daysAllowed || 12),
        description: data.description || '',
        status: data.status || 'ACTIVE',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await leaveTypeRepository.insert(newType);
      return newType;
    },
    onSuccess: (newType) => {
      queryClient.setQueryData(LEAVE_TYPES_QUERY_KEY, (old: LeaveType[] = []) => [...old, newType]);
      queryClient.invalidateQueries({ queryKey: LEAVE_TYPES_QUERY_KEY });
    },
  });
};
