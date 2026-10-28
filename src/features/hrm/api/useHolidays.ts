import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { holidayRepository } from '../../../core/repositories/HolidayRepository';
import { Holiday } from '../../../types/models';

export const HOLIDAYS_QUERY_KEY = ['hrm_holidays'];

export const useHolidays = () => {
  return useQuery({
    queryKey: HOLIDAYS_QUERY_KEY,
    queryFn: async () => {
      return holidayRepository.getAll();
    },
  });
};

export const useAddHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Holiday>) => {
      const dateStr = data.date || new Date().toISOString().split('T')[0];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[new Date(dateStr).getDay()] || 'Monday';

      const newHoliday: Holiday = {
        name: data.name || '',
        date: dateStr,
        dayOfWeek: data.dayOfWeek || dayOfWeek,
        type: data.type || 'PUBLIC',
        description: data.description || '',
        status: data.status || 'ACTIVE',
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      };
      await holidayRepository.insert(newHoliday);
      return newHoliday;
    },
    onSuccess: (newHoliday) => {
      queryClient.setQueryData(HOLIDAYS_QUERY_KEY, (old: Holiday[] = []) => [...old, newHoliday]);
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await holidayRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(HOLIDAYS_QUERY_KEY, (old: Holiday[] = []) =>
        old.filter((h) => h.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
    },
  });
};
