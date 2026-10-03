import { BaseRepository } from './BaseRepository';
import { SaleReturn, SaleReturnItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class SaleReturnRepository extends BaseRepository<SaleReturn> {
  protected tableName = 'sale_returns';

  protected getInsertColumns(): string {
    return 'id, saleId, returnNumber, reference, customerId, customerName, date, subtotal, taxTotal, discountTotal, totalAmount, status, reason, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'saleId = ?, returnNumber = ?, reference = ?, customerId = ?, customerName = ?, date = ?, subtotal = ?, taxTotal = ?, discountTotal = ?, totalAmount = ?, status = ?, reason = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: SaleReturn): any[] {
    return [
      entity.id,
      entity.saleId || null,
      entity.returnNumber,
      entity.reference || null,
      entity.customerId || null,
      entity.customerName || null,
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

  protected fromRow(row: any): SaleReturn {
    return {
      id: Number(row.id),
      saleId: row.saleId ? Number(row.saleId) : undefined,
      returnNumber: String(row.returnNumber || ''),
      reference: row.reference ? String(row.reference) : undefined,
      customerId: row.customerId ? Number(row.customerId) : undefined,
      customerName: row.customerName ? String(row.customerName) : undefined,
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

  public async getItemsForSaleReturn(saleReturnId: number): Promise<SaleReturnItem[]> {
    try {
      const res = await db.execute('SELECT * FROM sale_return_items WHERE saleReturnId = ?', [saleReturnId]);
      const items: SaleReturnItem[] = [];
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
            saleReturnId: Number(row.saleReturnId),
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
      console.error('Failed to get sale return items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<SaleReturn | null> {
    const item = await super.getById(id);
    if (!item) return null;
    const items = await this.getItemsForSaleReturn(id);
    return { ...item, items };
  }

  public override async getAll(): Promise<SaleReturn[]> {
    try {
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: SaleReturn[] = [];
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
      console.error('Failed to get all sale returns:', error);
      return [];
    }
  }

  protected async syncWithApi(entity: SaleReturn, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync sale return ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.SALES_RETURNS.BASE);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        for (const item of data) {
          const existing = await this.getById(item.id);
          if (!existing) {
            await this.insert({
              id: item.id,
              returnNumber: item.returnNumber,
              saleId: item.saleId,
              customerName: item.sale?.customer?.name,
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

  public async createSaleReturnWithItems(
    returnData: Omit<SaleReturn, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<SaleReturnItem, 'id' | 'saleReturnId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<SaleReturn> {
    const now = new Date().toISOString();
    const returnId = Date.now() + Math.floor(Math.random() * 1000);

    const saleReturn: SaleReturn = {
      ...returnData,
      id: returnId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert',
    };

    await this.insert(saleReturn, false);

    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

      await db.execute(
        `INSERT INTO sale_return_items (
          id, saleReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
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

      // RESTOCK RETURNED ITEMS TO INVENTORY
      const addedBaseQty = unitType === 'sub' ? item.quantity / conversionRate : item.quantity;
      try {
        await db.execute(
          `UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?`,
          [addedBaseQty, item.productId]
        );
      } catch (stockErr) {
        console.error(`Failed to restock product ${item.productId}:`, stockErr);
      }
    }

    // Try background API sync
    if (saleReturn.saleId) {
      try {
        await apiClient.post(API_ENDPOINTS.SALES_RETURNS.BASE, {
          saleId: saleReturn.saleId,
          returnNumber: saleReturn.returnNumber,
          returnDate: saleReturn.date,
          reason: saleReturn.reason,
          subTotal: saleReturn.subtotal,
          taxTotal: saleReturn.taxTotal,
          discountTotal: saleReturn.discountTotal,
          totalAmount: saleReturn.totalAmount,
          status: saleReturn.status,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount || 0,
            taxAmount: i.taxAmount || 0,
            total: i.total,
          })),
        });
        saleReturn.syncStatus = 'synced';
        await this.update(saleReturn, false);
      } catch (e) {
        // Offline fallback
      }
    }

    return { ...saleReturn, items: items as SaleReturnItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM sale_return_items WHERE saleReturnId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    try {
      await apiClient.delete(API_ENDPOINTS.SALES_RETURNS.BY_ID(id));
    } catch (e) {
      // offline
    }
  }
}

export const saleReturnRepository = new SaleReturnRepository();
