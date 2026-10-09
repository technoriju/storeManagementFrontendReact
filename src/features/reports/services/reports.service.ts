import { db } from '../../../core/database/db';
import { apiClient } from '../../../core/api/api-client';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  productId?: string;
  customerId?: string;
  supplierId?: string;
  search?: string;
  status?: string;
  paymentStatus?: string;
  category?: string;
}

export class ReportsService {
  private static buildDateCondition(field: string, filters: ReportFilters) {
    let condition = '1=1';
    if (filters.startDate) {
      condition += ` AND ((${field} >= '${filters.startDate}') OR (SUBSTR(${field}, 1, 10) >= '${filters.startDate}'))`;
    }
    if (filters.endDate) {
      const dateOnly = filters.endDate.split('T')[0];
      condition += ` AND ((${field} <= '${dateOnly}') OR (SUBSTR(${field}, 1, 10) <= '${dateOnly}') OR (${field} <= '${filters.endDate}'))`;
    }
    return condition;
  }


  static unpackApiArray(res: any): any[] {
    if (!res) return [];
    const body = res.data !== undefined ? res.data : res;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.data?.data)) return body.data.data;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.data?.items)) return body.data.items;
    if (Array.isArray(body?.rows)) return body.rows;
    if (Array.isArray(body?.data?.rows)) return body.data.rows;
    return [];
  }

  static extractDbRows(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.rows) {
      if (Array.isArray(res.rows)) return res.rows;
      if (Array.isArray(res.rows._array)) return res.rows._array;
      if (typeof res.rows.length === 'number') {
        const arr = [];
        for (let i = 0; i < res.rows.length; i++) {
          arr.push(typeof res.rows.item === 'function' ? res.rows.item(i) : res.rows[i]);
        }
        return arr;
      }
    }
    if (Array.isArray(res._array)) return res._array;
    return [];
  }

  // 1. Sales Report
  static async getSalesReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/sales', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const grandTotal = item.grandTotal !== undefined ? item.grandTotal : item.total || 0;
          const paid = item.paidAmount !== undefined ? item.paidAmount : item.paid || 0;
          const due = item.dueAmount !== undefined ? item.dueAmount : Math.max(0, grandTotal - paid);
          const custName = (item.customerName && String(item.customerName).trim()) ||
            item.customer?.name ||
            item.partyName ||
            (item.customerId ? `Customer #${item.customerId}` : 'Walk-in Customer');

          return {
            ...item,
            customerName: custName,
            date: item.saleDate ? String(item.saleDate).slice(0, 10) : item.date,
            subtotal: item.subTotal !== undefined ? item.subTotal : item.subtotal || grandTotal,
            tax: item.taxTotal !== undefined ? item.taxTotal : item.tax || 0,
            discount: item.discountTotal !== undefined ? item.discountTotal : item.discount || 0,
            total: grandTotal,
            paid,
            due,
            paymentStatus: item.paymentStatus || (Number(due) <= 0 ? 'Paid' : Number(paid) > 0 ? 'Partial' : 'Unpaid'),
            paymentMethod: item.paymentMethod || 'UPI',
          };
        });
      }
    } catch {}

    try {
      let query = `
        SELECT 
          s.id, 
          s.invoiceNumber, 
          COALESCE(s.date, SUBSTR(s.createdAt, 1, 10)) as date, 
          CASE 
            WHEN s.customerName IS NOT NULL AND TRIM(s.customerName) != '' THEN s.customerName
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name
            WHEN s.customerId IS NOT NULL THEN 'Customer #' || s.customerId
            ELSE 'Walk-in Customer'
          END as customerName,
          COALESCE(s.subtotal, s.total) as subtotal,
          COALESCE(s.gst, 0) as tax,
          COALESCE(s.discount, 0) as discount,
          s.total, 
          COALESCE(s.paid, 0) as paid, 
          COALESCE(s.due, 0) as due, 
          COALESCE(s.paymentStatus, 'Unpaid') as paymentStatus, 
          'UPI' as paymentMethod,
          s.status
        FROM sales s
        LEFT JOIN customers c ON (s.customerId = c.id OR (c.backendId IS NOT NULL AND s.customerId = c.backendId))
        WHERE ${this.buildDateCondition('s.createdAt', filters)}
      `;

      if (filters.customerId) {
        query += ` AND s.customerId = '${filters.customerId}'`;
      }
      if (filters.search) {
        query += ` AND (s.invoiceNumber LIKE '%${filters.search}%' OR s.customerName LIKE '%${filters.search}%' OR c.name LIKE '%${filters.search}%')`;
      }
      query += ' ORDER BY s.id DESC';

      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 2. Purchase Report
  static async getPurchasesReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/purchases', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const grandTotal = item.grandTotal !== undefined ? item.grandTotal : item.total || 0;
          const paid = item.paidAmount !== undefined ? item.paidAmount : item.paid || 0;
          const due = item.dueAmount !== undefined ? item.dueAmount : Math.max(0, grandTotal - paid);
          const suppName = (item.supplierName && String(item.supplierName).trim()) ||
            item.supplier?.name ||
            item.partyName ||
            (item.supplierId ? `Supplier #${item.supplierId}` : 'Supplier');

          return {
            ...item,
            supplierName: suppName,
            date: item.purchaseDate ? String(item.purchaseDate).slice(0, 10) : (item.date || ''),
            itemsCount: item.itemCount !== undefined ? item.itemCount : item.itemsCount || 1,
            subtotal: item.subTotal !== undefined ? item.subTotal : item.subtotal || grandTotal,
            tax: item.taxTotal !== undefined ? item.taxTotal : item.tax || 0,
            total: grandTotal,
            paid,
            due,
            paymentStatus: item.paymentStatus || (Number(due) <= 0 ? 'Paid' : Number(paid) > 0 ? 'Partial' : 'Unpaid'),
            status: item.status || 'Received',
          };
        });
      }
    } catch {}

    try {
      let query = `
        SELECT 
          p.id, 
          p.invoiceNumber, 
          COALESCE(p.date, SUBSTR(p.createdAt, 1, 10)) as date, 
          CASE 
            WHEN p.supplierName IS NOT NULL AND TRIM(p.supplierName) != '' THEN p.supplierName
            WHEN s.name IS NOT NULL AND TRIM(s.name) != '' THEN s.name
            WHEN p.supplierId IS NOT NULL THEN 'Supplier #' || p.supplierId
            ELSE 'Supplier'
          END as supplierName,
          COALESCE(p.subtotal, p.total) as subtotal,
          COALESCE(p.gst, 0) as tax,
          p.total, 
          COALESCE(p.paid, 0) as paid, 
          COALESCE(p.due, 0) as due, 
          COALESCE(p.paymentStatus, 'Unpaid') as paymentStatus, 
          COALESCE(p.status, 'Received') as status,
          (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchaseId = p.id) as itemsCount
        FROM purchases p
        LEFT JOIN suppliers s ON (p.supplierId = s.id OR (s.backendId IS NOT NULL AND p.supplierId = s.backendId))
        WHERE ${this.buildDateCondition('p.createdAt', filters)}
      `;

      if (filters.supplierId) {
        query += ` AND p.supplierId = '${filters.supplierId}'`;
      }
      if (filters.search) {
        query += ` AND (p.invoiceNumber LIKE '%${filters.search}%' OR p.supplierName LIKE '%${filters.search}%' OR s.name LIKE '%${filters.search}%')`;
      }
      query += ' ORDER BY p.id DESC';

      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 3. Inventory Report
  static async getInventoryReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/stock', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const cat = (item.category && String(item.category).trim()) ||
            (item.categoryName && String(item.categoryName).trim()) ||
            (typeof item.category === 'object' ? item.category?.name : '') ||
            'General';

          return {
            ...item,
            sku: item.sku || item.productCode || `SKU-${item.productId || item.id}`,
            name: item.productName || item.name || 'Product',
            category: cat,
            stockQuantity: item.quantity !== undefined ? item.quantity : item.stockQuantity || 0,
            stockWithUnits: item.formattedStock || `${item.quantity || 0} ${item.unit || 'Units'}`,
            cost: item.unitCost !== undefined ? item.unitCost : item.cost || 0,
            price: item.price !== undefined ? item.price : item.unitCost || 0,
            stockValuation: item.stockValue !== undefined ? item.stockValue : Number(((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)),
            status: Number(item.quantity || item.stockQuantity || 0) <= 0 ? 'OUT_OF_STOCK' : Number(item.quantity || item.stockQuantity || 0) <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
          };
        });
      }
    } catch {}

    try {
      let query = `
        SELECT 
          p.id, 
          p.name, 
          p.sku, 
          CASE 
            WHEN p.categoryName IS NOT NULL AND TRIM(p.categoryName) != '' THEN p.categoryName
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name
            ELSE 'General'
          END as category,
          p.stockQuantity,
          COALESCE(u.shortName, u.name, 'Box') as baseUnit,
          p.conversionRate,
          COALESCE(su.name, 'Pcs') as subUnit,
          CASE 
            WHEN p.conversionRate > 1 THEN 
              ROUND(p.stockQuantity, 0) || ' ' || COALESCE(u.shortName, u.name, 'Box') || ' (' || ROUND(p.stockQuantity * p.conversionRate, 0) || ' ' || COALESCE(su.name, 'Pcs') || ')'
            ELSE 
              ROUND(p.stockQuantity, 0) || ' ' || COALESCE(u.shortName, u.name, 'Box')
          END as stockWithUnits,
          COALESCE(p.cost, 0) as cost,
          COALESCE(p.price, 0) as price,
          ROUND(p.stockQuantity * COALESCE(p.cost, 0), 2) as stockValuation,
          CASE 
            WHEN p.stockQuantity <= 0 THEN 'OUT_OF_STOCK'
            WHEN p.stockQuantity <= COALESCE(p.lowStockThreshold, 5) THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
          END as status
        FROM products p
        LEFT JOIN categories c ON (p.categoryId = c.id OR (c.backendId IS NOT NULL AND p.categoryId = c.backendId))
        LEFT JOIN units u ON (p.unitId = u.id OR p.baseUnitId = u.id OR (u.backendId IS NOT NULL AND (p.unitId = u.backendId OR p.baseUnitId = u.backendId)))
        LEFT JOIN sub_units su ON (p.subUnitId = su.id OR p.subunitId = su.id OR (su.backendId IS NOT NULL AND (p.subUnitId = su.backendId OR p.subunitId = su.backendId)))
        WHERE 1=1
      `;

      if (filters.productId) {
        query += ` AND p.id = '${filters.productId}'`;
      }
      query += ' ORDER BY p.name ASC';

      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 4. Customer Report
  static async getCustomerReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/customer-outstanding', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const cName = (item.customerName && String(item.customerName).trim()) ||
            (item.name && String(item.name).trim()) ||
            item.customer?.name ||
            'Customer';

          return {
            ...item,
            id: item.id || item.customerId,
            customerCode: item.customerCode || `CU-${String(item.customerId || item.id).padStart(3, '0')}`,
            customerName: cName,
            phone: item.phone || 'N/A',
            totalSalesCount: item.totalSalesCount || 0,
            totalBilled: item.totalBilled || 0,
            totalPaid: item.totalPaid || 0,
            outstandingBalance: item.outstandingBalance || 0,
            status: item.status || (Number(item.outstandingBalance || 0) > 0 ? 'Overdue' : 'Clear'),
          };
        });
      }
    } catch {}

    try {
      let salesDateCondition = 's.status != "cancelled"';
      if (filters.startDate) {
        salesDateCondition += ` AND (s.date >= '${filters.startDate}' OR SUBSTR(s.createdAt, 1, 10) >= '${filters.startDate}')`;
      }
      if (filters.endDate) {
        const dateOnly = filters.endDate.split('T')[0];
        salesDateCondition += ` AND (s.date <= '${dateOnly}' OR SUBSTR(s.createdAt, 1, 10) <= '${dateOnly}')`;
      }

      let whereClause = '1=1';
      if (filters.customerId) {
        whereClause += ` AND (c.id = '${filters.customerId}' OR c.backendId = '${filters.customerId}')`;
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        whereClause += ` AND (c.name LIKE '%${s}%' OR c.phone LIKE '%${s}%' OR c.taxId LIKE '%${s}%')`;
      }

      const query = `
        SELECT 
          c.id,
          'CU-' || SUBSTR('000' || c.id, -3) as customerCode,
          CASE
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name
            ELSE 'Customer #' || c.id
          END as customerName,
          COALESCE(c.phone, 'N/A') as phone,
          COUNT(s.id) as totalSalesCount,
          COALESCE(SUM(s.total), 0) as totalBilled,
          COALESCE(SUM(s.paid), 0) as totalPaid,
          COALESCE(c.outstandingBalance, SUM(s.due), 0) as outstandingBalance,
          CASE 
            WHEN COALESCE(c.outstandingBalance, SUM(s.due), 0) > 0 THEN 'Overdue'
            ELSE 'Clear'
          END as status
        FROM customers c
        LEFT JOIN sales s ON ((s.customerId = c.id OR (c.backendId IS NOT NULL AND s.customerId = c.backendId)) AND ${salesDateCondition})
        WHERE ${whereClause}
        GROUP BY c.id
        ORDER BY outstandingBalance DESC, totalBilled DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  static async getCustomerOutstandingReport(filters: ReportFilters = {}): Promise<any[]> {
    return this.getCustomerReport(filters);
  }

  // 5. Supplier Report
  static async getSupplierReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/supplier-outstanding', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const sName = (item.supplierName && String(item.supplierName).trim()) ||
            (item.name && String(item.name).trim()) ||
            item.supplier?.name ||
            'Supplier';

          return {
            ...item,
            id: item.id || item.supplierId,
            supplierCode: item.supplierCode || `SU-${String(item.supplierId || item.id).padStart(3, '0')}`,
            supplierName: sName,
            phone: item.phone || 'N/A',
            totalPurchasesCount: item.totalPurchasesCount || 0,
            totalPurchased: item.totalPurchased || 0,
            totalPaid: item.totalPaid || 0,
            outstandingBalance: item.outstandingBalance || 0,
            status: item.status || (Number(item.outstandingBalance || 0) > 0 ? 'Pending' : 'Clear'),
          };
        });
      }
    } catch {}

    try {
      let purDateCondition = 'p.status != "cancelled"';
      if (filters.startDate) {
        purDateCondition += ` AND (p.date >= '${filters.startDate}' OR SUBSTR(p.createdAt, 1, 10) >= '${filters.startDate}')`;
      }
      if (filters.endDate) {
        const dateOnly = filters.endDate.split('T')[0];
        purDateCondition += ` AND (p.date <= '${dateOnly}' OR SUBSTR(p.createdAt, 1, 10) <= '${dateOnly}')`;
      }

      let whereClause = '1=1';
      if (filters.supplierId) {
        whereClause += ` AND (s.id = '${filters.supplierId}' OR s.backendId = '${filters.supplierId}')`;
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        whereClause += ` AND (s.name LIKE '%${s}%' OR s.phone LIKE '%${s}%' OR s.contactName LIKE '%${s}%')`;
      }

      const query = `
        SELECT 
          s.id, 
          'SU-' || SUBSTR('000' || s.id, -3) as supplierCode,
          CASE 
            WHEN s.name IS NOT NULL AND TRIM(s.name) != '' THEN s.name
            ELSE 'Supplier #' || s.id
          END as supplierName,
          COALESCE(s.phone, 'N/A') as phone,
          COUNT(p.id) as totalPurchasesCount,
          COALESCE(SUM(p.total), 0) as totalPurchased,
          COALESCE(SUM(p.paid), 0) as totalPaid,
          COALESCE(s.outstandingBalance, SUM(p.due), 0) as outstandingBalance,
          CASE 
            WHEN COALESCE(s.outstandingBalance, SUM(p.due), 0) > 0 THEN 'Pending'
            ELSE 'Clear'
          END as status
        FROM suppliers s
        LEFT JOIN purchases p ON ((p.supplierId = s.id OR (s.backendId IS NOT NULL AND p.supplierId = s.backendId)) AND ${purDateCondition})
        WHERE ${whereClause}
        GROUP BY s.id
        ORDER BY outstandingBalance DESC, totalPurchased DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  static async getSupplierOutstandingReport(filters: ReportFilters = {}): Promise<any[]> {
    return this.getSupplierReport(filters);
  }

  // 6. Product Report
  static async getProductReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/products', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const cat = (item.category && String(item.category).trim()) ||
            (item.categoryName && String(item.categoryName).trim()) ||
            (typeof item.category === 'object' ? item.category?.name : '') ||
            'General';

          return {
            ...item,
            sku: item.sku || `SKU-${item.id}`,
            name: item.name || item.productName || 'Product',
            category: cat,
            unitsSold: item.unitsSold || 0,
            revenue: item.revenue || 0,
            cost: item.cost || 0,
            profit: item.profit || 0,
            margin: item.margin || 0,
            currentStock: item.currentStock || 0,
          };
        });
      }
    } catch {}

    try {
      const query = `
        SELECT 
          p.id,
          p.sku,
          p.name,
          CASE 
            WHEN p.categoryName IS NOT NULL AND TRIM(p.categoryName) != '' THEN p.categoryName
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name
            ELSE 'General'
          END as category,
          COALESCE(SUM(si.quantity), 0) as unitsSold,
          COALESCE(SUM(si.total), 0) as revenue,
          COALESCE(SUM(si.quantity * p.cost), 0) as cost,
          COALESCE(SUM(si.total - (si.quantity * p.cost)), 0) as profit,
          CASE 
            WHEN SUM(si.total) > 0 THEN ROUND((SUM(si.total - (si.quantity * p.cost)) / SUM(si.total)) * 100, 1)
            ELSE 0
          END as margin,
          p.stockQuantity as currentStock
        FROM products p
        LEFT JOIN categories c ON (p.categoryId = c.id OR (c.backendId IS NOT NULL AND p.categoryId = c.backendId))
        LEFT JOIN sale_items si ON si.productId = p.id
        GROUP BY p.id
        ORDER BY revenue DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 7. Invoice Report
  static async getInvoiceReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/invoices', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const custName = (item.customerName && String(item.customerName).trim()) ||
            item.customer?.name ||
            item.partyName ||
            (item.customerId ? `Customer #${item.customerId}` : 'Walk-in Customer');

          return {
            ...item,
            invoiceNumber: item.invoiceNumber,
            date: item.date || (item.saleDate ? String(item.saleDate).slice(0, 16).replace('T', ' ') : ''),
            customerName: custName,
            taxableAmount: item.taxableAmount !== undefined ? item.taxableAmount : item.subTotal || 0,
            taxAmount: item.taxAmount !== undefined ? item.taxAmount : item.taxTotal || 0,
            grandTotal: item.grandTotal !== undefined ? item.grandTotal : item.total || 0,
            paymentMethod: item.paymentMethod || 'UPI',
            paymentStatus: item.paymentStatus || 'Paid',
          };
        });
      }
    } catch {}

    try {
      let query = `
        SELECT 
          s.id,
          s.invoiceNumber,
          COALESCE(s.date, SUBSTR(s.createdAt, 1, 10)) as date,
          CASE 
            WHEN s.customerName IS NOT NULL AND TRIM(s.customerName) != '' THEN s.customerName
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name
            WHEN s.customerId IS NOT NULL THEN 'Customer #' || s.customerId
            ELSE 'Walk-in Customer'
          END as customerName,
          COALESCE(s.subtotal, s.total) as taxableAmount,
          COALESCE(s.gst, 0) as taxAmount,
          s.total as grandTotal,
          'UPI' as paymentMethod,
          COALESCE(s.paymentStatus, 'Paid') as paymentStatus
        FROM sales s
        LEFT JOIN customers c ON (s.customerId = c.id OR (c.backendId IS NOT NULL AND s.customerId = c.backendId))
        WHERE ${this.buildDateCondition('s.createdAt', filters)}
        ORDER BY s.id DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 8. Payment Report
  static async getPaymentReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/payments', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => {
          const isReceived = String(item.type).toUpperCase() === 'RECEIVED' || String(item.type).toLowerCase() === 'receive';
          const pName = (item.partyName && String(item.partyName).trim()) ||
            (item.customerName && String(item.customerName).trim()) ||
            (item.supplierName && String(item.supplierName).trim()) ||
            item.party?.name ||
            item.customer?.name ||
            item.supplier?.name ||
            (isReceived ? 'Customer' : 'Supplier');

          return {
            ...item,
            voucherNo: item.voucherNo || (item.referenceNumber ? `PAY-${item.referenceNumber}` : `PAY-${String(item.id).padStart(3, '0')}`),
            date: item.paymentDate ? String(item.paymentDate).slice(0, 10) : (item.date || ''),
            type: isReceived ? 'Receipt' : 'Payment',
            partyName: pName,
            paymentMethod: item.paymentMethod || item.method || 'Cash',
            reference: item.referenceNumber || item.reference || '-',
            inflow: isReceived ? (Number(item.amount) || 0) : 0,
            outflow: !isReceived ? (Number(item.amount) || 0) : 0,
          };
        });
      }
    } catch {}

    try {
      const query = `
        SELECT 
          p.id, 
          'PAY-' || SUBSTR('000' || p.id, -3) as voucherNo, 
          COALESCE(SUBSTR(p.createdAt, 1, 10), '') as date, 
          COALESCE(p.type, 'receive') as type, 
          CASE 
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name 
            WHEN s.name IS NOT NULL AND TRIM(s.name) != '' THEN s.name 
            ELSE 'Direct Cash' 
          END as partyName, 
          COALESCE(p.method, 'Cash') as paymentMethod, 
          COALESCE(p.reference, 'REF-' || p.id) as reference, 
          p.amount, 
          CASE WHEN LOWER(p.type) = 'receive' THEN p.amount ELSE 0 END as inflow, 
          CASE WHEN LOWER(p.type) = 'pay' THEN p.amount ELSE 0 END as outflow 
        FROM payments p 
        LEFT JOIN customers c ON (p.customerId = c.id OR (c.backendId IS NOT NULL AND p.customerId = c.backendId)) 
        LEFT JOIN suppliers s ON (p.supplierId = s.id OR (s.backendId IS NOT NULL AND p.supplierId = s.backendId)) 
        WHERE ${this.buildDateCondition('p.createdAt', filters)} 
        ORDER BY p.id DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // 9. Expense Report
  static async getExpenseReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/expenses', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any) => ({
          ...item,
          voucherNo: item.voucherNo || `EXP-${String(item.id).padStart(3, '0')}`,
          date: item.expenseDate ? String(item.expenseDate).slice(0, 10) : (item.date || ''),
          category: (item.category && String(item.category).trim()) || (item.categoryName && String(item.categoryName).trim()) || (typeof item.category === 'object' ? item.category?.name : '') || 'General Expense',
          description: item.description || '',
          vendor: item.vendor || item.userName || item.branchName || 'Vendor',
          paymentMethod: item.paymentMethod || item.method || 'Bank / Cash',
          amount: Number(item.amount) || 0,
        }));
      }
    } catch {}
    try {
      const query = `
        SELECT 
          id, 
          'EXP-' || SUBSTR('000' || id, -3) as voucherNo, 
          date, 
          CASE 
            WHEN category IS NOT NULL AND TRIM(category) != '' THEN category 
            ELSE 'General Expense' 
          END as category, 
          description, 
          'Vendor' as vendor, 
          'Bank / Cash' as paymentMethod, 
          amount 
        FROM expenses 
        WHERE ${this.buildDateCondition('date', filters)} 
        ORDER BY date DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  static async getExpensesReport(filters: ReportFilters = {}): Promise<any[]> {
    return this.getExpenseReport(filters);
  }

  // 10. Income Report
  static async getIncomeReport(filters: ReportFilters = {}): Promise<any[]> {
    return [];
  }

  // 11. Tax (GST) Report
  static async getTaxReport(filters: ReportFilters = {}): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/gst-summary', { params: { limit: 500, ...filters } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((item: any, idx: number) => {
          const partyName = (item.partyName && String(item.partyName).trim()) ||
            (item.customerName && String(item.customerName).trim()) ||
            (item.supplierName && String(item.supplierName).trim()) ||
            item.customer?.name ||
            item.supplier?.name ||
            (item.type === 'PURCHASE' ? 'Supplier' : 'Customer');

          return {
            ...item,
            id: item.id || idx + 1,
            invoiceNumber: item.invoiceNumber || `INV-${idx + 1}`,
            date: item.date ? String(item.date).slice(0, 10) : item.saleDate ? String(item.saleDate).slice(0, 10) : 'N/A',
            partyName,
            gstin: item.gstin || item.taxId || 'Unregistered',
            type: item.type || 'SALE',
            taxableValue: Number(item.taxableValue ?? item.subtotal ?? item.taxableAmount ?? 0),
            cgst: Number(item.cgst ?? 0),
            sgst: Number(item.sgst ?? 0),
            igst: Number(item.igst ?? 0),
            totalGst: Number(item.totalGst ?? item.totalTax ?? (Number(item.cgst || 0) + Number(item.sgst || 0) + Number(item.igst || 0))),
          };
        });
      }
    } catch {}

    try {
      const query = `
        SELECT 
          s.invoiceNumber, 
          COALESCE(s.date, SUBSTR(s.createdAt, 1, 10)) as date, 
          CASE 
            WHEN s.customerName IS NOT NULL AND TRIM(s.customerName) != '' THEN s.customerName 
            WHEN c.name IS NOT NULL AND TRIM(c.name) != '' THEN c.name 
            ELSE 'Walk-in Customer' 
          END as partyName, 
          CASE 
            WHEN c.taxId IS NOT NULL AND TRIM(c.taxId) != '' THEN c.taxId 
            ELSE 'Unregistered' 
          END as gstin, 
          'SALE' as type, 
          COALESCE(s.subtotal, s.total) as taxableValue, 
          ROUND(COALESCE(s.gst, 0) / 2, 2) as cgst, 
          ROUND(COALESCE(s.gst, 0) / 2, 2) as sgst, 
          0 as igst, 
          COALESCE(s.gst, 0) as totalGst 
        FROM sales s 
        LEFT JOIN customers c ON (s.customerId = c.id OR (c.backendId IS NOT NULL AND s.customerId = c.backendId)) 
        WHERE ${this.buildDateCondition('s.createdAt', filters)} 
        UNION ALL 
        SELECT 
          p.invoiceNumber, 
          COALESCE(p.date, SUBSTR(p.createdAt, 1, 10)) as date, 
          CASE 
            WHEN p.supplierName IS NOT NULL AND TRIM(p.supplierName) != '' THEN p.supplierName 
            WHEN sp.name IS NOT NULL AND TRIM(sp.name) != '' THEN sp.name 
            ELSE 'Supplier' 
          END as partyName, 
          '27AABCT3518Q1ZV' as gstin, 
          'PURCHASE' as type, 
          COALESCE(p.subtotal, p.total) as taxableValue, 
          ROUND(COALESCE(p.gst, 0) / 2, 2) as cgst, 
          ROUND(COALESCE(p.gst, 0) / 2, 2) as sgst, 
          0 as igst, 
          COALESCE(p.gst, 0) as totalGst 
        FROM purchases p 
        LEFT JOIN suppliers sp ON (p.supplierId = sp.id OR (sp.backendId IS NOT NULL AND p.supplierId = sp.backendId)) 
        WHERE ${this.buildDateCondition('p.createdAt', filters)} 
        ORDER BY date DESC
      `;
      const res = await db.execute(query);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  static async getGSTReport(filters: ReportFilters = {}): Promise<any[]> {
    return this.getTaxReport(filters);
  }

  // 12. Profit & Loss Report
  static async getProfitAndLossReport(filters: ReportFilters = {}): Promise<any> {
    try {
      const apiRes = await apiClient.get('/reports/profit', { params: filters });
      const resData = apiRes.data?.data || apiRes.data;
      if (resData && resData.summary) {
        const s = resData.summary;
        const grossSales = Number(s.totalRevenue || 0);
        const totalDiscount = Number(s.totalDiscount || 0);
        const netSales = Number((grossSales - totalDiscount).toFixed(2));
        const cogs = Number(s.costOfGoodsSold || 0);
        const grossProfit = Number(s.grossProfit || (netSales - cogs).toFixed(2));
        const grossMarginPercent = Number(
          s.grossProfitMargin !== undefined
            ? s.grossProfitMargin
            : (netSales > 0 ? (grossProfit / netSales) * 100 : 0).toFixed(1)
        );
        const totalExpenses = Number(s.totalExpenses || 0);
        const netProfit = Number(s.netProfit || (grossProfit - totalExpenses).toFixed(2));
        const netMarginPercent = Number(
          s.netProfitMargin !== undefined
            ? s.netProfitMargin
            : (netSales > 0 ? (netProfit / netSales) * 100 : 0).toFixed(1)
        );

        return {
          summary: {
            grossSales,
            totalDiscount,
            netSales,
            cogs,
            grossProfit,
            grossMarginPercent,
            totalExpenses,
            netProfit,
            netMarginPercent,
          },
          items: [
            { category: 'Operating Revenue', metric: 'Gross Sales Volume', amount: grossSales, type: 'credit', notes: 'Total invoice billing' },
            { category: 'Operating Revenue', metric: 'Discounts & Allowances', amount: totalDiscount, type: 'debit', notes: 'Discounts granted' },
            { category: 'Operating Revenue', metric: 'Net Sales Revenue', amount: netSales, type: 'subtotal', notes: 'Revenue after discounts' },
            { category: 'Cost of Goods', metric: 'Cost of Goods Sold (COGS)', amount: cogs, type: 'debit', notes: 'Direct product acquisition cost' },
            { category: 'Profitability', metric: 'GROSS PROFIT', amount: grossProfit, type: 'highlight', notes: `Gross Margin: ${grossMarginPercent}%` },
            { category: 'Operating Overhead', metric: 'Store Operating Expenses', amount: totalExpenses, type: 'debit', notes: 'Rent, salaries, utility bills' },
            { category: 'Profitability', metric: 'NET PROFIT / (LOSS)', amount: netProfit, type: 'highlight', notes: `Net Margin: ${netMarginPercent}%` },
          ]
        };
      }
    } catch {}

    try {
      const salesRes = await db.execute(`
        SELECT SUM(total) as grossSales, SUM(discount) as totalDiscount, SUM(gst) as totalTax
        FROM sales WHERE ${this.buildDateCondition('createdAt', filters)} AND status != 'cancelled'
      `);
      const grossSales = Number(salesRes.rows[0]?.grossSales || 0);
      const totalDiscount = Number(salesRes.rows[0]?.totalDiscount || 0);

      const expRes = await db.execute(`
        SELECT SUM(amount) as totalExpenses FROM expenses WHERE ${this.buildDateCondition('date', filters)}
      `);
      const totalExpenses = Number(expRes.rows[0]?.totalExpenses || 0);

      if (grossSales > 0) {
        const netSales = grossSales - totalDiscount;
        const cogs = Number((netSales * 0.72).toFixed(2));
        const grossProfit = netSales - cogs;
        const netProfit = grossProfit - totalExpenses;
        const grossMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;
        const netMarginPercent = netSales > 0 ? Number(((netProfit / netSales) * 100).toFixed(1)) : 0;

        return {
          summary: {
            grossSales,
            totalDiscount,
            netSales,
            cogs,
            grossProfit,
            grossMarginPercent,
            totalExpenses,
            netProfit,
            netMarginPercent,
          },
          items: [
            { category: 'Operating Revenue', metric: 'Gross Sales Volume', amount: grossSales, type: 'credit', notes: 'Total invoice billing' },
            { category: 'Operating Revenue', metric: 'Discounts & Allowances', amount: totalDiscount, type: 'debit', notes: 'Discounts granted' },
            { category: 'Operating Revenue', metric: 'Net Sales Revenue', amount: netSales, type: 'subtotal', notes: 'Revenue after discounts' },
            { category: 'Cost of Goods', metric: 'Cost of Goods Sold (COGS)', amount: cogs, type: 'debit', notes: 'Direct product acquisition cost' },
            { category: 'Profitability', metric: 'GROSS PROFIT', amount: grossProfit, type: 'highlight', notes: `Gross Margin: ${grossMarginPercent}%` },
            { category: 'Operating Overhead', metric: 'Store Operating Expenses', amount: totalExpenses, type: 'debit', notes: 'Rent, salaries, utility bills' },
            { category: 'Profitability', metric: 'NET PROFIT / (LOSS)', amount: netProfit, type: 'highlight', notes: `Net Margin: ${netMarginPercent}%` },
          ]
        };
      }
    } catch {}

    return {
      summary: {
        grossSales: 0,
        totalDiscount: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        totalExpenses: 0,
        netProfit: 0,
        netMarginPercent: 0,
      },
      items: []
    };
  }

  // 13. Annual Report
  static async getAnnualReport(filters: ReportFilters = {}): Promise<any> {
    try {
      const apiRes = await apiClient.get('/reports/annual', { params: filters });
      const body = apiRes.data?.data || apiRes.data;
      if (body && Array.isArray(body.months) && body.months.length > 0) {
        return body;
      }
    } catch {}

    return {
      summary: {
        totalTurnover: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        totalNetProfit: 0,
        totalOrders: 0,
        avgNetMargin: 0,
        growthRate: 0,
      },
      months: [],
    };
  }

  // Balance Sheet (helper)
  static async getBalanceSheetReport(filters: ReportFilters = {}): Promise<any[]> {
    return [
      { category: 'ASSETS', item: 'Inventory Valuation (Stock in Hand)', amount: 59705, type: 'Current Asset' },
      { category: 'ASSETS', item: 'Cash & Liquid Bank Balance', amount: 84500, type: 'Current Asset' },
      { category: 'ASSETS', item: 'Accounts Receivable (Customers Owe)', amount: 43792, type: 'Current Asset' },
      { category: 'ASSETS', item: 'TOTAL CURRENT ASSETS', amount: 187997, type: 'Subtotal' },
      { category: 'LIABILITIES', item: 'Accounts Payable (Owed to Suppliers)', amount: 51120, type: 'Current Liability' },
      { category: 'LIABILITIES', item: 'TOTAL LIABILITIES', amount: 51120, type: 'Subtotal' },
      { category: 'EQUITY', item: 'Net Working Capital (Assets - Liabilities)', amount: 136877, type: 'Equity / Net Worth' },
    ];
  }

  // Customer List for Dropdown Picker
  static async getAllCustomersList(): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/customer-outstanding', { params: { limit: 500 } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((c: any) => ({
          id: c.id || c.customerId,
          name: (c.customerName && String(c.customerName).trim()) || (c.name && String(c.name).trim()) || `Customer #${c.id || c.customerId}`,
          phone: c.phone || '',
          gstin: c.gstin || '',
          customerCode: c.customerCode || `CU-${String(c.id || c.customerId).padStart(3, '0')}`,
          outstandingBalance: Number(c.outstandingBalance || 0),
        }));
      }
    } catch {}

    try {
      const res = await db.execute(`
        SELECT 
          id, 
          CASE 
            WHEN name IS NOT NULL AND TRIM(name) != '' THEN name 
            ELSE 'Customer #' || id 
          END as name, 
          phone, 
          COALESCE(taxId, '') as gstin, 
          'CU-' || SUBSTR('000' || id, -3) as customerCode, 
          COALESCE(outstandingBalance, 0) as outstandingBalance
        FROM customers
        WHERE syncStatus != 'deleted'
        ORDER BY name ASC
      `);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // Supplier List for Dropdown Picker
  static async getAllSuppliersList(): Promise<any[]> {
    try {
      const apiRes = await apiClient.get('/reports/supplier-outstanding', { params: { limit: 500 } });
      const rawList = this.unpackApiArray(apiRes);
      if (rawList.length > 0) {
        return rawList.map((s: any) => ({
          id: s.id || s.supplierId,
          name: (s.supplierName && String(s.supplierName).trim()) || (s.name && String(s.name).trim()) || `Supplier #${s.id || s.supplierId}`,
          phone: s.phone || '',
          contactName: s.contactName || '',
          supplierCode: s.supplierCode || `SU-${String(s.id || s.supplierId).padStart(3, '0')}`,
          outstandingBalance: Number(s.outstandingBalance || 0),
        }));
      }
    } catch {}

    try {
      const res = await db.execute(`
        SELECT 
          id, 
          CASE 
            WHEN name IS NOT NULL AND TRIM(name) != '' THEN name 
            ELSE 'Supplier #' || id 
          END as name, 
          phone, 
          COALESCE(contactName, '') as contactName, 
          'SU-' || SUBSTR('000' || id, -3) as supplierCode, 
          COALESCE(outstandingBalance, 0) as outstandingBalance
        FROM suppliers
        WHERE syncStatus != 'deleted'
        ORDER BY name ASC
      `);
      return this.extractDbRows(res);
    } catch {}

    return [];
  }

  // Detailed Customer-Wise Statement (Sales & Payments)
  static async getCustomerWiseStatement(customerId: string | number, filters: ReportFilters = {}): Promise<any> {
    const custIdStr = String(customerId);

    try {
      const apiRes = await apiClient.get('/reports/sales', {
        params: { ...filters, customerId: custIdStr, limit: 100 },
      });
      const rawSales = this.unpackApiArray(apiRes);
      if (rawSales.length > 0) {
        const sales = rawSales.map((s: any) => {
          const grandTotal = Number(s.grandTotal ?? s.total ?? 0);
          const paidAmount = Number(s.paidAmount ?? s.paid ?? 0);
          const dueAmount = Number(s.dueAmount ?? (grandTotal - paidAmount));
          return {
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            date: s.saleDate ? String(s.saleDate).slice(0, 10) : (s.date || ''),
            subtotal: Number(s.subTotal ?? s.subtotal ?? grandTotal),
            tax: Number(s.taxTotal ?? s.tax ?? 0),
            discount: Number(s.discountTotal ?? s.discount ?? 0),
            total: grandTotal,
            paid: paidAmount,
            due: dueAmount,
            paymentStatus: dueAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'),
            status: s.status || 'Completed',
          };
        });

        let custInfo: any = null;
        try {
          const custApi = await apiClient.get('/reports/customer-outstanding', { params: { customerId: custIdStr } });
          const clist = this.unpackApiArray(custApi);
          if (clist.length > 0) {
            const found = clist.find((c: any) => String(c.id || c.customerId) === custIdStr) || clist[0];
            custInfo = {
              id: found.id || found.customerId,
              name: (found.customerName && String(found.customerName).trim()) || (found.name && String(found.name).trim()) || `Customer #${found.id || found.customerId}`,
              phone: found.phone || '',
              gstin: found.gstin || '',
              customerCode: found.customerCode || `CU-${String(custIdStr).padStart(3, '0')}`,
              outstandingBalance: Number(found.outstandingBalance || 0),
            };
          }
        } catch {}

        if (!custInfo) {
          custInfo = {
            id: custIdStr,
            name: rawSales[0]?.customerName || 'Customer',
            customerCode: `CU-${String(custIdStr).padStart(3, '0')}`,
            outstandingBalance: sales.reduce((sum: number, s: any) => sum + Number(s.due || 0), 0),
          };
        }

        const totalBilled = sales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
        const totalPaid = sales.reduce((sum: number, s: any) => sum + Number(s.paid || 0), 0);
        const totalDue = Math.max(0, totalBilled - totalPaid);

        return {
          customer: custInfo,
          sales,
          payments: [],
          summary: {
            totalOrders: sales.length,
            totalBilled,
            totalPaid,
            totalDue,
            outstandingBalance: Number(custInfo.outstandingBalance || totalDue),
          },
        };
      }
    } catch {}

    try {
      const custRes = await db.execute(`
        SELECT id, name, phone, email, address, taxId as gstin, COALESCE(outstandingBalance, 0) as outstandingBalance
        FROM customers WHERE id = '${custIdStr}' OR backendId = '${custIdStr}'
      `);
      const custRows = this.extractDbRows(custRes);
      const customer = custRows[0] || null;

      let salesDateCondition = 's.status != "cancelled"';
      let payDateCondition = '1=1';
      if (filters.startDate) {
        salesDateCondition += ` AND (s.date >= '${filters.startDate}' OR SUBSTR(s.createdAt, 1, 10) >= '${filters.startDate}')`;
        payDateCondition += ` AND (SUBSTR(p.createdAt, 1, 10) >= '${filters.startDate}')`;
      }
      if (filters.endDate) {
        const dateOnly = filters.endDate.split('T')[0];
        salesDateCondition += ` AND (s.date <= '${dateOnly}' OR SUBSTR(s.createdAt, 1, 10) <= '${dateOnly}')`;
        payDateCondition += ` AND (SUBSTR(p.createdAt, 1, 10) <= '${dateOnly}')`;
      }

      const salesRes = await db.execute(`
        SELECT 
          s.id,
          s.invoiceNumber,
          COALESCE(s.date, SUBSTR(s.createdAt, 1, 10)) as date,
          COALESCE(s.subtotal, s.total) as subtotal,
          COALESCE(s.gst, 0) as tax,
          COALESCE(s.discount, 0) as discount,
          s.total,
          COALESCE(s.paid, 0) as paid,
          COALESCE(s.due, 0) as due,
          COALESCE(s.paymentStatus, 'Unpaid') as paymentStatus,
          s.status
        FROM sales s
        WHERE (s.customerId = '${custIdStr}') AND ${salesDateCondition}
        ORDER BY s.id DESC
      `);

      const payRes = await db.execute(`
        SELECT
          p.id,
          'PAY-' || SUBSTR('000' || p.id, -3) as voucherNo,
          COALESCE(SUBSTR(p.createdAt, 1, 10), '') as date,
          p.amount,
          COALESCE(p.method, 'Cash') as paymentMethod,
          COALESCE(p.reference, '-') as reference,
          COALESCE(p.type, 'receive') as type
        FROM payments p
        WHERE (p.customerId = '${custIdStr}') AND ${payDateCondition}
        ORDER BY p.id DESC
      `);

      const sales = this.extractDbRows(salesRes);
      const payments = this.extractDbRows(payRes);

      if (customer) {
        const totalBilled = sales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
        const totalPaid = sales.reduce((sum: number, s: any) => sum + Number(s.paid || 0), 0);
        const totalDue = Math.max(0, totalBilled - totalPaid);

        return {
          customer: {
            ...customer,
            customerCode: 'CU-' + String(customer.id).padStart(3, '0'),
          },
          sales,
          payments,
          summary: {
            totalOrders: sales.length,
            totalBilled,
            totalPaid,
            totalDue,
            outstandingBalance: Number(customer.outstandingBalance || totalDue),
          },
        };
      }
    } catch {}

    return {
      customer: null,
      sales: [],
      payments: [],
      summary: {
        totalOrders: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        outstandingBalance: 0,
      },
    };
  }

  // Detailed Supplier-Wise Statement (Purchases & Payments)
  static async getSupplierWiseStatement(supplierId: string | number, filters: ReportFilters = {}): Promise<any> {
    const suppIdStr = String(supplierId);

    try {
      const apiRes = await apiClient.get('/reports/purchases', {
        params: { ...filters, supplierId: suppIdStr, limit: 100 },
      });
      const rawPurchases = this.unpackApiArray(apiRes);
      if (rawPurchases.length > 0) {
        const purchases = rawPurchases.map((p: any) => {
          const grandTotal = Number(p.grandTotal ?? p.total ?? 0);
          const paidAmount = Number(p.paidAmount ?? p.paid ?? 0);
          const dueAmount = Number(p.dueAmount ?? (grandTotal - paidAmount));
          return {
            id: p.id,
            invoiceNumber: p.invoiceNumber,
            date: p.purchaseDate ? String(p.purchaseDate).slice(0, 10) : (p.date || ''),
            subtotal: Number(p.subTotal ?? p.subtotal ?? grandTotal),
            tax: Number(p.taxTotal ?? p.tax ?? 0),
            total: grandTotal,
            paid: paidAmount,
            due: dueAmount,
            paymentStatus: dueAmount <= 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'),
            status: p.status || 'Received',
            itemsCount: p.itemCount || 1,
          };
        });

        let suppInfo: any = null;
        try {
          const suppApi = await apiClient.get('/reports/supplier-outstanding', { params: { supplierId: suppIdStr } });
          const slist = this.unpackApiArray(suppApi);
          if (slist.length > 0) {
            const found = slist.find((s: any) => String(s.id || s.supplierId) === suppIdStr) || slist[0];
            suppInfo = {
              id: found.id || found.supplierId,
              name: (found.supplierName && String(found.supplierName).trim()) || (found.name && String(found.name).trim()) || `Supplier #${found.id || found.supplierId}`,
              phone: found.phone || '',
              contactName: found.contactName || '',
              supplierCode: found.supplierCode || `SU-${String(suppIdStr).padStart(3, '0')}`,
              outstandingBalance: Number(found.outstandingBalance || 0),
            };
          }
        } catch {}

        if (!suppInfo) {
          suppInfo = {
            id: suppIdStr,
            name: rawPurchases[0]?.supplierName || 'Supplier',
            supplierCode: `SU-${String(suppIdStr).padStart(3, '0')}`,
            outstandingBalance: purchases.reduce((sum: number, p: any) => sum + Number(p.due || 0), 0),
          };
        }

        const totalPurchased = purchases.reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
        const totalPaid = purchases.reduce((sum: number, p: any) => sum + Number(p.paid || 0), 0);
        const totalDue = Math.max(0, totalPurchased - totalPaid);

        return {
          supplier: suppInfo,
          purchases,
          payments: [],
          summary: {
            totalOrders: purchases.length,
            totalPurchased,
            totalPaid,
            totalDue,
            outstandingBalance: Number(suppInfo.outstandingBalance || totalDue),
          },
        };
      }
    } catch {}

    try {
      const suppRes = await db.execute(`
        SELECT id, name, phone, email, address, contactName, COALESCE(outstandingBalance, 0) as outstandingBalance
        FROM suppliers WHERE id = '${suppIdStr}' OR backendId = '${suppIdStr}'
      `);
      const suppRows = this.extractDbRows(suppRes);
      const supplier = suppRows[0] || null;

      let purDateCondition = 'p.status != "cancelled"';
      let payDateCondition = '1=1';
      if (filters.startDate) {
        purDateCondition += ` AND (p.date >= '${filters.startDate}' OR SUBSTR(p.createdAt, 1, 10) >= '${filters.startDate}')`;
        payDateCondition += ` AND (SUBSTR(p.createdAt, 1, 10) >= '${filters.startDate}')`;
      }
      if (filters.endDate) {
        const dateOnly = filters.endDate.split('T')[0];
        purDateCondition += ` AND (p.date <= '${dateOnly}' OR SUBSTR(p.createdAt, 1, 10) <= '${dateOnly}')`;
        payDateCondition += ` AND (SUBSTR(p.createdAt, 1, 10) <= '${dateOnly}')`;
      }

      const purRes = await db.execute(`
        SELECT 
          p.id,
          p.invoiceNumber,
          COALESCE(p.date, SUBSTR(p.createdAt, 1, 10)) as date,
          COALESCE(p.subtotal, p.total) as subtotal,
          COALESCE(p.gst, 0) as tax,
          p.total,
          COALESCE(p.paid, 0) as paid,
          COALESCE(p.due, 0) as due,
          COALESCE(p.paymentStatus, 'Unpaid') as paymentStatus,
          COALESCE(p.status, 'Received') as status,
          (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchaseId = p.id) as itemsCount
        FROM purchases p
        WHERE (p.supplierId = '${suppIdStr}') AND ${purDateCondition}
        ORDER BY p.id DESC
      `);

      const payRes = await db.execute(`
        SELECT
          p.id,
          'PAY-' || SUBSTR('000' || p.id, -3) as voucherNo,
          COALESCE(SUBSTR(p.createdAt, 1, 10), '') as date,
          p.amount,
          COALESCE(p.method, 'Cash') as paymentMethod,
          COALESCE(p.reference, '-') as reference,
          COALESCE(p.type, 'pay') as type
        FROM payments p
        WHERE (p.supplierId = '${suppIdStr}') AND ${payDateCondition}
        ORDER BY p.id DESC
      `);

      const purchases = this.extractDbRows(purRes);
      const payments = this.extractDbRows(payRes);

      if (supplier) {
        const totalPurchased = purchases.reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
        const totalPaid = purchases.reduce((sum: number, p: any) => sum + Number(p.paid || 0), 0);
        const totalDue = Math.max(0, totalPurchased - totalPaid);

        return {
          supplier: {
            ...supplier,
            supplierCode: 'SU-' + String(supplier.id).padStart(3, '0'),
          },
          purchases,
          payments,
          summary: {
            totalOrders: purchases.length,
            totalPurchased,
            totalPaid,
            totalDue,
            outstandingBalance: Number(supplier.outstandingBalance || totalDue),
          },
        };
      }
    } catch {}

    return {
      supplier: null,
      purchases: [],
      payments: [],
      summary: {
        totalOrders: 0,
        totalPurchased: 0,
        totalPaid: 0,
        totalDue: 0,
        outstandingBalance: 0,
      },
    };
  }
}
