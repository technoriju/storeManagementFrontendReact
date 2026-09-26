import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import { Brand } from '../../../types/models';
export type { Brand };
export const BRAND_QUERY_KEY = ['brands'] as const;
export const useBrands = () => { const client = useQueryClient(); return useQuery({ queryKey: BRAND_QUERY_KEY, queryFn: async () => { const local = await brandRepository.getAll(); void brandRepository.fetchFromApi().then(() => brandRepository.getAll().then(items => client.setQueryData(BRAND_QUERY_KEY, items))); return local; } }); };
export const useAddBrand = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: Partial<Brand>) => { const item = { ...data, id: data.id || Math.floor(Math.random() * -1000000000), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: 'pending_insert' as const } as Brand; await brandRepository.insert(item); return item; }, onSuccess: item => { client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) => [...(old || []), item]); client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' }); } }); };
export const useUpdateBrand = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (data: Brand) => { const item = { ...data, updatedAt: new Date().toISOString(), syncStatus: 'pending_update' as const }; await brandRepository.update(item); return item; }, onSuccess: item => { client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) => (old || []).map(row => row.id === item.id ? item : row)); client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' }); } }); };
export const useDeleteBrand = () => { const client = useQueryClient(); return useMutation({ mutationFn: async (id: number) => { await brandRepository.delete(id); return id; }, onSuccess: id => { client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) => (old || []).filter(row => row.id !== id)); client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' }); } }); };


