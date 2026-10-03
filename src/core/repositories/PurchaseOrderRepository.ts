import { BaseRepository } from './BaseRepository';
import { PurchaseOrder, PurchaseOrderItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrder> {
  protected tableName = 'purchase_orders';

  protected getInsertColumns(): string {
    return 'id, orderNumber, supplierId, supplierName, orderDate, expectedDate, subtotal, discount, taxTotal, shipping, grandTotal, status, notes, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'orderNumber = ?, supplierId = ?, supplierName = ?, orderDate = ?, expectedDate = ?, subtotal = ?, discount = ?, taxTotal = ?, shipping = ?, grandTotal = ?, status = ?, notes = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: PurchaseOrder): any[] {
    return [
      entity.id,
      entity.orderNumber,
      entity.supplierId,
      entity.supplierName || null,
      entity.orderDate,
      entity.expectedDate || null,
      entity.subtotal || 0,
      entity.discount || 0,
      entity.taxTotal || 0,
      entity.shipping || 0,
      entity.grandTotal || 0,
      entity.status || 'Ordered',
      entity.notes || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): PurchaseOrder {
    return {
      id: Number(row.id),
      orderNumber: String(row.orderNumber || ''),
      supplierId: Number(row.supplierId || 0),
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      orderDate: String(row.orderDate || ''),
      expectedDate: row.expectedDate ? String(row.expectedDate) : undefined,
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      taxTotal: Number(row.taxTotal || 0),
      shipping: Number(row.shipping || 0),
      grandTotal: Number(row.grandTotal || 0),
      status: (row.status as any) || 'Ordered',
      notes: row.notes ? String(row.notes) : undefined,
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || new Date().toISOString()),
      syncStatus: (row.syncStatus as any) || 'synced',
    };
  }

  public async getItemsForPurchaseOrder(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    try {
      const res = await db.execute('SELECT * FROM purchase_order_items WHERE purchaseOrderId = ?', [purchaseOrderId]);
      const items: PurchaseOrderItem[] = [];
      let rawRows: any[] = [];
      if (res.rows && Array.isArray(res.rows)) {
        rawRows = res.rows;
      } else if (res.rows && typeof res.rows === 'object') {
        if ('_array' in res.rows && Array.isArray((res.rows as any)._array)) {
          rawRows = (res.rows as any)._array;
        } else if ('item' in res.rows && typeof (res.rows as any).length === 'number') {
          for (let i = 0; i < (res.rows as any).length; i++) {
            rawRows.push((res.rows as any).item(i));
          }
        }
      }
      for (const row of rawRows) {
        if (row) {
          items.push({
            id: Number(row.id),
            purchaseOrderId: Number(row.purchaseOrderId),
            productId: Number(row.productId),
            productName: row.productName ? String(row.productName) : undefined,
            quantity: Number(row.quantity || 1),
            unitPrice: Number(row.unitPrice || 0),
            discount: Number(row.discount || 0),
            taxAmount: Number(row.taxAmount || 0),
            unit: row.unit ? String(row.unit) : undefined,
            unitType: row.unitType || 'base',
            conversionRate: row.conversionRate ? Number(row.conversionRate) : 1,
            total: Number(row.total || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            syncStatus: row.syncStatus,
          });
        }
      }
      return items;
    } catch (e) {
      console.error('Failed to get purchase order items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<PurchaseOrder | null> {
    const item = await super.getById(id);
    if (!item) return null;
    const items = await this.getItemsForPurchaseOrder(id);
    return { ...item, items };
  }

  public override async getAll(): Promise<PurchaseOrder[]> {
    try {
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: PurchaseOrder[] = [];
      let rawRows: any[] = [];
      if (res.rows && Array.isArray(res.rows)) {
        rawRows = res.rows;
      } else if (res.rows && typeof res.rows === 'object') {
        if ('_array' in res.rows && Array.isArray((res.rows as any)._array)) {
          rawRows = (res.rows as any)._array;
        } else if ('item' in res.rows && typeof (res.rows as any).length === 'number') {
          for (let i = 0; i < (res.rows as any).length; i++) {
            rawRows.push((res.rows as any).item(i));
          }
        }
      }
      for (const row of rawRows) {
        if (row) items.push(this.fromRow(row));
      }
      return items;
    } catch (error) {
      console.error('Failed to get all purchase orders:', error);
      return [];
    }
  }

  protected async syncWithApi(entity: PurchaseOrder, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync purchase order ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASE_ORDERS.BASE);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        for (const item of data) {
          const existing = await this.getById(item.id);
          if (!existing) {
            await this.insert({
              id: item.id,
              orderNumber: item.orderNumber,
              supplierId: item.supplierId,
              supplierName: item.supplier?.name,
              orderDate: item.orderDate ? item.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
              expectedDate: item.expectedDate ? item.expectedDate.slice(0, 10) : undefined,
              subtotal: Number(item.subTotal || 0),
              discount: Number(item.discountTotal || 0),
              taxTotal: Number(item.taxTotal || 0),
              shipping: Number(item.shipping || 0),
              grandTotal: Number(item.grandTotal || 0),
              status: item.status || 'Ordered',
              notes: item.notes,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
              syncStatus: 'synced',
            }, false);
          }
        }
      }
    } catch (e) {
      // offline
    }
  }

  public async createPurchaseOrderWithItems(
    orderData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<PurchaseOrder> {
    const now = new Date().toISOString();
    const orderId = Date.now() + Math.floor(Math.random() * 1000);

    const order: PurchaseOrder = {
      ...orderData,
      id: orderId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert',
    };

    await this.insert(order, false);

    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      await db.execute(
        `INSERT INTO purchase_order_items (
          id, purchaseOrderId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          orderId,
          item.productId,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.taxAmount || 0,
          item.unit || null,
          item.unitType || 'base',
          item.conversionRate || 1,
          item.total,
          now,
          now,
          'pending_insert',
        ]
      );
    }

    // Try background API sync
    try {
      await apiClient.post(API_ENDPOINTS.PURCHASE_ORDERS.BASE, {
        orderNumber: order.orderNumber,
        supplierId: order.supplierId,
        orderDate: order.orderDate,
        expectedDate: order.expectedDate,
        subTotal: order.subtotal,
        discountTotal: order.discount,
        taxTotal: order.taxTotal,
        shipping: order.shipping,
        grandTotal: order.grandTotal,
        status: order.status,
        notes: order.notes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          taxAmount: i.taxAmount || 0,
          total: i.total,
        })),
      });
      order.syncStatus = 'synced';
      await this.update(order, false);
    } catch (e) {
      // Offline fallback
    }

    return { ...order, items: items as PurchaseOrderItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM purchase_order_items WHERE purchaseOrderId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    try {
      await apiClient.delete(API_ENDPOINTS.PURCHASE_ORDERS.BY_ID(id));
    } catch (e) {
      // offline
    }
  }
}

export const purchaseOrderRepository = new PurchaseOrderRepository();
