import { BaseRepository } from './BaseRepository';
import { PurchaseReturn, PurchaseReturnItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class PurchaseReturnRepository extends BaseRepository<PurchaseReturn> {
  protected tableName = 'purchase_returns';

  protected getInsertColumns(): string {
    return 'id, purchaseId, returnNumber, reference, supplierId, supplierName, date, subtotal, taxTotal, discountTotal, totalAmount, status, reason, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'purchaseId = ?, returnNumber = ?, reference = ?, supplierId = ?, supplierName = ?, date = ?, subtotal = ?, taxTotal = ?, discountTotal = ?, totalAmount = ?, status = ?, reason = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: PurchaseReturn): any[] {
    return [
      entity.id,
      entity.purchaseId || null,
      entity.returnNumber,
      entity.reference || null,
      entity.supplierId || null,
      entity.supplierName || null,
      entity.date,
      entity.subtotal || 0,
      entity.taxTotal || 0,
      entity.discountTotal || 0,
      entity.totalAmount || 0,
      entity.status || 'Received',
      entity.reason || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): PurchaseReturn {
    return {
      id: Number(row.id),
      purchaseId: row.purchaseId ? Number(row.purchaseId) : undefined,
      returnNumber: String(row.returnNumber || ''),
      reference: row.reference ? String(row.reference) : undefined,
      supplierId: row.supplierId ? Number(row.supplierId) : undefined,
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      date: String(row.date || ''),
      subtotal: Number(row.subtotal || 0),
      taxTotal: Number(row.taxTotal || 0),
      discountTotal: Number(row.discountTotal || 0),
      totalAmount: Number(row.totalAmount || 0),
      status: (row.status as any) || 'Received',
      reason: row.reason ? String(row.reason) : undefined,
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || new Date().toISOString()),
      syncStatus: (row.syncStatus as any) || 'synced',
    };
  }

  public async getItemsForPurchaseReturn(purchaseReturnId: number): Promise<PurchaseReturnItem[]> {
    try {
      const res = await db.execute('SELECT * FROM purchase_return_items WHERE purchaseReturnId = ?', [purchaseReturnId]);
      const items: PurchaseReturnItem[] = [];
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
            purchaseReturnId: Number(row.purchaseReturnId),
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
      console.error('Failed to get purchase return items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<PurchaseReturn | null> {
    const item = await super.getById(id);
    if (!item) return null;
    const items = await this.getItemsForPurchaseReturn(id);
    return { ...item, items };
  }

  public override async getAll(): Promise<PurchaseReturn[]> {
    try {
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: PurchaseReturn[] = [];
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
      console.error('Failed to get all purchase returns:', error);
      return [];
    }
  }

  protected async syncWithApi(entity: PurchaseReturn, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync purchase return ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASE_RETURNS.BASE);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        for (const item of data) {
          const existing = await this.getById(item.id);
          if (!existing) {
            await this.insert({
              id: item.id,
              returnNumber: item.returnNumber,
              purchaseId: item.purchaseId,
              supplierName: item.purchase?.supplier?.name,
              date: item.returnDate ? item.returnDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
              subtotal: Number(item.subTotal || 0),
              taxTotal: Number(item.taxTotal || 0),
              discountTotal: Number(item.discountTotal || 0),
              totalAmount: Number(item.totalAmount || 0),
              reason: item.reason,
              status: item.status || 'Received',
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

  public async createPurchaseReturnWithItems(
    returnData: Omit<PurchaseReturn, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<PurchaseReturnItem, 'id' | 'purchaseReturnId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<PurchaseReturn> {
    const now = new Date().toISOString();
    const returnId = Date.now() + Math.floor(Math.random() * 1000);

    const purchaseReturn: PurchaseReturn = {
      ...returnData,
      id: returnId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert',
    };

    await this.insert(purchaseReturn, false);

    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

      await db.execute(
        `INSERT INTO purchase_return_items (
          id, purchaseReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          returnId,
          item.productId,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.taxAmount || 0,
          item.unit || null,
          unitType,
          conversionRate,
          item.total,
          now,
          now,
          'pending_insert',
        ]
      );

      // DEDUCT RETURNED ITEMS FROM LOCAL INVENTORY
      const deductedBaseQty = unitType === 'sub' ? item.quantity / conversionRate : item.quantity;
      try {
        await db.execute(
          `UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ?`,
          [deductedBaseQty, item.productId]
        );
      } catch (stockErr) {
        console.error(`Failed to deduct stock for product ${item.productId}:`, stockErr);
      }
    }

    // Try background API sync
    if (purchaseReturn.purchaseId) {
      try {
        await apiClient.post(API_ENDPOINTS.PURCHASE_RETURNS.BASE, {
          purchaseId: purchaseReturn.purchaseId,
          returnNumber: purchaseReturn.returnNumber,
          returnDate: purchaseReturn.date,
          reason: purchaseReturn.reason,
          subTotal: purchaseReturn.subtotal,
          taxTotal: purchaseReturn.taxTotal,
          discountTotal: purchaseReturn.discountTotal,
          totalAmount: purchaseReturn.totalAmount,
          status: purchaseReturn.status,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount || 0,
            taxAmount: i.taxAmount || 0,
            total: i.total,
          })),
        });
        purchaseReturn.syncStatus = 'synced';
        await this.update(purchaseReturn, false);
      } catch (e) {
        // Offline fallback
      }
    }

    return { ...purchaseReturn, items: items as PurchaseReturnItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM purchase_return_items WHERE purchaseReturnId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    try {
      await apiClient.delete(API_ENDPOINTS.PURCHASE_RETURNS.BY_ID(id));
    } catch (e) {
      // offline
    }
  }
}

export const purchaseReturnRepository = new PurchaseReturnRepository();
