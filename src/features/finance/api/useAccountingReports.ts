import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
import { db } from '../../../core/database/db';

export const useTrialBalance = (filters: { startDate?: string; endDate?: string } = {}) => {
  return useQuery({
    queryKey: ['trial_balance', filters],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.ACCOUNTING_REPORTS.TRIAL_BALANCE, {
          params: filters,
        });
        if (res.data?.data) return res.data.data;
        if (res.data) return res.data;
      } catch (_) {}

      // Fallback: local calculation from SQLite
      const extractSum = (res: any, field: string): number => {
        try {
          if (Array.isArray(res.rows) && res.rows[0]) return Number(res.rows[0][field] || 0);
          if (res.rows?._array?.[0]) return Number(res.rows._array[0][field] || 0);
        } catch (_) {}
        return 0;
      };

      const [salesRes, purchasesRes, expRes, incRes, bankRes] = await Promise.all([
        db.execute(`SELECT SUM(grandTotal) as total, SUM(due) as due FROM sales WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(grandTotal) as total, SUM(due) as due FROM purchases WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(amount) as total FROM expenses WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(amount) as total FROM incomes WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(currentBalance) as total FROM bank_accounts WHERE deletedAt IS NULL`),
      ]);

      const salesTotal = extractSum(salesRes, 'total');
      const accountsReceivable = extractSum(salesRes, 'due');
      const purchasesTotal = extractSum(purchasesRes, 'total');
      const accountsPayable = extractSum(purchasesRes, 'due');
      const expensesTotal = extractSum(expRes, 'total');
      const incomesTotal = extractSum(incRes, 'total');
      const bankTotal = extractSum(bankRes, 'total');

      const rows = [
        { accountCode: '1001', accountName: 'Cash & Bank Balances', classification: 'Current Asset', debit: bankTotal, credit: 0 },
        { accountCode: '1002', accountName: 'Accounts Receivable (Customer Dues)', classification: 'Current Asset', debit: accountsReceivable, credit: 0 },
        { accountCode: '2001', accountName: 'Accounts Payable (Supplier Dues)', classification: 'Current Liability', debit: 0, credit: accountsPayable },
        { accountCode: '4001', accountName: 'Sales Revenue', classification: 'Revenue', debit: 0, credit: salesTotal },
        { accountCode: '4002', accountName: 'Other Operating Income', classification: 'Revenue', debit: 0, credit: incomesTotal },
        { accountCode: '5001', accountName: 'Purchases & Direct Goods', classification: 'Direct Expense', debit: purchasesTotal, credit: 0 },
        { accountCode: '5002', accountName: 'Operating Expenses', classification: 'Indirect Expense', debit: expensesTotal, credit: 0 },
      ];

      const totalDebit = Number(rows.reduce((sum, r) => sum + r.debit, 0).toFixed(2));
      const totalCredit = Number(rows.reduce((sum, r) => sum + r.credit, 0).toFixed(2));
      const difference = Number(Math.abs(totalDebit - totalCredit).toFixed(2));

      return {
        asOfDate: filters.endDate || new Date().toISOString().slice(0, 10),
        summary: {
          totalDebit,
          totalCredit,
          difference,
          isBalanced: difference === 0,
        },
        data: rows,
      };
    },
  });
};

export const useCashFlow = (filters: { startDate?: string; endDate?: string } = {}) => {
  return useQuery({
    queryKey: ['cash_flow', filters],
    queryFn: async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.ACCOUNTING_REPORTS.CASH_FLOW, {
          params: filters,
        });
        if (res.data?.data) return res.data.data;
        if (res.data) return res.data;
      } catch (_) {}

      // Fallback: local SQLite calculation
      const extractSum = (res: any, field: string): number => {
        try {
          if (Array.isArray(res.rows) && res.rows[0]) return Number(res.rows[0][field] || 0);
          if (res.rows?._array?.[0]) return Number(res.rows._array[0][field] || 0);
        } catch (_) {}
        return 0;
      };

      const [salesPaidRes, purchPaidRes, expRes, incRes, bankRes] = await Promise.all([
        db.execute(`SELECT SUM(paid) as paid FROM sales WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(paid) as paid FROM purchases WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(amount) as total FROM expenses WHERE deletedAt IS NULL`),
        db.execute(`SELECT SUM(amount) as total FROM incomes WHERE deletedAt IS NULL`),
        db.execute(`SELECT * FROM bank_accounts WHERE deletedAt IS NULL`),
      ]);

      const salesPaid = extractSum(salesPaidRes, 'paid');
      const purchPaid = extractSum(purchPaidRes, 'paid');
      const expTotal = extractSum(expRes, 'total');
      const incTotal = extractSum(incRes, 'total');

      const totalInflow = Number((salesPaid + incTotal).toFixed(2));
      const totalOutflow = Number((purchPaid + expTotal).toFixed(2));
      const netCashFlow = Number((totalInflow - totalOutflow).toFixed(2));

      let bankList: any[] = [];
      if (Array.isArray(bankRes.rows)) bankList = bankRes.rows;
      else if (bankRes.rows?._array) bankList = bankRes.rows._array;

      return {
        asOfDate: filters.endDate || new Date().toISOString().slice(0, 10),
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow,
          bankAccountsTotal: bankList.reduce((sum, b) => sum + Number(b.currentBalance || 0), 0),
        },
        breakdown: [
          { category: 'OPERATING INFLOW', title: 'Customer Sales Collections', amount: salesPaid, type: 'INFLOW' },
          { category: 'OPERATING INFLOW', title: 'Miscellaneous Income', amount: incTotal, type: 'INFLOW' },
          { category: 'OPERATING OUTFLOW', title: 'Supplier Purchases Paid', amount: purchPaid, type: 'OUTFLOW' },
          { category: 'OPERATING OUTFLOW', title: 'Operating Expenses & Overheads', amount: expTotal, type: 'OUTFLOW' },
        ],
        bankAccounts: bankList.map((b) => ({
          id: b.id,
          name: b.accountName,
          type: b.accountType,
          balance: Number(b.currentBalance || 0),
        })),
        recentTransfers: [],
      };
    },
  });
};
