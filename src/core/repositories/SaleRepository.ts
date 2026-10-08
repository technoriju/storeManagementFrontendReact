import { BaseRepository } from './BaseRepository';
import { Sale, SaleItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class SaleRepository extends BaseRepository<Sale> {
  protected tableName = 'sales';

  protected getInsertColumns(): string {
    return 'id, invoiceNumber, reference, customerId, customerName, supplierId, supplierName, date, subtotal, discount, orderTax, shipping, gst, total, paid, due, status, paymentStatus, biller, notes, previousDue, advancePayment, showPreviousBalance, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'invoiceNumber = ?, reference = ?, customerId = ?, customerName = ?, supplierId = ?, supplierName = ?, date = ?, subtotal = ?, discount = ?, orderTax = ?, shipping = ?, gst = ?, total = ?, paid = ?, due = ?, status = ?, paymentStatus = ?, biller = ?, notes = ?, previousDue = ?, advancePayment = ?, showPreviousBalance = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Sale): any[] {
    return [
      entity.id,
      entity.invoiceNumber,
      entity.reference || null,
      entity.customerId || null,
      entity.customerName || null,
      entity.supplierId || null,
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
      entity.status || 'Completed',
      entity.paymentStatus || 'Unpaid',
      entity.biller || null,
      entity.notes || null,
      entity.previousDue || 0,
      entity.advancePayment || 0,
      entity.showPreviousBalance ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Sale {
    return {
      id: Number(row.id),
      invoiceNumber: String(row.invoiceNumber || ''),
      reference: row.reference ? String(row.reference) : undefined,
      customerId: row.customerId ? Number(row.customerId) : undefined,
      customerName: row.customerName ? String(row.customerName) : undefined,
      supplierId: row.supplierId ? Number(row.supplierId) : undefined,
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
      status: (row.status as any) || 'Completed',
      paymentStatus: (row.paymentStatus as any) || 'Unpaid',
      biller: row.biller ? String(row.biller) : undefined,
      notes: row.notes ? String(row.notes) : undefined,
      previousDue: Number(row.previousDue || 0),
      advancePayment: Number(row.advancePayment || 0),
      showPreviousBalance: Boolean(row.showPreviousBalance),
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || new Date().toISOString()),
      syncStatus: (row.syncStatus as any) || 'synced'
    };
  }

  public async getItemsForSale(saleId: number): Promise<SaleItem[]> {
    try {
      const res = await db.execute(
        `SELECT si.*, p.name as fallbackProductName, p.sku as productSku
         FROM sale_items si
         LEFT JOIN products p ON si.productId = p.id
         WHERE si.saleId = ?
         ORDER BY si.id ASC`,
        [saleId]
      );
      const items: SaleItem[] = [];
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
        if (!row) continue;
        // Strictly verify item belongs to this sale
        if (row.saleId !== undefined && row.saleId !== null && Number(row.saleId) !== Number(saleId)) {
          continue;
        }
        const qty = Number(row.quantity || 1);
        if (qty <= 0) continue;

        const pId = Number(row.productId);
        const existingIdx = items.findIndex((it) => it.productId === pId);
        const newItem: SaleItem = {
          id: Number(row.id),
          saleId: Number(row.saleId || saleId),
          productId: pId,
          productName: row.productName || row.fallbackProductName || `Product #${row.productId}`,
          quantity: qty,
          unitPrice: Number(row.unitPrice || 0),
          discount: Number(row.discount || 0),
          gst: Number(row.gst || 0),
          taxAmount: Number(row.taxAmount || 0),
          unitCost: Number(row.unitCost || 0),
          unit: row.unit ? String(row.unit) : undefined,
          unitType: row.unitType || 'sub',
          conversionRate: row.conversionRate ? Number(row.conversionRate) : 1,
          total: Number(row.total || 0),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          syncStatus: row.syncStatus,
        };

        if (existingIdx >= 0) {
          // If duplicate row exists, prefer synced or higher total
          if (newItem.syncStatus === 'synced' || newItem.total > items[existingIdx].total) {
            items[existingIdx] = newItem;
          }
        } else {
          items.push(newItem);
        }
      }
      return items;
    } catch (e) {
      console.error('Failed to get sale items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<Sale | null> {
    const sale = await super.getById(id);
    if (!sale) return null;
    const items = await this.getItemsForSale(id);
    return { ...sale, items };
  }

  public override async getAll(): Promise<Sale[]> {
    try {
      // Clean up duplicate sales with matching invoiceNumber in SQLite
      try {
        const dupRows = await db.execute(`
          SELECT invoiceNumber, COUNT(*) as cnt 
          FROM sales 
          WHERE invoiceNumber IS NOT NULL AND invoiceNumber != ''
          GROUP BY invoiceNumber 
          HAVING cnt > 1
        `);
        let dups: any[] = [];
        if (dupRows.rows && Array.isArray(dupRows.rows)) dups = dupRows.rows;
        else if (dupRows.rows && typeof dupRows.rows === 'object' && '_array' in dupRows.rows) dups = (dupRows.rows as any)._array;

        for (const d of dups) {
          if (!d?.invoiceNumber) continue;
          const matchesRes = await db.execute(
            `SELECT id, syncStatus FROM sales WHERE invoiceNumber = ? ORDER BY id ASC`,
            [d.invoiceNumber]
          );
          let matches: any[] = [];
          if (matchesRes.rows && Array.isArray(matchesRes.rows)) matches = matchesRes.rows;
          else if (matchesRes.rows && typeof matchesRes.rows === 'object' && '_array' in matchesRes.rows) matches = (matchesRes.rows as any)._array;

          if (matches.length > 1) {
            const serverMatch = matches.find((m) => Number(m.id) < 1000000000000);
            const keepId = serverMatch ? Number(serverMatch.id) : Number(matches[matches.length - 1].id);
            const deleteIds = matches.map((m) => Number(m.id)).filter((id) => id !== keepId);

            if (deleteIds.length > 0) {
              const placeholders = deleteIds.map(() => '?').join(',');
              await db.execute(`DELETE FROM sale_items WHERE saleId IN (${placeholders})`, deleteIds);
              await db.execute(`DELETE FROM sales WHERE id IN (${placeholders})`, deleteIds);
            }
          }
        }
      } catch (dupErr) {
        console.warn('Error during sales deduplication:', dupErr);
      }

      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const sales: Sale[] = [];
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
        if (row) sales.push(this.fromRow(row));
      }

      // Batch load items for all sales
      try {
        const itemsRes = await db.execute(`
          SELECT si.*, p.name as fallbackProductName, p.sku as productSku
          FROM sale_items si
          LEFT JOIN products p ON si.productId = p.id
          ORDER BY si.id ASC
        `);
        let itemRows: any[] = [];
        if (itemsRes.rows && Array.isArray(itemsRes.rows)) {
          itemRows = itemsRes.rows;
        } else if (itemsRes.rows && typeof itemsRes.rows === 'object') {
          if ('_array' in itemsRes.rows && Array.isArray((itemsRes.rows as any)._array)) {
            itemRows = (itemsRes.rows as any)._array;
          } else if ('item' in itemsRes.rows && typeof (itemsRes.rows as any).length === 'number') {
            for (let i = 0; i < (itemsRes.rows as any).length; i++) {
              itemRows.push((itemsRes.rows as any).item(i));
            }
          }
        }

        const itemsBySaleId: Record<number, SaleItem[]> = {};
        for (const r of itemRows) {
          if (!r) continue;
          const sId = Number(r.saleId);
          if (!sId) continue;
          if (!itemsBySaleId[sId]) itemsBySaleId[sId] = [];

          const pId = Number(r.productId);
          const qty = Number(r.quantity || 1);
          if (qty <= 0) continue;

          const existingIdx = itemsBySaleId[sId].findIndex((it) => it.productId === pId);
          const newItem: SaleItem = {
            id: Number(r.id),
            saleId: sId,
            productId: pId,
            productName: r.productName || r.fallbackProductName || `Product #${r.productId}`,
            quantity: qty,
            unitPrice: Number(r.unitPrice || 0),
            discount: Number(r.discount || 0),
            gst: Number(r.gst || 0),
            taxAmount: Number(r.taxAmount || 0),
            unitCost: Number(r.unitCost || 0),
            unit: r.unit ? String(r.unit) : undefined,
            unitType: r.unitType || 'sub',
            conversionRate: r.conversionRate ? Number(r.conversionRate) : 1,
            total: Number(r.total || 0),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            syncStatus: r.syncStatus,
          };

          if (existingIdx >= 0) {
            const existing = itemsBySaleId[sId][existingIdx];
            if (newItem.syncStatus === 'synced' && existing.syncStatus !== 'synced') {
              itemsBySaleId[sId][existingIdx] = newItem;
            } else if (newItem.total > 0 && existing.total === 0) {
              itemsBySaleId[sId][existingIdx] = newItem;
            }
          } else {
            itemsBySaleId[sId].push(newItem);
          }
        }

        for (const sale of sales) {
          sale.items = itemsBySaleId[sale.id] || [];
        }
      } catch (itemsErr) {
        console.warn('Failed to load items in getAll():', itemsErr);
      }

      // Memory deduplication by invoiceNumber/reference
      const seen = new Set<string>();
      const uniqueSales: Sale[] = [];
      for (const s of sales) {
        const key = (s.invoiceNumber || s.reference || String(s.id)).trim();
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        uniqueSales.push(s);
      }

      return uniqueSales;
    } catch (error) {
      console.error('Failed to get all sales:', error);
      return [];
    }
  }

  private requestSync(): void {
    void import('../sync/SyncEngine').then(({ syncEngine }) => syncEngine.syncNow());
  }

  protected async syncWithApi(entity: Sale, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation === 'delete') {
        if (/^\d+$/.test(String(entity.id)) && entity.id > 0) {
          await apiClient.delete(API_ENDPOINTS.SALES.BY_ID(entity.id));
        }
        return;
      }

      const items = entity.items || (await this.getItemsForSale(entity.id));
      const customerId = entity.customerId && Number(entity.customerId) > 0 ? Number(entity.customerId) : 1;
      const apiPayload = {
        branchId: 1,
        warehouseId: 1,
        customerId,
        invoiceNumber: entity.invoiceNumber || entity.reference || `INV-${entity.id}`,
        saleDate: entity.date ? new Date(entity.date).toISOString() : new Date().toISOString(),
        status: entity.status || 'Completed',
        subTotal: Number(entity.subtotal || 0),
        taxTotal: Number((entity.orderTax || 0) + (entity.gst || 0)),
        discountTotal: Number(entity.discount || 0),
        grandTotal: Number(entity.total || 0),
        paymentAmount: Number(entity.paid || 0),
        paymentMethod: 'CASH',
        paid: Number(entity.paid || 0),
        due: Number(entity.due || 0),
        previousDue: Number(entity.previousDue || 0),
        advancePayment: Number(entity.advancePayment || 0),
        showPreviousBalance: Boolean(entity.showPreviousBalance),
        notes: entity.notes || undefined,
        paymentStatus: entity.paymentStatus || 'Unpaid',
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
        response = await apiClient.put(API_ENDPOINTS.SALES.BY_ID(targetServerId), apiPayload);
      } else {
        response = await apiClient.post(API_ENDPOINTS.SALES.BASE, apiPayload);
      }

      if (response && response.status >= 200 && response.status < 300) {
        const body = response?.data?.data || response?.data || {};
        const returnedId = Number(body.id || body._id);
        if (returnedId && returnedId !== entity.id && Number(entity.id) > 1000000000000) {
          await db.execute(`UPDATE sales SET id = ?, syncStatus = 'synced' WHERE id = ?`, [returnedId, entity.id]);
          await db.execute(`UPDATE sale_items SET saleId = ?, syncStatus = 'synced' WHERE saleId = ?`, [returnedId, entity.id]);
          await outboxRepo.rebaseEntity(this.tableName, entity.id, returnedId, returnedId);
        } else {
          await db.execute(`UPDATE sales SET syncStatus = 'synced' WHERE id = ?`, [entity.id]);
          await db.execute(`UPDATE sale_items SET syncStatus = 'synced' WHERE saleId = ?`, [entity.id]);
        }
      }
    } catch (error) {
      console.error(`Failed to sync sale ${entity.id} with API:`, error);
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
          await apiClient.delete(API_ENDPOINTS.SALES.BY_ID(item.entityId));
        } catch (e) {
          console.warn('Failed to delete sale on API:', e);
        }
      }
      return;
    }

    let payloadData: { sale: Sale; items: SaleItem[] } | null = null;
    if (item.payload) {
      try {
        payloadData = JSON.parse(item.payload);
      } catch {}
    }

    const sale = payloadData?.sale || (await this.getById(item.entityId));
    if (!sale) return;
    const items = payloadData?.items || (await this.getItemsForSale(sale.id));
    sale.items = items;

    if (item.operation === 'UPDATE') {
      await this.syncWithApi(sale, 'update');
    } else {
      await this.syncWithApi(sale, 'insert');
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

  private normalizeApiSale(s: any, existingSale?: Sale | null): { sale: Sale; items: SaleItem[] } {
    const saleId = Number(s.id);
    const total = Number(s.grandTotal ?? s.total ?? 0);
    const paid = Number(
      s.paymentAmount ??
        s.paid ??
        (Array.isArray(s.payments)
          ? s.payments.reduce((sum: number, pay: any) => sum + Number(pay.amount || pay.payment?.amount || 0), 0)
          : (existingSale?.paid ?? 0))
    );
    const due = Number(s.due ?? Math.max(0, total - paid));
    let paymentStatus = s.paymentStatus || existingSale?.paymentStatus;
    if (!paymentStatus) {
      if (paid >= total && total > 0) paymentStatus = 'Paid';
      else if (paid > 0) paymentStatus = 'Partial';
      else paymentStatus = 'Unpaid';
    }

    const dateStr = s.saleDate
      ? String(s.saleDate).slice(0, 10)
      : s.date
      ? String(s.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const prevDue = s.previousDue !== undefined && Number(s.previousDue) > 0
      ? Number(s.previousDue)
      : Number(existingSale?.previousDue || 0);

    const advPay = s.advancePayment !== undefined && Number(s.advancePayment) > 0
      ? Number(s.advancePayment)
      : Number(existingSale?.advancePayment || 0);

    const showPrev = s.showPreviousBalance !== undefined
      ? Boolean(s.showPreviousBalance)
      : Boolean(existingSale?.showPreviousBalance || (prevDue > 0 || advPay > 0));

    const sale: Sale = {
      id: saleId,
      invoiceNumber: String(s.invoiceNumber || `INV-${saleId}`),
      reference: s.reference ? String(s.reference) : String(s.invoiceNumber || `INV-${saleId}`),
      customerId: Number(s.customerId || s.customer?.id || 0),
      customerName: s.customer?.name || s.customerName || 'Walk-in Customer',
      supplierId: s.supplierId ? Number(s.supplierId) : undefined,
      supplierName: s.supplier?.name || s.supplierName,
      date: dateStr,
      subtotal: Number(s.subTotal ?? s.subtotal ?? 0),
      discount: Number(s.discountTotal ?? s.discount ?? 0),
      orderTax: Number(s.taxTotal ?? s.orderTax ?? 0),
      shipping: Number(s.shipping ?? 0),
      gst: Number(s.gst ?? 0),
      total,
      paid,
      due,
      status: (s.status === 'COMPLETED' ? 'Completed' : s.status || 'Completed') as any,
      paymentStatus: paymentStatus as any,
      biller: s.biller || 'Admin',
      notes: s.notes || existingSale?.notes,
      previousDue: prevDue,
      advancePayment: advPay,
      showPreviousBalance: showPrev,
      createdAt: s.createdAt ? String(s.createdAt) : (existingSale?.createdAt || new Date().toISOString()),
      updatedAt: s.updatedAt ? String(s.updatedAt) : new Date().toISOString(),
      syncStatus: 'synced',
    };

    const items: SaleItem[] = [];
    if (Array.isArray(s.items)) {
      for (const it of s.items) {
        const itemId = Number(it.id || Date.now() + Math.floor(Math.random() * 10000));
        const conversionRate = Number(it.conversionRate || it.productUnit?.conversionFactor || 1);
        const unitType = it.unitType || 'sub';
        const unitPrice = Number(it.unitPrice || 0);
        const quantity = Number(it.quantity || 1);
        const discount = Number(it.discount || 0);
        const taxAmount = Number(it.taxAmount || 0);
        const itemTotal = Number(it.total || quantity * unitPrice - discount + taxAmount);
        const productName = it.product?.name || it.productName || undefined;

        items.push({
          id: itemId,
          saleId,
          productId: Number(it.productId),
          productName,
          quantity,
          unitPrice,
          discount,
          gst: Number(it.gst || 0),
          taxAmount,
          unitCost: Number(it.unitCost || 0),
          unit: it.unit ? String(it.unit) : undefined,
          unitType,
          conversionRate,
          total: itemTotal,
          createdAt: it.createdAt ? String(it.createdAt) : sale.createdAt,
          updatedAt: it.updatedAt ? String(it.updatedAt) : sale.updatedAt,
          syncStatus: 'synced',
        });
      }
    }

    return { sale, items };
  }

  public async fetchFromApi(): Promise<Sale[]> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.SALES.BASE);
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
            `SELECT id FROM sales WHERE invoiceNumber = ? OR (reference IS NOT NULL AND reference = ?)`,
            [raw.invoiceNumber, raw.invoiceNumber]
          );
          let matchedRows: any[] = [];
          if (matchRes.rows && Array.isArray(matchRes.rows)) matchedRows = matchRes.rows;
          else if (matchRes.rows && typeof matchRes.rows === 'object' && '_array' in matchRes.rows) matchedRows = (matchRes.rows as any)._array;

          for (const m of matchedRows) {
            const oldId = Number(m.id);
            if (oldId && oldId !== rawId) {
              const oldSale = await super.getById(oldId);
              if (oldSale && !existing) existing = oldSale;
              await db.execute(`DELETE FROM sale_items WHERE saleId = ?`, [oldId]);
              await db.execute(`DELETE FROM sales WHERE id = ?`, [oldId]);
              await outboxRepo.removeForEntity(this.tableName, oldId);
            }
          }
        }

        const { sale, items } = this.normalizeApiSale(raw, existing);

        if (existing && existing.syncStatus !== 'synced') {
          // Do not overwrite local pending changes
          continue;
        }

        if (existing) {
          await super.update(sale, false);
        } else {
          await super.insert(sale, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM sale_items WHERE saleId = ?',
            [sale.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO sale_items (
                id, saleId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.saleId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount,
                it.gst,
                it.taxAmount,
                it.unitCost || 0,
                it.unit || null,
                it.unitType || 'sub',
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
          `DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE syncStatus = 'synced' AND id NOT IN (${placeholders}))`,
          serverIds
        );
        await db.execute(
          `DELETE FROM sales WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
          serverIds
        );
      }

      return await this.getAll();
    } catch (error) {
      console.warn('[SaleRepository] fetchFromApi error (offline):', error);
      return await this.getAll();
    }
  }

  public async fetchByIdFromApi(id: number): Promise<Sale | null> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.SALES.BY_ID(id));
      const raw = response.data?.data || response.data;
      if (!raw || !raw.id) return await this.getById(id);

      const existing = await super.getById(id);
      const { sale, items } = this.normalizeApiSale(raw, existing);
      if (!existing || existing.syncStatus === 'synced') {
        if (existing) {
          await super.update(sale, false);
        } else {
          await super.insert(sale, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM sale_items WHERE saleId = ?',
            [sale.id]
          );

          for (const it of items) {
            await db.execute(
              `INSERT INTO sale_items (
                id, saleId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                it.id,
                it.saleId,
                it.productId,
                it.productName || null,
                it.quantity,
                it.unitPrice,
                it.discount,
                it.gst,
                it.taxAmount,
                it.unitCost || 0,
                it.unit || null,
                it.unitType || 'sub',
                it.conversionRate || 1,
                it.total,
                it.createdAt,
                it.updatedAt,
                'synced',
              ]
            );
          }
        }
        return { ...sale, items };
      }

      return await this.getById(id);
    } catch (e) {
      console.warn(`[SaleRepository] fetchByIdFromApi(${id}) error:`, e);
      return await this.getById(id);
    }
  }

  public async createSaleWithItems(
    saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<SaleItem, 'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<Sale> {
    const now = new Date().toISOString();
    const saleId = Date.now() + Math.floor(Math.random() * 1000);

    const sale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert'
    };

    // Insert sale into local database
    await this.insert(sale, false);

    const fullItems: SaleItem[] = [];
    // Insert items & deduct product stock
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'sub';

      const fullItem: SaleItem = {
        ...item,
        id: itemId,
        saleId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };
      fullItems.push(fullItem);

      await db.execute(
        `INSERT INTO sale_items (
          id, saleId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          saleId,
          item.productId,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.gst,
          item.taxAmount,
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

      // If status is Completed, deduct from product stock (in base unit)
      if (sale.status === 'Completed') {
        const deductedBaseQty = unitType === 'base' ? Number(item.quantity) * conversionRate : Number(item.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ?`,
            [deductedBaseQty, item.productId]
          );
        } catch (stockErr) {
          console.error(`Failed to deduct stock for product ${item.productId}:`, stockErr);
        }
      }
    }

    // If sale has due, update customer's outstanding balance
    if (sale.customerId && Number(sale.customerId) > 0) {
      try {
        const cId = Number(sale.customerId);
        const saleDue = Number(sale.due || 0);
        if (saleDue > 0) {
          await db.execute(
            `UPDATE customers SET outstandingBalance = COALESCE(outstandingBalance, 0) + ?, updatedAt = ? WHERE id = ?`,
            [saleDue, now, cId]
          );
        }
      } catch (custErr) {
        console.warn('Failed to update customer balance on sale creation:', custErr);
      }
    }

    // If sale has paid amount, record in payments table
    if (sale.paid && Number(sale.paid) > 0) {
      try {
        await db.execute(
          `INSERT INTO payments (amount, method, type, reference, notes, customerId, createdAt, updatedAt, syncStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(sale.paid),
            'cash',
            'receive',
            sale.invoiceNumber,
            `Payment for Invoice ${sale.invoiceNumber}`,
            sale.customerId ? Number(sale.customerId) : null,
            now,
            now,
            'pending_insert'
          ]
        );
      } catch (payErr) {
        console.warn('Failed to insert payment for sale:', payErr);
      }
    }

    // Always queue in outbox for reliable auto-sync
    await outboxRepo.add(this.tableName, saleId, 'CREATE', { sale, items: fullItems });
    this.requestSync();

    return { ...sale, items: fullItems };
  }

  public async updateSaleWithItems(
    saleId: number,
    saleData: Partial<Sale>,
    newItems: Array<Omit<SaleItem, 'id' | 'saleId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<Sale> {
    const now = new Date().toISOString();
    const existingSale =
      (await this.getById(saleId)) ||
      (await this.getAll()).find(
        (s) =>
          s.id === saleId ||
          String(s.id) === String(saleId) ||
          (saleData.invoiceNumber && s.invoiceNumber === saleData.invoiceNumber)
      );

    let oldItems = await this.getItemsForSale(saleId);
    if ((!oldItems || oldItems.length === 0) && existingSale?.items && existingSale.items.length > 0) {
      oldItems = existingSale.items;
    }

    // 1. Stock Adjustment:
    // Step A: Reverse old items stock (add back what previous sale deducted)
    const oldStatus = String(existingSale?.status || '').toUpperCase();
    const isOldCompleted = !existingSale || oldStatus === 'COMPLETED' || oldStatus === 'RECEIVED';
    if (isOldCompleted && oldItems && oldItems.length > 0) {
      for (const oldItem of oldItems) {
        if (!oldItem.productId) continue;
        const conversionRate =
          oldItem.conversionRate && Number(oldItem.conversionRate) > 0 ? Number(oldItem.conversionRate) : 1;
        const unitType = oldItem.unitType || 'sub';
        const baseQty = unitType === 'base' ? Number(oldItem.quantity) * conversionRate : Number(oldItem.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity + ?, updatedAt = ? WHERE id = ?`,
            [baseQty, now, oldItem.productId]
          );
        } catch (e) {
          console.warn('Stock reverse err:', e);
        }
      }
    }

    // Step B: Deduct new items stock (deduct what is now sold)
    const newStatus = String(saleData.status || existingSale?.status || 'Completed').toUpperCase();
    const isNewCompleted = newStatus === 'COMPLETED' || newStatus === 'RECEIVED';
    if (isNewCompleted && newItems && newItems.length > 0) {
      for (const newItem of newItems) {
        if (!newItem.productId) continue;
        const conversionRate =
          newItem.conversionRate && Number(newItem.conversionRate) > 0 ? Number(newItem.conversionRate) : 1;
        const unitType = newItem.unitType || 'sub';
        const baseQty = unitType === 'base' ? Number(newItem.quantity) * conversionRate : Number(newItem.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity - ?, updatedAt = ? WHERE id = ?`,
            [baseQty, now, newItem.productId]
          );
        } catch (e) {
          console.warn('Stock deduct err:', e);
        }
      }
    }

    // 2. Adjust Customer balance difference:
    const oldDue = Number(existingSale?.due || 0);
    const newDue = Number(saleData.due !== undefined ? saleData.due : oldDue);
    const dueDiff = newDue - oldDue;
    const custId = saleData.customerId || existingSale?.customerId;
    if (custId && Number(custId) > 0 && dueDiff !== 0) {
      try {
        await db.execute(
          `UPDATE customers SET outstandingBalance = MAX(0, COALESCE(outstandingBalance, 0) + ?), updatedAt = ? WHERE id = ?`,
          [dueDiff, now, Number(custId)]
        );
      } catch (e) {
        console.warn('Customer balance update err:', e);
      }
    }

    // 3. Update sale row in SQLite
    const updatedSale: Sale = {
      ...existingSale!,
      ...saleData,
      id: saleId,
      updatedAt: now,
      syncStatus: 'pending_update',
    };
    await this.update(updatedSale, false);

    // 4. Replace sale items in SQLite
    await db.execute('DELETE FROM sale_items WHERE saleId = ?', [saleId]);
    const fullItems: SaleItem[] = [];
    for (const item of newItems) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'sub';
      const fullItem: SaleItem = {
        ...item,
        id: itemId,
        saleId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending_insert',
      };
      fullItems.push(fullItem);

      await db.execute(
        `INSERT INTO sale_items (
          id, saleId, productId, productName, quantity, unitPrice, discount, gst, taxAmount, unitCost, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          saleId,
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

    // 5. Outbox & API sync
    await outboxRepo.add(this.tableName, saleId, 'UPDATE', { sale: updatedSale, items: fullItems });
    this.requestSync();

    try {
      const targetServerId = updatedSale.invoiceNumber || updatedSale.reference || saleId;
      const apiPayload = {
        ...updatedSale,
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
      await apiClient.put(API_ENDPOINTS.SALES.BY_ID(targetServerId), apiPayload);
    } catch (e) {
      console.warn('Direct API sale update error (will sync via outbox):', e);
    }

    return { ...updatedSale, items: fullItems };
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

  public async getCustomerPreviousBalance(
    customerId: number | string,
    customerName?: string
  ): Promise<{
    outstandingBalance: number;
    salesDue: number;
    totalDue: number;
    advance: number;
    unpaidCount: number;
  }> {
    try {
      const cIdNum = Number(customerId);
      const cName = customerName ? customerName.trim() : '';

      // Skip unassigned or generic walk-in customers
      const isWalkIn = !cName || cName.toLowerCase() === 'walk-in customer' || cName.toLowerCase() === 'walk-in';
      if ((isNaN(cIdNum) || cIdNum <= 0) && isWalkIn) {
        return { outstandingBalance: 0, salesDue: 0, totalDue: 0, advance: 0, unpaidCount: 0 };
      }
      if (isWalkIn) {
        return { outstandingBalance: 0, salesDue: 0, totalDue: 0, advance: 0, unpaidCount: 0 };
      }

      let custBal = 0;

      // 1. Try fetching latest balance from backend if customer has a valid server ID
      if (!isNaN(cIdNum) && cIdNum > 0) {
        try {
          const apiRes = await apiClient.get(API_ENDPOINTS.CUSTOMERS.BY_ID(cIdNum));
          const apiCust = apiRes?.data?.data || apiRes?.data;
          if (apiCust && apiCust.outstandingBalance !== undefined) {
            custBal = Number(apiCust.outstandingBalance || 0);
            try {
              await db.execute('UPDATE customers SET outstandingBalance = ? WHERE id = ?', [custBal, cIdNum]);
            } catch (_) {}
          }
        } catch (_) {}
      }

      // 2. Fetch customer opening/ledger balance from local customers table if not obtained from API
      if (custBal === 0) {
        try {
          const whereParts: string[] = [];
          const whereArgs: any[] = [];
          if (!isNaN(cIdNum) && cIdNum > 0) {
            whereParts.push('id = ?');
            whereArgs.push(cIdNum);
          }
          if (cName) {
            whereParts.push('(name IS NOT NULL AND LOWER(name) = LOWER(?))');
            whereArgs.push(cName);
          }
          if (whereParts.length > 0) {
            const custRes = await db.execute(
              `SELECT outstandingBalance FROM customers WHERE ${whereParts.join(' OR ')} LIMIT 1`,
              whereArgs
            );
            const cRows = this.extractRows(custRes);
            if (cRows.length > 0 && cRows[0]) {
              custBal = Number(cRows[0].outstandingBalance || 0);
            }
          }
        } catch (err) {
          console.warn('Failed to query customer balance:', err);
        }
      }

      // 3. Query previous invoices for THIS specific customer from local sales table
      let sDue = 0;
      let unpaidCount = 0;
      try {
        const whereSaleParts: string[] = [];
        const saleArgs: any[] = [];
        if (!isNaN(cIdNum) && cIdNum > 0) {
          whereSaleParts.push('customerId = ?');
          saleArgs.push(cIdNum);
        }
        if (cName) {
          whereSaleParts.push('(customerName IS NOT NULL AND customerName != \'\' AND LOWER(customerName) = LOWER(?))');
          saleArgs.push(cName);
        }

        if (whereSaleParts.length > 0) {
          const salesRes = await db.execute(
            `SELECT id, invoiceNumber, reference, customerId, customerName, total, paid, due, paymentStatus, status 
             FROM sales 
             WHERE (${whereSaleParts.join(' OR ')})
             AND (status IS NULL OR LOWER(status) != 'cancelled')`,
            saleArgs
          );
          const sRows = this.extractRows(salesRes);
          for (const row of sRows) {
            if (!row) continue;
            const total = Number(row.total || 0);
            const paid = Number(row.paid || 0);
            let due = Number(row.due !== undefined && row.due !== null ? row.due : 0);

            if (due <= 0 && total > paid && String(row.paymentStatus || '').toLowerCase() !== 'paid') {
              due = total - paid;
            }

            if (due > 0) {
              sDue += due;
              unpaidCount++;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to query sales for customer balance:', err);
      }

      // 4. Compute effective total due and advance
      let totalDue = 0;
      let advance = 0;

      if (sDue > 0) {
        totalDue = sDue;
        if (custBal > 0 && custBal > sDue) {
          totalDue = custBal;
        }
      } else if (custBal > 0) {
        totalDue = custBal;
      } else if (custBal < 0) {
        advance = Math.abs(custBal);
      }

      return {
        outstandingBalance: custBal,
        salesDue: sDue,
        totalDue,
        advance,
        unpaidCount,
      };
    } catch {
      return { outstandingBalance: 0, salesDue: 0, totalDue: 0, advance: 0, unpaidCount: 0 };
    }
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    const sale = await this.getById(id) || (await this.getAll()).find(s => s.id === id || String(s.id) === String(id));
    const items = await this.getItemsForSale(id);

    // If sync enabled, delete from server FIRST to ensure sync with server
    if (shouldSync) {
      const serverTargetId = sale?.invoiceNumber || sale?.reference || id;
      try {
        await apiClient.delete(API_ENDPOINTS.SALES.BY_ID(serverTargetId));
      } catch (apiErr: any) {
        // If 404, record already deleted on server, proceed with local cleanup
        const status = apiErr?.response?.status;
        if (status !== 404) {
          const errMsg = apiErr?.response?.data?.message || apiErr?.message || 'Server failed to delete sale bill';
          console.error(`Failed to delete sale ${id} from server:`, errMsg);
          throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        }
      }
    }

    // Adjust stock: restore deducted items back to stock
    if (sale && (sale.status === 'Completed' || (sale.status as any) === 'COMPLETED')) {
      for (const item of items) {
        if (!item.productId) continue;
        const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
        const unitType = item.unitType || 'base';
        const baseQty = unitType === 'base' ? Number(item.quantity) * conversionRate : Number(item.quantity);
        try {
          await db.execute(
            `UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?`,
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
              'SALE_CANCELLED',
              baseQty,
              currStock - baseQty,
              currStock,
              'Sale Bill Deletion',
              sale.invoiceNumber || String(id),
              'Restored stock on sale deletion',
              new Date().toISOString(),
              new Date().toISOString(),
              'synced'
            ]
          );
        } catch (stockErr) {
          console.warn(`Failed to restore stock for product ${item.productId}:`, stockErr);
        }
      }
    }

    // Revert customer outstanding balance if due was recorded
    if (sale && sale.customerId && Number(sale.customerId) > 0 && Number(sale.due || 0) > 0) {
      try {
        await db.execute(
          `UPDATE customers SET outstandingBalance = MAX(0, COALESCE(outstandingBalance, 0) - ?), updatedAt = ? WHERE id = ?`,
          [Number(sale.due), new Date().toISOString(), Number(sale.customerId)]
        );
      } catch (custErr) {
        console.warn(`Failed to revert customer balance:`, custErr);
      }
    }

    await db.execute('DELETE FROM sale_items WHERE saleId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    if (shouldSync) {
      await tombstoneRepo.add(this.tableName, id);
      await outboxRepo.removeForEntity(this.tableName, id);
    }
  }
}

export const saleRepository = new SaleRepository();
