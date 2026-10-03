import { BaseRepository } from './BaseRepository';
import { Purchase, PurchaseItem } from '../../types/models';
import { db } from '../database/db';

export class PurchaseRepository extends BaseRepository<Purchase> {
  protected tableName = 'purchases';

  protected getInsertColumns(): string {
    return 'id, invoiceNumber, reference, supplierId, supplierName, date, subtotal, discount, orderTax, shipping, gst, total, paid, due, status, paymentStatus, notes, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'invoiceNumber = ?, reference = ?, supplierId = ?, supplierName = ?, date = ?, subtotal = ?, discount = ?, orderTax = ?, shipping = ?, gst = ?, total = ?, paid = ?, due = ?, status = ?, paymentStatus = ?, notes = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
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

  protected async syncWithApi(entity: Purchase, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity, false);
      }
    } catch (error) {
      console.error(`Failed to sync purchase ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    // API logic when backend purchase endpoint is ready
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
    for (const item of items) {
      const itemId = Date.now() + Math.floor(Math.random() * 10000);
      const conversionRate = item.conversionRate && Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
      const unitType = item.unitType || 'base';

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
        const addedBaseQty = unitType === 'sub' ? item.quantity / conversionRate : item.quantity;
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

    return { ...purchase, items: items as PurchaseItem[] };
  }

  public override async delete(id: number): Promise<void> {
    await db.execute('DELETE FROM purchase_items WHERE purchaseId = ?', [id]);
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

export const purchaseRepository = new PurchaseRepository();
