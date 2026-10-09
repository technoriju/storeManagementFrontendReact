import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export interface StockItem {
  id: string | number;
  name: string;
  sku: string;
  productCode?: string;
  barcode?: string;
  categoryId?: number;
  categoryName?: string;
  brandId?: number;
  brandName?: string;
  unit?: string;
  purchasePrice: number;
  retailPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  stockValue: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt?: string;
}

export interface StockSummary {
  totalProducts: number;
  totalStockQuantity: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
}

export interface StockTransactionRecord {
  id: string | number;
  productId: number | string;
  productName: string;
  sku?: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface AddStockPayload {
  productId: number | string;
  warehouseId?: number | string;
  quantity: number;
  reason?: string;
  reference?: string;
  unitCost?: number;
  notes?: string;
}

export interface AdjustStockPayload {
  productId: number | string;
  warehouseId?: number | string;
  adjustmentType: 'ADD' | 'SUBTRACT' | 'SET';
  quantity: number;
  reason?: string;
  notes?: string;
}

class StockRepository {
  private extractRows(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res.rows)) return res.rows;
    if (res.rows && typeof res.rows === 'object') {
      if ('_array' in res.rows && Array.isArray((res.rows as any)._array)) {
        return (res.rows as any)._array;
      }
      if ('item' in res.rows && typeof (res.rows as any).length === 'number') {
        const arr = [];
        for (let i = 0; i < (res.rows as any).length; i++) {
          arr.push((res.rows as any).item(i));
        }
        return arr;
      }
    }
    if (Array.isArray(res)) return res;
    return [];
  }

  async getStocks(filters?: {
    search?: string;
    categoryId?: number;
    brandId?: number;
    status?: string;
  }): Promise<{ items: StockItem[]; summary: StockSummary }> {
    // 1. Try fetching from Backend API
    try {
      const params: any = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.brandId) params.brandId = filters.brandId;
      if (filters?.status) params.status = filters.status;

      const res = await apiClient.get(API_ENDPOINTS.INVENTORY.STOCKS, { params });
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.items)) {
        const mappedItems: StockItem[] = data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku || '',
          productCode: item.productCode,
          barcode: item.barcode,
          categoryId: item.categoryId,
          categoryName: item.category?.name || item.categoryName,
          brandId: item.brandId,
          brandName: item.brand?.name || item.brandName,
          unit: item.unit || item.baseUnit?.shortName || 'pcs',
          purchasePrice: Number(item.purchasePrice || 0),
          retailPrice: Number(item.retailPrice || 0),
          currentStock: Number(item.currentStock || 0),
          lowStockThreshold: Number(item.lowStockLevel || 10),
          stockValue: Number(item.stockValue || 0),
          status: item.status || 'IN_STOCK',
          updatedAt: item.updatedAt,
        }));

        const summary: StockSummary = data.summary || this.calculateSummary(mappedItems);
        return { items: mappedItems, summary };
      }
    } catch (_) {
      // Backend unavailable or offline, continue to local SQLite
    }

    // 2. Query Local SQLite DB
    try {
      const res = await db.execute(`SELECT * FROM products ORDER BY name ASC`);
      const rawRows = this.extractRows(res);

      let items: StockItem[] = rawRows.map((row: any) => {
        const currentStock = Number(row.stockQuantity ?? row.openingStock ?? 0);
        const lowStockThreshold = Number(row.lowStockThreshold || 10);
        const purchasePrice = Number(row.purchasePrice ?? row.cost ?? 0);
        const retailPrice = Number(row.retailPrice ?? row.price ?? 0);
        const stockValue = Number((currentStock * purchasePrice).toFixed(2));

        let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (currentStock <= 0) {
          status = 'OUT_OF_STOCK';
        } else if (lowStockThreshold > 0 && currentStock <= lowStockThreshold) {
          status = 'LOW_STOCK';
        }

        return {
          id: row.id,
          name: row.name || 'Unnamed Product',
          sku: row.sku || '',
          productCode: row.productCode,
          barcode: row.barcode,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          brandId: row.brandId,
          brandName: row.brandName,
          unit: row.unit || 'pcs',
          purchasePrice,
          retailPrice,
          currentStock,
          lowStockThreshold,
          stockValue,
          status,
          updatedAt: row.updatedAt,
        };
      });

      // Apply client-side filters on SQLite results
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.sku.toLowerCase().includes(q) ||
            (i.categoryName && i.categoryName.toLowerCase().includes(q)) ||
            (i.brandName && i.brandName.toLowerCase().includes(q)),
        );
      }
      if (filters?.categoryId) {
        items = items.filter((i) => i.categoryId === Number(filters.categoryId));
      }
      if (filters?.brandId) {
        items = items.filter((i) => i.brandId === Number(filters.brandId));
      }
      if (filters?.status) {
        const s = filters.status.toUpperCase();
        items = items.filter((i) => i.status === s);
      }

      const summary = this.calculateSummary(items);
      return { items, summary };
    } catch (e) {
      console.warn('Failed to query local products for stock:', e);
      return {
        items: [],
        summary: {
          totalProducts: 0,
          totalStockQuantity: 0,
          totalStockValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          inStockCount: 0,
        },
      };
    }
  }

  private calculateSummary(items: StockItem[]): StockSummary {
    const totalProducts = items.length;
    const totalStockQuantity = Number(
      items.reduce((sum, item) => sum + item.currentStock, 0).toFixed(4),
    );
    const totalStockValue = Number(
      items.reduce((sum, item) => sum + item.stockValue, 0).toFixed(2),
    );
    const lowStockCount = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStockCount = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const inStockCount = items.filter((i) => i.status === 'IN_STOCK').length;

    return {
      totalProducts,
      totalStockQuantity,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };
  }

  async addStock(payload: AddStockPayload): Promise<any> {
    const numProductId = Number(payload.productId);
    const qtyToAdd = Number(payload.quantity);
    const nowIso = new Date().toISOString();
    const reference = payload.reference || `STK-${Date.now()}`;

    // 1. Update local SQLite DB
    try {
      const getRes = await db.execute(`SELECT * FROM products WHERE id = ?`, [numProductId]);
      const rawRows = this.extractRows(getRes);
      const product = rawRows[0];
      const prevStock = product ? Number(product.stockQuantity || 0) : 0;
      const newStock = prevStock + qtyToAdd;

      if (payload.unitCost !== undefined && Number(payload.unitCost) > 0) {
        await db.execute(
          `UPDATE products SET stockQuantity = ?, purchasePrice = ?, updatedAt = ? WHERE id = ?`,
          [newStock, Number(payload.unitCost), nowIso, numProductId],
        );
      } else {
        await db.execute(
          `UPDATE products SET stockQuantity = ?, updatedAt = ? WHERE id = ?`,
          [newStock, nowIso, numProductId],
        );
      }

      await db.execute(
        `INSERT INTO stock_transactions (productId, productName, sku, type, quantity, previousStock, newStock, reason, reference, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numProductId,
          product?.name || 'Product',
          product?.sku || '',
          'ADD_STOCK',
          qtyToAdd,
          prevStock,
          newStock,
          payload.reason || 'Direct Stock Addition',
          reference,
          payload.notes || null,
          nowIso,
          nowIso,
        ],
      );
    } catch (localErr) {
      console.warn('Local SQLite update error on addStock:', localErr);
    }

    // 2. Sync to Backend API (only for positive server-synced product IDs)
    if (numProductId > 0) {
      try {
        const apiRes = await apiClient.post(API_ENDPOINTS.INVENTORY.ADD_STOCK, {
          productId: numProductId,
          quantity: qtyToAdd,
          reason: payload.reason,
          reference,
          unitCost: payload.unitCost,
          notes: payload.notes,
          warehouseId: payload.warehouseId,
        });
        return apiRes.data?.data || apiRes.data;
      } catch (apiErr) {
        console.warn('Backend sync deferred for addStock (will sync later):', apiErr);
      }
    }
    return {
      success: true,
      productId: String(numProductId),
      quantityAdded: qtyToAdd,
      offline: true,
    };
  }

  async adjustStock(payload: AdjustStockPayload): Promise<any> {
    const numProductId = Number(payload.productId);
    const qty = Number(payload.quantity);
    const nowIso = new Date().toISOString();
    const reference = payload.reason || `ADJ-${Date.now()}`;

    // 1. Update local SQLite DB
    try {
      const getRes = await db.execute(`SELECT * FROM products WHERE id = ?`, [numProductId]);
      const rawRows = this.extractRows(getRes);
      const product = rawRows[0];
      const prevStock = product ? Number(product.stockQuantity || 0) : 0;

      let newStock = prevStock;
      if (payload.adjustmentType === 'ADD') {
        newStock = prevStock + qty;
      } else if (payload.adjustmentType === 'SUBTRACT') {
        newStock = Math.max(0, prevStock - qty);
      } else if (payload.adjustmentType === 'SET') {
        newStock = Math.max(0, qty);
      }

      await db.execute(
        `UPDATE products SET stockQuantity = ?, updatedAt = ? WHERE id = ?`,
        [newStock, nowIso, numProductId],
      );

      await db.execute(
        `INSERT INTO stock_transactions (productId, productName, sku, type, quantity, previousStock, newStock, reason, reference, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numProductId,
          product?.name || 'Product',
          product?.sku || '',
          `ADJUSTMENT_${payload.adjustmentType}`,
          Math.abs(newStock - prevStock),
          prevStock,
          newStock,
          payload.reason || 'Manual Adjustment',
          reference,
          payload.notes || null,
          nowIso,
          nowIso,
        ],
      );
    } catch (localErr) {
      console.warn('Local SQLite error on adjustStock:', localErr);
    }

    // 2. Sync to Backend API (only for positive server-synced product IDs)
    if (numProductId > 0) {
      try {
        const apiRes = await apiClient.post(API_ENDPOINTS.INVENTORY.ADJUST_STOCK, {
          productId: numProductId,
          adjustmentType: payload.adjustmentType,
          quantity: qty,
          reason: payload.reason,
          notes: payload.notes,
          warehouseId: payload.warehouseId,
        });
        return apiRes.data?.data || apiRes.data;
      } catch (apiErr) {
        console.warn('Backend sync deferred for adjustStock:', apiErr);
      }
    }
    return {
      success: true,
      productId: String(numProductId),
      adjustmentType: payload.adjustmentType,
      offline: true,
    };
  }

  async getTransactions(productId?: number | string): Promise<StockTransactionRecord[]> {
    // 1. Try Backend API (only if no productId or positive server product ID)
    if (!productId || Number(productId) > 0) {
      try {
        const params: any = {};
        if (productId) params.productId = productId;
        const res = await apiClient.get(API_ENDPOINTS.INVENTORY.TRANSACTIONS, { params });
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          return data.map((tx: any) => ({
            id: tx.id,
            productId: tx.productId,
            productName: tx.productName,
            sku: tx.sku,
            type: tx.transactionType,
            quantity: Math.abs(Number(tx.unitQuantity || tx.baseQuantity || 0)),
            previousStock: 0,
            newStock: 0,
            reason: tx.referenceId,
            reference: tx.referenceId,
            createdAt: tx.createdAt,
          }));
        }
      } catch (_) {}
    }

    // 2. Fallback to SQLite
    try {
      let query = `SELECT * FROM stock_transactions`;
      const params: any[] = [];
      if (productId) {
        query += ` WHERE productId = ?`;
        params.push(Number(productId));
      }
      query += ` ORDER BY id DESC LIMIT 50`;

      const res = await db.execute(query, params);
      const rows = this.extractRows(res);
      return rows.map((r: any) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        type: r.type,
        quantity: Math.abs(Number(r.quantity || 0)),
        previousStock: Number(r.previousStock || 0),
        newStock: Number(r.newStock || 0),
        reason: r.reason,
        reference: r.reference,
        notes: r.notes,
        createdAt: r.createdAt,
      }));
    } catch (e) {
      return [];
    }
  }
}

export const stockRepository = new StockRepository();
