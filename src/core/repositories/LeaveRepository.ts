import { BaseRepository } from './BaseRepository';
import { LeaveRequest, LeaveType } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { employeeRepository } from './EmployeeRepository';

export class LeaveRepository extends BaseRepository<LeaveRequest> {
  protected tableName = 'leaves';

  async getAll(): Promise<LeaveRequest[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async insert(entity: LeaveRequest): Promise<void> {
    try {
      let targetEmpId = entity.employeeId;
      if (targetEmpId <= 0) {
        const localEmp = await employeeRepository.getById(targetEmpId);
        if (localEmp?.backendId) targetEmpId = localEmp.backendId;
      }
      let targetTypeId = entity.leaveTypeId;
      if (targetTypeId <= 0) {
        const localType = await leaveTypeRepository.getById(targetTypeId);
        if (localType?.backendId) targetTypeId = localType.backendId;
      }

      if (targetEmpId > 0 && targetTypeId > 0) {
        const res = await apiClient.post(API_ENDPOINTS.HRM.LEAVES, {
          employeeId: targetEmpId,
          leaveTypeId: targetTypeId,
          startDate: entity.startDate,
          endDate: entity.endDate,
          days: entity.totalDays,
          reason: entity.reason,
          status: entity.status,
        });
        const data = res.data?.data || res.data;
        if (data?.id) {
          entity.id = Number(data.id);
          entity.backendId = Number(data.id);
        }
      }
    } catch (e: any) {
      console.warn('[LeaveRepository] API insert failed:', e?.message || e);
    }
    await super.insert(entity, false);
  }

  async update(entity: LeaveRequest): Promise<void> {
    const targetId = entity.backendId || entity.id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.patch(`${API_ENDPOINTS.HRM.LEAVES}/${targetId}/status`, {
          status: entity.status,
          approvedBy: entity.approvedBy,
        });
      }
    } catch (e: any) {
      console.warn('[LeaveRepository] API update failed:', e?.message || e);
    }
    await super.update(entity, false);
  }

  async delete(itemOrId: number | LeaveRequest): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.LEAVE_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM leaves WHERE id = ?`, [id]);
  }

  public async fetchFromApi(): Promise<LeaveRequest[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.LEAVES);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const normalized: LeaveRequest = {
            id: Number(item.id),
            backendId: Number(item.id),
            employeeId: Number(item.employeeId),
            employeeName: item.employeeName || (item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : ''),
            departmentName: item.departmentName || '',
            leaveTypeId: Number(item.leaveTypeId),
            leaveTypeName: item.leaveTypeName || (item.leaveType ? item.leaveType.name : ''),
            startDate: item.startDate ? String(item.startDate).split('T')[0] : '',
            endDate: item.endDate ? String(item.endDate).split('T')[0] : '',
            totalDays: Number(item.days || 1),
            reason: item.reason || '',
            status: item.status || 'PENDING',
            appliedAt: item.appliedAt || item.createdAt || new Date().toISOString(),
            approvedBy: item.approvedBy,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            deletedAt: item.deletedAt || null,
            syncStatus: 'synced',
          };
          const local = await this.getById(normalized.id);
          if (local) {
            await super.update(normalized, false);
          } else {
            await super.insert(normalized, false);
          }
        }
      }
    } catch (e) {}
    return this.getAll();
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
    try {
      const res = await apiClient.post(API_ENDPOINTS.HRM.LEAVE_TYPES, {
        name: entity.name,
        daysAllowed: entity.daysAllowed,
        description: entity.description,
        status: entity.status,
      });
      const data = res.data?.data || res.data;
      if (data?.id) {
        entity.id = data.id;
        entity.backendId = data.id;
      }
    } catch (e) {}
    await super.insert(entity, false);
  }

  async update(entity: LeaveType): Promise<void> {
    await super.update(entity, false);
  }

  async delete(itemOrId: number | LeaveType): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.LEAVE_TYPE_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM leave_types WHERE id = ?`, [id]);
  }

  public async fetchFromApi(): Promise<LeaveType[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.LEAVE_TYPES);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const normalized: LeaveType = {
            id: Number(item.id),
            backendId: Number(item.id),
            name: item.name || '',
            daysAllowed: Number(item.daysAllowed || 12),
            description: item.description || '',
            status: item.status || 'ACTIVE',
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            deletedAt: item.deletedAt || null,
            syncStatus: 'synced',
          };
          const local = await this.getById(normalized.id);
          if (local) {
            await super.update(normalized, false);
          } else {
            await super.insert(normalized, false);
          }
        }
      }
    } catch (e) {}
    return this.getAll();
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
