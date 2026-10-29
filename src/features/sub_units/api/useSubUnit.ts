import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subUnitRepository } from '../../../core/repositories/SubUnitRepository';
import { SubUnit as ModelSubUnit } from '../../../types/models';
export interface SubUnit { id: number; name: string; parentUnitId?: number; multiplier?: number; status?: string; createdAt?: string; updatedAt?: string; syncStatus?: ModelSubUnit['syncStatus']; }
export const SUBUNIT_QUERY_KEY = ['sub_units'] as const;
const view = (item: ModelSubUnit): SubUnit => ({ ...item });
export const useSubUnits = () => {
  const client = useQueryClient();
  return useQuery({
    queryKey: SUBUNIT_QUERY_KEY,
    queryFn: async () => {
      const local = (await subUnitRepository.getAll()).map(view);
      if (local.length === 0) {
        try {
          await subUnitRepository.fetchFromApi();
          return (await subUnitRepository.getAll()).map(view);
        } catch (e) {
          console.error('Failed initial sub-unit fetch:', e);
          return local;
        }
      }
      void subUnitRepository
        .fetchFromApi()
        .then(() => subUnitRepository.getAll().then(items => client.setQueryData(SUBUNIT_QUERY_KEY, items.map(view))))
        .catch(console.error);
      return local;
    },
  });
};
export const useAddSubUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: Partial<SubUnit>) => { const item = await subUnitRepository.createDirect(data as any); return view(item); }, onSuccess: item => { client.setQueryData(SUBUNIT_QUERY_KEY, (old: SubUnit[] | undefined) => [...(old || []), item]); client.invalidateQueries({ queryKey: SUBUNIT_QUERY_KEY, refetchType: 'none' }); } }); };
export const useUpdateSubUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: SubUnit) => { const item = await subUnitRepository.updateDirect(data as any); return view(item); }, onSuccess: item => { client.setQueryData(SUBUNIT_QUERY_KEY, (old: SubUnit[] | undefined) => (old || []).map(row => row.id === item.id ? item : row)); client.invalidateQueries({ queryKey: SUBUNIT_QUERY_KEY, refetchType: 'none' }); } }); };
export const useDeleteSubUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (id: number) => { await subUnitRepository.delete(id); return id; }, onSuccess: id => { client.setQueryData(SUBUNIT_QUERY_KEY, (old: SubUnit[] | undefined) => (old || []).filter(row => row.id !== id)); client.invalidateQueries({ queryKey: SUBUNIT_QUERY_KEY, refetchType: 'none' }); } }); };


