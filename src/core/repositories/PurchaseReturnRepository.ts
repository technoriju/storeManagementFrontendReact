import { BaseRepository } from './BaseRepository';
import { PurchaseReturn, PurchaseReturnItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

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

  public async getReturnedQuantitiesForPurchase(purchaseId: number | string): Promise<Record<number, number>> {
    try {
      const res = await db.execute(
        `SELECT pri.productId, SUM(pri.quantity) as totalReturned
         FROM purchase_return_items pri
         JOIN purchase_returns pr ON pri.purchaseReturnId = pr.id
         WHERE pr.purchaseId = ? AND (pr.status IS NULL OR LOWER(pr.status) != 'cancelled')
         GROUP BY pri.productId`,
        [Number(purchaseId)]
      );
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
      const map: Record<number, number> = {};
      for (const row of rawRows) {
        if (row && row.productId) {
          map[Number(row.productId)] = Number(row.totalReturned || 0);
        }
      }
      return map;
    } catch (e) {
      console.warn('Failed to get returned quantities for purchase:', e);
      return {};
    }
  }

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  protected async syncWithApi(entity: PurchaseReturn, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'delete') {
        if (/^\d+$/.test(String(entity.id)) && entity.id > 0) {
          await apiClient.delete(API_ENDPOINTS.PURCHASE_RETURNS.BY_ID(entity.id));
        }
        return;
      }

      if (entity.purchaseId) {
        const items = entity.items || (await this.getItemsForPurchaseReturn(entity.id));
        const response = await apiClient.post(API_ENDPOINTS.PURCHASE_RETURNS.BASE, {
          purchaseId: Number(entity.purchaseId),
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
            await db.execute(`UPDATE purchase_returns SET id = ?, syncStatus = 'synced' WHERE id = ?`, [Number(returnedId), entity.id]);
            await db.execute(`UPDATE purchase_return_items SET purchaseReturnId = ?, syncStatus = 'synced' WHERE purchaseReturnId = ?`, [Number(returnedId), entity.id]);
            await outboxRepo.rebaseEntity(this.tableName, entity.id, Number(returnedId), Number(returnedId));
          } else {
            await db.execute(`UPDATE purchase_returns SET syncStatus = 'synced' WHERE id = ?`, [entity.id]);
            await db.execute(`UPDATE purchase_return_items SET syncStatus = 'synced' WHERE purchaseReturnId = ?`, [entity.id]);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync purchase return ${entity.id} with API:`, error);
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

  private normalizeApiPurchaseReturn(item: any): { purchaseReturn: PurchaseReturn; items: PurchaseReturnItem[] } {
    const returnId = Number(item.id);
    const dateStr = item.returnDate
      ? String(item.returnDate).slice(0, 10)
      : item.date
      ? String(item.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const purchaseReturn: PurchaseReturn = {
      id: returnId,
      purchaseId: item.purchaseId ? Number(item.purchaseId) : undefined,
      returnNumber: String(item.returnNumber || `PRT-${returnId}`),
      reference: item.reference ? String(item.reference) : String(item.returnNumber || `PRT-${returnId}`),
      supplierId: item.purchase?.supplierId
        ? Number(item.purchase.supplierId)
        : item.supplierId
        ? Number(item.supplierId)
        : undefined,
      supplierName: item.purchase?.supplier?.name || item.supplierName || 'Unknown Supplier',
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

    const items: PurchaseReturnItem[] = [];
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
          purchaseReturnId: returnId,
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
          createdAt: it.createdAt ? String(it.createdAt) : purchaseReturn.createdAt,
          updatedAt: it.updatedAt ? String(it.updatedAt) : purchaseReturn.updatedAt,
          syncStatus: 'synced',
        });
      }
    }

    return { purchaseReturn, items };
  }

  public async fetchFromApi(): Promise<PurchaseReturn[]> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASE_RETURNS.BASE);
      const rawList = this.extractList(response.data);
      if (!Array.isArray(rawList)) return await this.getAll();

      for (const raw of rawList) {
        if (!raw.id) continue;
        const { purchaseReturn, items } = this.normalizeApiPurchaseReturn(raw);

        const existing = await super.getById(purchaseReturn.id);
        if (existing && existing.syncStatus !== 'synced') {
          // Do not overwrite local pending modifications
          continue;
        }

        if (existing) {
          await super.update(purchaseReturn, false);
        } else {
          await super.insert(purchaseReturn, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM purchase_return_items WHERE purchaseReturnId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [purchaseReturn.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO purchase_return_items (
                id, purchaseReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.purchaseReturnId,
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
          `DELETE FROM purchase_return_items WHERE purchaseReturnId IN (SELECT id FROM purchase_returns WHERE syncStatus = 'synced' AND id NOT IN (${placeholders}))`,
          serverIds
        );
        await db.execute(
          `DELETE FROM purchase_returns WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
          serverIds
        );
      }

      return await this.getAll();
    } catch (e) {
      console.warn('[PurchaseReturnRepository] fetchFromApi error (offline):', e);
      return await this.getAll();
    }
  }

  public async fetchByIdFromApi(id: number): Promise<PurchaseReturn | null> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASE_RETURNS.BY_ID(id));
      const raw = response.data?.data || response.data;
      if (!raw || !raw.id) return await this.getById(id);

      const { purchaseReturn, items } = this.normalizeApiPurchaseReturn(raw);
      const existing = await super.getById(purchaseReturn.id);
      if (!existing || existing.syncStatus === 'synced') {
        if (existing) {
          await super.update(purchaseReturn, false);
        } else {
          await super.insert(purchaseReturn, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM purchase_return_items WHERE purchaseReturnId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [purchaseReturn.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO purchase_return_items (
                id, purchaseReturnId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.purchaseReturnId,
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
      console.warn(`[PurchaseReturnRepository] fetchByIdFromApi(${id}) error:`, e);
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
          await apiClient.delete(API_ENDPOINTS.PURCHASE_RETURNS.BY_ID(item.entityId));
        } catch (e) {
          console.warn('Failed to delete purchase return on API:', e);
        }
      }
      return;
    }

    let payloadData: { purchaseReturn: PurchaseReturn; items: PurchaseReturnItem[] } | null = null;
    if (item.payload) {
      try {
        payloadData = JSON.parse(item.payload);
      } catch {}
    }

    const purchaseReturn = payloadData?.purchaseReturn || (await this.getById(item.entityId));
    if (!purchaseReturn) return;
    const items = payloadData?.items || (await this.getItemsForPurchaseReturn(purchaseReturn.id));
    purchaseReturn.items = items;

    let targetPurchaseId = purchaseReturn.purchaseId ? Number(purchaseReturn.purchaseId) : null;
    if (targetPurchaseId && targetPurchaseId > 1000000000000) {
      const prRowRes = await db.execute(`SELECT purchaseId FROM purchase_returns WHERE id = ? LIMIT 1`, [purchaseReturn.id]);
      const prRows = (prRowRes as any)?.rows ? (Array.isArray((prRowRes as any).rows) ? (prRowRes as any).rows : (prRowRes as any).rows._array || []) : [];
      if (prRows.length > 0 && prRows[0].purchaseId && Number(prRows[0].purchaseId) < 1000000000000) {
        targetPurchaseId = Number(prRows[0].purchaseId);
      }
      if (targetPurchaseId > 1000000000000) {
        throw new Error(`Parent purchase ${targetPurchaseId} pending server sync`);
      }
    }

    if (targetPurchaseId) {
      const response = await apiClient.post(API_ENDPOINTS.PURCHASE_RETURNS.BASE, {
        purchaseId: targetPurchaseId,
        returnNumber: purchaseReturn.returnNumber,
        returnDate: purchaseReturn.date ? new Date(purchaseReturn.date).toISOString() : new Date().toISOString(),
        reason: purchaseReturn.reason,
        subTotal: Number(purchaseReturn.subtotal || 0),
        taxTotal: Number(purchaseReturn.taxTotal || 0),
        discountTotal: Number(purchaseReturn.discountTotal || 0),
        totalAmount: Number(purchaseReturn.totalAmount || 0),
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
        if (returnedId && String(returnedId) !== String(purchaseReturn.id)) {
          await db.execute(`UPDATE purchase_returns SET id = ?, syncStatus = 'synced' WHERE id = ?`, [Number(returnedId), purchaseReturn.id]);
          await db.execute(`UPDATE purchase_return_items SET purchaseReturnId = ?, syncStatus = 'synced' WHERE purchaseReturnId = ?`, [Number(returnedId), purchaseReturn.id]);
          await outboxRepo.rebaseEntity(this.tableName, purchaseReturn.id, Number(returnedId), Number(returnedId));
        } else {
          await db.execute(`UPDATE purchase_returns SET syncStatus = 'synced' WHERE id = ?`, [purchaseReturn.id]);
          await db.execute(`UPDATE purchase_return_items SET syncStatus = 'synced' WHERE purchaseReturnId = ?`, [purchaseReturn.id]);
        }
      }
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

    const fullItems: PurchaseReturnItem[] = [];
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

      const fullItem: PurchaseReturnItem = {
        ...item,
        id: itemId,
        purchaseReturnId: returnId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };
      fullItems.push(fullItem);

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

    const returnTotal = Number(purchaseReturn.totalAmount || 0);

    // Update parent purchase due & payment status locally in SQLite
    if (purchaseReturn.purchaseId) {
      try {
        const purRes = await db.execute(`SELECT grandTotal, paid, due, paymentStatus FROM purchases WHERE id = ? LIMIT 1`, [purchaseReturn.purchaseId]);
        const pRows = (purRes as any)?.rows ? (Array.isArray((purRes as any).rows) ? (purRes as any).rows : (purRes as any).rows._array || []) : [];
        if (pRows.length > 0) {
          const pDue = Number(pRows[0].due || 0);
          const pPaid = Number(pRows[0].paid || 0);
          const newDue = Math.max(0, Number((pDue - returnTotal).toFixed(2)));
          let newStatus = pRows[0].paymentStatus;
          if (newDue === 0) newStatus = 'Paid';
          else if (pPaid > 0) newStatus = 'Partial';
          await db.execute(
            `UPDATE purchases SET due = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?`,
            [newDue, newStatus, now, purchaseReturn.purchaseId]
          );
        }
      } catch (pErr) {
        console.warn('Failed to update local purchase due on return:', pErr);
      }
    }

    // Update supplier outstanding balance locally in SQLite
    if (purchaseReturn.supplierId) {
      try {
        await db.execute(
          `UPDATE suppliers SET outstandingBalance = COALESCE(outstandingBalance, 0) - ?, updatedAt = ? WHERE id = ?`,
          [returnTotal, now, purchaseReturn.supplierId]
        );
      } catch (sErr) {
        console.warn('Failed to update local supplier balance on return:', sErr);
      }
    }

    // Always queue in outbox for reliable auto-sync
    await outboxRepo.add(this.tableName, returnId, 'CREATE', { purchaseReturn, items: fullItems });
    this.requestSync();

    return { ...purchaseReturn, items: fullItems };
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    try {
      const existing = await this.getById(id);
      if (existing) {
        const items = existing.items || (await this.getItemsForPurchaseReturn(id));
        const now = new Date().toISOString();

        // 1. Revert product stock in local SQLite
        for (const item of items) {
          if (!item.productId) continue;
          const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
          const unitType = item.unitType || 'base';
          const baseQty = unitType === 'sub' ? Number(item.quantity) / conversionRate : Number(item.quantity);
          try {
            await db.execute(
              `UPDATE products SET stockQuantity = stockQuantity + ?, updatedAt = ? WHERE id = ?`,
              [baseQty, now, item.productId]
            );
          } catch (stockErr) {
            console.warn(`Failed to revert stock for product ${item.productId}:`, stockErr);
          }
        }

        const returnTotal = Number(existing.totalAmount || 0);

        // 2. Revert parent purchase due in local SQLite
        if (existing.purchaseId) {
          try {
            const purRes = await db.execute(`SELECT grandTotal, paid, due, paymentStatus FROM purchases WHERE id = ? LIMIT 1`, [existing.purchaseId]);
            const pRows = (purRes as any)?.rows ? (Array.isArray((purRes as any).rows) ? (purRes as any).rows : (purRes as any).rows._array || []) : [];
            if (pRows.length > 0) {
              const pDue = Number(pRows[0].due || 0);
              const pPaid = Number(pRows[0].paid || 0);
              const newDue = Number((pDue + returnTotal).toFixed(2));
              let newStatus = pRows[0].paymentStatus;
              if (newDue === 0 && pPaid > 0) newStatus = 'Paid';
              else if (pPaid > 0) newStatus = 'Partial';
              else newStatus = 'Unpaid';
              await db.execute(
                `UPDATE purchases SET due = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?`,
                [newDue, newStatus, now, existing.purchaseId]
              );
            }
          } catch (pErr) {
            console.warn('Failed to revert local purchase due on return delete:', pErr);
          }
        }

        // 3. Revert supplier balance in local SQLite
        if (existing.supplierId) {
          try {
            await db.execute(
              `UPDATE suppliers SET outstandingBalance = COALESCE(outstandingBalance, 0) + ?, updatedAt = ? WHERE id = ?`,
              [returnTotal, now, existing.supplierId]
            );
          } catch (sErr) {
            console.warn('Failed to revert local supplier balance on return delete:', sErr);
          }
        }
      }
    } catch (e) {
      console.warn('Error during local return delete rollback:', e);
    }

    await db.execute('DELETE FROM purchase_return_items WHERE purchaseReturnId = ?', [id]);
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

export const purchaseReturnRepository = new PurchaseReturnRepository();
