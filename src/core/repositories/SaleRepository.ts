import { BaseRepository } from './BaseRepository';
import { Sale, SaleItem } from '../../types/models';
import { db } from '../database/db';

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
        'SELECT * FROM sale_items WHERE saleId = ?',
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
            productName: row.productName ? String(row.productName) : undefined,
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
      const res = await db.execute(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
      const items: Sale[] = [];
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
      console.error('Failed to get all sales:', error);
      return [];
    }
  }

  protected async syncWithApi(entity: Sale, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync sale ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    // API sync logic when backend endpoint is ready
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

    // Insert sale
    await this.insert(sale, false);

    // Insert items & deduct product stock
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'sub';

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

    return { ...sale, items: items as SaleItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM sale_items WHERE saleId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

export const saleRepository = new SaleRepository();
