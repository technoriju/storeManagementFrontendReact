import { db } from '../../../core/database/db';
import { apiClient } from '../../../core/api/api-client';
import { API_ENDPOINTS } from '../../../core/api/api-urls';
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

export interface CustomerDistribution {
  firstTime: number;
  returnCount: number;
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
  customerDistribution?: CustomerDistribution;
}

let cachedMetrics: DashboardMetrics | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 10000; // 10 seconds memory cache

export class DashboardService {
  /**
   * Returns dashboard metrics.
   * Fetches from backend API first; falls back to local SQLite if offline or network error.
   * Uses stale-while-revalidate caching for instant rendering.
   */
  static async getMetrics(forceRefresh = false): Promise<DashboardMetrics> {
    const now = Date.now();
    if (!forceRefresh && cachedMetrics && now - lastFetchTime < CACHE_TTL) {
      return cachedMetrics;
    }

    // 1. Try Backend API first for complete, aggregated real data
    try {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD.METRICS, { timeout: 4000 });
      const resData = response.data?.data || response.data;
      if (resData && typeof resData === 'object' && resData.totalProducts !== undefined) {
        const metrics: DashboardMetrics = {
          todaySales: Number(resData.todaySales || 0),
          todayPurchases: Number(resData.todayPurchases || 0),
          currentStockValue: Number(resData.currentStockValue || 0),
          outstanding: Number(resData.outstanding || 0),
          profit: Number(resData.profit || 0),
          expenses: Number(resData.expenses || 0),
          todayOrdersCount: Number(resData.todayOrdersCount || 0),
          totalSales: Number(resData.totalSales || 0),
          totalPurchases: Number(resData.totalPurchases || 0),
          totalSalesReturn: Number(resData.totalSalesReturn || 0),
          totalPurchaseReturn: Number(resData.totalPurchaseReturn || 0),
          totalCustomers: Number(resData.totalCustomers || 0),
          totalSuppliers: Number(resData.totalSuppliers || 0),
          totalProducts: Number(resData.totalProducts || 0),
          lowStockCount: Number(resData.lowStockCount || 0),
          recentSales: Array.isArray(resData.recentSales) ? resData.recentSales : [],
          hourlySalesData: Array.isArray(resData.hourlySalesData) ? resData.hourlySalesData : [],
          weeklySalesData: Array.isArray(resData.weeklySalesData) ? resData.weeklySalesData : [],
          monthlySalesData: Array.isArray(resData.monthlySalesData) ? resData.monthlySalesData : [],
          customerDistribution: resData.customerDistribution || { firstTime: 0, returnCount: 0 },
        };
        cachedMetrics = metrics;
        lastFetchTime = Date.now();
        return metrics;
      }
    } catch (apiError) {
      // Backend offline or unreachable, fall through to local SQLite
      console.warn('Dashboard: API unavailable, calculating from local database...', apiError);
    }

