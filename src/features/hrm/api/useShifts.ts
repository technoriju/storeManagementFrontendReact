import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftRepository } from '../../../core/repositories/ShiftRepository';
import { Shift } from '../../../types/models';

export const SHIFTS_QUERY_KEY = ['hrm_shifts'];

export const useShifts = () => {
  return useQuery({
    queryKey: SHIFTS_QUERY_KEY,
    queryFn: async () => {
      return shiftRepository.getAll();
    },
  });
};

export const useAddShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Shift>) => {
      const newShift: Shift = {
        name: data.name || '',
        code: data.code || `SHF-${Date.now().toString().slice(-4)}`,
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '18:00',
        lateToleranceMinutes: data.lateToleranceMinutes ?? 15,
        breakDurationMinutes: data.breakDurationMinutes ?? 60,
        status: data.status || 'ACTIVE',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await shiftRepository.insert(newShift);
      return newShift;
    },
    onSuccess: (newShift) => {
      queryClient.setQueryData(SHIFTS_QUERY_KEY, (old: Shift[] = []) => [...old, newShift]);
      queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEY });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Shift> }) => {
      const existing = await shiftRepository.getById(id);
      const updated: Shift = {
        ...(existing || {}),
        ...data,
        id,
        name: data.name ?? existing?.name ?? '',
        code: data.code ?? existing?.code ?? '',
        startTime: data.startTime ?? existing?.startTime ?? '09:00',
        endTime: data.endTime ?? existing?.endTime ?? '18:00',
        status: data.status ?? existing?.status ?? 'ACTIVE',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await shiftRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(SHIFTS_QUERY_KEY, (old: Shift[] = []) =>
        old.map((s) => (s.id === updated.id ? updated : s))
      );
      queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEY });
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await shiftRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(SHIFTS_QUERY_KEY, (old: Shift[] = []) =>
        old.filter((s) => s.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: SHIFTS_QUERY_KEY });
    },
  });
};
