import { db } from '../database/db';
import { BaseEntity } from '../../types/models';

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;
  
  // Convert domain model to DB row
  protected abstract toRow(entity: T): any[];
  
  // Convert DB row to domain model
  protected abstract fromRow(row: any): T;
  
  // SQLite parameterized string, e.g. (?, ?, ?)
  protected abstract getInsertColumns(): string;
  protected abstract getInsertPlaceholders(): string;
  protected abstract getUpdateSet(): string;

  async getById(id: string): Promise<T | null> {
    const res = await db.execute(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    if (res.rows?.length) {
      return this.fromRow(res.rows[0]);
    }
    return null;
  }

  async getAll(): Promise<T[]> {
    const res = await db.execute(`SELECT * FROM ${this.tableName}`);
    const items: T[] = [];
    if (res.rows) {
      for (let i = 0; i < res.rows.length; i++) {
        items.push(this.fromRow(res.rows[i]));
      }
    }
    return items;
  }

  async insert(entity: T): Promise<void> {
    const query = `INSERT INTO ${this.tableName} (${this.getInsertColumns()}) VALUES (${this.getInsertPlaceholders()})`;
    await db.execute(query, this.toRow(entity));
    // Optional: After successful local insert, trigger background API sync
    this.syncWithApi(entity, 'insert').catch(console.error);
  }

  async update(entity: T): Promise<void> {
    const query = `UPDATE ${this.tableName} SET ${this.getUpdateSet()} WHERE id = ?`;
    const params = [...this.toRow(entity), entity.id];
    await db.execute(query, params);
    // Optional: Trigger background API sync
    this.syncWithApi(entity, 'update').catch(console.error);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) return;

    // For offline-first, we might want to soft-delete and set syncStatus = 'pending_delete'
    // But for a simple implementation, we just hard delete locally.
    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    
    // Optional: Trigger background API sync
    this.syncWithApi(entity, 'delete').catch(console.error);
  }

  // Abstract method to be implemented by specific repositories for API interaction
  protected abstract syncWithApi(entity: T, operation: 'insert' | 'update' | 'delete'): Promise<void>;
  
  // Pull from API to Local Database
  public abstract fetchFromApi(): Promise<void>;
}
