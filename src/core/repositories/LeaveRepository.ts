import { BaseRepository } from './BaseRepository';
import { LeaveRequest, LeaveType } from '../../types/models';
import { db } from '../database/db';

export class LeaveRepository extends BaseRepository<LeaveRequest> {
  protected tableName = 'leaves';

  async getAll(): Promise<LeaveRequest[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async insert(entity: LeaveRequest): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: LeaveRequest): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | LeaveRequest): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM leaves WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, employeeId, employeeName, departmentName, leaveTypeId, leaveTypeName, startDate, endDate, totalDays, reason, status, appliedAt, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, employeeId = ?, employeeName = ?, departmentName = ?, leaveTypeId = ?, leaveTypeName = ?, startDate = ?, endDate = ?, totalDays = ?, reason = ?, status = ?, appliedAt = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: LeaveRequest): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.employeeId,
      entity.employeeName || '',
      entity.departmentName || '',
      entity.leaveTypeId,
      entity.leaveTypeName || '',
      entity.startDate || new Date().toISOString().split('T')[0],
      entity.endDate || new Date().toISOString().split('T')[0],
      Number(entity.totalDays || 1),
      entity.reason || '',
      entity.status || 'PENDING',
      entity.appliedAt || new Date().toISOString(),
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): LeaveRequest {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      employeeId: Number(row.employeeId || 0),
      employeeName: row.employeeName || '',
      departmentName: row.departmentName || '',
      leaveTypeId: Number(row.leaveTypeId || 0),
      leaveTypeName: row.leaveTypeName || '',
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      totalDays: Number(row.totalDays || 1),
      reason: row.reason || '',
      status: row.status || 'PENDING',
      appliedAt: row.appliedAt || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export class LeaveTypeRepository extends BaseRepository<LeaveType> {
  protected tableName = 'leave_types';

  async getAll(): Promise<LeaveType[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async insert(entity: LeaveType): Promise<void> {
    await super.insert(entity, false);
  }

  async update(entity: LeaveType): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | LeaveType): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    await db.execute(`DELETE FROM leave_types WHERE id = ?`, [id]);
  }

  protected getInsertColumns(): string {
    return 'id, backendId, name, daysAllowed, description, status, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, name = ?, daysAllowed = ?, description = ?, status = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: LeaveType): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.name || '',
      Number(entity.daysAllowed || 12),
      entity.description || '',
      entity.status || 'ACTIVE',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): LeaveType {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      name: row.name || '',
      daysAllowed: Number(row.daysAllowed || 12),
      description: row.description || '',
      status: row.status || 'ACTIVE',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const leaveRepository = new LeaveRepository();
export const leaveTypeRepository = new LeaveTypeRepository();
