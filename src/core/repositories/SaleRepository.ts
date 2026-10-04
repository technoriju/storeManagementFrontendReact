import { BaseRepository } from './BaseRepository';
import { Sale, SaleItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { outboxRepo, tombstoneRepo, OutboxItem } from '../sync/outbox';

export class SaleRepository extends BaseRepository<Sale> {
  protected tableName = 'sales';

  protected getInsertColumns(): string {
    return 'id, invoiceNumber, reference, customerId, customerName, supplierId, supplierName, date, subtotal, discount, orderTax, shipping, gst, total, paid, due, status, paymentStatus, biller, notes, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'invoiceNumber = ?, reference = ?, customerId = ?, customerName = ?, supplierId = ?, supplierName = ?, date = ?, subtotal = ?, discount = ?, orderTax = ?, shipping = ?, gst = ?, total = ?, paid = ?, due = ?, status = ?, paymentStatus = ?, biller = ?, notes = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
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
        if (row) {
          items.push({
            id: Number(row.id),
            saleId: Number(row.saleId),
            productId: Number(row.productId),
            productName: row.productName || row.fallbackProductName || `Product #${row.productId}`,
            quantity: Number(row.quantity || 1),
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
            syncStatus: row.syncStatus
          });
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
          if (!itemsBySaleId[sId]) itemsBySaleId[sId] = [];
          itemsBySaleId[sId].push({
            id: Number(r.id),
            saleId: sId,
            productId: Number(r.productId),
            productName: r.productName || r.fallbackProductName || `Product #${r.productId}`,
            quantity: Number(r.quantity || 1),
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
          });
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
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount || 0),
          taxAmount: Number(it.taxAmount || 0),
          total: Number(it.total),
        })),
      };

      const response = await apiClient.post(API_ENDPOINTS.SALES.BASE, apiPayload);
      if (response.status >= 200 && response.status < 300) {
        const body = response?.data?.data || response?.data || {};
        const returnedId = Number(body.id || body._id);
        if (returnedId && returnedId !== entity.id) {
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

    await this.syncWithApi(sale, 'insert');
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

  private normalizeApiSale(s: any): { sale: Sale; items: SaleItem[] } {
    const saleId = Number(s.id);
    const total = Number(s.grandTotal ?? s.total ?? 0);
    const paid = Number(
      s.paymentAmount ??
        s.paid ??
        (Array.isArray(s.payments)
          ? s.payments.reduce((sum: number, pay: any) => sum + Number(pay.amount || pay.payment?.amount || 0), 0)
          : 0)
    );
    const due = Number(s.due ?? Math.max(0, total - paid));
    let paymentStatus = s.paymentStatus;
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
      notes: s.notes ? String(s.notes) : undefined,
      createdAt: s.createdAt ? String(s.createdAt) : new Date().toISOString(),
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
        const { sale, items } = this.normalizeApiSale(raw);

        // Check if existing locally by server ID first
        let existing = await super.getById(sale.id);

        // If not found by server ID, check if a local row exists with the same invoiceNumber or reference
        if (!existing && (sale.invoiceNumber || sale.reference)) {
          const matchRes = await db.execute(
            `SELECT id FROM sales WHERE invoiceNumber = ? OR (reference IS NOT NULL AND reference = ?)`,
            [sale.invoiceNumber, sale.invoiceNumber]
          );
          let matchedRows: any[] = [];
          if (matchRes.rows && Array.isArray(matchRes.rows)) matchedRows = matchRes.rows;
          else if (matchRes.rows && typeof matchRes.rows === 'object' && '_array' in matchRes.rows) matchedRows = (matchRes.rows as any)._array;

          for (const m of matchedRows) {
            const oldId = Number(m.id);
            if (oldId && oldId !== sale.id) {
              await db.execute(`DELETE FROM sale_items WHERE saleId = ?`, [oldId]);
              await db.execute(`DELETE FROM sales WHERE id = ?`, [oldId]);
              await outboxRepo.removeForEntity(this.tableName, oldId);
            }
          }
        }

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
            'DELETE FROM sale_items WHERE saleId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
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

      const { sale, items } = this.normalizeApiSale(raw);
      const existing = await super.getById(sale.id);
      if (!existing || existing.syncStatus === 'synced') {
        if (existing) {
          await super.update(sale, false);
        } else {
          await super.insert(sale, false);
        }

        if (items.length > 0) {
          await db.execute(
            'DELETE FROM sale_items WHERE saleId = ? AND (syncStatus = "synced" OR syncStatus IS NULL)',
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
    }

    // Always queue in outbox for reliable auto-sync
    await outboxRepo.add(this.tableName, saleId, 'CREATE', { sale, items: fullItems });
    this.requestSync();

    return { ...sale, items: fullItems };
  }

  public override async delete(id: number, shouldSync = true): Promise<void> {
    await db.execute('DELETE FROM sale_items WHERE saleId = ?', [id]);
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

export const saleRepository = new SaleRepository();
