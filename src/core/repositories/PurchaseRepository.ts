import { BaseRepository } from './BaseRepository';
import { Purchase, PurchaseItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class PurchaseRepository extends BaseRepository<Purchase> {
  protected tableName = 'purchases';

  protected getInsertColumns(): string {
    return 'id, invoiceNumber, reference, supplierId, supplierName, date, subtotal, discount, orderTax, shipping, gst, total, paid, due, status, paymentStatus, notes, previousDue, advancePayment, showPreviousBalance, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'invoiceNumber = ?, reference = ?, supplierId = ?, supplierName = ?, date = ?, subtotal = ?, discount = ?, orderTax = ?, shipping = ?, gst = ?, total = ?, paid = ?, due = ?, status = ?, paymentStatus = ?, notes = ?, previousDue = ?, advancePayment = ?, showPreviousBalance = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Purchase): any[] {
    return [
      entity.id,
      entity.invoiceNumber,
      entity.reference || null,
      entity.supplierId,
      entity.supplierName || null,
      entity.date,
      entity.subtotal || 0,
      entity.discount || 0,
      entity.orderTax || 0,
      entity.shipping || 0,
      entity.gst || 0,
      entity.total || 0,
      entity.paid || 0,
      entity.due || 0,
      entity.status || 'Received',
      entity.paymentStatus || 'Unpaid',
      entity.notes || null,
      entity.previousDue || 0,
      entity.advancePayment || 0,
      entity.showPreviousBalance ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Purchase {
    return {
      id: Number(row.id),
      invoiceNumber: String(row.invoiceNumber || ''),
      reference: row.reference ? String(row.reference) : undefined,
      supplierId: Number(row.supplierId || 0),
      supplierName: row.supplierName ? String(row.supplierName) : undefined,
      date: String(row.date || ''),
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      orderTax: Number(row.orderTax || 0),
      shipping: Number(row.shipping || 0),
      gst: Number(row.gst || 0),
      total: Number(row.total || 0),
      paid: Number(row.paid || 0),
      due: Number(row.due || 0),
      status: (row.status as any) || 'Received',
      paymentStatus: (row.paymentStatus as any) || 'Unpaid',
      notes: row.notes ? String(row.notes) : undefined,
      previousDue: Number(row.previousDue || 0),
      advancePayment: Number(row.advancePayment || 0),
      showPreviousBalance: Boolean(row.showPreviousBalance),
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || new Date().toISOString()),
      syncStatus: (row.syncStatus as any) || 'synced'
    };
  }

  public async getItemsForPurchase(purchaseId: number): Promise<PurchaseItem[]> {
    try {
      const res = await db.execute(
        'SELECT * FROM purchase_items WHERE purchaseId = ?',
        [purchaseId]
      );
      const items: PurchaseItem[] = [];
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
            purchaseId: Number(row.purchaseId),
            productId: Number(row.productId),
            productName: row.productName ? String(row.productName) : undefined,
            quantity: Number(row.quantity || 1),
            unitPrice: Number(row.unitPrice || 0),
            discount: Number(row.discount || 0),
            gst: Number(row.gst || 0),
            taxAmount: Number(row.taxAmount || 0),
            unitCost: Number(row.unitCost || 0),
            unit: row.unit ? String(row.unit) : undefined,
            unitType: row.unitType || 'base',
            conversionRate: row.conversionRate ? Number(row.conversionRate) : 1,
            total: Number(row.total || 0),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            syncStatus: row.syncStatus
          });
        }
      }
      return items;
    } catch (e) {
      console.error('Failed to get purchase items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<Purchase | null> {
    const purchase = await super.getById(id);
    if (!purchase) return null;
    const items = await this.getItemsForPurchase(id);
    return { ...purchase, items };
  }

  public override async getAll(): Promise<Purchase[]> {
    try {
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: Purchase[] = [];
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
      console.error('Failed to get all purchases:', error);
      return [];
    }
  }

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  protected async syncWithApi(entity: Purchase, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'delete') {
        if (/^\d+$/.test(String(entity.id)) && entity.id > 0) {
          await apiClient.delete(API_ENDPOINTS.PURCHASES.BY_ID(entity.id));
        }
        return;
      }

      const items = entity.items || (await this.getItemsForPurchase(entity.id));
      const supplierId = entity.supplierId && Number(entity.supplierId) > 0 ? Number(entity.supplierId) : 1;
      const apiPayload = {
        branchId: 1,
        warehouseId: 1,
        supplierId,
        invoiceNumber: entity.invoiceNumber || entity.reference || `PO-${entity.id}`,
        purchaseDate: entity.date ? new Date(entity.date).toISOString() : new Date().toISOString(),
        status: entity.status || 'Received',
        subTotal: Number(entity.subtotal || 0),
        taxTotal: Number((entity.orderTax || 0) + (entity.gst || 0)),
        discountTotal: Number(entity.discount || 0),
        grandTotal: Number(entity.total || 0),
        paymentAmount: Number(entity.paid || 0),
        paymentMethod: 'CASH',
        paid: Number(entity.paid || 0),
        due: Number(entity.due || 0),
        paymentStatus: entity.paymentStatus || 'Unpaid',
        notes: entity.notes || undefined,
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0),
          taxAmount: Number(it.taxAmount || 0),
          total: Number(it.total),
          unitType: it.unitType,
          conversionRate: Number(it.conversionRate || 1),
        })),
      };

      let response: any;
      if (operation === 'update') {
        const targetServerId = entity.invoiceNumber || entity.reference || entity.id;
        response = await apiClient.put(API_ENDPOINTS.PURCHASES.BY_ID(targetServerId), apiPayload);
      } else {
        response = await apiClient.post(API_ENDPOINTS.PURCHASES.BASE, apiPayload);
      }

      if (response && response.status >= 200 && response.status < 300) {
        const body = response?.data?.data || response?.data || {};
        const returnedId = Number(body.id || body._id);
        if (returnedId && returnedId !== entity.id && Number(entity.id) > 1000000000000) {
          await db.execute(`UPDATE purchases SET id = ?, syncStatus = 'synced' WHERE id = ?`, [returnedId, entity.id]);
          await db.execute(`UPDATE purchase_items SET purchaseId = ?, syncStatus = 'synced' WHERE purchaseId = ?`, [returnedId, entity.id]);
          await outboxRepo.rebaseEntity(this.tableName, entity.id, returnedId, returnedId);
        } else {
          await db.execute(`UPDATE purchases SET syncStatus = 'synced' WHERE id = ?`, [entity.id]);
          await db.execute(`UPDATE purchase_items SET syncStatus = 'synced' WHERE purchaseId = ?`, [entity.id]);
        }
      }
    } catch (error) {
      console.error(`Failed to sync purchase ${entity.id} with API:`, error);
      throw error;
    }
  }

  async syncOutboxItem(item: OutboxItem): Promise<void> {
    if (item.operation !== 'DELETE' && (await tombstoneRepo.isDeleted(this.tableName, item.entityId))) {
      return;
    }
    if (item.operation === 'DELETE') {
      if (/^\d+$/.test(String(item.entityId)) && item.entityId > 0) {
        try {
          await apiClient.delete(API_ENDPOINTS.PURCHASES.BY_ID(item.entityId));
        } catch (e) {
          console.warn('Failed to delete purchase on API:', e);
        }
      }
      return;
    }

    let payloadData: { purchase: Purchase; items: PurchaseItem[] } | null = null;
    if (item.payload) {
      try {
        payloadData = JSON.parse(item.payload);
      } catch {}
    }

    const purchase = payloadData?.purchase || (await this.getById(item.entityId));
    if (!purchase) return;
    const items = payloadData?.items || (await this.getItemsForPurchase(purchase.id));
    purchase.items = items;

    if (item.operation === 'UPDATE') {
      await this.syncWithApi(purchase, 'update');
    } else {
      await this.syncWithApi(purchase, 'insert');
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

  private normalizeApiPurchase(p: any): { purchase: Purchase; items: PurchaseItem[] } {
    const purchaseId = Number(p.id);
    const total = Number(p.grandTotal ?? p.total ?? 0);
    const paid = Number(
      p.paymentAmount ??
        p.paid ??
        (Array.isArray(p.payments)
          ? p.payments.reduce((sum: number, pay: any) => sum + Number(pay.amount || pay.payment?.amount || 0), 0)
          : 0)
    );
    const due = Number(p.due ?? Math.max(0, total - paid));
    let paymentStatus = p.paymentStatus;
    if (!paymentStatus) {
      if (paid >= total && total > 0) paymentStatus = 'Paid';
      else if (paid > 0) paymentStatus = 'Partial';
      else paymentStatus = 'Unpaid';
    }

    const dateStr = p.purchaseDate
      ? String(p.purchaseDate).slice(0, 10)
      : p.date
      ? String(p.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const purchase: Purchase = {
      id: purchaseId,
      invoiceNumber: String(p.invoiceNumber || `PO-${purchaseId}`),
      reference: p.reference ? String(p.reference) : String(p.invoiceNumber || `PO-${purchaseId}`),
      supplierId: Number(p.supplierId || p.supplier?.id || 0),
      supplierName: p.supplier?.name || p.supplierName || 'Unknown Supplier',
      date: dateStr,
      subtotal: Number(p.subTotal ?? p.subtotal ?? 0),
      discount: Number(p.discountTotal ?? p.discount ?? 0),
      orderTax: Number(p.taxTotal ?? p.orderTax ?? 0),
      shipping: Number(p.shipping ?? 0),
      gst: Number(p.gst ?? 0),
      total,
      paid,
      due,
      status: (p.status === 'COMPLETED' ? 'Received' : p.status || 'Received') as any,
      paymentStatus: paymentStatus as any,
      notes: p.notes ? String(p.notes) : undefined,
      createdAt: p.createdAt ? String(p.createdAt) : new Date().toISOString(),
      updatedAt: p.updatedAt ? String(p.updatedAt) : new Date().toISOString(),
      syncStatus: 'synced',
    };

    const items: PurchaseItem[] = [];
    if (Array.isArray(p.items)) {
      for (const it of p.items) {
        const itemId = Number(it.id || Date.now() + Math.floor(Math.random() * 10000));
        const conversionRate = Number(it.conversionRate || it.productUnit?.conversionFactor || 1);
        const unitType = it.unitType || 'base';
        const unitPrice = Number(it.unitPrice || 0);
        const quantity = Number(it.quantity || 1);
        const discount = Number(it.discount || 0);
        const taxAmount = Number(it.taxAmount || 0);
        const itemTotal = Number(it.total || quantity * unitPrice - discount + taxAmount);
        const productName = it.product?.name || it.productName || undefined;

        items.push({
          id: itemId,
          purchaseId,
          productId: Number(it.productId),
          productName,
          quantity,
          unitPrice,
          discount,
          gst: Number(it.gst || 0),
          taxAmount,
          unitCost: Number(it.unitCost || unitPrice),
          unit: it.unit ? String(it.unit) : undefined,
          unitType,
          conversionRate,
          total: itemTotal,
          createdAt: it.createdAt ? String(it.createdAt) : purchase.createdAt,
          updatedAt: it.updatedAt ? String(it.updatedAt) : purchase.updatedAt,
          syncStatus: 'synced',
        });
      }
    }

    return { purchase, items };
  }

  public async fetchFromApi(): Promise<Purchase[]> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASES.BASE);
      const rawList = this.extractList(response.data);
      if (!Array.isArray(rawList)) return await this.getAll();

      for (const raw of rawList) {
        if (!raw.id) continue;
        const rawId = Number(raw.id);
        if (await tombstoneRepo.isDeleted(this.tableName, rawId)) {
          continue;
        }
        // Check if existing locally by server ID first
        let existing = await super.getById(rawId);

        // If not found by server ID, check if a local row exists with the same invoiceNumber or reference
        if (!existing && (raw.invoiceNumber || raw.reference)) {
          const matchRes = await db.execute(
            `SELECT id FROM purchases WHERE invoiceNumber = ? OR (reference IS NOT NULL AND reference = ?)`,
            [raw.invoiceNumber || raw.reference, raw.invoiceNumber || raw.reference]
          );
          let matchedRows: any[] = [];
          if (matchRes.rows && Array.isArray(matchRes.rows)) matchedRows = matchRes.rows;
          else if (matchRes.rows && typeof matchRes.rows === 'object' && '_array' in matchRes.rows) matchedRows = (matchRes.rows as any)._array;

          for (const m of matchedRows) {
            const oldId = Number(m.id);
            if (oldId && oldId !== rawId) {
              const oldPurchase = await super.getById(oldId);
              if (oldPurchase && !existing) existing = oldPurchase;
              await db.execute(`DELETE FROM purchase_items WHERE purchaseId = ?`, [oldId]);
              await db.execute(`DELETE FROM purchases WHERE id = ?`, [oldId]);
              await outboxRepo.removeForEntity(this.tableName, oldId);
            }
          }
        }

        const { purchase, items } = this.normalizeApiPurchase(raw);
        if (existing && existing.syncStatus !== 'synced') {
          // Do not overwrite local pending modifications
          continue;
        }

        if (existing) {
          await super.update(purchase, false);
        } else {
          await super.insert(purchase, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM purchase_items WHERE purchaseId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [purchase.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO purchase_items (
                id, purchaseId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.purchaseId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount,
                it.gst,
                it.taxAmount,
                it.unitCost || 0,
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
          `DELETE FROM purchase_items WHERE purchaseId IN (SELECT id FROM purchases WHERE syncStatus = 'synced' AND id NOT IN (${placeholders}))`,
          serverIds
        );
        await db.execute(
          `DELETE FROM purchases WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
          serverIds
        );
      }

      return await this.getAll();
    } catch (error) {
      console.warn('[PurchaseRepository] fetchFromApi error (offline):', error);
      return await this.getAll();
    }
  }

  public async fetchByIdFromApi(id: number): Promise<Purchase | null> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.PURCHASES.BY_ID(id));
      const raw = response.data?.data || response.data;
      if (!raw || !raw.id) return await this.getById(id);

      const { purchase, items } = this.normalizeApiPurchase(raw);
      const existing = await super.getById(purchase.id);
      if (!existing || existing.syncStatus === 'synced') {
        if (existing) {
          await super.update(purchase, false);
        } else {
          await super.insert(purchase, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM purchase_items WHERE purchaseId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
            [purchase.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO purchase_items (
                id, purchaseId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.purchaseId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount,
                it.gst,
                it.taxAmount,
                it.unitCost || 0,
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
      console.warn(`[PurchaseRepository] fetchByIdFromApi(${id}) error:`, e);
      return await this.getById(id);
    }
  }

  public async createPurchaseWithItems(
    purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<Purchase> {
    const now = new Date().toISOString();
    const purchaseId = Date.now() + Math.floor(Math.random() * 1000);

    const purchase: Purchase = {
      ...purchaseData,
      id: purchaseId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert'
    };

    // Insert purchase
    await this.insert(purchase, false);

    // Insert items & update product stock
    const fullItems: PurchaseItem[] = [];
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

      const fullItem: PurchaseItem = {
        ...item,
        id: itemId,
        purchaseId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert'
      };
      fullItems.push(fullItem);

      await db.execute(
        `INSERT INTO purchase_items (
          id, purchaseId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          purchaseId,
          item.productId,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.gst,
          item.taxAmount,
          item.unitCost,
          item.unit || null,
          unitType,
          conversionRate,
          item.total,
          now,
          now,
          'pending_insert'
        ]
      );

      // If status is Received, add to product stock (in base unit)
      if (purchase.status === 'Received') {
        const addedBaseQty = unitType === 'base' ? Number(item.quantity) * conversionRate : Number(item.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?`,
            [addedBaseQty, item.productId]
          );
        } catch (stockErr) {
          console.error(`Failed to update stock for product ${item.productId}:`, stockErr);
        }
      }
    }

    // If purchase has due, update supplier's outstanding balance
    if (purchase.supplierId && Number(purchase.supplierId) > 0) {
      try {
        const sId = Number(purchase.supplierId);
        const purDue = Number(purchase.due || 0);
        if (purDue > 0) {
          await db.execute(
            `UPDATE suppliers SET outstandingBalance = COALESCE(outstandingBalance, 0) + ?, updatedAt = ? WHERE id = ?`,
            [purDue, now, sId]
          );
        }
      } catch (suppErr) {
        console.warn('Failed to update supplier balance on purchase creation:', suppErr);
      }
    }

    // If purchase has paid amount, record in payments table (type = 'pay')
    if (purchase.paid && Number(purchase.paid) > 0) {
      try {
        const invNum = purchase.invoiceNumber || purchase.reference;
        const existingRes = await db.execute(
          `SELECT id FROM payments WHERE reference = ? AND type = 'pay' LIMIT 1`,
          [invNum]
        );
        let existingRows: any[] = [];
        if (existingRes.rows && Array.isArray(existingRes.rows)) existingRows = existingRes.rows;
        else if (existingRes.rows && typeof existingRes.rows === 'object' && '_array' in existingRes.rows) existingRows = (existingRes.rows as any)._array;

        if (existingRows.length > 0) {
          await db.execute(
            `UPDATE payments SET amount = ?, supplierId = ?, updatedAt = ?, syncStatus = 'pending_update' WHERE id = ?`,
            [Number(purchase.paid), purchase.supplierId ? Number(purchase.supplierId) : null, now, existingRows[0].id]
          );
        } else {
          const paymentId = Date.now() + Math.floor(Math.random() * 10000);
          await db.execute(
            `INSERT INTO payments (id, backendId, amount, method, type, reference, notes, supplierId, createdAt, updatedAt, syncStatus)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              paymentId,
              null,
              Number(purchase.paid),
              'cash',
              'pay',
              invNum,
              `Payment for Purchase ${invNum}`,
              purchase.supplierId ? Number(purchase.supplierId) : null,
              now,
              now,
              'pending_insert'
            ]
          );
        }
      } catch (payErr) {
        console.warn('Failed to insert payment for purchase:', payErr);
      }
    }

    // Always queue in outbox for reliable auto-sync
    await outboxRepo.add(this.tableName, purchaseId, 'CREATE', { purchase, items: fullItems });
    this.requestSync();

    return { ...purchase, items: fullItems };
  }

  public async updatePurchaseWithItems(
    purchaseId: number,
    purchaseData: Partial<Purchase>,
    newItems: Array<Omit<PurchaseItem, 'id' | 'purchaseId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<Purchase> {
    const now = new Date().toISOString();
    const existingPurchase =
      (await this.getById(purchaseId)) ||
      (await this.getAll()).find(
        (p) =>
          p.id === purchaseId ||
          String(p.id) === String(purchaseId) ||
          (purchaseData.invoiceNumber && p.invoiceNumber === purchaseData.invoiceNumber)
      );

    let oldItems = await this.getItemsForPurchase(purchaseId);
    if ((!oldItems || oldItems.length === 0) && existingPurchase?.items && existingPurchase.items.length > 0) {
      oldItems = existingPurchase.items;
    }

    // 1. Stock Adjustment:
    // Step A: Reverse old items stock (subtract what previous purchase added)
    const oldStatus = String(existingPurchase?.status || '').toUpperCase();
    const isOldReceived = !existingPurchase || oldStatus === 'RECEIVED' || oldStatus === 'COMPLETED';
    if (isOldReceived && oldItems && oldItems.length > 0) {
      for (const oldItem of oldItems) {
        if (!oldItem.productId) continue;
        const conversionRate =
          oldItem.conversionRate && Number(oldItem.conversionRate) > 0 ? Number(oldItem.conversionRate) : 1;
        const unitType = oldItem.unitType || 'base';
        const baseQty = unitType === 'base' ? Number(oldItem.quantity) * conversionRate : Number(oldItem.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity - ?, updatedAt = ? WHERE id = ?`,
            [baseQty, now, oldItem.productId]
          );
        } catch (e) {
          console.warn('Stock reverse err:', e);
        }
      }
    }

    // Step B: Add new items stock (add what is now purchased)
    const newStatus = String(purchaseData.status || existingPurchase?.status || 'Received').toUpperCase();
    const isNewReceived = newStatus === 'RECEIVED' || newStatus === 'COMPLETED';
    if (isNewReceived && newItems && newItems.length > 0) {
      for (const newItem of newItems) {
        if (!newItem.productId) continue;
        const conversionRate =
          newItem.conversionRate && Number(newItem.conversionRate) > 0 ? Number(newItem.conversionRate) : 1;
        const unitType = newItem.unitType || 'base';
        const baseQty = unitType === 'base' ? Number(newItem.quantity) * conversionRate : Number(newItem.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity + ?, updatedAt = ? WHERE id = ?`,
            [baseQty, now, newItem.productId]
          );
        } catch (e) {
          console.warn('Stock add err:', e);
        }
      }
    }

    // 2. Adjust Supplier balance difference:
    const oldDue = Number(existingPurchase?.due || 0);
    const newDue = Number(purchaseData.due !== undefined ? purchaseData.due : oldDue);
    const dueDiff = newDue - oldDue;
    const suppId = purchaseData.supplierId || existingPurchase?.supplierId;
    if (suppId && Number(suppId) > 0 && dueDiff !== 0) {
      try {
        await db.execute(
          `UPDATE suppliers SET outstandingBalance = MAX(0, COALESCE(outstandingBalance, 0) + ?), updatedAt = ? WHERE id = ?`,
          [dueDiff, now, Number(suppId)]
        );
      } catch (e) {
        console.warn('Supplier balance update err:', e);
      }
    }

    // 3. Update purchase row in SQLite
    const updatedPurchase: Purchase = {
      ...existingPurchase!,
      ...purchaseData,
      id: purchaseId,
      updatedAt: now,
      syncStatus: 'pending_update',
    };
    await this.update(updatedPurchase, false);

    // 4. Replace purchase items in SQLite
    await db.execute('DELETE FROM purchase_items WHERE purchaseId = ?', [purchaseId]);
    const fullItems: PurchaseItem[] = [];
    for (const item of newItems) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';
      const fullItem: PurchaseItem = {
        ...item,
        id: itemId,
        purchaseId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };
      fullItems.push(fullItem);

      await db.execute(
        `INSERT INTO purchase_items (
          id, purchaseId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          purchaseId,
          item.productId,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discount || 0,
          item.gst || 0,
          item.taxAmount || 0,
          item.unitCost || 0,
          item.unit || null,
          unitType,
          conversionRate,
          item.total,
          now,
          now,
          'pending_insert'
        ]
      );
    }

    // 5. Update or insert payment record if paid amount is set
    if (purchaseData.paid !== undefined) {
      try {
        const invNum = updatedPurchase.invoiceNumber || updatedPurchase.reference;
        const newPaid = Number(purchaseData.paid || 0);
        const existingRes = await db.execute(
          `SELECT id FROM payments WHERE reference = ? AND type = 'pay' LIMIT 1`,
          [invNum]
        );
        let existingRows: any[] = [];
        if (existingRes.rows && Array.isArray(existingRes.rows)) existingRows = existingRes.rows;
        else if (existingRes.rows && typeof existingRes.rows === 'object' && '_array' in existingRes.rows) existingRows = (existingRes.rows as any)._array;

        if (newPaid > 0) {
          if (existingRows.length > 0) {
            await db.execute(
              `UPDATE payments SET amount = ?, supplierId = ?, updatedAt = ?, syncStatus = 'pending_update' WHERE id = ?`,
              [newPaid, updatedPurchase.supplierId ? Number(updatedPurchase.supplierId) : null, now, existingRows[0].id]
            );
          } else {
            const paymentId = Date.now() + Math.floor(Math.random() * 10000);
            await db.execute(
              `INSERT INTO payments (id, backendId, amount, method, type, reference, notes, supplierId, createdAt, updatedAt, syncStatus)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                paymentId,
                null,
                newPaid,
                'cash',
                'pay',
                invNum,
                `Payment for Purchase ${invNum}`,
                updatedPurchase.supplierId ? Number(updatedPurchase.supplierId) : null,
                now,
                now,
                'pending_insert'
              ]
            );
          }
        } else if (existingRows.length > 0) {
          await db.execute(`DELETE FROM payments WHERE id = ?`, [existingRows[0].id]);
        }
      } catch (payErr) {
        console.warn('Failed to update payment for purchase update:', payErr);
      }
    }

    // 6. Outbox & API sync
    await outboxRepo.add(this.tableName, purchaseId, 'UPDATE', { purchase: updatedPurchase, items: fullItems });
    this.requestSync();

    try {
      const targetServerId = updatedPurchase.invoiceNumber || updatedPurchase.reference || purchaseId;
      const apiPayload = {
        ...updatedPurchase,
        items: fullItems.map((it) => ({
          productId: String(it.productId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0),
          taxAmount: Number(it.taxAmount || 0),
          total: Number(it.total),
          unitType: it.unitType,
          conversionRate: Number(it.conversionRate || 1),
        })),
      };
      await apiClient.put(API_ENDPOINTS.PURCHASES.BY_ID(targetServerId), apiPayload);
    } catch (e) {
      console.warn('Direct API purchase update error (will sync via outbox):', e);
    }

    return { ...updatedPurchase, items: fullItems };
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    const purchase = await this.getById(id) || (await this.getAll()).find(p => p.id === id || String(p.id) === String(id));
    const items = await this.getItemsForPurchase(id);

    // If sync enabled, delete from server FIRST to ensure sync with server
    if (shouldSync) {
      const serverTargetId = purchase?.invoiceNumber || id;
      try {
        await apiClient.delete(API_ENDPOINTS.PURCHASES.BY_ID(serverTargetId));
      } catch (apiErr: any) {
        // If 404, record already deleted on server, proceed with local cleanup
        const status = apiErr?.response?.status;
        if (status !== 404) {
          const errMsg = apiErr?.response?.data?.message || apiErr?.message || 'Server failed to delete purchase bill';
          console.error(`Failed to delete purchase ${id} from server:`, errMsg);
          throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        }
      }
    }

    // Adjust stock: reverse added stock for received purchase
    if (purchase && (purchase.status === 'Received' || (purchase.status as any) === 'COMPLETED')) {
      for (const item of items) {
        if (!item.productId) continue;
        const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
        const unitType = item.unitType || 'base';
        const baseQty = unitType === 'base' ? Number(item.quantity) * conversionRate : Number(item.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = MAX(0, stockQuantity - ?) WHERE id = ?`,
            [baseQty, item.productId]
          );

          // Record reversing transaction in stock_transactions
          const prodRes = await db.execute('SELECT stockQuantity, name, sku FROM products WHERE id = ?', [item.productId]);
          const pRows = this.extractRows(prodRes);
          const currStock = pRows.length > 0 ? Number(pRows[0].stockQuantity || 0) : 0;
          await db.execute(
            `INSERT INTO stock_transactions (
              productId, productName, sku, type, quantity, previousStock, newStock, reason, reference, notes, createdAt, updatedAt, syncStatus
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.productId,
              item.productName || pRows[0]?.name || null,
              pRows[0]?.sku || null,
              'PURCHASE_CANCELLED',
              -baseQty,
              currStock + baseQty,
              currStock,
              'Purchase Bill Deletion',
              purchase.invoiceNumber || String(id),
              'Deducted stock on purchase deletion',
              new Date().toISOString(),
              new Date().toISOString(),
              'synced'
            ]
          );
        } catch (stockErr) {
          console.warn(`Failed to deduct stock for product ${item.productId}:`, stockErr);
        }
      }
    }

    // Revert supplier balance if due was recorded
    if (purchase && purchase.supplierId && Number(purchase.supplierId) > 0 && Number(purchase.due || 0) > 0) {
      try {
        await db.execute(
          `UPDATE suppliers SET outstandingBalance = MAX(0, COALESCE(outstandingBalance, 0) - ?), updatedAt = ? WHERE id = ?`,
          [Number(purchase.due), new Date().toISOString(), Number(purchase.supplierId)]
        );
      } catch (suppErr) {
        console.warn(`Failed to revert supplier balance:`, suppErr);
      }
    }

    await db.execute('DELETE FROM purchase_items WHERE purchaseId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (purchase?.invoiceNumber || purchase?.reference) {
      try {
        await db.execute(`DELETE FROM payments WHERE reference = ?`, [purchase.invoiceNumber || purchase.reference]);
      } catch (_) {}
    }
    if (shouldSync) {
      await tombstoneRepo.add(this.tableName, id);
      await outboxRepo.removeForEntity(this.tableName, id);
    }
  }

  public async getSupplierPreviousBalance(
    supplierId: number | string,
    supplierName?: string,
    excludePurchaseId?: number | string
  ): Promise<{
    outstandingBalance: number;
    purchasesDue: number;
    totalDue: number;
    advance: number;
    unpaidCount: number;
  }> {
    try {
      const sIdNum = Number(supplierId);
      const sName = supplierName ? supplierName.trim() : '';

      if ((isNaN(sIdNum) || sIdNum <= 0) && !sName) {
        return { outstandingBalance: 0, purchasesDue: 0, totalDue: 0, advance: 0, unpaidCount: 0 };
      }

      // 1. Resolve accurate supplier details from local DB
      let localSupplier: any = null;
      try {
        if (!isNaN(sIdNum) && sIdNum > 0) {
          const sRes = await db.execute(
            `SELECT * FROM suppliers WHERE id = ? OR backendId = ? LIMIT 1`,
            [sIdNum, sIdNum]
          );
          const sRows = this.extractRows(sRes);
          if (sRows.length > 0 && sRows[0]) {
            localSupplier = sRows[0];
          }
        }
        if (!localSupplier && sName) {
          const sRes = await db.execute(
            `SELECT * FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
            [sName]
          );
          const sRows = this.extractRows(sRes);
          if (sRows.length > 0 && sRows[0]) {
            localSupplier = sRows[0];
          }
        }
      } catch (err) {
        console.warn('Failed to query local supplier info:', err);
      }

      const resolvedLocalId = localSupplier ? Number(localSupplier.id) : (!isNaN(sIdNum) && sIdNum > 0 ? sIdNum : undefined);
      const resolvedBackendId = localSupplier?.backendId ? Number(localSupplier.backendId) : undefined;
      const resolvedName = (localSupplier?.name || sName).trim();
      const serverTargetId = resolvedBackendId || (resolvedLocalId && resolvedLocalId > 0 && resolvedLocalId < 1000000000000 ? resolvedLocalId : undefined);

      let suppBal: number | null = null;

      // 2. Fetch fresh ledger balance from backend if supplier has a server ID
      if (serverTargetId) {
        try {
          const apiRes = await apiClient.get(API_ENDPOINTS.SUPPLIERS.BY_ID(serverTargetId));
          const apiSupp = apiRes?.data?.data || apiRes?.data;
          if (apiSupp && apiSupp.outstandingBalance !== undefined && apiSupp.outstandingBalance !== null) {
            suppBal = Number(apiSupp.outstandingBalance);
            try {
              if (resolvedLocalId) {
                await db.execute('UPDATE suppliers SET outstandingBalance = ? WHERE id = ?', [suppBal, resolvedLocalId]);
              }
            } catch (_) {}
          }
        } catch (_) {}
      }

      if (suppBal === null && localSupplier?.outstandingBalance !== undefined && localSupplier?.outstandingBalance !== null) {
        suppBal = Number(localSupplier.outstandingBalance);
      }

      // 3. Query previous unpaid purchases for THIS specific supplier from local purchases table
      let pDue = 0;
      let unpaidCount = 0;
      try {
        const whereConditions: string[] = [];
        const purchaseArgs: any[] = [];

        const idMatches: string[] = [];
        if (resolvedLocalId && resolvedLocalId > 0) {
          idMatches.push('supplierId = ?');
          purchaseArgs.push(resolvedLocalId);
        }
        if (resolvedBackendId && resolvedBackendId > 0 && resolvedBackendId !== resolvedLocalId) {
          idMatches.push('supplierId = ?');
          purchaseArgs.push(resolvedBackendId);
        }

        if (idMatches.length > 0) {
          whereConditions.push(`(${idMatches.join(' OR ')})`);
        } else if (resolvedName) {
          whereConditions.push(`(supplierName IS NOT NULL AND LOWER(TRIM(supplierName)) = LOWER(TRIM(?)))`);
          purchaseArgs.push(resolvedName);
        }

        if (whereConditions.length > 0) {
          let sql = `SELECT id, invoiceNumber, reference, supplierId, supplierName, total, paid, due, paymentStatus, status 
                     FROM purchases 
                     WHERE ${whereConditions.join(' AND ')}
                     AND (status IS NULL OR LOWER(status) != 'cancelled')`;

          if (excludePurchaseId) {
            const exIdNum = Number(excludePurchaseId);
            sql += ` AND id != ? AND invoiceNumber != ? AND (reference IS NULL OR reference != ?)`;
            purchaseArgs.push(exIdNum, String(excludePurchaseId), String(excludePurchaseId));
          }

          const purchasesRes = await db.execute(sql, purchaseArgs);
          const pRows = this.extractRows(purchasesRes);
          for (const row of pRows) {
            if (!row) continue;
            const total = Number(row.total || 0);
            const paid = Number(row.paid || 0);
            let due = Number(row.due !== undefined && row.due !== null ? row.due : 0);

            if (due <= 0 && total > paid && String(row.paymentStatus || '').toLowerCase() !== 'paid') {
              due = total - paid;
            }

            if (due > 0) {
              pDue += due;
              unpaidCount++;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to query purchases for supplier balance:', err);
      }

      // If editing an existing purchase and we have a server balance, subtract the excluded purchase's due from server balance
      if (excludePurchaseId && suppBal !== null && suppBal > 0) {
        try {
          const exPurchRes = await db.execute(
            `SELECT total, paid, due, paymentStatus FROM purchases WHERE (id = ? OR invoiceNumber = ?) LIMIT 1`,
            [Number(excludePurchaseId), String(excludePurchaseId)]
          );
          const exRows = this.extractRows(exPurchRes);
          if (exRows.length > 0 && exRows[0]) {
            const exTot = Number(exRows[0].total || 0);
            const exPaid = Number(exRows[0].paid || 0);
            let exDue = Number(exRows[0].due !== undefined ? exRows[0].due : 0);
            if (exDue <= 0 && exTot > exPaid && String(exRows[0].paymentStatus || '').toLowerCase() !== 'paid') {
              exDue = exTot - exPaid;
            }
            if (exDue > 0) {
              suppBal = Math.max(0, suppBal - exDue);
            }
          }
        } catch (_) {}
      }

      // 4. Compute effective total due and advance
      let totalDue = 0;
      let advance = 0;

      if (suppBal !== null) {
        if (suppBal > 0) {
          totalDue = suppBal;
        } else if (suppBal < 0) {
          advance = Math.abs(suppBal);
        }
      } else if (pDue > 0) {
        totalDue = pDue;
      }

      return {
        outstandingBalance: suppBal !== null ? suppBal : pDue,
        purchasesDue: pDue,
        totalDue,
        advance,
        unpaidCount,
      };
    } catch {
      return { outstandingBalance: 0, purchasesDue: 0, totalDue: 0, advance: 0, unpaidCount: 0 };
    }
  }

  private extractRows(results: any): any[] {
    let rawRows: any[] = [];
    if (!results) return rawRows;
    if (Array.isArray(results)) return results;
    if (results.rows && Array.isArray(results.rows)) {
      rawRows = results.rows;
    } else if (results.rows && typeof results.rows === 'object') {
      if ('_array' in results.rows && Array.isArray((results.rows as any)._array)) {
        rawRows = (results.rows as any)._array;
      } else if ('item' in results.rows && typeof (results.rows as any).length === 'number') {
        const len = (results.rows as any).length;
        for (let i = 0; i < len; i++) {
          rawRows.push((results.rows as any).item(i));
        }
      } else {
        try {
          rawRows = Array.from(results.rows as any);
        } catch (e) {}
      }
    }
    return rawRows;
  }
}

export const purchaseRepository = new PurchaseRepository();
