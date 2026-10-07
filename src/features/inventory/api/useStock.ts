import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  stockRepository,
  StockItem,
  StockSummary,
  AddStockPayload,
  AdjustStockPayload,
  StockTransactionRecord,
} from '../../../core/repositories/StockRepository';

export const STOCK_QUERY_KEY = ['stocks'] as const;
export const STOCK_TRANSACTIONS_KEY = ['stock_transactions'] as const;

export const useStockList = (filters?: {
  search?: string;
  categoryId?: number;
  brandId?: number;
  status?: string;
}) => {
  return useQuery<{ items: StockItem[]; summary: StockSummary }>({
    queryKey: [...STOCK_QUERY_KEY, filters],
    queryFn: () => stockRepository.getStocks(filters),
    refetchOnMount: 'always',
    staleTime: 5000,
  });
};

export const useStockTransactions = (productId?: number | string) => {
  return useQuery<StockTransactionRecord[]>({
    queryKey: [...STOCK_TRANSACTIONS_KEY, productId],
    queryFn: () => stockRepository.getTransactions(productId),
    refetchOnMount: 'always',
  });
};

export const useAddStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddStockPayload) => stockRepository.addStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => stockRepository.adjustStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
