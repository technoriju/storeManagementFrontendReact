import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAccountRepository } from '../../../core/repositories/BankAccountRepository';
import { BankAccount } from '../../../types/models';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { db } from '../../../core/database/db';

export const BANK_ACCOUNTS_QUERY_KEY = ['bank_accounts'];

export const useBankAccounts = () => {
  return useQuery({
    queryKey: BANK_ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      try {
        const apiAccounts = await bankAccountRepository.fetchFromApi();
        if (apiAccounts.length > 0) return apiAccounts;
      } catch (_) {}
      return bankAccountRepository.getAll();
    },
  });
};

export const useAddBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BankAccount>) => {
      const openingBal = Number(data.openingBalance || 0);
      const newAccount: BankAccount = {
        accountName: data.accountName || 'Bank Account',
        accountNumber: data.accountNumber || '',
        bankName: data.bankName || '',
        branchName: data.branchName || '',
        ifscCode: data.ifscCode || '',
        accountType: data.accountType || 'BANK',
        openingBalance: openingBal,
        currentBalance: data.currentBalance !== undefined ? Number(data.currentBalance) : openingBal,
        status: data.status || 'ACTIVE',
        ...data,
        id: data.id || Math.floor(Math.random() * -1000000000),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_insert',
      } as BankAccount;
      await bankAccountRepository.insert(newAccount);
      return newAccount;
    },
    onSuccess: (newAccount) => {
      queryClient.setQueryData(BANK_ACCOUNTS_QUERY_KEY, (oldData: BankAccount[] | undefined) => {
        if (!oldData) return [newAccount];
        return [...oldData, newAccount];
      });
      queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BankAccount> }) => {
      const existing = await bankAccountRepository.getById(id);
      const updated: BankAccount = {
        ...(existing || {}),
        id,
        ...data,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
      } as BankAccount;

      await bankAccountRepository.update(updated);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(BANK_ACCOUNTS_QUERY_KEY, (oldData: BankAccount[] | undefined) => {
        if (!oldData) return [updated];
        return oldData.map((item) => (item.id === updated.id ? updated : item));
      });
      queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await bankAccountRepository.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(BANK_ACCOUNTS_QUERY_KEY, (oldData: BankAccount[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((item) => item.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY, refetchType: 'none' });
    },
  });
};

export const useAccountStatement = (accountId?: number, query?: any) => {
  return useQuery({
    queryKey: ['account_statement', accountId, query],
    enabled: !!accountId,
    queryFn: async () => {
      if (!accountId) return null;

      try {
        const response = await apiClient.get(API_ENDPOINTS.BANKING.STATEMENT(accountId), {
          params: query,
        });
        if (response.data?.data) return response.data.data;
        if (response.data) return response.data;
      } catch (_) {}

      // Fallback: local SQLite statement
      const account = await bankAccountRepository.getById(accountId);
      if (!account) return null;

      const transfersInRes = await db.execute(
        `SELECT * FROM money_transfers WHERE toAccountId = ? AND deletedAt IS NULL ORDER BY transferDate ASC`,
        [accountId]
      );
      const transfersOutRes = await db.execute(
        `SELECT * FROM money_transfers WHERE fromAccountId = ? AND deletedAt IS NULL ORDER BY transferDate ASC`,
        [accountId]
      );

      const extractRows = (res: any): any[] => {
        if (Array.isArray(res.rows)) return res.rows;
        if (res.rows?._array) return res.rows._array;
        return [];
      };

      const tin = extractRows(transfersInRes);
      const tout = extractRows(transfersOutRes);

      const rows: any[] = [];
      for (const t of tin) {
        rows.push({
          id: `tin-${t.id}`,
          date: t.transferDate,
          type: 'TRANSFER_IN',
          reference: t.reference || `TRF-${t.id}`,
          description: `Transfer from ${t.fromAccountName || 'Account'}${t.description ? ' - ' + t.description : ''}`,
          debit: 0,
          credit: Number(t.amount || 0),
        });
      }
      for (const t of tout) {
        rows.push({
          id: `tout-${t.id}`,
          date: t.transferDate,
          type: 'TRANSFER_OUT',
          reference: t.reference || `TRF-${t.id}`,
          description: `Transfer to ${t.toAccountName || 'Account'}${t.description ? ' - ' + t.description : ''}`,
          debit: Number(t.amount || 0),
          credit: 0,
        });
      }

      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let running = Number(account.openingBalance || 0);
      let totalDr = 0;
      let totalCr = 0;

      const entries = rows.map((r) => {
        totalDr += r.debit;
        totalCr += r.credit;
        running = running + r.credit - r.debit;
        return {
          ...r,
          balance: Number(running.toFixed(2)),
        };
      });

      return {
        account: {
          id: account.id,
          accountName: account.accountName,
          accountType: account.accountType,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          openingBalance: Number(account.openingBalance || 0),
          currentBalance: Number(account.currentBalance || 0),
        },
        summary: {
          openingBalance: Number(account.openingBalance || 0),
          totalDebit: totalDr,
          totalCredit: totalCr,
          closingBalance: Number(account.currentBalance || running),
        },
        entries,
      };
    },
  });
};
