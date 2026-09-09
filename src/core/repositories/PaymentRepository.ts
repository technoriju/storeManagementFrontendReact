import { BaseRepository } from './BaseRepository';
import { Payment } from '../../types/models';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { db } from '../database/db';

export class PaymentRepository extends BaseRepository<Payment> {
  protected tableName = 'payments';

  protected getInsertColumns(): string {
    return 'id, amount, method, type, reference, notes, customerId, supplierId, createdAt, updatedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'amount = ?, method = ?, type = ?, reference = ?, notes = ?, customerId = ?, supplierId = ?, createdAt = ?, updatedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Payment): any[] {
    return [
      entity.id,
      entity.amount,
      entity.method,
      entity.type,
      entity.reference || null,
      entity.notes || null,
      entity.customerId || null,
      entity.supplierId || null,
      entity.createdAt,
      entity.updatedAt,
      entity.syncStatus || 'synced'
    ];
  }

  protected fromRow(row: any): Payment {
    return {
      id: row.id,
      amount: row.amount,
      method: row.method,
      type: row.type,
      reference: row.reference,
      notes: row.notes,
      customerId: row.customerId,
      supplierId: row.supplierId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      syncStatus: row.syncStatus,
    };
  }

  protected async syncWithApi(entity: Payment, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    // API logic to be implemented, using mock try-catch
    try {
      if (operation !== 'delete' && entity.syncStatus !== 'synced') {
        entity.syncStatus = 'synced';
        await this.update(entity);
      }
    } catch (error) {
      console.error(`Failed to sync payment ${entity.id} with API:`, error);
    }
  }

  public async fetchFromApi(): Promise<void> {
    // API logic to be implemented
  }

  public async getByCustomerId(customerId: string): Promise<Payment[]> {
    try {
      const results = await db.execute(`SELECT * FROM ${this.tableName} WHERE customerId = ? ORDER BY createdAt DESC`, [customerId]);
      const items: Payment[] = [];
      if (results.rows) {
        for (let i = 0; i < results.rows.length; i++) {
          items.push(this.fromRow(results.rows[i]));
        }
      }
      return items;
    } catch (error) {
      throw error;
    }
  }

  public async getBySupplierId(supplierId: string): Promise<Payment[]> {
    try {
      const results = await db.execute(`SELECT * FROM ${this.tableName} WHERE supplierId = ? ORDER BY createdAt DESC`, [supplierId]);
      const items: Payment[] = [];
      if (results.rows) {
        for (let i = 0; i < results.rows.length; i++) {
          items.push(this.fromRow(results.rows[i]));
        }
      }
      return items;
    } catch (error) {
      throw error;
    }
  }
}

export const paymentRepository = new PaymentRepository();
