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
    
    let rawRow: any = null;
    if (Array.isArray(res.rows) && res.rows.length > 0) {
      rawRow = res.rows[0];
    } else if (res.rows && typeof res.rows === 'object') {
      if ('_array' in res.rows && Array.isArray((res.rows as any)._array) && (res.rows as any)._array.length > 0) {
        rawRow = (res.rows as any)._array[0];
      } else if ('item' in res.rows && typeof (res.rows as any).length === 'number' && (res.rows as any).length > 0) {
        rawRow = (res.rows as any).item(0);
      }
    }

    if (rawRow) {
      return this.fromRow(rawRow);
    }
    return null;
  }

  async getAll(): Promise<T[]> {
    const res = await db.execute(`SELECT * FROM ${this.tableName}`);
    const items: T[] = [];
    
    // op-sqlite can return rows as an array, or an object with _array or item()
    let rawRows: any[] = [];
    if (Array.isArray(res.rows)) {
      rawRows = res.rows;
    } else if (res.rows && typeof res.rows === 'object') {
      if ('_array' in res.rows && Array.isArray((res.rows as any)._array)) {
        rawRows = (res.rows as any)._array;
      } else if ('item' in res.rows && typeof (res.rows as any).length === 'number') {
        const len = (res.rows as any).length;
        for (let i = 0; i < len; i++) {
          rawRows.push((res.rows as any).item(i));
        }
      } else {
        // Just in case res.rows behaves like an array but fails Array.isArray
        rawRows = Array.from(res.rows as any);
      }
    }

    for (const row of rawRows) {
      if (row) items.push(this.fromRow(row));
    }
    
    return items;
  }

  async insert(entity: T, shouldSync = true): Promise<void> {
    const query = `INSERT INTO ${this.tableName} (${this.getInsertColumns()}) VALUES (${this.getInsertPlaceholders()})`;
    await db.execute(query, this.toRow(entity));
    if (shouldSync) {
      this.syncWithApi(entity, 'insert').catch(console.error);
    }
  }

  async update(entity: T, shouldSync = true): Promise<void> {
    const query = `UPDATE ${this.tableName} SET ${this.getUpdateSet()} WHERE id = ?`;
    const params = [...this.toRow(entity).slice(1), entity.id];
    await db.execute(query, params);
    if (shouldSync) {
      this.syncWithApi(entity, 'update').catch(console.error);
    }
  }

  async delete(id: string, shouldSync = true): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) return;

    await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    
    if (shouldSync) {
      this.syncWithApi(entity, 'delete').catch(console.error);
    }
  }

  // Abstract method to be implemented by specific repositories for API interaction
  protected abstract syncWithApi(entity: T, operation: 'insert' | 'update' | 'delete'): Promise<void>;
  
  // Pull from API to Local Database
  public abstract fetchFromApi(): Promise<unknown>;
}
