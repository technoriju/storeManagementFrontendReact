import { BaseRepository } from './BaseRepository';
import { Holiday } from '../../types/models';
import { db } from '../database/db';

export class HolidayRepository extends BaseRepository<Holiday> {
  protected tableName = 'holidays';

  async getAll(): Promise<Holiday[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  async insert(entity: Holiday): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Holiday): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Holiday): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM holidays WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, date, dayOfWeek, type, description, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, date = ?, dayOfWeek = ?, type = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Holiday): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      entity.date || new Date().toISOString().split('T')[0],
      entity.dayOfWeek || '',
      entity.type || 'PUBLIC',
      entity.description || '',
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Holiday {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      date: row.date || '',
      dayOfWeek: row.dayOfWeek || '',
      type: row.type || 'PUBLIC',
      description: row.description || '',
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const holidayRepository = new HolidayRepository();
