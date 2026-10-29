import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandRepository } from '../../../core/repositories/BrandRepository';
import { Brand } from '../../../types/models';
export type { Brand };
export const BRAND_QUERY_KEY = ['brands'] as const;
export const useBrands = () => {
  return useQuery({
    queryKey: BRAND_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiBrands = await brandRepository.fetchFromApi();
        if (apiBrands && apiBrands.length > 0) return apiBrands;
      } catch (_) {}
      return brandRepository.getAll();
    },
  });
};

export const useAddBrand = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Brand>) => {
      return await brandRepository.createDirect(data);
    },
    onSuccess: (item) => {
      client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) => [...(old || []), item]);
      client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateBrand = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (data: Brand) => {
      return await brandRepository.updateDirect(data);
    },
    onSuccess: (item) => {
      client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) =>
        (old || []).map((row) => (String(row.id) === String(item.id) ? item : row))
      );
      client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteBrand = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (brandOrId: Brand | number | string) => {
      const id = typeof brandOrId === 'object' && brandOrId !== null ? (brandOrId as any).id : brandOrId;
      await brandRepository.delete(brandOrId as any);
      return id;
    },
    onSuccess: (id) => {
      client.setQueryData(BRAND_QUERY_KEY, (old: Brand[] | undefined) =>
        (old || []).filter((row) => String(row.id) !== String(id))
      );
      client.invalidateQueries({ queryKey: BRAND_QUERY_KEY, refetchType: 'none' });
    },
  });
};


