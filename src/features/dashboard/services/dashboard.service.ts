import { db } from '../../../core/database/db';
import { format } from 'date-fns';

export interface RecentSaleItem {
  id: number;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  date: string;
}

export interface ChartPoint {
  label: string;
  sales: number;
  purchase: number;
}

export interface DashboardMetrics {
  todaySales: number;
  todayPurchases: number;
  currentStockValue: number;
  outstanding: number;
  profit: number;
  expenses: number;
  todayOrdersCount: number;
  totalSales: number;
  totalPurchases: number;
  totalSalesReturn: number;
  totalPurchaseReturn: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalProducts: number;
  lowStockCount: number;
  recentSales: RecentSaleItem[];
  hourlySalesData: ChartPoint[];
  weeklySalesData: ChartPoint[];
  monthlySalesData: ChartPoint[];
}

export class DashboardService {
  static async getMetrics(): Promise<DashboardMetrics> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // 1. Today's Sales & Count
    let todaySales = 0;
    let todayOrdersCount = 0;
    try {
      const salesRes = await db.execute(`
        SELECT SUM(total) as total, COUNT(*) as count FROM sales 
        WHERE (createdAt LIKE '${todayStr}%' OR date LIKE '${todayStr}%') AND status != 'cancelled'
      `);
      todaySales = Number(salesRes.rows[0]?.total || 0);
      todayOrdersCount = Number(salesRes.rows[0]?.count || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load today sales', e);
    }

    // 2. All-time Sales
    let totalSales = 0;
    try {
      const allSalesRes = await db.execute(`
        SELECT SUM(total) as total FROM sales WHERE status != 'cancelled'
      `);
      totalSales = Number(allSalesRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load total sales', e);
    }

    // 3. Today's Purchases
    let todayPurchases = 0;
    try {
      const purchasesRes = await db.execute(`
        SELECT SUM(total) as total FROM purchases 
        WHERE (createdAt LIKE '${todayStr}%' OR date LIKE '${todayStr}%') AND status != 'cancelled'
      `);
      todayPurchases = Number(purchasesRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load today purchases', e);
    }

    // 4. All-time Purchases
    let totalPurchases = 0;
    try {
      const allPurchasesRes = await db.execute(`
        SELECT SUM(total) as total FROM purchases WHERE status != 'cancelled'
      `);
      totalPurchases = Number(allPurchasesRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load total purchases', e);
    }

    // 5. Sales Returns
    let totalSalesReturn = 0;
    try {
      const sReturnRes = await db.execute(`
        SELECT SUM(totalAmount) as total FROM sale_returns
      `);
      totalSalesReturn = Number(sReturnRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load sales returns', e);
    }

    // 6. Purchase Returns
    let totalPurchaseReturn = 0;
    try {
      const pReturnRes = await db.execute(`
        SELECT SUM(totalAmount) as total FROM purchase_returns
      `);
      totalPurchaseReturn = Number(pReturnRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load purchase returns', e);
    }

    // 7. Current Stock Value & Product Counts
    let currentStockValue = 0;
    let totalProducts = 0;
    let lowStockCount = 0;
    try {
      const stockRes = await db.execute(`
        SELECT 
          SUM(stockQuantity * cost) as totalValue,
          COUNT(*) as count,
          SUM(CASE WHEN lowStockThreshold IS NOT NULL AND stockQuantity <= lowStockThreshold THEN 1 ELSE 0 END) as lowCount
        FROM products
      `);
      currentStockValue = Number(stockRes.rows[0]?.totalValue || 0);
      totalProducts = Number(stockRes.rows[0]?.count || 0);
      lowStockCount = Number(stockRes.rows[0]?.lowCount || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load stock data', e);
    }

    // 8. Outstanding Customer Balances
    let outstanding = 0;
    let totalCustomers = 0;
    try {
      const custOutRes = await db.execute(`
        SELECT SUM(outstandingBalance) as total, COUNT(*) as count FROM customers
      `);
      outstanding = Number(custOutRes.rows[0]?.total || 0);
      totalCustomers = Number(custOutRes.rows[0]?.count || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load customers', e);
    }

    // 9. Total Suppliers
    let totalSuppliers = 0;
    try {
      const suppRes = await db.execute(`
        SELECT COUNT(*) as count FROM suppliers
      `);
      totalSuppliers = Number(suppRes.rows[0]?.count || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load suppliers', e);
    }

    // 10. Today's Expenses
    let expenses = 0;
    try {
      const expRes = await db.execute(`
        SELECT SUM(amount) as total FROM expenses
        WHERE (date LIKE '${todayStr}%' OR createdAt LIKE '${todayStr}%')
      `);
      expenses = Number(expRes.rows[0]?.total || 0);
    } catch (e) {
      console.warn('Dashboard: failed to load expenses', e);
    }

    // 11. Profit Calculation
    let profit = 0;
    try {
      const cogsRes = await db.execute(`
        SELECT SUM(
          si.quantity * CASE 
            WHEN si.unitCost IS NOT NULL AND si.unitCost > 0 THEN si.unitCost
            WHEN si.unitType = 'sub' AND si.conversionRate > 0 THEN (p.cost / si.conversionRate)
            WHEN p.conversionRate > 1 AND si.unitType = 'sub' THEN (p.cost / p.conversionRate)
            ELSE p.cost
          END
        ) as total 
        FROM sale_items si
        JOIN products p ON si.productId = p.id
        JOIN sales s ON si.saleId = s.id
        WHERE (s.createdAt LIKE '${todayStr}%' OR s.date LIKE '${todayStr}%') AND s.status != 'cancelled'
      `);
      const cogs = Number(cogsRes.rows[0]?.total || 0);
      profit = todaySales - cogs - expenses;
    } catch (e) {
      profit = todaySales - expenses;
    }

    // 12. Recent Sales
    let recentSales: RecentSaleItem[] = [];
    try {
      const recRes = await db.execute(`
        SELECT id, invoiceNumber, customerName, total, paymentStatus, date, createdAt
        FROM sales 
        WHERE status != 'cancelled'
        ORDER BY id DESC LIMIT 5
      `);
      recentSales = (recRes.rows || []).map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber || `INV-${row.id}`,
        customerName: row.customerName || 'Walk-in Customer',
        total: Number(row.total || 0),
        paymentStatus: row.paymentStatus || 'Paid',
        date: row.date || row.createdAt || todayStr,
      }));
    } catch (e) {
      console.warn('Dashboard: failed to load recent sales', e);
    }

    // Hourly intervals for 1D chart
    const hourlySalesData: ChartPoint[] = [
      { label: '8 am', sales: 25, purchase: 40 },
      { label: '10 am', sales: 45, purchase: 65 },
      { label: '12 pm', sales: 65, purchase: 50 },
      { label: '2 pm', sales: 40, purchase: 35 },
      { label: '4 pm', sales: 85, purchase: 60 },
      { label: '6 pm', sales: 95, purchase: 70 },
      { label: '8 pm', sales: 50, purchase: 30 },
    ];

    const weeklySalesData: ChartPoint[] = [
      { label: 'Mon', sales: 45, purchase: 30 },
      { label: 'Tue', sales: 60, purchase: 45 },
      { label: 'Wed', sales: 35, purchase: 55 },
      { label: 'Thu', sales: 80, purchase: 40 },
      { label: 'Fri', sales: 70, purchase: 65 },
      { label: 'Sat', sales: 90, purchase: 85 },
      { label: 'Sun', sales: 65, purchase: 20 },
    ];

    const monthlySalesData: ChartPoint[] = [
      { label: 'Jan', sales: 50, purchase: 40 },
      { label: 'Feb', sales: 65, purchase: 50 },
      { label: 'Mar', sales: 85, purchase: 70 },
      { label: 'Apr', sales: 75, purchase: 60 },
      { label: 'May', sales: 90, purchase: 80 },
      { label: 'Jun', sales: 95, purchase: 85 },
    ];

    return {
      todaySales,
      todayPurchases,
      currentStockValue,
      outstanding,
      profit,
      expenses,
      todayOrdersCount,
      totalSales,
      totalPurchases,
      totalSalesReturn,
      totalPurchaseReturn,
      totalCustomers,
      totalSuppliers,
      totalProducts,
      lowStockCount,
      recentSales,
      hourlySalesData,
      weeklySalesData,
      monthlySalesData,
    };
  }
}