    // 2. Fallback to Local SQLite (Optimized with Promise.all)
    const localData = await this.getMetricsFromLocalDb();
    cachedMetrics = localData;
    lastFetchTime = Date.now();
    return localData;
  }

  /**
   * Fast parallel calculation from local SQLite database
   */
  private static async getMetricsFromLocalDb(): Promise<DashboardMetrics> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const [
      salesRes,
      allSalesRes,
      purchasesRes,
      allPurchasesRes,
      sReturnRes,
      pReturnRes,
      stockRes,
      custOutRes,
      suppRes,
      expRes,
      cogsRes,
      recRes,
      weeklySalesRes,
      weeklyPurchasesRes,
      monthlySalesRes,
      monthlyPurchasesRes,
    ] = await Promise.all([
      db.execute(`
        SELECT SUM(total) as total, COUNT(*) as count FROM sales 
        WHERE (createdAt LIKE '${todayStr}%' OR date LIKE '${todayStr}%') AND status != 'cancelled'
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(total) as total FROM sales WHERE status != 'cancelled'
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(total) as total FROM purchases 
        WHERE (createdAt LIKE '${todayStr}%' OR date LIKE '${todayStr}%') AND status != 'cancelled'
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(total) as total FROM purchases WHERE status != 'cancelled'
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(totalAmount) as total FROM sale_returns
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(totalAmount) as total FROM purchase_returns
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT 
          SUM(stockQuantity * cost) as totalValue,
          COUNT(*) as count,
          SUM(CASE WHEN lowStockThreshold IS NOT NULL AND stockQuantity <= lowStockThreshold THEN 1 ELSE 0 END) as lowCount
        FROM products
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(outstandingBalance) as total, COUNT(*) as count FROM customers
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT COUNT(*) as count FROM suppliers
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT SUM(amount) as total FROM expenses
        WHERE (date LIKE '${todayStr}%' OR createdAt LIKE '${todayStr}%')
      `).catch(() => ({ rows: [] })),

      db.execute(`
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
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT id, invoiceNumber, customerName, total, paymentStatus, date, createdAt
        FROM sales 
        WHERE status != 'cancelled'
        ORDER BY id DESC LIMIT 5
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT date, createdAt, total FROM sales
        WHERE status != 'cancelled' AND (date >= date('now', '-7 days') OR createdAt >= date('now', '-7 days'))
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT date, createdAt, total FROM purchases
        WHERE status != 'cancelled' AND (date >= date('now', '-7 days') OR createdAt >= date('now', '-7 days'))
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT date, createdAt, total FROM sales
        WHERE status != 'cancelled' AND (date >= date('now', '-6 months') OR createdAt >= date('now', '-6 months'))
      `).catch(() => ({ rows: [] })),

      db.execute(`
        SELECT date, createdAt, total FROM purchases
        WHERE status != 'cancelled' AND (date >= date('now', '-6 months') OR createdAt >= date('now', '-6 months'))
      `).catch(() => ({ rows: [] })),
    ]);

    const todaySales = Number(salesRes.rows?.[0]?.total || 0);
    const todayOrdersCount = Number(salesRes.rows?.[0]?.count || 0);
    const totalSales = Number(allSalesRes.rows?.[0]?.total || 0);
    const todayPurchases = Number(purchasesRes.rows?.[0]?.total || 0);
    const totalPurchases = Number(allPurchasesRes.rows?.[0]?.total || 0);
    const totalSalesReturn = Number(sReturnRes.rows?.[0]?.total || 0);
    const totalPurchaseReturn = Number(pReturnRes.rows?.[0]?.total || 0);
    const currentStockValue = Number(stockRes.rows?.[0]?.totalValue || 0);
    const totalProducts = Number(stockRes.rows?.[0]?.count || 0);
    const lowStockCount = Number(stockRes.rows?.[0]?.lowCount || 0);
    const outstanding = Number(custOutRes.rows?.[0]?.total || 0);
    const totalCustomers = Number(custOutRes.rows?.[0]?.count || 0);
    const totalSuppliers = Number(suppRes.rows?.[0]?.count || 0);
    const expenses = Number(expRes.rows?.[0]?.total || 0);

    const cogs = Number(cogsRes.rows?.[0]?.total || 0);
    const profit = Math.round((todaySales - cogs - expenses) * 100) / 100;

    const recentSales: RecentSaleItem[] = (recRes.rows || []).map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber || `INV-${row.id}`,
      customerName: row.customerName || 'Walk-in Customer',
      total: Number(row.total || 0),
      paymentStatus: row.paymentStatus || 'Paid',
      date: row.date || row.createdAt || todayStr,
    }));

    // Build real weekly chart points from local DB
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = new Map<string, { sales: number; purchase: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      weeklyMap.set(key, { sales: 0, purchase: 0 });
    }

    for (const r of weeklySalesRes.rows || []) {
      const key = (r.date || r.createdAt || '').slice(0, 10);
      const entry = weeklyMap.get(key);
      if (entry) entry.sales += Number(r.total || 0);
    }
    for (const r of weeklyPurchasesRes.rows || []) {
      const key = (r.date || r.createdAt || '').slice(0, 10);
      const entry = weeklyMap.get(key);
      if (entry) entry.purchase += Number(r.total || 0);
    }

    const weeklySalesData: ChartPoint[] = Array.from(weeklyMap.entries()).map(([key, val]) => {
      const d = new Date(key);
      return {
        label: isNaN(d.getTime()) ? key : dayNames[d.getDay()],
        sales: Math.round(val.sales),
        purchase: Math.round(val.purchase),
      };
    });

    // Build real monthly chart points from local DB
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map<string, { label: string; sales: number; purchase: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = format(d, 'yyyy-MM');
      monthlyMap.set(key, { label: monthNames[d.getMonth()], sales: 0, purchase: 0 });
    }

    for (const r of monthlySalesRes.rows || []) {
      const key = (r.date || r.createdAt || '').slice(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.sales += Number(r.total || 0);
    }
    for (const r of monthlyPurchasesRes.rows || []) {
      const key = (r.date || r.createdAt || '').slice(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.purchase += Number(r.total || 0);
    }

    const monthlySalesData: ChartPoint[] = Array.from(monthlyMap.values()).map((m) => ({
      label: m.label,
      sales: Math.round(m.sales),
      purchase: Math.round(m.purchase),
    }));

    const hourlySalesData: ChartPoint[] = [
      { label: '8 am', sales: 0, purchase: 0 },
      { label: '10 am', sales: 0, purchase: 0 },
      { label: '12 pm', sales: 0, purchase: 0 },
      { label: '2 pm', sales: 0, purchase: 0 },
      { label: '4 pm', sales: 0, purchase: 0 },
      { label: '6 pm', sales: 0, purchase: 0 },
      { label: '8 pm', sales: 0, purchase: 0 },
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
      customerDistribution: {
        firstTime: totalCustomers > 0 ? 1 : 0,
        returnCount: Math.max(0, totalCustomers - 1),
      },
    };
  }

  static clearCache() {
    cachedMetrics = null;
    lastFetchTime = 0;
  }
}
