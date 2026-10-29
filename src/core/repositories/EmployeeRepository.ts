import { BaseRepository } from './BaseRepository';
import { Employee } from '../../types/models';
import { db } from '../database/db';
import { apiClient } from '../api/api-client';
import { API_ENDPOINTS } from '../api/api-urls';

export class EmployeeRepository extends BaseRepository<Employee> {
  protected tableName = 'employees';

  async getAll(): Promise<Employee[]> {
    const items = await super.getAll();
    return items
      .filter((item) => !item.deletedAt)
      .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
  }

  async insert(entity: Employee): Promise<void> {
    try {
      const res = await apiClient.post(API_ENDPOINTS.HRM.EMPLOYEES, {
        employeeCode: entity.employeeCode,
        firstName: entity.firstName,
        lastName: entity.lastName,
        email: entity.email,
        phone: entity.phone,
        departmentId: entity.departmentId && entity.departmentId > 0 ? entity.departmentId : undefined,
        departmentName: entity.departmentName,
        designationId: entity.designationId && entity.designationId > 0 ? entity.designationId : undefined,
        designationName: entity.designationName,
        shiftId: entity.shiftId && entity.shiftId > 0 ? entity.shiftId : undefined,
        shiftName: entity.shiftName,
        joiningDate: entity.joiningDate,
        salary: entity.salary,
        employmentType: entity.employmentType,
        status: entity.status,
        address: entity.address,
        emergencyContact: entity.emergencyContact,
      });
      const data = res.data?.data || res.data;
      if (data?.id) {
        entity.id = Number(data.id);
        entity.backendId = Number(data.id);
        if (data.employeeCode) entity.employeeCode = data.employeeCode;
      }
    } catch (e: any) {
      console.warn('[EmployeeRepository] API insert failed, saving locally:', e?.message || e);
    }
    await super.insert(entity, false);
  }

