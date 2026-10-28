import { BaseRepository } from './BaseRepository';
import { Attendance } from '../../types/models';
import { db } from '../database/db';

export class AttendanceRepository extends BaseRepository<Attendance> {
  protected tableName = 'attendances';

  async getAll(): Promise<Attendance[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  async insert(entity: Attendance): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: Attendance): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Attendance): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM attendances WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, employeeId, employeeName, departmentName, date, clockIn, clockOut, status, totalHours, notes, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, employeeId = ?, employeeName = ?, departmentName = ?, date = ?, clockIn = ?, clockOut = ?, status = ?, totalHours = ?, notes = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Attendance): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.employeeId,
      entity.employeeName || '',
      entity.departmentName || '',
      entity.date || new Date().toISOString().split('T')[0],
      entity.clockIn || null,
      entity.clockOut || null,
      entity.status || 'PRESENT',
      entity.totalHours !== undefined ? Number(entity.totalHours) : null,
      entity.notes || '',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Attendance {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      employeeId: Number(row.employeeId || 0),
      employeeName: row.employeeName || '',
      departmentName: row.departmentName || '',
      date: row.date || '',
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      status: row.status || 'PRESENT',
      totalHours: row.totalHours !== null && row.totalHours !== undefined ? Number(row.totalHours) : undefined,
      notes: row.notes || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const attendanceRepository = new AttendanceRepository();
