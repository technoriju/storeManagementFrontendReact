import { Payment } from '../../types/models';
import { CrudConfig, OfflineCrudRepository, endpointFor, idOf, now } from './OfflineCrudRepository';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { outboxRepo } from '../sync/outbox';

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

  public override async fetchFromApi(): Promise<Payment[]> {
    try {
      const response = await apiClient.get<any>(config.endpoint.BASE);
      const extractList = (data: any): any[] => {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];
        for (const key of ['data', 'items', 'results', 'rows', 'records']) {
          if (data[key]) {
            const found = extractList(data[key]);
            if (found.length) return found;
          }
        }
        for (const val of Object.values(data)) {
          if (Array.isArray(val)) return val;
        }
        return [];
      };

      const rawList = extractList(response.data);
      if (!Array.isArray(rawList)) return await this.getAll();

      const serverIds: number[] = [];
      for (const raw of rawList) {
        if (!raw.id) continue;
        if (raw.deletedAt) continue;
        const item = config.normalize(raw);
        const serverId = Number(item.id);
        serverIds.push(serverId);

        // 1. Check if row exists locally by server ID
        let existing = await super.getById(serverId);

        // 2. If not found by server ID, check by reference & type (e.g. bill payment created locally)
        if (!existing && item.reference) {
          const matchRes = await db.execute(
            `SELECT * FROM ${this.tableName} WHERE reference = ? AND type = ? LIMIT 1`,
            [item.reference, item.type]
          );
          let matchedRows: any[] = [];
          if (matchRes.rows && Array.isArray(matchRes.rows)) matchedRows = matchRes.rows;
          else if (matchRes.rows && typeof matchRes.rows === 'object' && '_array' in matchRes.rows) matchedRows = (matchRes.rows as any)._array;

          if (matchedRows.length > 0) {
            const oldId = Number(matchedRows[0].id);
            if (oldId && oldId !== serverId) {
              await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [oldId]);
              await outboxRepo.removeForEntity(config.entityType, oldId);
            }
          }
        }

        if (existing) {
          await super.update(item, false);
        } else {
          await super.insert(item, false);
        }
      }

      // Cleanup local records marked synced that were deleted from server
      if (serverIds.length > 0) {
        const placeholders = serverIds.map(() => '?').join(',');
        await db.execute(
          `DELETE FROM ${this.tableName} WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`,
          serverIds
        );
      } else {
        await db.execute(`DELETE FROM ${this.tableName} WHERE syncStatus = 'synced'`);
      }

      return await this.getAll();
    } catch (error) {
      console.warn('[PaymentRepository] fetchFromApi error (offline):', error);
      return await this.getAll();
    }
  }
}

export const paymentRepository = new PaymentRepository();
