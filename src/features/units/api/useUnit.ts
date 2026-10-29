import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unitRepository } from '../../../core/repositories/UnitRepository';
import { Unit as ModelUnit } from '../../../types/models';
export type Unit = ModelUnit & { status?: string };
export const UNIT_QUERY_KEY = ['units'] as const;
const view = (item: ModelUnit): Unit => ({ ...item, status: 'Active' });
export const useUnits = () => useQuery({ queryKey: UNIT_QUERY_KEY, queryFn: async () => { try { await unitRepository.fetchFromApi(); } catch (_) {} return (await unitRepository.getAll()).map(view); } });
export const useAddUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: Partial<Unit>) => { const item = await unitRepository.createDirect({ ...data, shortName: data.shortName || '' } as any); return view(item); }, onSuccess: item => { client.setQueryData(UNIT_QUERY_KEY, (old: Unit[] | undefined) => [...(old || []), item]); client.invalidateQueries({ queryKey: UNIT_QUERY_KEY, refetchType: 'none' }); } }); };
export const useUpdateUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: Unit) => { const item = await unitRepository.updateDirect({ ...data, shortName: data.shortName || '' } as any); return view(item); }, onSuccess: item => { client.setQueryData(UNIT_QUERY_KEY, (old: Unit[] | undefined) => (old || []).map(row => row.id === item.id ? item : row)); client.invalidateQueries({ queryKey: UNIT_QUERY_KEY, refetchType: 'none' }); } }); };
export const useDeleteUnit = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (id: number) => { await unitRepository.delete(id); return id; }, onSuccess: id => { client.setQueryData(UNIT_QUERY_KEY, (old: Unit[] | undefined) => (old || []).filter(row => row.id !== id)); client.invalidateQueries({ queryKey: UNIT_QUERY_KEY, refetchType: 'none' }); } }); };


