import { BaseRepository } from './BaseRepository';
import { Shift } from '../../types/models';
import { db } from '../database/db';

export class ShiftRepository extends BaseRepository<Shift> {
  protected tableName = 'shifts';

  async getAll(): Promise<Shift[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: Shift): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Shift): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Shift): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM shifts WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, code, startTime, endTime, lateToleranceMinutes, breakDurationMinutes, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, code = ?, startTime = ?, endTime = ?, lateToleranceMinutes = ?, breakDurationMinutes = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Shift): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      entity.code || '',
      entity.startTime || '09:00',
      entity.endTime || '18:00',
      entity.lateToleranceMinutes ?? 15,
      entity.breakDurationMinutes ?? 60,
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Shift {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      code: row.code || '',
      startTime: row.startTime || '09:00',
      endTime: row.endTime || '18:00',
      lateToleranceMinutes: Number(row.lateToleranceMinutes || 15),
      breakDurationMinutes: Number(row.breakDurationMinutes || 60),
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const shiftRepository = new ShiftRepository();
