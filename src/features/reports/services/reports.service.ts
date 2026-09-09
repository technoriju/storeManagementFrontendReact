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
    const res = db.execute(query);
    return res.rows?._array || [];
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
    const res = db.execute(query);
    return res.rows?._array || [];
  }

  static async getInventoryReport(filters: ReportFilters) {
    let query = `
      SELECT id, name, sku, stockQuantity, cost, price, (stockQuantity * cost) as stockValue
      FROM products
      WHERE 1=1
    `;
    
    if (filters.productId) {
      query += ` AND id = '${filters.productId}'`;
    }
    
    query += ' ORDER BY name ASC';
    const res = db.execute(query);
    return res.rows?._array || [];
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
    const res = db.execute(query);
    return res.rows?._array || [];
  }
  
  static async getExpensesReport(filters: ReportFilters) {
    const query = `
      SELECT id, category, amount, date, description
      FROM expenses
      WHERE ${this.buildDateCondition('date', filters)}
      ORDER BY date DESC
    `;
    const res = db.execute(query);
    return res.rows?._array || [];
  }
}
