import { BaseRepository } from './BaseRepository';
import { Quotation, QuotationItem } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class QuotationRepository extends BaseRepository<Quotation> {
  protected tableName = 'quotations';

  protected getInsertColumns(): string {
    return 'id, quotationNumber, customerId, customerName, date, expiryDate, subtotal, discount, taxTotal, shipping, grandTotal, status, notes, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'quotationNumber = ?, customerId = ?, customerName = ?, date = ?, expiryDate = ?, subtotal = ?, discount = ?, taxTotal = ?, shipping = ?, grandTotal = ?, status = ?, notes = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Quotation): any[] {
    return [
      entity.id,
      entity.quotationNumber,
      entity.customerId,
      entity.customerName || null,
      entity.date,
      entity.expiryDate || null,
      entity.subtotal || 0,
      entity.discount || 0,
      entity.taxTotal || 0,
      entity.shipping || 0,
      entity.grandTotal || 0,
      entity.status || 'Sent',
      entity.notes || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Quotation {
    return {
      id: Number(row.id),
      quotationNumber: String(row.quotationNumber || ''),
      customerId: Number(row.customerId || 0),
      customerName: row.customerName ? String(row.customerName) : undefined,
      date: String(row.date || ''),
      expiryDate: row.expiryDate ? String(row.expiryDate) : undefined,
      subtotal: Number(row.subtotal || 0),
      discount: Number(row.discount || 0),
      taxTotal: Number(row.taxTotal || 0),
      shipping: Number(row.shipping || 0),
      grandTotal: Number(row.grandTotal || 0),
      status: (row.status as any) || 'Sent',
      notes: row.notes ? String(row.notes) : undefined,
      createdAt: String(row.createdAt || new Date().toISOString()),
      updatedAt: String(row.updatedAt || new Date().toISOString()),
      syncStatus: (row.syncStatus as any) || 'synced',
    };
  }

  public async getItemsForQuotation(quotationId: number): Promise<QuotationItem[]> {
    try {
      const res = await db.execute('SELECT * FROM quotation_items WHERE quotationId = ?', [quotationId]);
      const items: QuotationItem[] = [];
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
            quotationId: Number(row.quotationId),
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
      console.error('Failed to get quotation items:', e);
      return [];
    }
  }

  public override async getById(id: number): Promise<Quotation | null> {
    const item = await super.getById(id);
    if (!item) return null;
    const items = await this.getItemsForQuotation(id);
    return { ...item, items };
  }

  public override async getAll(): Promise<Quotation[]> {
    try {
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: Quotation[] = [];
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
      console.error('Failed to get all quotations:', error);
      return [];
    }
  }

  protected async syncWithApi(entity: Quotation, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync quotation ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<Quotation[]> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.QUOTATIONS.BASE);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        for (const item of data) {
          const existing = await this.getById(item.id);
          if (existing && existing.syncStatus !== 'synced') continue;

          const quotation: Quotation = {
            id: Number(item.id),
            quotationNumber: item.quotationNumber,
            customerId: item.customerId,
            customerName: item.customer?.name || item.customerName || 'Unknown Customer',
            date: item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : undefined,
            subtotal: Number(item.subTotal ?? item.subtotal ?? 0),
            discount: Number(item.discountTotal ?? item.discount ?? 0),
            taxTotal: Number(item.taxTotal ?? 0),
            shipping: Number(item.shipping ?? 0),
            grandTotal: Number(item.grandTotal ?? 0),
            status: item.status || 'Sent',
            notes: item.notes,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            syncStatus: 'synced',
          };

          if (existing) {
            await this.update(quotation, false);
          } else {
            await this.insert(quotation, false);
          }
        }

        const serverIds = data.map((x: any) => Number(x.id)).filter(Boolean);
        if (serverIds.length > 0) {
          const placeholders = serverIds.map(() => '?').join(',');
          await db.execute(
            `DELETE FROM ${this.tableName} WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
            serverIds
          );
        }
      }
      return await this.getAll();
    } catch (e) {
      console.warn('[QuotationRepository] fetchFromApi error (offline):', e);
      return await this.getAll();
    }
  }

  public async createQuotationWithItems(
    quotationData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>,
    items: Array<Omit<QuotationItem, 'id' | 'quotationId' | 'createdAt' | 'updatedAt' | 'syncStatus'>>
  ): Promise<Quotation> {
    const now = new Date().toISOString();
    const quotationId = Date.now() + Math.floor(Math.random() * 1000);

    const quotation: Quotation = {
      ...quotationData,
      id: quotationId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending_insert',
    };

    await this.insert(quotation, false);

    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      await db.execute(
        `INSERT INTO quotation_items (
          id, quotationId, productId, productName, quantity, unitPrice, discount, taxAmount, unit, unitType, conversionRate, total, createdAt, updatedAt, syncStatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          quotationId,
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
      await apiClient.post(API_ENDPOINTS.QUOTATIONS.BASE, {
        quotationNumber: quotation.quotationNumber,
        customerId: quotation.customerId,
        date: quotation.date,
        expiryDate: quotation.expiryDate,
        subTotal: quotation.subtotal,
        discountTotal: quotation.discount,
        taxTotal: quotation.taxTotal,
        shipping: quotation.shipping,
        grandTotal: quotation.grandTotal,
        status: quotation.status,
        notes: quotation.notes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          taxAmount: i.taxAmount || 0,
          total: i.total,
        })),
      });
      quotation.syncStatus = 'synced';
      await this.update(quotation, false);
    } catch (e) {
      // Offline fallback: stays pending_insert
    }

    return { ...quotation, items: items as QuotationItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM quotation_items WHERE quotationId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    try {
      await apiClient.delete(API_ENDPOINTS.QUOTATIONS.BY_ID(id));
    } catch (e) {
      // offline
    }
  }
}

export const quotationRepository = new QuotationRepository();
