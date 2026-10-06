import { db } from '../../../core/database/db';
import { apiClient } from '../../../core/api/api-client';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  productId?: string;
  customerId?: string;
  supplierId?: string;
}

export class ReportsService {
  private static buildDateCondition(field: string, filters: ReportFilters) {
    let condition = '1=1';
    if (filters.startDate) {
      condition += ` AND ${field} >= '${filters.startDate}'`;
    }
    if (filters.endDate) {
      // Append time to ensure end of day if only date is provided
      const endDate = filters.endDate.includes('T') ? filters.endDate : `${filters.endDate}T23:59:59.999Z`;
      condition += ` AND ${field} <= '${endDate}'`;
    }
    return condition;
  }

  static async getSalesReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/sales', { params: filters });
      if (apiRes.data?.data && Array.isArray(apiRes.data.data)) {
        return apiRes.data.data;
      }
    } catch {}

    let query = `
      SELECT 
        s.id, 
        s.invoiceNumber, 
        COALESCE(s.date, SUBSTR(s.createdAt, 1, 10)) as date, 
        s.total, 
        COALESCE(s.paid, 0) as paid, 
        COALESCE(s.due, 0) as due, 
        COALESCE(s.previousDue, 0) as previousDue,
        COALESCE(s.paymentStatus, 'Unpaid') as paymentStatus, 
        s.status, 
        COALESCE(s.customerName, c.name, 'Walk-in Customer') as customerName
      FROM sales s
      LEFT JOIN customers c ON s.customerId = c.id
      WHERE ${this.buildDateCondition('s.createdAt', filters)}
    `;
    
    if (filters.customerId) {
      query += ` AND s.customerId = '${filters.customerId}'`;
    }
    
    query += ' ORDER BY s.id DESC';
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getPurchasesReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/purchases', { params: filters });
      if (apiRes.data?.data && Array.isArray(apiRes.data.data)) {
        return apiRes.data.data;
      }
    } catch {}

    let query = `
      SELECT 
        p.id, 
        p.invoiceNumber, 
        COALESCE(p.date, SUBSTR(p.createdAt, 1, 10)) as date, 
        p.total, 
        COALESCE(p.paid, 0) as paid, 
        COALESCE(p.due, 0) as due, 
        COALESCE(p.paymentStatus, 'Unpaid') as paymentStatus, 
        p.status, 
        COALESCE(p.supplierName, s.name, 'Supplier') as supplierName
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE ${this.buildDateCondition('p.createdAt', filters)}
    `;
    
    if (filters.supplierId) {
      query += ` AND p.supplierId = '${filters.supplierId}'`;
    }
    
    query += ' ORDER BY p.id DESC';
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getInventoryReport(filters: ReportFilters) {
    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.sku, 
        p.stockQuantity as baseStock,
        COALESCE(u.shortName, u.name, 'Box') as baseUnit,
        p.conversionRate,
        COALESCE(su.name, 'Pcs') as subUnit,
        CASE 
          WHEN p.conversionRate > 1 THEN ROUND(p.stockQuantity * p.conversionRate, 2)
          ELSE p.stockQuantity 
        END as subUnitStock,
        CASE 
          WHEN p.conversionRate > 1 THEN 
            ROUND(p.stockQuantity, 2) || ' ' || COALESCE(u.shortName, u.name, 'Box') || ' (' || ROUND(p.stockQuantity * p.conversionRate, 0) || ' ' || COALESCE(su.name, 'Pcs') || ')'
          ELSE 
            ROUND(p.stockQuantity, 2) || ' ' || COALESCE(u.shortName, u.name, 'Box')
        END as stockWithUnits,
        p.cost as boxCost,
        CASE 
          WHEN p.conversionRate > 1 THEN ROUND(p.cost / p.conversionRate, 2)
          ELSE p.cost
        END as pcsCost,
        ROUND(p.stockQuantity * p.cost, 2) as stockValuation
      FROM products p
      LEFT JOIN units u ON p.unitId = u.id OR p.baseUnitId = u.id
      LEFT JOIN sub_units su ON p.subUnitId = su.id OR p.subunitId = su.id
      WHERE 1=1
    `;
    
    if (filters.productId) {
      query += ` AND p.id = '${filters.productId}'`;
    }
    
    query += ' ORDER BY p.name ASC';
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getProfitAndLossReport(filters: ReportFilters) {
    // 1. Sales Revenue
    const salesRes = await db.execute(`
      SELECT 
        SUM(total) as grossSales,
        SUM(discount) as totalDiscount,
        SUM(gst) as totalTax
      FROM sales
      WHERE ${this.buildDateCondition('createdAt', filters)} AND status != 'cancelled'
    `);
    const grossSales = Number(salesRes.rows[0]?.grossSales || 0);
    const totalDiscount = Number(salesRes.rows[0]?.totalDiscount || 0);
    const netSales = grossSales;

    // 2. Cost of Goods Sold (COGS) converted with unitCost & conversionRate
    const cogsRes = await db.execute(`
      SELECT SUM(
        si.quantity * CASE 
          WHEN si.unitCost IS NOT NULL AND si.unitCost > 0 THEN si.unitCost
          WHEN si.unitType = 'sub' AND si.conversionRate > 0 THEN (p.cost / si.conversionRate)
          WHEN p.conversionRate > 1 AND si.unitType = 'sub' THEN (p.cost / p.conversionRate)
          ELSE p.cost
        END
      ) as totalCOGS
      FROM sale_items si
      JOIN products p ON si.productId = p.id
      JOIN sales s ON si.saleId = s.id
      WHERE ${this.buildDateCondition('s.createdAt', filters)} AND s.status != 'cancelled'
    `);
    const cogs = Number(cogsRes.rows[0]?.totalCOGS || 0);

    // 3. Operating Expenses
    const expRes = await db.execute(`
      SELECT SUM(amount) as totalExpenses
      FROM expenses
      WHERE ${this.buildDateCondition('date', filters)}
    `);
    const totalExpenses = Number(expRes.rows[0]?.totalExpenses || 0);

    // 4. Calculations
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;
    const netMarginPercent = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(2)) : 0;

    return [
      { metric: '1. Gross Sales Revenue', amount: grossSales, notes: 'Total sales invoices' },
      { metric: '2. Sales Discounts Given', amount: totalDiscount, notes: 'Discounts deducted' },
      { metric: '3. Net Sales Revenue', amount: netSales, notes: 'Sales after discount' },
      { metric: '4. Cost of Goods Sold (COGS)', amount: cogs, notes: 'Calculated using unit & sub-unit conversion costs' },
      { metric: '5. GROSS PROFIT', amount: grossProfit, notes: `Gross Margin: ${grossMarginPercent}%` },
      { metric: '6. Operating Expenses', amount: totalExpenses, notes: 'General and operational costs' },
      { metric: '7. NET PROFIT / (LOSS)', amount: netProfit, notes: `Net Margin: ${netMarginPercent}%` },
    ];
  }

  static async getBalanceSheetReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/balance-sheet', { params: filters });
      const apiData = apiRes.data?.data || apiRes.data?.statement;
      if (Array.isArray(apiData) && apiData.length > 0) {
        return apiData;
      }
    } catch {}

    // Offline / Local SQLite calculation:
    // 1. Current Assets:
    // a. Stock Valuation: base units * cost
    const stockRes = await db.execute(`
      SELECT SUM(stockQuantity * cost) as stockValuation FROM products
    `);
    const stockValuation = Number(stockRes.rows[0]?.stockValuation || 0);

    // b. Cash & Liquid Balance from payments table & sales/purchases
    let totalCashIn = 0;
    let totalCashOut = 0;
    try {
      const payInRes = await db.execute(`
        SELECT SUM(amount) as cashIn FROM payments WHERE (type IS NULL OR LOWER(type) = 'receive')
      `);
      totalCashIn = Number(payInRes.rows[0]?.cashIn || 0);

      const payOutRes = await db.execute(`
        SELECT SUM(amount) as cashOut FROM payments WHERE LOWER(type) = 'pay'
      `);
      totalCashOut = Number(payOutRes.rows[0]?.cashOut || 0);
    } catch {}

    // If payments table was empty, fallback to sales.paid & purchases.paid
    if (totalCashIn === 0) {
      const cashInRes = await db.execute(`
        SELECT SUM(paid) as totalCashIn FROM sales WHERE status != 'cancelled'
      `);
      totalCashIn = Number(cashInRes.rows[0]?.totalCashIn || 0);
    }
    if (totalCashOut === 0) {
      const cashOutPurchasesRes = await db.execute(`
        SELECT SUM(paid) as totalPurchasesPaid FROM purchases WHERE status != 'cancelled'
      `);
      totalCashOut = Number(cashOutPurchasesRes.rows[0]?.totalPurchasesPaid || 0);
    }

    const expensesRes = await db.execute(`
      SELECT SUM(amount) as totalExpenses FROM expenses
    `);
    const totalExpenses = Number(expensesRes.rows[0]?.totalExpenses || 0);

    const netCashAndBank = Number(Math.max(0, totalCashIn - totalCashOut - totalExpenses).toFixed(2));

    // c. Accounts Receivable (Customer Outstanding)
    let accountsReceivable = 0;
    try {
      const custRes = await db.execute(`
        SELECT SUM(outstandingBalance) as totalDue FROM customers WHERE outstandingBalance > 0
      `);
      accountsReceivable = Number(custRes.rows[0]?.totalDue || 0);
    } catch {}

    if (accountsReceivable === 0) {
      const arRes = await db.execute(`
        SELECT SUM(due) as accountsReceivable FROM sales WHERE status != 'cancelled'
      `);
      accountsReceivable = Number(arRes.rows[0]?.accountsReceivable || 0);
    }

    const totalCurrentAssets = Number((stockValuation + netCashAndBank + accountsReceivable).toFixed(2));

    // 2. Current Liabilities:
    // Accounts Payable (Supplier Outstanding)
    let accountsPayable = 0;
    try {
      const suppRes = await db.execute(`
        SELECT SUM(outstandingBalance) as totalDue FROM suppliers WHERE outstandingBalance > 0
      `);
      accountsPayable = Number(suppRes.rows[0]?.totalDue || 0);
    } catch {}

    if (accountsPayable === 0) {
      const apRes = await db.execute(`
        SELECT SUM(due) as accountsPayable FROM purchases WHERE status != 'cancelled'
      `);
      accountsPayable = Number(apRes.rows[0]?.accountsPayable || 0);
    }
    const totalCurrentLiabilities = accountsPayable;

    // 3. Equity: Net Working Capital
    const workingCapital = Number((totalCurrentAssets - totalCurrentLiabilities).toFixed(2));

    return [
      { category: 'ASSETS', item: 'Inventory Valuation (Stock in Box/Pcs)', amount: stockValuation, type: 'Current Asset' },
      { category: 'ASSETS', item: 'Cash & Liquid Balance', amount: netCashAndBank, type: 'Current Asset' },
      { category: 'ASSETS', item: 'Accounts Receivable (Customers Owe)', amount: accountsReceivable, type: 'Current Asset' },
      { category: 'ASSETS', item: 'TOTAL CURRENT ASSETS', amount: totalCurrentAssets, type: 'Subtotal' },
      { category: 'LIABILITIES', item: 'Accounts Payable (Owed to Suppliers)', amount: accountsPayable, type: 'Current Liability' },
      { category: 'LIABILITIES', item: 'TOTAL LIABILITIES', amount: totalCurrentLiabilities, type: 'Subtotal' },
      { category: 'EQUITY', item: 'Net Working Capital (Assets - Liabilities)', amount: workingCapital, type: 'Equity / Net Worth' },
    ];
  }

  static async getCustomerOutstandingReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/customer-outstanding', { params: filters });
      if (apiRes.data?.data && Array.isArray(apiRes.data.data)) {
        return apiRes.data.data;
      }
    } catch {}

    const query = `
      SELECT 
        c.id as customerId,
        c.name as customerName,
        COALESCE(c.phone, '') as phone,
        COALESCE(c.outstandingBalance, 0) as outstandingBalance,
        COUNT(s.id) as totalSalesCount,
        COALESCE(SUM(s.total), 0) as totalBilled,
        COALESCE(SUM(s.paid), 0) as totalPaid,
        COALESCE(SUM(s.due), 0) as totalDue
      FROM customers c
      LEFT JOIN sales s ON (s.customerId = c.id AND s.status != 'cancelled')
      GROUP BY c.id
      ORDER BY c.outstandingBalance DESC, totalDue DESC
    `;
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getSupplierOutstandingReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/supplier-outstanding', { params: filters });
      if (apiRes.data?.data && Array.isArray(apiRes.data.data)) {
        return apiRes.data.data;
      }
    } catch {}

    const query = `
      SELECT 
        s.id as supplierId,
        s.name as supplierName,
        COALESCE(s.phone, '') as phone,
        COALESCE(s.outstandingBalance, 0) as outstandingBalance,
        COUNT(p.id) as totalPurchasesCount,
        COALESCE(SUM(p.total), 0) as totalPurchased,
        COALESCE(SUM(p.paid), 0) as totalPaid,
        COALESCE(SUM(p.due), 0) as totalDue
      FROM suppliers s
      LEFT JOIN purchases p ON (p.supplierId = s.id AND p.status != 'cancelled')
      GROUP BY s.id
      ORDER BY s.outstandingBalance DESC, totalDue DESC
    `;
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getPaymentReport(filters: ReportFilters) {
    try {
      const apiRes = await apiClient.get('/reports/payments', { params: filters });
      if (apiRes.data?.data && Array.isArray(apiRes.data.data)) {
        return apiRes.data.data;
      }
    } catch {}

    const query = `
      SELECT 
        p.id,
        COALESCE(SUBSTR(p.createdAt, 1, 10), '') as date,
        p.amount,
        p.method as paymentMethod,
        COALESCE(p.type, 'receive') as type,
        COALESCE(p.reference, '') as reference,
        COALESCE(c.name, s.name, 'N/A') as partyName,
        COALESCE(p.notes, '') as notes
      FROM payments p
      LEFT JOIN customers c ON p.customerId = c.id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE ${this.buildDateCondition('p.createdAt', filters)}
      ORDER BY p.id DESC
    `;
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getGSTReport(filters: ReportFilters) {
    const query = `
      SELECT s.invoiceNumber, s.createdAt, s.total, s.gst as totalGst, 'SALE' as type
      FROM sales s
      WHERE ${this.buildDateCondition('s.createdAt', filters)}
      UNION ALL
      SELECT p.invoiceNumber, p.createdAt, p.total, p.gst as totalGst, 'PURCHASE' as type
      FROM purchases p
      WHERE ${this.buildDateCondition('p.createdAt', filters)}
      ORDER BY createdAt DESC
    `;
    const res = await db.execute(query);
    return res.rows || [];
  }
  
  static async getExpensesReport(filters: ReportFilters) {
    const query = `
      SELECT id, category, amount, date, description
      FROM expenses
      WHERE ${this.buildDateCondition('date', filters)}
      ORDER BY date DESC
    `;
    const res = await db.execute(query);
    return res.rows || [];
  }
}
