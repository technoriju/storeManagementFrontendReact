import { db } from '../../../core/database/db';
import { format } from 'date-fns';

export interface DashboardMetrics {
  todaySales: number;
  todayPurchases: number;
  currentStockValue: number;
  outstanding: number;
  profit: number;
  expenses: number;
}

export class DashboardService {
  static async getMetrics(): Promise<DashboardMetrics> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd'); // Assuming createdAt is ISO format or starts with YYYY-MM-DD
    
    // 1. Today's Sales
    const salesRes = await db.execute(`
      SELECT SUM(total) as total FROM sales 
      WHERE createdAt LIKE '${todayStr}%' AND status != 'cancelled'
    `);
    const todaySales = Number(salesRes.rows[0]?.total || 0);

    // 2. Today's Purchases
    const purchasesRes = await db.execute(`
      SELECT SUM(total) as total FROM purchases 
      WHERE createdAt LIKE '${todayStr}%' AND status != 'cancelled'
    `);
    const todayPurchases = Number(purchasesRes.rows[0]?.total || 0);

    // 3. Current Stock Value (simplified as stockQuantity * cost)
    const stockRes = await db.execute(`
      SELECT SUM(stockQuantity * cost) as total FROM products
    `);
    const currentStockValue = Number(stockRes.rows[0]?.total || 0);

    // 4. Outstanding (Customers Owe + Owe Suppliers)
    // Positive means users owe us, negative means we owe suppliers? Let's just do customer outstanding
    const custOutRes = await db.execute(`
      SELECT SUM(outstandingBalance) as total FROM customers
    `);
    const outstanding = Number(custOutRes.rows[0]?.total || 0);

    // 5. Today's Expenses
    const expRes = await db.execute(`
      SELECT SUM(amount) as total FROM expenses
      WHERE date LIKE '${todayStr}%'
    `);
    const expenses = Number(expRes.rows[0]?.total || 0);

    // 6. Profit (Simplified: Today Sales - (Cost of goods sold for today's sales) - Expenses)
    // This is a rough estimation. For actual profit we need COGS.
    const cogsRes = await db.execute(`
      SELECT SUM(si.quantity * p.cost) as total 
      FROM sale_items si
      JOIN products p ON si.productId = p.id
      JOIN sales s ON si.saleId = s.id
      WHERE s.createdAt LIKE '${todayStr}%' AND s.status != 'cancelled'
    `);
    const cogs = Number(cogsRes.rows[0]?.total || 0);
    
    const profit = todaySales - cogs - expenses;

    return {
      todaySales,
      todayPurchases,
      currentStockValue,
      outstanding,
      profit,
      expenses,
    };
  }
}
