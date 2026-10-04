import { BaseRepository } from './BaseRepository';
import { SaleReturn, SaleReturnItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

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

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  protected async syncWithApi(entity: SaleReturn, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'delete') {
        if (/^\d+$/.test(String(entity.id)) && entity.id > 0) {
          await apiClient.delete(API_ENDPOINTS.SALES_RETURNS.BY_ID(entity.id));
        }
        return;
      }

      if (entity.saleId) {
        const items = entity.items || (await this.getItemsForSaleReturn(entity.id));
        const response = await apiClient.post(API_ENDPOINTS.SALES_RETURNS.BASE, {
          saleId: Number(entity.saleId),
          returnNumber: entity.returnNumber,
          returnDate: entity.date ? new Date(entity.date).toISOString() : new Date().toISOString(),
          reason: entity.reason,
          subTotal: Number(entity.subtotal || 0),
          taxTotal: Number(entity.taxTotal || 0),
          discountTotal: Number(entity.discountTotal || 0),
          totalAmount: Number(entity.totalAmount || 0),
          items: items.map((i) => ({
            productId: Number(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            discount: Number(i.discount || 0),
            taxAmount: Number(i.taxAmount || 0),
            total: Number(i.total),
          })),
        });

        if (response.status >= 200 && response.status < 300) {
          const body = response?.data?.data || response?.data || {};
          const returnedId = body.id;
          if (returnedId && String(returnedId) !== String(entity.id)) {
            await db.execute(`UPDATE sale_returns SET id = ?, syncStatus = 'synced' WHERE id = ?`, [Number(returnedId), entity.id]);
            await db.execute(`UPDATE sale_return_items SET saleReturnId = ?, syncStatus = 'synced' WHERE saleReturnId = ?`, [Number(returnedId), entity.id]);
            await outboxRepo.rebaseEntity(this.tableName, entity.id, Number(returnedId), Number(returnedId));
          } else {
            await db.execute(`UPDATE sale_returns SET syncStatus = 'synced' WHERE id = ?`, [entity.id]);
            await db.execute(`UPDATE sale_return_items SET syncStatus = 'synced' WHERE saleReturnId = ?`, [entity.id]);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync sale return ${entity.id} with API:`, error);
      throw error;
    }
  }

  private extractList(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    for (const key of ['data', 'items', 'results', 'rows', 'records']) {
      if (data[key]) {
        const found = this.extractList(data[key]);
        if (found.length) return found;
      }
    }
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val;
    }
    return [];
  }

  private normalizeApiSaleReturn(item: any): { saleReturn: SaleReturn; items: SaleReturnItem[] } {
    const returnId = Number(item.id);
    const dateStr = item.returnDate
      ? String(item.returnDate).slice(0, 10)
      : item.date
      ? String(item.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const saleReturn: SaleReturn = {
      id: returnId,
      saleId: item.saleId ? Number(item.saleId) : undefined,
      returnNumber: String(item.returnNumber || `SRT-${returnId}`),
      reference: item.reference ? String(item.reference) : String(item.returnNumber || `SRT-${returnId}`),
      customerId: item.sale?.customerId
        ? Number(item.sale.customerId)
        : item.customerId
        ? Number(item.customerId)
        : undefined,
      customerName: item.sale?.customer?.name || item.customerName || 'Walk-in Customer',
      date: dateStr,
      subtotal: Number(item.subTotal ?? item.subtotal ?? 0),
      taxTotal: Number(item.taxTotal ?? 0),
      discountTotal: Number(item.discountTotal ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      status: (item.status || 'Received') as any,
      reason: item.reason ? String(item.reason) : undefined,
      createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
      updatedAt: item.updatedAt ? String(item.updatedAt) : new Date().toISOString(),
      syncStatus: 'synced',
    };

    const items: SaleReturnItem[] = [];
    if (Array.isArray(item.items)) {
      for (const it of item.items) {
        const itemId = Number(it.id || Date.now() + Math.floor(Math.random() * 10000));
        const conversionRate = Number(it.conversionRate || 1);
        const unitType = it.unitType || 'base';
        const unitPrice = Number(it.unitPrice || 0);
        const quantity = Number(it.quantity || 1);
        const discount = Number(it.discount || 0);
        const taxAmount = Number(it.taxAmount || 0);
        const itemTotal = Number(it.total || quantity * unitPrice - discount + taxAmount);
        const productName = it.product?.name || it.productName || undefined;

        items.push({
          id: itemId,
          saleReturnId: returnId,
          productId: Number(it.productId),
          productName,
          quantity,
          unitPrice,
          discount,
          taxAmount,
          unit: it.unit ? String(it.unit) : undefined,
          unitType,
          conversionRate,
          total: itemTotal,
          createdAt: it.createdAt ? String(it.createdAt) : saleReturn.createdAt,
          updatedAt: it.updatedAt ? String(it.updatedAt) : saleReturn.updatedAt,
          syncStatus: 'synced',
        });
      }
    }

    return { saleReturn, items };
  }

  public async fetchFromApi(): Promise<SaleReturn[]> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.SALES_RETURNS.BASE);
      const rawList = this.extractList(response.data);
      if (!Array.isArray(rawList)) return await this.getAll();

      for (const raw of rawList) {
        if (!raw.id) continue;
        const { saleReturn, items } = this.normalizeApiSaleReturn(raw);

        const existing = await super.getById(saleReturn.id);
        if (existing && existing.syncStatus !== 'synced') {
          // Do not overwrite local pending modifications
          continue;
        }

        if (existing) {
          await super.update(saleReturn, false);
        } else {
          await super.insert(saleReturn, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM sale_return_items WHERE saleReturnId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [saleReturn.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO sale_return_items (
                id, saleReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.saleReturnId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount || 0,
                it.taxAmount || 0,
                it.unit || null,
                it.unitType || 'base',
                it.conversionRate || 1,
                it.total,
                it.createdAt,
                it.updatedAt,
                'synced',
              ]
            );
          }
        }
      }

      // Cleanup local records deleted from server
      const serverIds = rawList.map((x: any) => Number(x.id)).filter((id: number) => !isNaN(id) && id > 0);
      if (serverIds.length > 0) {
        const placeholders = serverIds.map(() => '?').join(',');
        await db.execute(
          `DELETE FROM sale_return_items WHERE saleReturnId IN (SELECT id FROM sale_returns WHERE syncStatus = 'synced' AND id NOT IN (${placeholders}))`,
          serverIds
        );
        await db.execute(
          `DELETE FROM sale_returns WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
          serverIds
        );
      }

      return await this.getAll();
    } catch (e) {
      console.warn('[SaleReturnRepository] fetchFromApi error (offline):', e);
      return await this.getAll();
    }
  }

  public async fetchByIdFromApi(id: number): Promise<SaleReturn | null> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.SALES_RETURNS.BY_ID(id));
      const raw = response.data?.data || response.data;
      if (!raw || !raw.id) return await this.getById(id);

      const { saleReturn, items } = this.normalizeApiSaleReturn(raw);
      const existing = await super.getById(saleReturn.id);
      if (!existing || existing.syncStatus === 'synced') {
        if (existing) {
          await super.update(saleReturn, false);
        } else {
          await super.insert(saleReturn, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM sale_return_items WHERE saleReturnId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [saleReturn.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO sale_return_items (
                id, saleReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.saleReturnId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount || 0,
                it.taxAmount || 0,
                it.unit || null,
                it.unitType || 'base',
                it.conversionRate || 1,
                it.total,
                it.createdAt,
                it.updatedAt,
                'synced',
              ]
            );
          }
        }
      }

      return await this.getById(id);
    } catch (e) {
      console.warn(`[SaleReturnRepository] fetchByIdFromApi(${id}) error:`, e);
      return await this.getById(id);
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted(this.tableName, item.entityId))) {
      return;
    }
    if (item.operation === 'DELETE') {
      if (/^\d+$/.test(String(item.entityId)) && Number(item.entityId) > 0) {
        try {
          await apiClient.delete(API_ENDPOINTS.SALES_RETURNS.BY_ID(item.entityId));
        } catch (e) {
          console.warn('Failed to delete sale return on API:', e);
        }
      }
      return;
    }

    let payloadData: { saleReturn: SaleReturn; items: SaleReturnItem[] } | null = null;
    if (item.payload) {
      try {
        payloadData = JSON.parse(item.payload);
      } catch {}
    }

    const saleReturn = payloadData?.saleReturn || (await this.getById(item.entityId));
    if (!saleReturn) return;
    const items = payloadData?.items || (await this.getItemsForSaleReturn(saleReturn.id));
    saleReturn.items = items;

    if (saleReturn.saleId) {
      const response = await apiClient.post(API_ENDPOINTS.SALES_RETURNS.BASE, {
        saleId: Number(saleReturn.saleId),
        returnNumber: saleReturn.returnNumber,
        returnDate: saleReturn.date ? new Date(saleReturn.date).toISOString() : new Date().toISOString(),
        reason: saleReturn.reason,
        subTotal: Number(saleReturn.subtotal || 0),
        taxTotal: Number(saleReturn.taxTotal || 0),
        discountTotal: Number(saleReturn.discountTotal || 0),
        totalAmount: Number(saleReturn.totalAmount || 0),
        items: items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount || 0),
          taxAmount: Number(i.taxAmount || 0),
          total: Number(i.total),
        })),
      });

      if (response.status >= 200 && response.status < 300) {
        const body = response?.data?.data || response?.data || {};
        const returnedId = body.id;
        if (returnedId && String(returnedId) !== String(saleReturn.id)) {
          await db.execute(`UPDATE sale_returns SET id = ?, syncStatus = 'synced' WHERE id = ?`, [Number(returnedId), saleReturn.id]);
          await db.execute(`UPDATE sale_return_items SET saleReturnId = ?, syncStatus = 'synced' WHERE saleReturnId = ?`, [Number(returnedId), saleReturn.id]);
          await outboxRepo.rebaseEntity(this.tableName, saleReturn.id, Number(returnedId), Number(returnedId));
        } else {
          await db.execute(`UPDATE sale_returns SET syncStatus = 'synced' WHERE id = ?`, [saleReturn.id]);
          await db.execute(`UPDATE sale_return_items SET syncStatus = 'synced' WHERE saleReturnId = ?`, [saleReturn.id]);
        }
      }
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

    const fullItems: SaleReturnItem[] = [];
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

      const fullItem: SaleReturnItem = {
        ...item,
        id: itemId,
        saleReturnId: returnId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };
      fullItems.push(fullItem);

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

    // Always queue in outbox for reliable auto-sync
    await outboxRepo.add(this.tableName, returnId, 'CREATE', { saleReturn, items: fullItems });
    this.requestSync();

    return { ...saleReturn, items: fullItems };
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    await db.execute('DELETE FROM sale_return_items WHERE saleReturnId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add(this.tableName, id);
      await outboxRepo.removeForEntity(this.tableName, id);
      if (/^\d+$/.test(String(id))) {
        await outboxRepo.add(this.tableName, id, 'DELETE', { id });
        this.requestSync();
      }
    }
  }
}

export const saleReturnRepository = new SaleReturnRepository();
