import { BaseRepository } from './BaseRepository';
import { Attendance } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';
import { employeeRepository } from './EmployeeRepository';

export class AttendanceRepository extends BaseRepository<Attendance> {
  protected tableName = 'attendances';

  async getAll(): Promise<Attendance[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  async insert(entity: Attendance): Promise<void> {
    try {
      let targetEmpId = entity.employeeId;
      if (targetEmpId <= 0) {
        const localEmp = await employeeRepository.getById(targetEmpId);
        if (localEmp?.backendId) targetEmpId = localEmp.backendId;
      }
      if (targetEmpId > 0) {
        const res = await apiClient.post(API_ENDPOINTS.HRM.ATTENDANCE, {
          employeeId: targetEmpId,
          date: entity.date,
          clockIn: entity.clockIn,
          clockOut: entity.clockOut,
          status: entity.status,
          totalHours: entity.totalHours,
          notes: entity.notes,
        });
        const data = res.data?.data || res.data;
        if (data?.id) {
          entity.id = Number(data.id);
          entity.backendId = Number(data.id);
        }
      }
    } catch (e: any) {
      console.warn('[AttendanceRepository] API insert failed:', e?.message || e);
    }
    await super.insert(entity, false);
  }

  async update(entity: Attendance): Promise<void> {
    try {
      let targetEmpId = entity.employeeId;
      if (targetEmpId <= 0) {
        const localEmp = await employeeRepository.getById(targetEmpId);
        if (localEmp?.backendId) targetEmpId = localEmp.backendId;
      }
      if (targetEmpId > 0) {
        await apiClient.post(API_ENDPOINTS.HRM.ATTENDANCE, {
          employeeId: targetEmpId,
          date: entity.date,
          clockIn: entity.clockIn,
          clockOut: entity.clockOut,
          status: entity.status,
          totalHours: entity.totalHours,
          notes: entity.notes,
        });
      }
    } catch (e: any) {
      console.warn('[AttendanceRepository] API update failed:', e?.message || e);
    }
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Attendance): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.ATTENDANCE_BY_ID(targetId));
      }
    } catch (e) {}
    await db.execute(`DELETE FROM attendances WHERE id = ? OR backendId = ?`, [id, targetId]);
  }

  public async fetchFromApi(): Promise<Attendance[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.ATTENDANCE);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        const incomingIds: number[] = [];
        for (const item of items) {
          const normalized: Attendance = {
            id: Number(item.id),
            backendId: Number(item.id),
            employeeId: Number(item.employeeId),
            employeeName: item.employeeName || (item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : ''),
            departmentName: item.departmentName || '',
            date: item.date ? String(item.date).split('T')[0] : new Date().toISOString().split('T')[0],
            clockIn: item.clockIn || undefined,
            clockOut: item.clockOut || undefined,
            status: item.status || 'PRESENT',
            totalHours: item.totalHours !== null ? Number(item.totalHours) : undefined,
            notes: item.notes || '',
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            deletedAt: item.deletedAt || null,
            syncStatus: 'synced',
          };
          incomingIds.push(normalized.id);
          const local = await this.getById(normalized.id);
          if (local) {
            await super.update(normalized, false);
          } else {
            await super.insert(normalized, false);
          }
        }

        if (incomingIds.length > 0) {
          const placeholders = incomingIds.map(() => '?').join(',');
          await db.execute(`DELETE FROM attendances WHERE syncStatus = 'synced' AND id NOT IN (${placeholders})`, incomingIds);
        } else {
          await db.execute(`DELETE FROM attendances WHERE syncStatus = 'synced'`);
        }
      }
    } catch (e) {}
    return this.getAll();
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
