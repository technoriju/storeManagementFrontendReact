import { db } from '../../../core/database/db';

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
    let query = `
      SELECT s.id, s.invoiceNumber, s.createdAt, s.total, s.status, c.name as customerName
      FROM sales s
      LEFT JOIN customers c ON s.customerId = c.id
      WHERE ${this.buildDateCondition('s.createdAt', filters)}
    `;
    
    if (filters.customerId) {
      query += ` AND s.customerId = '${filters.customerId}'`;
    }
    
    query += ' ORDER BY s.createdAt DESC';
    const res = await db.execute(query);
    return res.rows || [];
  }

  static async getPurchasesReport(filters: ReportFilters) {
    let query = `
      SELECT p.id, p.invoiceNumber, p.createdAt, p.total, p.status, s.name as supplierName
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE ${this.buildDateCondition('p.createdAt', filters)}
    `;
    
    if (filters.supplierId) {
      query += ` AND p.supplierId = '${filters.supplierId}'`;
    }
    
    query += ' ORDER BY p.createdAt DESC';
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
    // Current Assets:
    // a. Stock Valuation: base units * box cost
    const stockRes = await db.execute(`
      SELECT SUM(stockQuantity * cost) as stockValuation FROM products
    `);
    const stockValuation = Number(stockRes.rows[0]?.stockValuation || 0);

    // b. Cash & Bank (Collected Sales - Paid Purchases - Expenses)
    const cashInRes = await db.execute(`
      SELECT SUM(paid) as totalCashIn FROM sales WHERE status != 'cancelled'
    `);
    const cashIn = Number(cashInRes.rows[0]?.totalCashIn || 0);

    const cashOutPurchasesRes = await db.execute(`
      SELECT SUM(paid) as totalPurchasesPaid FROM purchases WHERE status != 'cancelled'
    `);
    const purchasesPaid = Number(cashOutPurchasesRes.rows[0]?.totalPurchasesPaid || 0);

    const expensesRes = await db.execute(`
      SELECT SUM(amount) as totalExpenses FROM expenses
    `);
    const totalExpenses = Number(expensesRes.rows[0]?.totalExpenses || 0);

    const netCashAndBank = Math.max(0, cashIn - purchasesPaid - totalExpenses);

    // c. Accounts Receivable (Customer Outstanding)
    const arRes = await db.execute(`
      SELECT SUM(due) as accountsReceivable FROM sales WHERE status != 'cancelled'
    `);
    const accountsReceivable = Number(arRes.rows[0]?.accountsReceivable || 0);

    const totalCurrentAssets = stockValuation + netCashAndBank + accountsReceivable;

    // Current Liabilities:
    // Accounts Payable (Supplier Outstanding)
    const apRes = await db.execute(`
      SELECT SUM(due) as accountsPayable FROM purchases WHERE status != 'cancelled'
    `);
    const accountsPayable = Number(apRes.rows[0]?.accountsPayable || 0);
    const totalCurrentLiabilities = accountsPayable;

    // Equity: Net Working Capital
    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;

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