  async update(entity: Employee): Promise<void> {
    const targetId = entity.backendId || entity.id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.patch(API_ENDPOINTS.HRM.EMPLOYEE_BY_ID(targetId), {
          employeeCode: entity.employeeCode,
          firstName: entity.firstName,
          lastName: entity.lastName,
          email: entity.email,
          phone: entity.phone,
          departmentId: entity.departmentId && entity.departmentId > 0 ? entity.departmentId : undefined,
          departmentName: entity.departmentName,
          designationId: entity.designationId && entity.designationId > 0 ? entity.designationId : undefined,
          designationName: entity.designationName,
          shiftId: entity.shiftId && entity.shiftId > 0 ? entity.shiftId : undefined,
          shiftName: entity.shiftName,
          joiningDate: entity.joiningDate,
          salary: entity.salary,
          employmentType: entity.employmentType,
          status: entity.status,
          address: entity.address,
          emergencyContact: entity.emergencyContact,
        });
      } else {
        const res = await apiClient.post(API_ENDPOINTS.HRM.EMPLOYEES, {
          employeeCode: entity.employeeCode,
          firstName: entity.firstName,
          lastName: entity.lastName,
          email: entity.email,
          phone: entity.phone,
          departmentId: entity.departmentId && entity.departmentId > 0 ? entity.departmentId : undefined,
          departmentName: entity.departmentName,
          designationId: entity.designationId && entity.designationId > 0 ? entity.designationId : undefined,
          designationName: entity.designationName,
          shiftId: entity.shiftId && entity.shiftId > 0 ? entity.shiftId : undefined,
          shiftName: entity.shiftName,
          joiningDate: entity.joiningDate,
          salary: entity.salary,
          employmentType: entity.employmentType,
          status: entity.status,
          address: entity.address,
          emergencyContact: entity.emergencyContact,
        });
        const data = res.data?.data || res.data;
        if (data?.id) {
          const oldId = entity.id;
          entity.id = Number(data.id);
          entity.backendId = Number(data.id);
          await db.execute('UPDATE employees SET id = ?, backendId = ? WHERE id = ?', [Number(data.id), Number(data.id), oldId]);
        }
      }
    } catch (e: any) {
      console.warn('[EmployeeRepository] API update failed, saving locally:', e?.message || e);
    }
    await super.update(entity, false);
  }

  async delete(itemOrId: number | Employee): Promise<void> {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    const existing = typeof itemOrId === 'number' ? await this.getById(id) : itemOrId;
    const targetId = existing?.backendId || id;
    try {
      if (targetId && targetId > 0) {
        await apiClient.delete(API_ENDPOINTS.HRM.EMPLOYEE_BY_ID(targetId));
      }
    } catch (e: any) {
      console.warn('[EmployeeRepository] API delete failed, deleting locally:', e?.message || e);
    }
    await db.execute(`DELETE FROM employees WHERE id = ?`, [id]);
  }

  public async fetchFromApi(): Promise<Employee[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.HRM.EMPLOYEES);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const normalized: Employee = {
            id: Number(item.id),
            backendId: Number(item.id),
            employeeCode: item.employeeCode || '',
            firstName: item.firstName || '',
            lastName: item.lastName || '',
            email: item.email || '',
            phone: item.phone || '',
            departmentId: item.departmentId ? Number(item.departmentId) : undefined,
            departmentName: item.departmentName || '',
            designationId: item.designationId ? Number(item.designationId) : undefined,
            designationName: item.designationName || '',
            shiftId: item.shiftId ? Number(item.shiftId) : undefined,
            shiftName: item.shiftName || '',
            joiningDate: item.joiningDate ? String(item.joiningDate).split('T')[0] : '',
            salary: Number(item.salary || 0),
            employmentType: item.employmentType || 'FULL_TIME',
            status: item.status || 'ACTIVE',
            address: item.address || '',
            emergencyContact: item.emergencyContact || '',
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
    return 'id, backendId, employeeCode, firstName, lastName, email, phone, departmentId, departmentName, designationId, designationName, shiftId, shiftName, joiningDate, salary, employmentType, status, address, emergencyContact, createdAt, updatedAt, deletedAt, syncStatus';
  }

  protected getInsertPlaceholders(): string {
    return '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';
  }

  protected getUpdateSet(): string {
    return 'backendId = ?, employeeCode = ?, firstName = ?, lastName = ?, email = ?, phone = ?, departmentId = ?, departmentName = ?, designationId = ?, designationName = ?, shiftId = ?, shiftName = ?, joiningDate = ?, salary = ?, employmentType = ?, status = ?, address = ?, emergencyContact = ?, createdAt = ?, updatedAt = ?, deletedAt = ?, syncStatus = ?';
  }

  protected toRow(entity: Employee): any[] {
    return [
      entity.id || Math.floor(Math.random() * -1000000000),
      entity.backendId || null,
      entity.employeeCode || '',
      entity.firstName || '',
      entity.lastName || '',
      entity.email || '',
      entity.phone || '',
      entity.departmentId || null,
      entity.departmentName || '',
      entity.designationId || null,
      entity.designationName || '',
      entity.shiftId || null,
      entity.shiftName || '',
      entity.joiningDate || new Date().toISOString().split('T')[0],
      Number(entity.salary || 0),
      entity.employmentType || 'FULL_TIME',
      entity.status || 'ACTIVE',
      entity.address || '',
      entity.emergencyContact || '',
      entity.createdAt || new Date().toISOString(),
      entity.updatedAt || new Date().toISOString(),
      entity.deletedAt || null,
      entity.syncStatus || 'synced',
    ];
  }

  protected fromRow(row: any): Employee {
    return {
      id: Number(row.id || 0),
      backendId: row.backendId,
      employeeCode: row.employeeCode || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email: row.email || '',
      phone: row.phone || '',
      departmentId: row.departmentId ? Number(row.departmentId) : undefined,
      departmentName: row.departmentName || '',
      designationId: row.designationId ? Number(row.designationId) : undefined,
      designationName: row.designationName || '',
      shiftId: row.shiftId ? Number(row.shiftId) : undefined,
      shiftName: row.shiftName || '',
      joiningDate: row.joiningDate || '',
      salary: Number(row.salary || 0),
      employmentType: row.employmentType || 'FULL_TIME',
      status: row.status || 'ACTIVE',
      address: row.address || '',
      emergencyContact: row.emergencyContact || '',
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      deletedAt: row.deletedAt,
      syncStatus: row.syncStatus,
    };
  }
}

export const employeeRepository = new EmployeeRepository();
