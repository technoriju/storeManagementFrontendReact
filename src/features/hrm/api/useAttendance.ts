import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceRepository } from '../../../core/repositories/AttendanceRepository';
import { Attendance } from '../../../types/models';

export const ATTENDANCE_QUERY_KEY = ['hrm_attendance'];

export const useAttendance = () => {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiData = await attendanceRepository.fetchFromApi();
        if (apiData && apiData.length > 0) return apiData;
      } catch (_) {}
      return attendanceRepository.getAll();
    },
  });
};

export const useAddAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Attendance>) => {
      const newAtt: Attendance = {
        employeeId: data.employeeId || 0,
        employeeName: data.employeeName || '',
        departmentName: data.departmentName || '',
        date: data.date || new Date().toISOString().split('T')[0],
        clockIn: data.clockIn || '09:00',
        clockOut: data.clockOut || '18:00',
        status: data.status || 'PRESENT',
        totalHours: data.totalHours !== undefined ? Number(data.totalHours) : 9.0,
        notes: data.notes || '',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await attendanceRepository.insert(newAtt);
      return newAtt;
    },
    onSuccess: (newAtt) => {
      queryClient.setQueryData(ATTENDANCE_QUERY_KEY, (old: Attendance[] = []) => [newAtt, ...old]);
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEY });
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Attendance> }) => {
      const existing = await attendanceRepository.getById(id);
      const updated: Attendance = {
        ...(existing || {}),
        ...data,
        id,
        status: data.status ?? existing?.status ?? 'PRESENT',
        clockIn: data.clockIn ?? existing?.clockIn,
        clockOut: data.clockOut ?? existing?.clockOut,
        totalHours: data.totalHours !== undefined ? Number(data.totalHours) : existing?.totalHours,
        notes: data.notes ?? existing?.notes,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      } as Attendance;
      await attendanceRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(ATTENDANCE_QUERY_KEY, (old: Attendance[] = []) =>
        old.map((a) => (a.id === updated.id ? updated : a))
      );
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEY });
    },
  });
};

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await attendanceRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(ATTENDANCE_QUERY_KEY, (old: Attendance[] = []) =>
        old.filter((a) => a.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEY });
    },
  });
};
