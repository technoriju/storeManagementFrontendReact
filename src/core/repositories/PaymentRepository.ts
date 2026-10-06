import { Payment } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
import { db } from '../database/db';

const config: CrudConfig<Payment> = {
  tableName: 'payments',
  entityType: 'payments',
  endpoint: endpointFor('PAYMENTS'),
  columns: 'id, backendId, amount, method, type, reference, notes, customerId, supplierId, createdAt, updatedAt, syncStatus',
  placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  updateSet: 'backendId = ?, amount = ?, method = ?, type = ?, reference = ?, notes = ?, customerId = ?, supplierId = ?, createdAt = ?, updatedAt = ?, syncStatus = ?',
  toRow: (e) => [
    e.id,
    e.backendId || null,
    e.amount,
    e.method,
    e.type,
    e.reference || null,
    e.notes || null,
    e.customerId || null,
    e.supplierId || null,
    e.createdAt || now(),
    e.updatedAt || now(),
    e.syncStatus || 'synced',
  ],
  fromRow: (r) => ({
    id: r.id,
    backendId: r.backendId || undefined,
    amount: Number(r.amount),
    method: r.method,
    type: r.type,
    reference: r.reference || undefined,
    notes: r.notes || undefined,
    customerId: r.customerId || undefined,
    supplierId: r.supplierId || undefined,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    syncStatus: r.syncStatus,
  }),
  normalize: (r) => ({
    id: idOf(r),
    backendId: idOf(r),
    amount: Number(r.amount || 0),
    method: (r.method || r.paymentMethod || 'cash').toLowerCase(),
    type: r.type || 'receive',
    reference: r.reference || r.referenceNumber || undefined,
    notes: r.notes || undefined,
    customerId: r.customerId ? Number(r.customerId) : undefined,
    supplierId: r.supplierId ? Number(r.supplierId) : undefined,
    createdAt: r.createdAt || r.paymentDate || now(),
    updatedAt: r.updatedAt || now(),
    syncStatus: 'synced',
  }),
  payload: (e) => ({
    amount: Number(e.amount),
    paymentMethod: e.method,
    method: e.method,
    type: e.type,
    referenceNumber: e.reference,
    reference: e.reference,
    notes: e.notes,
    customerId: e.customerId,
    supplierId: e.supplierId,
  }),
};

export class PaymentRepository extends OfflineCrudRepository<Payment> {
  constructor() {
    super(config);
  }

  private extractRows(results: any): any[] {
    let rawRows: any[] = [];
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
        try { rawRows = Array.from(results.rows as any); } catch (e) {}
      }
    } else if (Array.isArray(results)) {
      rawRows = results;
    }
    return rawRows;
  }

  public async getByCustomerId(customerId: string | number): Promise<Payment[]> {
    try {
      const results = await db.execute(
        `SELECT * FROM ${this.tableName} WHERE customerId = ? ORDER BY createdAt DESC`,
        [customerId]
      );
      return this.extractRows(results).map((row) => this.fromRow(row));
    } catch (error) {
      throw error;
    }
  }

  public async getBySupplierId(supplierId: string | number): Promise<Payment[]> {
    try {
      const results = await db.execute(
        `SELECT * FROM ${this.tableName} WHERE supplierId = ? ORDER BY createdAt DESC`,
        [supplierId]
      );
      return this.extractRows(results).map((row) => this.fromRow(row));
    } catch (error) {
      throw error;
    }
  }

  public async getCustomerPayments(): Promise<Payment[]> {
    try {
      const results = await db.execute(
        `SELECT * FROM ${this.tableName} WHERE customerId IS NOT NULL OR type = 'receive' ORDER BY createdAt DESC`
      );
      return this.extractRows(results).map((row) => this.fromRow(row));
    } catch (error) {
      throw error;
    }
  }

  public async getSupplierPayments(): Promise<Payment[]> {
    try {
      const results = await db.execute(
        `SELECT * FROM ${this.tableName} WHERE supplierId IS NOT NULL OR type = 'pay' ORDER BY createdAt DESC`
      );
      return this.extractRows(results).map((row) => this.fromRow(row));
    } catch (error) {
      throw error;
    }
  }
}

export const paymentRepository = new PaymentRepository();
